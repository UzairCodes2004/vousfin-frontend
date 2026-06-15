/**
 * CommandCenterPage — the one inbox (Autonomy roadmap Phase 0).
 *
 * Everything that needs you (and what VousFin is doing for you) in one place:
 * actionable proposed actions (approve / dismiss) first, then the insights it's
 * surfacing. Plus the autonomy dials — how much you trust each capability to act.
 */
import { Link } from 'react-router-dom'
import {
  Brain, CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowUpRight,
  Check, X, Sparkles, RefreshCw,
} from 'lucide-react'
import {
  useAutonomyInbox, useAutonomyPolicy, useSetCapability,
  useApproveAction, useRejectAction,
} from '@/hooks/useAutonomy'
import { cn } from '@/utils/cn'

/* ── Autonomy dials ─────────────────────────────────────────────────────── */
const CAP_LABEL = {
  bookkeeping: 'Bookkeeping', reconciliation: 'Reconciliation', collections: 'Collections',
  payments: 'Payments', tax: 'Tax', close: 'Month-end close', advisory: 'Advisory',
}
const LEVELS = [
  { v: 'observe',   l: 'Observe' },
  { v: 'suggest',   l: 'Suggest' },
  { v: 'copilot',   l: 'Co-pilot' },
  { v: 'autopilot', l: 'Autopilot' },
]
const LEVEL_TONE = {
  observe:   'text-text-muted',
  suggest:   'text-cyan',
  copilot:   'text-amber',
  autopilot: 'text-positive',
}

function AutonomyDials() {
  const { data: policy, isLoading } = useAutonomyPolicy()
  const setCap = useSetCapability()
  const caps = policy?.capabilities || {}

  return (
    <div className="premium-card p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="p-1.5 rounded-lg bg-cyan/15"><Sparkles className="h-4 w-4 text-cyan" /></div>
        <div>
          <h2 className="text-sm font-bold text-text-primary">How much VousFin acts for you</h2>
          <p className="text-[12.5px] text-text-muted">Turn each area up as you trust it. Everything starts at “Suggest”.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-glass-panel animate-pulse" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
          {Object.keys(CAP_LABEL).map((cap) => {
            const level = caps[cap]?.level || 'suggest'
            return (
              <div key={cap} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-glass bg-glass-panel/40">
                <span className="text-[13px] font-medium text-text-secondary">{CAP_LABEL[cap]}</span>
                <select
                  value={level}
                  onChange={(e) => setCap.mutate({ capability: cap, level: e.target.value })}
                  className={cn('bg-transparent text-[12.5px] font-bold focus:outline-none cursor-pointer', LEVEL_TONE[level])}
                >
                  {LEVELS.map(o => <option key={o.v} value={o.v} className="bg-charcoal text-text-primary">{o.l}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Inbox items ────────────────────────────────────────────────────────── */
const INSIGHT_TONE = {
  critical: { Icon: AlertTriangle, border: 'border-negative/25', bg: 'bg-negative/8', text: 'text-negative' },
  warning:  { Icon: AlertCircle,   border: 'border-amber/25',    bg: 'bg-amber/8',    text: 'text-amber' },
  info:     { Icon: Info,          border: 'border-cyan/20',     bg: 'bg-cyan/6',     text: 'text-cyan' },
}

function InsightCard({ item }) {
  const tone = INSIGHT_TONE[item.level] || INSIGHT_TONE.info
  const body = (
    <div className={cn('flex items-start gap-2.5 p-3.5 rounded-xl border h-full', tone.bg, tone.border)}>
      <tone.Icon className={cn('h-4 w-4 shrink-0 mt-0.5', tone.text)} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text-primary leading-snug">{item.title}</p>
        {item.summary && <p className="text-[12.5px] text-text-secondary leading-relaxed mt-0.5">{item.summary}</p>}
        {item.actionTo && (
          <span className="inline-flex items-center gap-1 text-[12.5px] text-cyan font-medium mt-1.5">
            {item.actionLabel || 'Open'} <ArrowUpRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <span className="text-[10.5px] uppercase tracking-wider text-text-muted shrink-0">{item.capability}</span>
    </div>
  )
  return item.actionTo ? <Link to={item.actionTo} className="block group">{body}</Link> : <div>{body}</div>
}

function ActionCard({ item }) {
  const approve = useApproveAction()
  const reject = useRejectAction()
  return (
    <div className="premium-card p-4 flex items-start gap-3">
      <div className="p-2 rounded-xl bg-positive/12 shrink-0"><Brain className="h-4 w-4 text-positive" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-text-primary leading-tight">{item.title}</p>
          <span className="text-[10.5px] uppercase tracking-wider text-text-muted">{item.capability}</span>
          {item.confidence != null && (
            <span className="text-[11px] font-bold text-cyan">{Math.round(item.confidence * 100)}% sure</span>
          )}
        </div>
        {item.summary && <p className="text-[12.5px] text-text-secondary mt-0.5">{item.summary}</p>}
        <div className="flex items-center gap-2 mt-2.5">
          <button onClick={() => approve.mutate(item.id)} disabled={approve.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-positive/12 text-positive text-[12.5px] font-semibold hover:bg-positive/20 transition-colors disabled:opacity-50">
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          <button onClick={() => reject.mutate(item.id)} disabled={reject.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-muted text-[12.5px] font-semibold hover:bg-glass-hover transition-colors disabled:opacity-50">
            <X className="h-3.5 w-3.5" /> Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function CommandCenterPage() {
  const { data, isLoading, isError, isFetching, refetch } = useAutonomyInbox()
  const items = data?.items || []
  const counts = data?.counts || {}
  const actions  = items.filter(i => i.kind === 'action')
  const insights = items.filter(i => i.kind === 'insight')

  return (
    <div className="animate-fade-in pb-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Command Center</h1>
          <p className="text-sm text-text-secondary mt-1">Everything that needs you — and what VousFin is handling for you.</p>
        </div>
        <button onClick={() => refetch()} aria-label="Refresh"
          className="p-2 rounded-lg border border-glass text-text-muted hover:text-cyan hover:border-cyan/40 transition-colors">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
      </div>

      <AutonomyDials />

      {/* Waiting for you */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[12.5px] font-bold uppercase tracking-widest text-text-muted">Waiting for you</span>
          {counts.actions > 0 && <span className="text-[12px] font-bold text-positive">{counts.actions}</span>}
          <div className="flex-1 h-px bg-glass" />
        </div>
        {isLoading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="premium-card h-20 animate-pulse" />)}</div>
        ) : actions.length === 0 ? (
          <div className="premium-card p-5 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-positive shrink-0" />
            <p className="text-[13px] text-text-secondary">Nothing needs your approval right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 stagger-rise">{actions.map(a => <ActionCard key={a.id} item={a} />)}</div>
        )}
      </div>

      {/* Worth knowing */}
      {(insights.length > 0 || !isLoading) && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[12.5px] font-bold uppercase tracking-widest text-text-muted">Worth knowing</span>
            <div className="flex-1 h-px bg-glass" />
          </div>
          {isError ? (
            <div className="premium-card p-5 text-center">
              <p className="text-sm text-negative">Couldn’t load right now.</p>
              <button onClick={() => refetch()} className="mt-1.5 text-sm text-cyan font-semibold hover:underline">Try again</button>
            </div>
          ) : insights.length === 0 ? (
            <div className="premium-card p-5 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-positive shrink-0" />
              <p className="text-[13px] text-text-secondary">All clear — we checked your spending, cash flow, tax and forecast.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-rise">
              {insights.map(i => <InsightCard key={i.id} item={i} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
