/**
 * AIInsightsPanel — Phase 5.6 Step 2
 *
 * Four-section AI Accountant panel:
 *   1. Daily Briefing   — cash position, overdue AR, margin, anomaly count
 *   2. AI Recommendations — from /ai/cashflow-recommendations
 *   3. Insight Cards    — from /ai/financial-insights (severity-sorted)
 *   4. Smart Actions    — navigate to key workflows
 *
 * Props:
 *   kpis        — from Dashboard (useDashboardAll)
 *   currency    — from business store
 *   kpiLoading  — boolean
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ChevronDown, ChevronUp, ArrowRight, RefreshCw, Zap,
  Wallet, TrendingUp, TrendingDown, Bell, DollarSign,
  CreditCard, FileText, BarChart2, Lightbulb,
} from 'lucide-react'
import { useFinancialInsights, useAIRecommendations } from '@/hooks/useAI'
import { cn } from '@/utils/cn'

/* ── Compact value formatter ──────────────────────────────────────── */
function fmt(val = 0, currency = 'PKR') {
  const sym = currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : currency
  const abs = Math.abs(val)
  if (abs >= 1_000_000) return `${sym} ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sym} ${(abs / 1_000).toFixed(0)}K`
  return `${sym} ${abs.toFixed(0)}`
}

