/**
 * ReturnsQueue — the returns you can file now (FR-04.3).
 * One row per filing obligation for the current cycle, showing its status and
 * deadline, with a single CTA that opens the one-click filing wizard.
 */
import { useState } from 'react'
import { FileText, ArrowRight } from 'lucide-react'
import { useTaxReturns } from '@/hooks/useTax'
import DeadlineCountdown from './DeadlineCountdown'
import ReturnFilingWizard from './ReturnFilingWizard'
import { cn } from '@/utils/cn'

const RETURN_DEFS = [
  { returnType: 'GST-01',    taxType: 'GST',        label: 'Sales Tax Return (GST-01)' },
  { returnType: 'WHT-165',   taxType: 'WHT',        label: 'Withholding Statement (165)' },
  { returnType: 'IT-RETURN', taxType: 'INCOME_TAX', label: 'Income Tax Return' },
]

const STATUS_PILL = {
  'not started': 'bg-glass-panel border-glass text-text-muted',
  draft:         'bg-glass-panel border-glass text-text-secondary',
  validated:     'bg-cyan/10 border-cyan/25 text-cyan',
  submitted:     'bg-amber/15 border-amber/30 text-amber',
  filed:         'bg-positive/12 border-positive/30 text-positive',
  rejected:      'bg-negative-muted border-negative/30 text-negative',
}

const periodLabel = (p) => (!p ? '' : !p.month ? `FY ${p.year}` : new Date(p.year, p.month - 1, 1).toLocaleString('en', { month: 'short', year: 'numeric' }))

/** Period a return covers, from its filing deadline (mirrors the auto-prepare job). */
function periodFor(returnType, dueDate) {
  const d = new Date(dueDate)
  if (returnType === 'IT-RETURN') return { year: d.getFullYear() }
  const dm = d.getMonth()
  return { year: dm === 0 ? d.getFullYear() - 1 : d.getFullYear(), month: dm === 0 ? 12 : dm }
}

const samePeriod = (a, b) => a && b && a.year === b.year && (a.month || null) === (b.month || null)

export default function ReturnsQueue({ taxes = [], currency = 'PKR' }) {
  const { data: returns = [] } = useTaxReturns()
  const [wizard, setWizard] = useState(null)   // { returnType, period }

  const rows = RETURN_DEFS.map((def) => {
    const tax = taxes.find(t => t.taxType === def.taxType)
    const deadline = tax?.nextDeadline || null
    const period = deadline?.dueDate ? periodFor(def.returnType, deadline.dueDate) : null
    const existing = returns.find(r => r.returnType === def.returnType && samePeriod(r.period, period))
    return { ...def, deadline, period, status: existing?.status || 'not started' }
  }).filter(r => r.period)

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[12.5px] font-bold uppercase tracking-widest text-text-muted">File your returns</span>
        <div className="flex-1 h-px bg-glass" />
      </div>

      <div className="premium-card divide-y divide-glass overflow-hidden">
        {rows.map((r) => (
          <div key={r.returnType} className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-xl bg-glass-panel shrink-0"><FileText className="h-4 w-4 text-text-secondary" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary leading-tight truncate">{r.label}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[12px] text-text-muted">{periodLabel(r.period)}</span>
                <span className={cn('text-[11px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5', STATUS_PILL[r.status])}>
                  {r.status}
                </span>
              </div>
            </div>
            <DeadlineCountdown deadline={r.deadline} muted={r.status === 'filed'} className="hidden sm:inline-flex" />
            {r.status === 'filed' ? (
              <span className="text-[12.5px] font-semibold text-positive shrink-0">Filed ✓</span>
            ) : (
              <button
                type="button"
                onClick={() => setWizard({ returnType: r.returnType, period: r.period })}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-cyan hover:gap-2 transition-all shrink-0"
              >
                {r.status === 'validated' ? 'Review & file' : 'Prepare & file'} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {wizard && (
        <ReturnFilingWizard
          isOpen={!!wizard}
          onClose={() => setWizard(null)}
          returnType={wizard.returnType}
          period={wizard.period}
          currency={currency}
        />
      )}
    </div>
  )
}
