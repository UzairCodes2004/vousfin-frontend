/**
 * AIInsightsPanel — Phase 5.6
 * AI Financial Insights center-piece with severity sorting, expandable cards, and refresh.
 */
import { useState } from 'react'
import {
  Brain, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ChevronDown, ChevronUp, ArrowRight, RefreshCw, Zap,
} from 'lucide-react'
import { useFinancialInsights } from '@/hooks/useAI'
import { cn } from '@/utils/cn'

/* ── Severity config ──────────────────────────────────────────────── */
const SEV = {
  critical: {
    Icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/25',
    badge: 'bg-red-400/20 text-red-300',
    dot: 'bg-red-400',
    label: 'Critical',
  },
  warning: {
    Icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/25',
    badge: 'bg-amber-400/20 text-amber-300',
    dot: 'bg-amber-400',
    label: 'Warning',
  },
  info: {
    Icon: Info,
    color: 'text-cyan',
    bg: 'bg-cyan/10',
    border: 'border-cyan/25',
    badge: 'bg-cyan/20 text-cyan',
    dot: 'bg-cyan',
    label: 'Info',
  },
  success: {
    Icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/25',
    badge: 'bg-emerald-400/20 text-emerald-300',
    dot: 'bg-emerald-400',
    label: 'Good',
  },
}

const PRIORITY = { critical: 0, warning: 1, info: 2, success: 3 }

/* ── Single insight card ──────────────────────────────────────────── */
function InsightCard({ insight, idx }) {
  const [open, setOpen] = useState(false)
  const sev = insight.severity || insight.type || 'info'
  const cfg = SEV[sev] || SEV.info

  return (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      className={cn(
        'w-full text-left border rounded-xl p-3.5 transition-all duration-200 group',
        cfg.bg, cfg.border,
        open && 'shadow-lg ring-1 ring-current/20',
      )}
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* icon */}
        <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', cfg.bg)}>
          <cfg.Icon className={cn('h-3.5 w-3.5', cfg.color)} />
        </div>

        {/* body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', cfg.badge)}>
              {cfg.label}
            </span>
            {insight.category && (
              <span className="text-[10px] text-text-muted uppercase tracking-wider">{insight.category}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-text-primary leading-snug">
            {insight.title || insight.message || insight.insight}
          </p>

          {/* expanded details */}
          {open && (
            <div className="mt-2.5 space-y-2">
              {insight.detail && (
                <p className="text-xs text-text-secondary leading-relaxed">{insight.detail}</p>
              )}
              {insight.suggestion && (
                <p className="text-xs text-text-muted leading-relaxed">
                  <span className="text-cyan font-semibold">Suggestion: </span>
                  {insight.suggestion}
                </p>
              )}
              {insight.action && (
                <span className="inline-flex items-center gap-1 text-xs text-cyan font-medium hover:underline">
                  {insight.action} <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* chevron */}
        <div className="flex-shrink-0 mt-0.5">
          {open
            ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
            : <ChevronDown className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>
    </button>
  )
}

/* ── Panel ────────────────────────────────────────────────────────── */
export default function AIInsightsPanel() {
  const { data: raw, isLoading, isError, refetch, isFetching } = useFinancialInsights()
  const [showAll, setShowAll] = useState(false)

  /* normalise response shape */
  const all = Array.isArray(raw?.insights) ? raw.insights
    : Array.isArray(raw) ? raw
    : []

  const sorted = [...all].sort((a, b) => {
    const pa = PRIORITY[a.severity || a.type] ?? 2
    const pb = PRIORITY[b.severity || b.type] ?? 2
    return pa - pb
  })

  const criticals = sorted.filter(i => (i.severity || i.type) === 'critical').length
  const warnings  = sorted.filter(i => (i.severity || i.type) === 'warning').length
  const visible   = showAll ? sorted : sorted.slice(0, 4)

  return (
    <div className="premium-card p-5 bg-gradient-to-br from-glass-panel via-transparent to-cyan/5 border-cyan/20">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan/15">
            <Brain className="h-4 w-4 text-cyan" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
              AI Financial Insights
              {criticals > 0 && (
                <span className="bg-red-400/20 text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {criticals} critical
                </span>
              )}
              {warnings > 0 && (
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {warnings} warning
                </span>
              )}
            </h2>
            <p className="text-[11px] text-text-muted">
              Real-time analysis · {all.length} insight{all.length !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-glass-hover transition-colors text-text-muted hover:text-text-secondary"
          title="Refresh insights"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* ── Body ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-xl animate-pulse bg-glass-panel" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="p-3 rounded-full bg-glass-panel">
            <Zap className="h-5 w-5 text-text-muted" />
          </div>
          <p className="text-sm text-text-muted max-w-xs">
            AI insights unavailable — the engine may still be warming up.
          </p>
          <button onClick={() => refetch()} className="text-xs text-cyan hover:underline font-medium">
            Retry
          </button>
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="p-3 rounded-full bg-emerald-400/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">All clear!</p>
            <p className="text-xs text-text-muted mt-1">No anomalies or financial risks detected.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {visible.map((insight, i) => (
              <InsightCard key={insight.id || insight._id || i} insight={insight} idx={i} />
            ))}
          </div>
          {sorted.length > 4 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="mt-3 w-full text-xs text-text-muted hover:text-text-secondary font-medium py-2 hover:bg-glass-hover rounded-lg transition-colors"
            >
              {showAll ? 'Show fewer insights' : `Show ${sorted.length - 4} more insights`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
