/**
 * ReturnFilingWizard — one-click return filing (FR-04.3).
 * Three plain-language steps: Review (auto-prepared summary) → Checks (FBR
 * validation; each error shows its fix; File is blocked until it passes) → File
 * (single confirm → IRIS ack, or download the FBR XML on the fallback path).
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, Download, FileCheck2, Loader2 } from 'lucide-react'
import Modal from '@/components/modals/Modal'
import Button from '@/components/ui/Button'
import taxService from '@/services/tax.service'
import { usePrepareReturn, useValidateReturn, useSubmitReturn } from '@/hooks/useTax'
import { compactMoney } from './taxFormat'
import toast from 'react-hot-toast'

const periodLabel = (p) => {
  if (!p) return ''
  if (!p.month) return `FY ${p.year}`
  return new Date(p.year, p.month - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' })
}

/* Plain-language one-liner per return type. */
function headline(ret, currency) {
  const f = ret?.data?.fields || {}
  if (ret?.returnType === 'GST-01')  return `You'll file ${compactMoney(f.netPayable, currency)} sales tax for ${periodLabel(ret.period)}.`
  if (ret?.returnType === 'WHT-165') return `Tax held back: ${compactMoney(f.totalWithheld, currency)} from ${f.vendorCount || 0} supplier(s) for ${periodLabel(ret.period)}.`
  if (ret?.returnType === 'IT-RETURN') return `Income tax for ${periodLabel(ret.period)}: ${compactMoney(f.balancePayable, currency)} to pay.`
  return `${ret?.returnType} for ${periodLabel(ret?.period)}.`
}