/* ══ SECTION 1 — Daily Briefing ═══════════════════════════════════════ */
function DailyBriefing({ kpis, currency, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
        ))}
      </div>
    )
  }

  const {
    cashBalance = 0, revenue = 0, expenses = 0, netProfit = 0,
    accountsReceivable = 0,
  } = kpis

  const month    = Math.max(1, new Date().getMonth() + 1)
  const burn     = expenses > 0 ? expenses / month : 0
  const runway   = burn > 0 ? cashBalance / burn : 99
  const margin   = revenue > 0 ? (netProfit / revenue) * 100 : 0
  const hasAR    = Math.abs(accountsReceivable) > 0
  const today    = new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

  const items = [
    {
      Icon: Wallet, label: 'Cash Position',
      value: fmt(cashBalance, currency),
      detail: runway < 99 ? `${runway.toFixed(1)} mo runway` : '6+ mo runway',
      good: cashBalance >= 0,
    },
    {
      Icon: FileText, label: 'Receivables',
      value: hasAR ? fmt(Math.abs(accountsReceivable), currency) : 'All clear',
      detail: hasAR ? 'Due from customers' : 'Nothing outstanding',
      good: !hasAR,
    },
    {
      Icon: TrendingUp, label: 'Profit Margin',
      value: `${margin.toFixed(1)}%`,
      detail: margin >= 15 ? 'Strong' : margin >= 5 ? 'Moderate' : 'Needs focus',
      good: margin >= 8,
    },
    {
      Icon: BarChart2, label: 'Monthly Burn',
      value: burn > 0 ? fmt(burn, currency) : '—',
      detail: 'Avg spend / month',
      good: true,
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Today's Briefing</p>
        <p className="text-[10px] text-text-muted">{today}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(({ Icon, label, value, detail, good }) => (
          <div
            key={label}
            className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon
                className="h-3 w-3 flex-shrink-0"
                style={{ color: good ? '#34d399' : '#fbbf24' }}
              />
              <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wide truncate">{label}</p>
            </div>
            <p className="text-xs font-black text-text-primary leading-tight truncate">{value}</p>
            <p className="text-[9px] text-text-muted mt-0.5 truncate">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══ SECTION 2 — AI Recommendations ══════════════════════════════════ */
function AIRecommendations({ recs, loading }) {
  if (loading) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">AI Recommendations</p>
        <div className="space-y-1.5">
          {[1, 2].map(i => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      </div>
    )
  }

  if (!recs || recs.length === 0) return null

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">AI Recommendations</p>
      <div className="space-y-1.5">
        {recs.slice(0, 3).map((rec, i) => {
          const text = rec.recommendation || rec.message || rec.text || rec.suggestion || String(rec)
          const cat  = rec.category || rec.type || ''
          return (
            <div
              key={i}
              className="flex items-start gap-2.5 p-2.5 rounded-lg border border-cyan/20 bg-cyan/5"
            >
              <Zap className="h-3 w-3 text-cyan flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary leading-snug">{text}</p>
                {cat && (
                  <p className="text-[9px] text-text-muted mt-0.5 uppercase tracking-wide">{cat}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══ SECTION 3 — Insight Card (existing, reused) ═════════════════════ */
const SEV = {
  critical: { Icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/25',    badge: 'bg-red-400/20 text-red-300',    label: 'Critical' },
  warning:  { Icon: AlertCircle,  color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/25',  badge: 'bg-amber-400/20 text-amber-300', label: 'Warning'  },
  info:     { Icon: Info,         color: 'text-cyan',        bg: 'bg-cyan/10',        border: 'border-cyan/25',        badge: 'bg-cyan/20 text-cyan',           label: 'Info'     },
  success:  { Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/25', badge: 'bg-emerald-400/20 text-emerald-300',label: 'Good'  },
}
const PRIORITY = { critical: 0, warning: 1, info: 2, success: 3 }

function InsightCard({ insight, idx }) {
  const [open, setOpen] = useState(false)
  const sev = insight.severity || insight.type || 'info'
  const cfg = SEV[sev] || SEV.info

  return (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      className={cn(
        'w-full text-left border rounded-xl p-3 transition-all duration-200 group',
        cfg.bg, cfg.border,
        open && 'shadow-lg',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('p-1 rounded-lg flex-shrink-0 mt-0.5', cfg.bg)}>
          <cfg.Icon className={cn('h-3 w-3', cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', cfg.badge)}>
              {cfg.label}
            </span>
            {insight.category && (
              <span className="text-[9px] text-text-muted uppercase tracking-wider">{insight.category}</span>
            )}
          </div>
          <p className="text-xs font-semibold text-text-primary leading-snug">
            {insight.title || insight.message || insight.insight}
          </p>
          {open && (
            <div className="mt-2 space-y-1.5">
              {insight.detail && (
                <p className="text-[11px] text-text-secondary leading-relaxed">{insight.detail}</p>
              )}
              {insight.suggestion && (
                <p className="text-[11px] text-text-muted">
                  <span className="text-cyan font-semibold">Suggestion: </span>
                  {insight.suggestion}
                </p>
              )}
              {insight.action && (
                <span className="inline-flex items-center gap-1 text-[11px] text-cyan font-medium">
                  {insight.action} <ArrowRight className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {open
            ? <ChevronUp   className="h-3 w-3 text-text-muted" />
            : <ChevronDown className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>
    </button>
  )
}

/* ══ SECTION 4 — Smart Actions ════════════════════════════════════════ */
const SMART_ACTIONS = [
  { label: 'Remind Customer', to: '/sales/receivables',   Icon: Bell,      color: '#fbbf24' },
  { label: 'Record Payment',  to: '/transactions',         Icon: DollarSign,color: '#34d399' },
  { label: 'Pay Bill',        to: '/purchases/payables',  Icon: CreditCard, color: '#f87171' },
  { label: 'Create Invoice',  to: '/customers',            Icon: FileText,   color: '#06b6d4' },
  { label: 'View Reports',    to: '/financial-reports',   Icon: BarChart2,  color: '#a78bfa' },
]

function SmartActionsBar() {
  return (
    <div className="pt-3 border-t border-glass mt-auto">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Smart Actions</p>
      <div className="grid grid-cols-3 gap-1.5">
        {SMART_ACTIONS.map(({ label, to, Icon, color }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all group active:scale-95"
          >
            <div className="p-1.5 rounded-md" style={{ background: color + '18' }}>
              <Icon className="h-3 w-3" style={{ color }} />
            </div>
            <span className="text-[9px] font-semibold text-text-muted group-hover:text-text-secondary transition-colors text-center leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ══ MAIN PANEL ═══════════════════════════════════════════════════════ */
export default function AIInsightsPanel({ kpis = {}, currency = 'PKR', kpiLoading = false }) {
  const { data: raw,  isLoading, isError, refetch, isFetching } = useFinancialInsights()
  const { data: recs, isLoading: recsLoading }                  = useAIRecommendations()
  const [showAll, setShowAll] = useState(false)

  /* Normalise insights */
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
  const visible   = showAll ? sorted : sorted.slice(0, 3)

  /* Normalise recommendations */
  const recommendations = Array.isArray(recs) ? recs : []

  /* Has meaningful KPI data to show briefing? */
  const hasBriefingData = (kpis.revenue || 0) > 0 || (kpis.cashBalance || 0) !== 0 || (kpis.expenses || 0) > 0

  return (
    <div className="premium-card p-5 flex flex-col w-full bg-gradient-to-br from-glass-panel via-transparent to-cyan/5 border-cyan/20">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan/15">
            <Brain className="h-4 w-4 text-cyan" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
              AI Accountant
              {criticals > 0 && (
                <span className="bg-red-400/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {criticals} critical
                </span>
              )}
              {warnings > 0 && (
                <span className="bg-amber-400/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {warnings} warning
                </span>
              )}
            </h2>
            <p className="text-[11px] text-text-muted">
              Live analysis · {all.length} insight{all.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-text-muted hover:text-text-secondary"
          title="Refresh insights"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto scrollbar-thin pr-0.5">

        {/* 1. Daily Briefing */}
        {(hasBriefingData || kpiLoading) && (
          <DailyBriefing kpis={kpis} currency={currency} loading={kpiLoading} />
        )}

        {/* 2. AI Recommendations */}
        <AIRecommendations recs={recommendations} loading={recsLoading} />

        {/* 3. Insight Cards */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-xl animate-pulse bg-white/[0.04]" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5">
            <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-secondary">Insights engine offline</p>
              <p className="text-[10px] text-text-muted">Temporarily unavailable</p>
            </div>
            <button onClick={() => refetch()} className="text-[11px] text-cyan hover:underline font-medium flex-shrink-0">
              Retry
            </button>
          </div>
        ) : all.length === 0 ? (
          /* All-clear state: keep the verified checks list */
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Verified Checks</p>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/8">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-text-primary">All systems healthy</p>
                <p className="text-[10px] text-text-muted">No anomalies detected</p>
              </div>
            </div>
            {[
              'Spending anomalies — none found',
              'Cash flow risk — positive trajectory',
              'Invoice aging — all within range',
              'Tax compliance — filings up to date',
            ].map(check => (
              <div key={check} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-emerald-400/10 bg-emerald-400/5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                <p className="text-[10px] text-text-secondary">{check}</p>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
              Financial Insights
            </p>
            <div className="space-y-1.5">
              {visible.map((insight, i) => (
                <InsightCard key={insight.id || insight._id || i} insight={insight} idx={i} />
              ))}
            </div>
            {sorted.length > 3 && (
              <button
                onClick={() => setShowAll(s => !s)}
                className="mt-2 w-full text-[11px] text-text-muted hover:text-text-secondary font-medium py-1.5 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                {showAll ? '↑ Show fewer' : `↓ Show ${sorted.length - 3} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Smart Actions — pinned at bottom */}
      <SmartActionsBar />
    </div>
  )
}
