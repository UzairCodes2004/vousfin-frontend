/**
 * TaxAutopilotPage — the live tax position destination (FR-04.1, Phase 4).
 *
 * Reads top-to-bottom: what you owe now + when it's due (hero), then a card per
 * tax type with a deadline countdown and a 6-month sparkline. Auto-loads and
 * refreshes within seconds of any posting (the ['tax'] query is invalidated by
 * transaction mutations).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Settings2, RefreshCw, Sparkles } from 'lucide-react'

import { useTaxPosition, useTaxTrend } from '@/hooks/useTax'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatDate } from '@/utils/formatters'

import TaxPositionCard   from '@/components/tax/TaxPositionCard'
import DeadlineCountdown from '@/components/tax/DeadlineCountdown'
import PayrollAccrualModal from '@/components/tax/PayrollAccrualModal'
import { compactMoney, deadlineTone } from '@/components/tax/taxFormat'
import { cn } from '@/utils/cn'

/* ── Hero: the single most urgent obligation, or an all-clear ──────────── */
function ObligationHero({ taxes, totalPayable, currency }) {
  const due = taxes
    .filter(t => t.status === 'tracked' && t.nextDeadline && t.liability > 0)
    .sort((a, b) => a.nextDeadline.daysRemaining - b.nextDeadline.daysRemaining)
  const top  = due[0]
  const tone = deadlineTone(top?.nextDeadline?.daysRemaining)

  return (
    <div className="premium-card p-6 relative overflow-hidden">
      {/* ambient glow in the urgency tone */}
      <div aria-hidden
        className={cn('absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl opacity-[0.12] pointer-events-none', tone.dot)} />

      {top ? (
        <>
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold uppercase tracking-widest text-text-muted mb-2">Next obligation</p>
              <h2 className="text-xl font-semibold text-text-primary leading-tight">{top.label}</h2>
              <div className="mt-2.5">
                <DeadlineCountdown deadline={top.nextDeadline} />
              </div>
            </div>
            <div className="lg:text-right shrink-0">
              <p className="num text-[2.2rem] sm:text-[2.6rem] font-semibold text-text-primary leading-none tracking-tight">
                {compactMoney(top.liability, currency)}
              </p>
              <p className="text-[12.5px] text-text-muted mt-1.5">
                {top.nextDeadline.returnType} · payable
              </p>
            </div>
          </div>

          <div className="relative mt-5 pt-4 border-t border-glass flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[12.5px] text-text-secondary">
              Total tax position{' '}
              <span className="num font-semibold text-text-primary">{compactMoney(totalPayable, currency)}</span>
            </span>
            <span className="text-[12px] text-text-muted inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Includes an income-tax estimate
            </span>
          </div>
        </>
      ) : (
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-positive-muted">
            <ShieldCheck className="h-6 w-6 text-positive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">You're all clear</h2>
            <p className="text-[13px] text-text-muted mt-0.5">No tax is payable right now. We'll surface obligations as they accrue.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="premium-card p-6">
      <div className="h-3 w-28 rounded bg-glass-panel animate-pulse" />
      <div className="mt-3 h-7 w-48 rounded bg-glass-panel animate-pulse" />
      <div className="mt-3 h-9 w-40 rounded bg-glass-panel animate-pulse" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function TaxAutopilotPage() {
  const { currency: storeCurrency } = useBusinessStore()
  const { data: position, isLoading, isError, isFetching, refetch } = useTaxPosition()
  const { data: trend } = useTaxTrend(6)

  const [payrollOpen, setPayrollOpen] = useState(false)
  const [payrollFocus, setPayrollFocus] = useState('EOBI')

  const currency = position?.currency || storeCurrency || 'PKR'
  const taxes    = position?.taxes || []

  /* Per-tax sparkline series extracted from the snapshot trend. */
  const seriesFor = useMemo(() => {
    const points = trend?.points || []
    return (taxType) => points.map(p => ({
      date:  p.date,
      value: (p.taxes?.find(x => x.taxType === taxType)?.liability) ?? 0,
    }))
  }, [trend])

  const openPayroll = (taxType) => { setPayrollFocus(taxType); setPayrollOpen(true) }

  return (
    <div className="animate-fade-in pb-10 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Tax Autopilot</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your live tax position — what you owe, and when it's due.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {position?.asOf && (
            <span className="text-[12px] text-text-muted hidden sm:inline">
              Updated {formatDate(position.asOf, 'd MMM, h:mm a')}
            </span>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-glass text-text-muted hover:text-cyan hover:border-cyan/40 transition-colors"
            aria-label="Refresh tax position"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <HeroSkeleton />
      ) : isError ? (
        <div className="premium-card p-6 text-center">
          <p className="text-sm text-negative font-medium">Couldn't load your tax position.</p>
          <button onClick={() => refetch()} className="mt-2 text-sm text-cyan font-semibold hover:underline">Try again</button>
        </div>
      ) : (
        <ObligationHero taxes={taxes} totalPayable={position?.totalPayable ?? 0} currency={currency} />
      )}

      {/* ── Per-tax cards ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[12.5px] font-bold uppercase tracking-widest text-text-muted">By tax type</span>
          <div className="flex-1 h-px bg-glass" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="premium-card p-5 h-52 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-rise">
            {taxes.map(tax => (
              <TaxPositionCard
                key={tax.taxType}
                tax={tax}
                series={seriesFor(tax.taxType)}
                currency={currency}
                onAddPayroll={openPayroll}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer link to the engine ──────────────────────────────── */}
      <Link
        to="/settings/tax"
        className="inline-flex items-center gap-2 text-[13px] text-text-muted hover:text-cyan transition-colors"
      >
        <Settings2 className="h-4 w-4" />
        Configure tax rates, registration & income-tax rate in the Tax Engine
      </Link>

      <PayrollAccrualModal isOpen={payrollOpen} onClose={() => setPayrollOpen(false)} focus={payrollFocus} />
    </div>
  )
}
