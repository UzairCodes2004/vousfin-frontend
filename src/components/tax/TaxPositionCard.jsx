/**
 * TaxPositionCard — one tax type's live position (FR-04.1, Phase 4).
 * Plain headline number for non-experts, a deadline countdown, a 6-snapshot
 * sparkline, and honest captions (income tax is clearly flagged an estimate).
 */
import { Link } from 'react-router-dom'
import { Percent, Scissors, Landmark, Users, ShieldCheck, Plus, ArrowUpRight } from 'lucide-react'
import DeadlineCountdown from './DeadlineCountdown'
import TaxTrendSparkline from './TaxTrendSparkline'
import { compactMoney } from './taxFormat'

const TAX_META = {
  GST:        { icon: Percent,     varName: '--chart-revenue', blurb: 'Sales tax collected, minus what you paid' },
  WHT:        { icon: Scissors,    varName: '--chart-cash',    blurb: 'Tax held back from supplier payments' },
  INCOME_TAX: { icon: Landmark,    varName: '--chart-profit',  blurb: 'Estimated from your profit', estimate: true },
  EOBI:       { icon: Users,       varName: '--chart-neutral', blurb: 'Employer social-security (EOBI)' },
  SESSI:      { icon: ShieldCheck, varName: '--chart-neutral', blurb: 'Provincial social-security' },
}

export default function TaxPositionCard({ tax, series = [], currency = 'PKR', onAddPayroll }) {
  const meta  = TAX_META[tax.taxType] || { icon: Landmark, varName: '--chart-neutral', blurb: '' }
  const Icon  = meta.icon
  const color = `rgb(var(${meta.varName}))`
  const tint  = `rgb(var(${meta.varName}) / 0.12)`

  const tracked    = tax.status !== 'not_tracked'
  const isPayroll  = tax.taxType === 'EOBI' || tax.taxType === 'SESSI'
  // Only let the deadline show urgency colour when money is actually owed.
  const owesSomething = tracked && (tax.refundable || tax.liability > 0)

  return (
    <div className="premium-card p-5 flex flex-col gap-3.5 relative overflow-hidden">
      {/* accent hairline */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl shrink-0" style={{ background: tint }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary leading-tight truncate">{tax.label}</h3>
            <p className="text-[12px] text-text-muted leading-tight">
              {tax.nextDeadline?.returnType || meta.blurb}
            </p>
          </div>
        </div>
        {!tracked && (
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-text-muted
            bg-glass-panel border border-glass rounded-full px-2 py-0.5">
            Not tracked
          </span>
        )}
      </div>

      {/* headline */}
      <div>
        {tracked ? (
          tax.refundable ? (
            <>
              <p className="num text-[1.55rem] font-semibold text-positive leading-none">
                {compactMoney(Math.abs(tax.raw ?? tax.liability), currency)}
              </p>
              <p className="text-[12px] text-positive/80 mt-1 font-medium">Refund due</p>
            </>
          ) : (
            <>
              <p className="num text-[1.55rem] font-semibold text-text-primary leading-none">
                {compactMoney(tax.liability, currency)}
              </p>
              <p className="text-[12px] text-text-muted mt-1">
                {meta.estimate
                  ? 'Estimated from your profit so far this year'
                  : tax.liability > 0 ? 'To pay this period' : 'Nothing due right now'}
              </p>
            </>
          )
        ) : (
          <>
            <p className="num text-[1.55rem] font-semibold text-text-muted/70 leading-none">—</p>
            <p className="text-[12px] text-text-muted mt-1">
              {isPayroll ? 'Turn on payroll to track EOBI/SESSI' : 'Estimate not available yet'}
            </p>
          </>
        )}
      </div>

      {/* deadline */}
      <DeadlineCountdown deadline={tax.nextDeadline} muted={!owesSomething} />

      {/* sparkline */}
      <TaxTrendSparkline series={series} color={color} currency={currency} />

      {/* contextual action */}
      {isPayroll && tracked && onAddPayroll && (
        <button
          type="button"
          onClick={() => onAddPayroll(tax.taxType)}
          className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-semibold text-cyan hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Record this month
        </button>
      )}
      {isPayroll && !tracked && (
        <Link to="/settings/tax"
          className="inline-flex items-center gap-1 self-start text-[12.5px] font-semibold text-text-muted hover:text-cyan transition-colors">
          Enable in Tax Engine <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
