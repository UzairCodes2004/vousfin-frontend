/**
 * TaxPositionWidget — compact homepage view of the live tax position (FR-04.1).
 * Leads with the single most-urgent obligation (the actionable bit), links to
 * the full Tax Autopilot page. Reuses the always-on ['tax'] position query, so
 * it refreshes within seconds of any posting.
 */
import { Link } from 'react-router-dom'
import { Scale, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useTaxPosition } from '@/hooks/useTax'
import { useBusinessStore } from '@/stores/useBusinessStore'
import DeadlineCountdown from '@/components/tax/DeadlineCountdown'
import { compactMoney } from '@/components/tax/taxFormat'

export default function TaxPositionWidget() {
  const { currency: storeCurrency } = useBusinessStore()
  const { data: position, isLoading, isError } = useTaxPosition()

  if (isError) return null  // never clutter the dashboard on failure

  if (isLoading) {
    return <div className="premium-card p-4 sm:p-5 h-[76px] animate-pulse" />
  }

  const currency = position?.currency || storeCurrency || 'PKR'
  const due = (position?.taxes || [])
    .filter(t => t.status === 'tracked' && t.nextDeadline && t.liability > 0)
    .sort((a, b) => a.nextDeadline.daysRemaining - b.nextDeadline.daysRemaining)
  const top = due[0]

  return (
    <Link
      to="/tax"
      className="premium-card p-4 sm:p-5 flex items-center justify-between gap-4 group
        hover:border-cyan/35 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 rounded-xl bg-cyan/12 shrink-0">
          {top ? <Scale className="h-5 w-5 text-cyan" /> : <ShieldCheck className="h-5 w-5 text-positive" />}
        </div>
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold uppercase tracking-widest text-text-muted">Tax Autopilot</p>
          {top ? (
            <p className="text-sm font-semibold text-text-primary leading-tight truncate">
              {top.label} · <span className="num">{compactMoney(top.liability, currency)}</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-text-primary leading-tight">You're all clear</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {top
          ? <DeadlineCountdown deadline={top.nextDeadline} className="hidden sm:inline-flex" />
          : <span className="text-[12.5px] text-text-muted hidden sm:inline">Nothing due</span>}
        <ArrowUpRight className="h-4 w-4 text-text-muted group-hover:text-cyan transition-colors" />
      </div>
    </Link>
  )
}
