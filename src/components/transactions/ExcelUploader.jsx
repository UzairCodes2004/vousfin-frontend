import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react'
import FileUpload from '@/components/common/FileUpload'
import Button from '@/components/common/Button'
import { showError, showSuccess } from '@/components/common/Toast'
import { getErrorMessage } from '@/utils/errorHandler'
import transactionService from '@/services/transaction.service'

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (raw) => {
  if (!raw) return '—'
  try { return new Date(raw).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(raw) }
}

const fmtAmt = (n) => Number(n).toLocaleString('en-PK')

// ── sub-components ────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, green, red }) {
  const color = green
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : red && value > 0
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-slate-200 bg-slate-50 text-slate-500'
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${color}`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs font-medium">{label}</p>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function ExcelUploader({ onSuccess }) {
  // step: 'idle' | 'uploading' | 'preview' | 'importing' | 'done'
  const [step, setStep]               = useState('idle')
  const [progress, setProgress]       = useState(0)
  const [preview, setPreview]         = useState(null)
  const [importResult, setResult]     = useState(null)
  const [showAllErrors, setShowAllErrors] = useState(false)

  // ── template download ──────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const response = await transactionService.downloadExcelTemplate()
      const url = URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'vousFin_import_template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      showError('Failed to download template')
    }
  }

  // ── file selected → upload & parse ────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) { setPreview(null); setStep('idle'); return }
    setStep('uploading')
    setProgress(0)
    try {
      const { data } = await transactionService.importExcel(file, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
      })
      setPreview(data.data)
      setStep('preview')
      showSuccess(`Parsed ${data.data.validCount} valid rows`)
    } catch (err) {
      showError(getErrorMessage(err))
      setStep('idle')
    } finally {
      setProgress(0)
    }
  }

  // ── confirm → bulk save ────────────────────────────────────────────────────
  const confirmImport = async () => {
    if (!preview?.validRows?.length) return
    setStep('importing')
    try {
      const { data } = await transactionService.confirmExcel(preview.validRows)
      setResult(data.data)
      setStep('done')
      if (!data.data.failed?.length) showSuccess(`${data.data.successful} transactions imported`)
    } catch (err) {
      showError(getErrorMessage(err))
      setStep('preview')
    }
  }

  const reset = () => {
    setStep('idle')
    setPreview(null)
    setResult(null)
    setShowAllErrors(false)
    setProgress(0)
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (step === 'done' && importResult) {
    const allPassed = !importResult.failed?.length
    return (
      <div className="space-y-4">
        <div className={`rounded-xl border p-6 text-center ${allPassed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          {allPassed
            ? <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
            : <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />}
          <p className="text-xl font-bold text-slate-800">
            {importResult.successful} transaction{importResult.successful !== 1 ? 's' : ''} imported
          </p>
          {importResult.failed?.length > 0 && (
            <p className="mt-1 text-sm text-amber-700">
              {importResult.failed.length} row{importResult.failed.length !== 1 ? 's' : ''} could not be saved
            </p>
          )}
        </div>

        {importResult.failed?.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-xs font-semibold text-red-700">Failed rows:</p>
            <ul className="space-y-0.5 text-xs text-red-600">
              {importResult.failed.map((f, i) => (
                <li key={i}>Row {f.row ?? '?'}: {f.error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={reset} className="flex-1">Upload another file</Button>
          <Button onClick={onSuccess} className="flex-1">View transactions</Button>
        </div>
      </div>
    )
  }

  // ── Normal flow ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Template download tip */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Need the import format?</p>
          <p className="text-xs text-slate-500">Download the template — it includes column headers and example rows</p>
        </div>
        <Button
          variant="outline"
          icon={Download}
          onClick={handleDownloadTemplate}
          className="flex-shrink-0 text-xs"
        >
          Template
        </Button>
      </div>

      {/* File upload (visible until preview is ready) */}
      {(step === 'idle' || step === 'uploading') && (
        <FileUpload
          onFileSelect={handleFile}
          progress={progress}
        />
      )}

      {/* Preview panel */}
      {(step === 'preview' || step === 'importing') && preview && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard icon={CheckCircle} label="Valid rows"       value={preview.validCount}   green />
            <SummaryCard icon={XCircle}     label="Rows with errors" value={preview.invalidCount} red />
          </div>

          {/* Preview table — first 5 valid rows */}
          {preview.validRows?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Preview — first {Math.min(5, preview.validRows.length)} of {preview.validRows.length} rows
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Debit</th>
                      <th className="px-3 py-2 font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.validRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-500">{fmtDate(row.transactionDate)}</td>
                        <td className="max-w-[160px] truncate px-3 py-2 text-slate-700" title={row.description}>{row.description}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-800">{fmtAmt(row.amount)}</td>
                        <td className="max-w-[120px] truncate px-3 py-2 text-slate-500" title={row.debitAccountName}>{row.debitAccountName}</td>
                        <td className="max-w-[120px] truncate px-3 py-2 text-slate-500" title={row.creditAccountName}>{row.creditAccountName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.validRows.length > 5 && (
                <p className="mt-1 text-center text-xs text-slate-400">
                  + {preview.validRows.length - 5} more rows not shown
                </p>
              )}
            </div>
          )}

          {/* Errors panel (collapsible) */}
          {preview.errors?.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-xs">
              <button
                type="button"
                onClick={() => setShowAllErrors(v => !v)}
                className="flex w-full items-center justify-between px-3 py-2 font-semibold text-red-700"
              >
                <span>{preview.errors.length} validation error{preview.errors.length !== 1 ? 's' : ''} — click to {showAllErrors ? 'hide' : 'view'}</span>
                {showAllErrors ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showAllErrors && (
                <ul className="max-h-52 divide-y divide-red-100 overflow-auto border-t border-red-200">
                  {preview.errors.map((e, i) => (
                    <li key={i} className="px-3 py-1.5 text-red-600">
                      <span className="font-semibold">Row {e.row}</span>
                      {e.field && e.field !== 'general' && (
                        <span className="ml-1 rounded bg-red-100 px-1 py-0.5 font-mono text-red-500">{e.field}</span>
                      )}
                      {' '}{e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={reset} disabled={step === 'importing'}>
              Cancel
            </Button>
            <Button
              onClick={confirmImport}
              loading={step === 'importing'}
              disabled={!preview.validCount}
              className="flex-1"
            >
              Import {preview.validCount} transaction{preview.validCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
