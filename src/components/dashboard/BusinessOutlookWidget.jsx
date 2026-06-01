/**
 * BusinessOutlookWidget — H3
 *
 * Forward-looking companion to BusinessHealthWidget. Shows where the business is
 * HEADED (not just where it is), from GET /ai/health-outlook:
 *   - projected cash runway (with downside/upside range)
 *   - forward health score
 *   - projected net margin vs current (direction)
 *   - proactive signals (cash shortfall / revenue decline / margin compression)
 *
 * Honest: renders an "insufficient" state when history is too short to forecast,
 * and a confidence chip derived from interval width + data sufficiency.
 */
import { memo } from 'react'
import {
  TrendingUp, TrendingDown, Minus, Gauge, Telescope,
  AlertTriangle, Zap, Info, CheckCircle2,
} from 'lucide-react'
import { useHealthOutlook } from '@/hooks/useAI'

const CONFIDENCE_META = {
  high:   { label: 'High confidence',   color: '#34d399' },
  medium: { label: 'Medium confidence', color: '#fbbf24' },
  low:    { label: 'Low confidence',    color: '#fb923c' },
}

const SIGNAL_META = {
  critical: { color: '#f87171', Icon: Zap },
  warning:  { color: '#fbbf24', Icon: AlertTriangle },
  info:     { color: '#60a5fa', Icon: Info },
}

function scoreColor(s) {
  return s >= 75 ? '#34d399' : s >= 55 ? '#fbbf24' : '#f87171'
}

function Stat({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
      {children}
      {hint && <p className="text-[10px] text-text-muted truncate">{hint}</p>}
    </div>
  )
}

const BusinessOutlookWidget = memo(function BusinessOutlookWidget({ horizon = 6 }) {
  const { data, isLoading } = useHealthOutlook(horizon)

  const insufficient = data && data.insufficient
  const conf = data?.confidence ? CONFIDENCE_META[data.confidence] : null

  return (
    <div className="premium-card p-5">
      {/* header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-400/15">
            <Telescope className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Forward Outlook</h3>
            <p className="text-[11px] text-text-muted">
              Next {data?.horizonMonths || horizon} months · projected from your forecast
            </p>
          </div>
        </div>
        {!isLoading && !insufficient && conf && (
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide flex-shrink-0"
            style={{ backgroundColor: `${conf.color}22`, color: conf.color }}
          >
            {conf.label}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}
        </div>
      ) : insufficient ? (
        <div className="flex items-center gap-3 py-4 px-2 text-text-muted">
          <Telescope className="h-5 w-5 flex-shrink-0 opacity-60" />
          <p className="text-xs leading-relaxed">
            {data.message || 'Not enough history to project an outlook yet. Record a few more months of revenue and expense data.'}
          </p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Runway */}
            <Stat
              label="Projected runway"
              hint={
                data.runway.survivesHorizon
                  ? `Stays positive ${data.horizonMonths}mo+`
                  : data.runway.pessimistic != null
                    ? `Range ${data.runway.pessimistic}–${data.runway.optimistic ?? '∞'} mo`
                    : undefined
              }
            >
              <div className="flex items-baseline gap-1">
                <span
                  className="text-2xl font-black leading-none"
                  style={{ color: data.runway.survivesHorizon ? '#34d399' : data.runway.months <= 2 ? '#f87171' : '#fbbf24' }}
                >
                  {data.runway.survivesHorizon ? `${data.horizonMonths}+` : data.runway.months}
                </span>
                <span className="text-[11px] text-text-muted font-semibold">months</span>
              </div>
            </Stat>

            {/* Forward health */}
            <Stat label="Forward health" hint={data.forwardHealth.level || undefined}>
              <div className="flex items-center gap-1.5">
                <Gauge className="h-4 w-4" style={{ color: scoreColor(data.forwardHealth.overall) }} />
                <span className="text-2xl font-black leading-none" style={{ color: scoreColor(data.forwardHealth.overall) }}>
                  {data.forwardHealth.overall ?? '—'}
                </span>
                <span className="text-[11px] text-text-muted font-semibold">/100</span>
              </div>
            </Stat>

            {/* Projected margin */}
            <Stat
              label="Projected margin"
              hint={data.margin.currentPct != null ? `Now ${data.margin.currentPct}%` : undefined}
            >
              <div className="flex items-center gap-1.5">
                <MarginArrow delta={data.margin.deltaPct} />
                <span className="text-2xl font-black leading-none text-text-primary">
                  {data.margin.projectedPct != null ? `${data.margin.projectedPct}%` : '—'}
                </span>
              </div>
            </Stat>
          </div>

          {/* signals */}
          {Array.isArray(data.signals) && data.signals.length > 0 && (
            <div className="mt-4 pt-3 border-t border-glass space-y-2">
              {data.signals.map((s, i) => {
                const meta = SIGNAL_META[s.level] || SIGNAL_META.info
                return (
                  <div key={s.id || i} className="flex items-start gap-2">
                    <meta.Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: meta.color }} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: meta.color }}>{s.title}</p>
                      <p className="text-[11px] text-text-secondary leading-snug">{s.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 py-4 px-2 text-text-muted">
          <CheckCircle2 className="h-4 w-4 opacity-60" />
          <p className="text-xs">Outlook unavailable right now.</p>
        </div>
      )}
    </div>
  )
})

function MarginArrow({ delta }) {
  if (delta == null || Math.abs(delta) < 0.1) return <Minus className="h-4 w-4 text-text-muted" />
  return delta > 0
    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
    : <TrendingDown className="h-4 w-4 text-red-400" />
}

export default BusinessOutlookWidget
