/**
 * AdvisoryCard — one legal tax-optimization advisory (FR-04.2).
 * Plain-language title + a prominent estimated saving, a one-line explanation,
 * an expandable legal basis, and a prominent risk warning on review-level items.
 */
import { useState } from 'react'
import { Lightbulb, ChevronDown, ShieldAlert, Scale } from 'lucide-react'
import { compactMoney } from './taxFormat'
import { cn } from '@/utils/cn'

const TAX_LABEL = { GST: 'Sales tax', WHT: 'Tax withheld', INCOME_TAX: 'Income tax', EOBI: 'EOBI', SESSI: 'SESSI' }

export default function AdvisoryCard({ advisory, currency = 'PKR' }) {
  const [open, setOpen] = useState(false)
  const review = advisory.riskLevel === 'review'

  return (
    <div className="premium-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-positive/12 shrink-0">
            <Lightbulb className="h-4 w-4 text-positive" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary leading-tight">{advisory.title}</h3>
            <span className="text-[11.5px] text-text-muted uppercase tracking-wide">
              {TAX_LABEL[advisory.taxType] || advisory.taxType}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-positive/12 text-positive text-[12.5px] font-bold px-2.5 py-1">
          Save ~<span className="num">{compactMoney(advisory.estimatedSavingPKR, currency)}</span>
        </span>
      </div>

      <p className="text-[13px] text-text-secondary leading-relaxed">{advisory.explanation}</p>

      {review && advisory.riskWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-negative/30 bg-negative-muted px-3 py-2">
          <ShieldAlert className="h-3.5 w-3.5 text-negative shrink-0 mt-0.5" />
          <p className="text-[12px] text-negative leading-snug">{advisory.riskWarning}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-semibold text-text-muted hover:text-cyan transition-colors"
        aria-expanded={open}
      >
        <Scale className="h-3.5 w-3.5" /> Legal basis
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="text-[12.5px] text-text-secondary border-l-2 border-glass pl-3">{advisory.legalRef}</p>
      )}
    </div>
  )
}
