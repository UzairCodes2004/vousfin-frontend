/**
 * ExcelUploader.jsx — standalone bulk-import component (used on CreateTransaction page)
 *
 * Enhanced v2:
 *  ✓ Shows per-row confidence badges (High / Medium / Low)
 *  ✓ Inline description editing
 *  ✓ Duplicate row warnings
 *  ✓ AI-inferred field indicator (✦)
 *  ✓ Confidence stats summary
 *  ✓ File format indicator (xlsx / xls / csv)
 *  ✓ Full error list (collapsible)
 */

import { useState, useRef } from 'react'
import {
  CheckCircle, XCircle, AlertTriangle, Download,
  ChevronDown, ChevronUp, Upload, Loader2, X,
} from 'lucide-react'
import FileUpload from '@/components/common/FileUpload'
import Button from '@/components/common/Button'
import { showError, showSuccess } from '@/components/common/Toast'
import { getErrorMessage } from '@/utils/errorHandler'
import transactionService from '@/services/transaction.service'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (raw) => {
  if (!raw) return '—'
  try {
    const s = typeof raw === 'string' ? raw : new Date(raw).toISOString()
    return s.split('T')[0]
  } catch { return String(raw) }
}
const fmtAmt = (n) => Number(n || 0).toLocaleString('en-PK')

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfBadge({ label, score }) {
  const cls =
    label === 'High'   ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
    label === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                         'border-red-200 bg-red-50 text-red-700'
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cls}`}>
      {label} {score}%
    </span>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ExcelUploader({ onSuccess }) {
  const [step, setStep]         = useState('idle')    // idle|uploading|preview|importing|done
  const [progress, setProgress] = useState(0)
  const [preview, setPreview]   = useState(null)
  const [rows, setRows]         = useState([])        // editable copy of validRows
  const [importResult, setResult] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const [editingIdx, setEditingIdx] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // ── Template download ────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const response = await transactionService.downloadExcelTemplate()
      const url = URL.createObjectURL(new Blob([response.data]))
      const a   = document.createElement('a')
      a.href = url; a.download = 'vousFin_import_template.xlsx'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { showError('Failed to download template') }
  }

  // ── File selected → upload & parse ──────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) { setPreview(null); setRows([]); setStep('idle'); return }
    setStep('uploading'); setProgress(0)
    try {
      const { data } = await transactionService.importExcel(file, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
      })
      const p = data.data
      setPreview(p)
      setRows(p.validRows ? [...p.validRows] : [])
      setStep('preview')
      showSuccess(`Parsed ${p.validCount} valid rows`)
    } catch (err) {
      showError(getErrorMessage(err))
      setStep('idle')
    } finally { setProgress(0) }
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  // ── Confirm → bulk save ──────────────────────────────────────────────────
  const confirmImport = async () => {
    if (!rows.length) return
    setStep('importing')
    try {
      const { data } = await transactionService.confirmExcel(rows)
      setResult(data.data)
      setStep('done')
      if (!data.data.failed?.length) showSuccess(`${data.data.successful} transactions imported`)
    } catch (err) {
      showError(getErrorMessage(err))
      setStep('preview')
    }
  }

  const reset = () => {
    setStep('idle'); setPreview(null); setRows([])
    setResult(null); setShowErrors(false); setProgress(0); setEditingIdx(null)
  }

  // Inline-edit helper
  const updateRow = (idx, field, value) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))

  // ── Done state ───────────────────────────────────────────────────────────
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
            <p className="mt-1 text-sm text-amber-700">{importResult.failed.length} row{importResult.failed.length !== 1 ? 's' : ''} could not be saved</p>
          )}
        </div>
        {importResult.failed?.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-xs font-semibold text-red-700">Failed rows:</p>
            <ul className="space-y-0.5 text-xs text-red-600">
              {importResult.failed.map((f, i) => <li key={i}>Row {f.row ?? '?'}: {f.error}</li>)}
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

  // ── Preview state ────────────────────────────────────────────────────────
  if ((step === 'preview' || step === 'importing') && preview) {
    const stats = preview.confidenceStats || {}
    const fi    = preview.fileInfo        || {}
    const dupes = preview.duplicatesFound || 0

    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard icon={CheckCircle} label="Valid rows"       value={rows.length}          green />
          <SummaryCard icon={XCircle}     label="Rows with errors" value={preview.invalidCount || 0} red />
        </div>

        {/* Confidence + format bar */}
        {(stats.high !== undefined || fi.format) && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {fi.format && <span className="font-mono uppercase text-slate-400">{fi.format}</span>}
            {stats.high   > 0 && <span className="text-emerald-600 font-medium">✓ {stats.high} High</span>}
            {stats.medium > 0 && <span className="text-amber-600 font-medium">~ {stats.medium} Medium</span>}
            {stats.low    > 0 && <span className="text-red-600 font-medium">! {stats.low} Low confidence</span>}
            {dupes        > 0 && <span className="text-amber-600 font-medium">⚠ {dupes} possible duplicate{dupes > 1 ? 's' : ''}</span>}
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Preview — {rows.length} row{rows.length !== 1 ? 's' : ''} · click description to edit
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-64">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500 border-b border-slate-200">
                  <tr>
                    {['Date', 'Description', 'Amount (PKR)', 'Debit', 'Credit', 'Conf.'].map(h => (
                      <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const isEditing = editingIdx === idx
                    return (
                      <tr key={idx} className={`${row.isDuplicate ? 'bg-amber-50' : ''} ${isEditing ? 'bg-cyan-50' : 'hover:bg-slate-50'}`}>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">
                          {isEditing ? (
                            <input type="date" className="w-28 rounded border border-slate-300 px-1 py-0.5 text-xs"
                              value={fmtDate(row.transactionDate)}
                              onChange={e => updateRow(idx, 'transactionDate', e.target.value)} />
                          ) : fmtDate(row.transactionDate)}
                        </td>
                        <td className="max-w-[160px] px-3 py-1.5 text-slate-700">
                          {isEditing ? (
                            <input autoFocus className="w-full rounded border border-blue-300 px-1 py-0.5 text-xs"
                              value={row.description || ''}
                              onChange={e => updateRow(idx, 'description', e.target.value)}
                              onBlur={() => setEditingIdx(null)}
                              onKeyDown={e => e.key === 'Enter' && setEditingIdx(null)} />
                          ) : (
                            <span className="block truncate cursor-text hover:text-blue-600"
                              title={[row.description, ...(row.warnings || [])].join('\n')}
                              onClick={() => setEditingIdx(idx)}>
                              {row.description}
                              {row.inferredFields?.length > 0 && <span className="ml-1 text-cyan-500" title={`AI inferred: ${row.inferredFields.join(', ')}`}>✦</span>}
                              {row.isDuplicate && <span className="ml-1 text-amber-500" title="Possible duplicate">⚠</span>}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-slate-800">
                          {isEditing ? (
                            <input type="number" className="w-24 rounded border border-slate-300 px-1 py-0.5 text-xs text-right"
                              value={row.amount}
                              onChange={e => updateRow(idx, 'amount', parseFloat(e.target.value) || 0)} />
                          ) : fmtAmt(row.amount)}
                        </td>
                        <td className="max-w-[100px] truncate px-3 py-1.5 text-slate-500">{row.debitAccountName || '—'}</td>
                        <td className="max-w-[100px] truncate px-3 py-1.5 text-slate-500">{row.creditAccountName || '—'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <ConfBadge label={row.confidenceLabel || 'High'} score={row.confidenceScore ?? 100} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-center text-[10px] text-slate-400">✦ AI-inferred field · ⚠ possible duplicate · click description to edit inline</p>
          </div>
        )}

        {/* Errors panel (collapsible) */}
        {preview.errors?.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-xs">
            <button type="button" onClick={() => setShowErrors(v => !v)}
              className="flex w-full items-center justify-between px-3 py-2 font-semibold text-red-700">
              <span>{preview.errors.length} validation error{preview.errors.length !== 1 ? 's' : ''}</span>
              {showErrors ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showErrors && (
              <ul className="max-h-52 divide-y divide-red-100 overflow-auto border-t border-red-200">
                {preview.errors.map((e, i) => (
                  <li key={i} className="px-3 py-1.5 text-red-600">
                    <span className="font-semibold">Row {e.row}</span>
                    {e.field && e.field !== 'general' && <span className="ml-1 rounded bg-red-100 px-1 font-mono text-red-500">{e.field}</span>}
                    {' '}{e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={reset} disabled={step === 'importing'}>Cancel</Button>
          <Button
            onClick={confirmImport}
            loading={step === 'importing'}
            disabled={!rows.length}
            className="flex-1"
          >
            Import {rows.length} transaction{rows.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    )
  }

  // ── Idle / Upload state ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Need the import format?</p>
          <p className="text-xs text-slate-500">Download the template with column headers and example rows</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleDownloadTemplate} className="flex-shrink-0 text-xs">
          Template
        </Button>
      </div>

      {/* Drag & drop zone */}
      {(step === 'idle' || step === 'uploading') && (
        <>
          <div
            className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {step === 'uploading' ? (
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            ) : (
              <Upload className="h-10 w-10 text-slate-400" />
            )}
            <div className="text-center">
              <p className="font-medium text-slate-700">Drop file here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">.xlsx · .xls · .csv — max 10 MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
          {step === 'uploading' && progress > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </>
      )}

      {/* Column guide */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        <p className="font-medium text-slate-600 mb-0.5">Required columns (fuzzy-matched, any order):</p>
        <p className="font-mono">date · description · amount · debit account · credit account</p>
        <p className="font-mono mt-0.5 text-[10px] text-slate-400">Optional: type · mode · customer · vendor · reference · notes</p>
      </div>
    </div>
  )
}