function SummaryRows({ ret, currency }) {
  const f = ret?.data?.fields || {}
  const rows = ret?.returnType === 'GST-01'
    ? [['Sales tax collected', f.outputTax], ['Sales tax paid', f.inputTax], ['Net to pay', f.netPayable]]
    : ret?.returnType === 'WHT-165'
    ? [['Suppliers', f.vendorCount], ['Total held back', f.totalWithheld]]
    : ret?.returnType === 'IT-RETURN'
    ? [['Taxable income', f.taxableIncome], ['Tax due', f.taxChargeable], ['Tax already paid', f.advanceTaxAdjusted], ['Balance to pay', f.balancePayable]]
    : []
  return (
    <dl className="mt-3 rounded-xl border border-glass divide-y divide-glass">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between px-3.5 py-2.5">
          <dt className="text-[12.5px] text-text-muted">{k}</dt>
          <dd className="num text-sm font-semibold text-text-primary">
            {k === 'Suppliers' ? (v ?? 0) : compactMoney(v, currency)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const STEPS = ['review', 'checks', 'file']

export default function ReturnFilingWizard({ isOpen, onClose, returnType, period, currency = 'PKR' }) {
  const prepare  = usePrepareReturn()
  const validate = useValidateReturn()
  const submit   = useSubmitReturn()

  const [step, setStep] = useState('review')
  const [ret, setRet]   = useState(null)
  const [validation, setValidation] = useState(null)
  const [filed, setFiled] = useState(null)

  // Auto-prepare from the GL when the wizard opens. The wizard remounts per open
  // (its parent renders it conditionally), so state starts fresh each time.
  useEffect(() => {
    let alive = true
    prepare.mutateAsync({ returnType, period }).then(r => { if (alive) setRet(r) }).catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnType, period?.year, period?.month])

  const runChecks = async () => {
    const updated = await validate.mutateAsync(ret._id)
    setRet(updated); setValidation(updated.validation); setStep('checks')
  }

  const downloadXml = async () => {
    try {
      const resp = await taxService.exportReturn(ret._id)
      const url = URL.createObjectURL(resp.data)
      const a = document.createElement('a')
      a.href = url; a.download = `${returnType}-${period.year}${period.month ? '-' + String(period.month).padStart(2, '0') : ''}.xml`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { toast.error('Could not download XML') }
  }

  const file = async () => {
    const res = await submit.mutateAsync(ret._id)
    setFiled(res); setStep('file')
    if (res.mode === 'xml') downloadXml()
  }

  const errors   = validation?.errors?.filter(e => e.severity === 'error') || []
  const warnings = validation?.errors?.filter(e => e.severity === 'warning') || []
  const canFile  = validation?.passed

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`File ${returnType} · ${periodLabel(period)}`} className="sm:max-w-lg">
      {/* step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <span className={`h-1.5 flex-1 rounded-full ${STEPS.indexOf(step) >= i ? 'bg-cyan' : 'bg-glass-panel'}`} />
          </div>
        ))}
      </div>

      {/* ── Review ── */}
      {step === 'review' && (
        <div>
          {prepare.isPending || !ret ? (
            <div className="flex items-center gap-2 text-sm text-text-muted py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Compiling from your ledger…
            </div>
          ) : (
            <>
              <p className="text-sm text-text-primary font-medium">{headline(ret, currency)}</p>
              <p className="text-[12.5px] text-text-muted mt-0.5">Compiled automatically from your books — no manual entry.</p>
              <SummaryRows ret={ret} currency={currency} />
              <div className="flex justify-end gap-3 pt-5">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={runChecks} loading={validate.isPending}>Run pre-filing checks</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Checks ── */}
      {step === 'checks' && (
        <div>
          {errors.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-positive/25 bg-positive/8 p-3">
              <CheckCircle2 className="h-4 w-4 text-positive shrink-0 mt-0.5" />
              <p className="text-[13px] text-text-primary">All FBR checks passed — this return is ready to file.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12.5px] font-bold uppercase tracking-wider text-negative">{errors.length} issue(s) to fix before filing</p>
              {errors.map((e) => (
                <div key={e.code} className="rounded-lg border border-negative/30 bg-negative-muted p-3">
                  <p className="text-[13px] font-semibold text-negative flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {e.message}</p>
                  <p className="text-[12.5px] text-text-secondary mt-1">{e.fix}</p>
                </div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="mt-2 space-y-2">
              {warnings.map((w) => (
                <div key={w.code} className="rounded-lg border border-amber/25 bg-amber/8 p-2.5">
                  <p className="text-[12.5px] text-amber font-medium">{w.message}</p>
                  <p className="text-[12px] text-text-muted mt-0.5">{w.fix}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between gap-3 pt-5">
            <Button variant="ghost" onClick={() => setStep('review')}>Back</Button>
            <Button onClick={file} loading={submit.isPending} disabled={!canFile}>File now</Button>
          </div>
        </div>
      )}

      {/* ── File ── */}
      {step === 'file' && (
        <div className="py-2">
          <div className="flex items-start gap-2.5 rounded-xl border border-positive/25 bg-positive/8 p-3">
            <FileCheck2 className="h-4 w-4 text-positive shrink-0 mt-0.5" />
            <div>
              {filed?.mode === 'iris' ? (
                <>
                  <p className="text-[13px] font-semibold text-text-primary">Filed with FBR</p>
                  <p className="text-[12.5px] text-text-secondary mt-0.5">Acknowledgment <span className="num font-semibold">{filed.ackNumber}</span> — recorded in your audit trail.</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-text-primary">FBR-compatible XML downloaded</p>
                  <p className="text-[12.5px] text-text-secondary mt-0.5">Upload it to FBR IRIS to complete filing. (Live IRIS submission activates once credentials are set.)</p>
                </>
              )}
            </div>
          </div>
          <div className="flex justify-between gap-3 pt-5">
            {filed?.mode !== 'iris' && (
              <Button variant="ghost" onClick={downloadXml}><Download className="h-3.5 w-3.5 mr-1.5" /> Download again</Button>
            )}
            <Button onClick={onClose} className="ml-auto">Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
