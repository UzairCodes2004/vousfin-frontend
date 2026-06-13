/**
 * NeedsAttentionFeed — the unified "AI Accountant" centerpiece (H6).
 *
 * ONE ranked, de-duplicated list merged server-side from financial insights,
 * forecast signals and anomalies (GET /ai/needs-attention), plus AI
 * recommendations and quick actions. Replaces the scattered insight panels so
 * the user has a single "what needs me right now?" surface.
 */
import { Link } from 'react-router-dom'
import {
  Brain, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ArrowRight, RefreshCw, Zap, Bell, DollarSign, CreditCard, FileText,
} from 'lucide-react'
import { useNeedsAttention, useAIRecommendations } from '@/hooks/useAI'
import { cn } from '@/utils/cn'

const SEV = {
  critical: { Icon: AlertTriangle, color: 'text-negative',    border: 'border-negative/25',    bg: 'bg-negative/8',    badge: 'bg-negative/20 text-negative',     label: 'Needs action' },
  warning:  { Icon: AlertCircle,  color: 'text-amber',  border: 'border-amber/25',  bg: 'bg-amber/8',  badge: 'bg-amber/20 text-amber', label: 'Worth a look' },
  info:     { Icon: Info,         color: 'text-cyan',        border: 'border-cyan/25',        bg: 'bg-cyan/8',        badge: 'bg-cyan/20 text-cyan',           label: 'Heads up'     },
}

const QUICK_ACTIONS = [
  { label: 'Chase a payment', to: '/sales/receivables',  Icon: Bell,       color: 'var(--c-highlight)' },
  { label: 'Record payment',  to: '/transactions',        Icon: DollarSign, color: 'var(--c-positive)' },
  { label: 'Pay a bill',      to: '/purchases/payables', Icon: CreditCard, color: 'var(--c-negative)' },
  { label: 'New invoice',     to: '/customers',           Icon: FileText,   color: 'var(--c-accent)' },
]

function AttentionItem({ item }) {
  const cfg = SEV[item.level] || SEV.info
  const body = (
    <div className={cn('flex items-start gap-2.5 p-3 rounded-xl border h-full', cfg.bg, cfg.border)}>
      <div className="p-1 rounded-lg flex-shrink-0 mt-0.5">
        <cfg.Icon className={cn('h-3.5 w-3.5', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', cfg.badge)}>{cfg.label}</span>
        </div>
        <p className="text-xs font-semibold text-text-primary leading-snug">{item.title}</p>
        {item.message && <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">{item.message}</p>}
        {item.action && item.actionTo && (
          <span className="inline-flex items-center gap-1 text-[11px] text-cyan font-medium mt-1.5 group-hover:gap-1.5 transition-all">
            {item.action} <ArrowRight className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    </div>
  )
  return item.actionTo
    ? <Link to={item.actionTo} className="group block">{body}</Link>
    : <div>{body}</div>
}

export default function NeedsAttentionFeed() {
  const { data, isLoading, isError, refetch, isFetching } = useNeedsAttention()
  const { data: recs, isLoading: recsLoading } = useAIRecommendations()

  const items = Array.isArray(data?.items) ? data.items : []
  const counts = data?.counts || {}
  const recommendations = Array.isArray(recs) ? recs : []

  return (
    <div className="premium-card p-5 bg-gradient-to-br from-glass-panel via-transparent to-cyan/5 border-cyan/20">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan/15">
            <Brain className="h-4 w-4 text-cyan" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
              Needs your attention
              {counts.critical > 0 && (
                <span className="bg-negative/20 text-negative text-[9px] font-bold px-1.5 py-0.5 rounded-full">{counts.critical} need action</span>
              )}
              {counts.warning > 0 && (
                <span className="bg-amber/20 text-amber text-[9px] font-bold px-1.5 py-0.5 rounded-full">{counts.warning} to review</span>
              )}
            </h2>
            <p className="text-[11px] text-text-muted">Your AI accountant, watching the numbers for you</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-glass-hover transition-colors text-text-muted hover:text-text-secondary"
          title="Re-check"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-2">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-glass-panel" />)}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber/20 bg-amber/5">
          <Zap className="h-3.5 w-3.5 text-amber flex-shrink-0" />
          <p className="text-xs text-text-secondary flex-1">Couldn&apos;t check right now.</p>
          <button onClick={() => refetch()} className="text-[11px] text-cyan hover:underline font-medium">Retry</button>
        </div>
      ) : items.length === 0 ? (
        /* Honest all-clear — reflects the real merged check across spending,
           cash flow, tax and forecast. */
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-positive/20 bg-positive/8">
          <CheckCircle2 className="h-4 w-4 text-positive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-text-primary">All clear — nothing needs you right now</p>
            <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
              We checked your spending, cash flow, receivables, tax and forecast — no risks or unusual activity.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {items.map((item, i) => <AttentionItem key={item.id || i} item={item} />)}
        </div>
      )}

      {/* Recommended next steps */}
      {!recsLoading && recommendations.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Recommended next steps</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {recommendations.slice(0, 4).map((rec, i) => {
              const text = rec.recommendation || rec.message || rec.text || rec.suggestion || String(rec)
              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-cyan/20 bg-cyan/5">
                  <Zap className="h-3 w-3 text-cyan flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-secondary leading-snug">{text}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="pt-3 mt-4 border-t border-glass">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Quick actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {QUICK_ACTIONS.map(({ label, to, Icon, color }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-glass-2 hover:border-glass-2 hover:bg-glass-hover transition-all group active:scale-95"
            >
              <div className="p-1 rounded-md flex-shrink-0" style={{ background: `rgb(${color} / 0.09)` }}>
                <Icon className="h-3 w-3" style={{ color: `rgb(${color})` }} />
              </div>
              <span className="text-[10px] font-semibold text-text-muted group-hover:text-text-secondary transition-colors text-center leading-tight">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
