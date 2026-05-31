/**
 * ForecastCard — Stage A3.
 * One trustworthy screen: the prediction + range, a confidence badge, the
 * measured accuracy ("based on your last N months, ~Y% accurate"), and the top
 * plain-English reasons. Honest empty state when there isn't enough data — it
 * never shows a fake precise number.
 */
import { TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Info, Sparkles } from 'lucide-react'
import { useForecastCard } from '@/hooks/useForecastRegistry'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'

const LABEL_STYLE = {
  High:         { cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5', Icon: ShieldCheck },
  Medium:       { cls: 'text-amber-400 border-amber-500/30 bg-amber-500/5',       Icon: ShieldCheck },
  Low:          { cls: 'text-rose-400 border-rose-500/30 bg-rose-500/5',          Icon: AlertTriangle },
  Insufficient: { cls: 'text-text-muted border-border bg-bg-subtle',              Icon: Info },
}

export default function ForecastCard({ target = 'Revenue', horizon = 6 }) {
  const currency = useBusinessStore((s) => s.currency)
  const { ensemble, score, explain, isLoading } = useForecastCard(target, horizon)

  if (isLoading) {
    return <div className="premium-card p-5 animate-pulse h-40" aria-busy="true" />
  }

  const insufficient = !ensemble || ensemble.insufficient || !ensemble.predicted?.length || score?.label === 'Insufficient'
  if (insufficient) {
    return (
      <div className="premium-card p-5 border-border bg-bg-subtle">
        <div className="flex items-center gap-2 text-text-primary font-semibold">
          <Info className="h-4 w-4 text-cyan" /> {target} forecast
        </div>
        <p className="mt-2 text-sm text-text-muted">
          {score?.basis || 'Record a few months of transactions to unlock AI forecasting for your business.'}
        </p>
      </div>
    )
  }

  const next = ensemble.predicted[0]
  const lo = ensemble.lower?.[0]
  const hi = ensemble.upper?.[0]
  const label = score?.label || 'Medium'
  const { cls, Icon } = LABEL_STYLE[label] || LABEL_STYLE.Medium
  const lastActual = explain?.drivers?.[0]?.feature
  const up = lastActual != null ? next >= lastActual : true
  const TrendIcon = up ? TrendingUp : TrendingDown

  return (
    <div className="premium-card p-5 space-y-4">
      {/* headline */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">Next period {target.toLowerCase()}</div>
          <div className="mt-1 flex items-center gap-2">
            <TrendIcon className={cn('h-5 w-5', up ? 'text-emerald-400' : 'text-rose-400')} />
            <span className="text-2xl font-bold text-text-primary font-mono">{formatCurrency(next, currency)}</span>
          </div>
          {lo != null && hi != null && (
            <div className="mt-1 text-xs text-text-muted font-mono">
              range {formatCurrency(lo, currency)} – {formatCurrency(hi, currency)}
            </div>
          )}
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shrink-0', cls)}>
          <Icon className="h-4 w-4" /> {label} confidence
        </span>
      </div>

      {/* measured accuracy — honest, never asserted */}
      {score?.accuracyPct != null && (
        <div className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{score.accuracyPct}% accurate</span>
          {' · '}{score.basis}
          {ensemble.coverageTarget ? ` · ${ensemble.coverageTarget}% prediction interval` : ''}
        </div>
      )}

      {/* top reasons */}
      {explain?.narrative && (
        <div className="rounded-lg bg-bg-subtle border border-border p-3 text-sm text-text-secondary flex gap-2">
          <Sparkles className="h-4 w-4 text-cyan shrink-0 mt-0.5" />
          <span>{explain.narrative}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
        {ensemble.modelType && <span>Model: {ensemble.modelType}</span>}
        {score?.confidence != null && <span>Confidence score: {score.confidence}/100</span>}
        {ensemble.baselineGate?.gatePassed != null && (
          <span>{ensemble.baselineGate.gatePassed ? '✓ beats naive baseline' : '⚠ baseline fallback'}</span>
        )}
      </div>
    </div>
  )
}
