/**
 * Dashboard — Phase 5.6 Rewrite
 *
 * Five-row information architecture:
 *   1. Header   — greeting, YTD label, quick-action CTA
 *   2. KPI Strip — 8 compact metrics with sparklines
 *   3. AI Insights — financial anomaly / risk analysis panel
 *   4. Forecasting — embedded AI forecasting engine (compact)
 *   5. Workspace — recent transactions + AR/AP summary
 *   6. Analytics — Revenue vs Expenses + Cash Flow charts
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Hourglass,
} from 'lucide-react'

import { useBusinessStore } from '@/stores/useBusinessStore'
import { useAuthStore }     from '@/stores/useAuthStore'
import { useTransactions }  from '@/hooks/useTransactions'
import { useDashboardAll }  from '@/hooks/useReports'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { cn } from '@/utils/cn'

import SmartKPIStrip    from '@/components/dashboard/SmartKPIStrip'
import AIInsightsPanel  from '@/components/dashboard/AIInsightsPanel'
import ForecastWidget   from '@/components/dashboard/ForecastWidget'
import RevenueExpensesChart from '@/components/dashboard/RevenueExpensesChart'
import CashFlowTrendChart   from '@/components/dashboard/CashFlowTrendChart'
import Badge       from '@/components/ui/Badge'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import Button      from '@/components/ui/Button'

/* ── helpers ──────────────────────────────────────────────────────── */
const INFLOW_TYPES = new Set([
  'income', 'cash sale', 'credit sale', 'payment received', 'revenue',
  'sales', 'sale',
])

function txIsInflow(tx) {
  return INFLOW_TYPES.has((tx.transactionType || '').toLowerCase())
}

function paymentBadge(status) {
  if (status === 'unpaid')  return <Badge variant="warning" className="text-[10px]">Unpaid</Badge>
  if (status === 'partial') return <Badge variant="warning" className="text-[10px]">Partial</Badge>
  return <Badge variant="default" className="text-[10px]">Posted</Badge>
}

/* ── Section header ───────────────────────────────────────────────── */
function SectionLabel({ label, to }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">{label}</h2>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-[11px] text-cyan hover:underline font-medium">
          View all <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

/* ── AR/AP summary card ───────────────────────────────────────────── */
function ArApCard({ title, value, currency, icon: Icon, color, to, status, count }) {
  return (
    <Link to={to} className="block">
      <div className={cn(
        'premium-card p-4 flex items-center justify-between gap-3 hover-scale transition-all',
        'hover:border-[var(--ac)]/30',
      )}
      style={{ '--ac': color }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: color + '18' }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{title}</p>
            <p className="text-lg font-black text-text-primary leading-tight">
              {formatCurrency(value, currency)}
            </p>
            {count != null && (
              <p className="text-[10px] text-text-muted mt-0.5">{count} outstanding</p>
            )}
          </div>
        </div>
        <div className={cn(
          'text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0',
          status === 'overdue' ? 'bg-red-400/15 text-red-300'
            : status === 'due'  ? 'bg-amber-400/15 text-amber-300'
            : 'bg-glass-panel text-text-muted',
        )}>
          {status === 'overdue' ? 'Overdue' : status === 'due' ? 'Due' : 'Tracked'}
        </div>
      </div>
    </Link>
  )
}

/* ── Quick Actions ───────────────────────────────────────────────── */
function QuickActions() {
  const actions = [
    { label: 'New Transaction', to: '/transactions',      icon: Plus,          color: '#06b6d4' },
    { label: 'View Reports',    to: '/reports',           icon: LayoutDashboard, color: '#a78bfa' },
    { label: 'AI Forecast',     to: '/ai/forecast',       icon: ArrowUpRight,  color: '#34d399' },
    { label: 'View Journal',    to: '/journal',           icon: CalendarDays,  color: '#fb923c' },
  ]
  return (
    <div className="premium-card p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(a => (
          <Link key={a.label} to={a.to}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-glass hover:border-[var(--ac)]/30 hover:bg-[var(--ac)]/5 transition-all group"
            style={{ '--ac': a.color }}
          >
            <a.icon className="h-3.5 w-3.5 flex-shrink-0 transition-colors" style={{ color: a.color }} />
            <span className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary transition-colors truncate">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Main Dashboard component                                         */
/* ══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user }                       = useAuthStore()
  const { currency, activeBusiness }   = useBusinessStore()
  const businessName = activeBusiness?.businessName

  /* YTD date range (memoised — changes only on year boundary) */
  const dateRange = useMemo(() => ({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  }), [])

  const { data: dashData,  isLoading: loadDash } = useDashboardAll(dateRange)
  const { data: txData,    isLoading: loadTx   } = useTransactions({ limit: 10 })

  /* Normalise transaction list */
  const recentTxs = Array.isArray(txData?.docs)
    ? txData.docs
    : Array.isArray(txData?.transactions)
      ? txData.transactions
      : Array.isArray(txData)
        ? txData
        : []

  const kpis              = dashData?.kpis            || {}
  const revenueVsExpenses = dashData?.revenueVsExpenses ?? []
  const cashFlowTrend     = dashData?.cashFlowTrend     ?? []

  /* Greeting by time-of-day */
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.fullName || user?.name || 'there').split(' ')[0]

  /* AR/AP outstanding status (simple heuristic) */
  const arStatus = kpis.accountsReceivable > 0 ? 'due' : 'tracked'
  const apStatus = kpis.accountsPayable    > 0 ? 'due' : 'tracked'

  return (
    <div className="space-y-6 animate-fade-in pb-8">

      {/* ── ROW 1 · Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-text-primary tracking-tight">
            <LayoutDashboard className="h-5 w-5 text-cyan" />
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-2">
            <span
              className="font-medium text-text-primary">{businessName || 'Your business'}</span>
            <span className="text-text-muted">·</span>
            <span className="flex items-center gap-1 text-text-muted">
              <Clock className="h-3.5 w-3.5" />
              YTD {new Date().getFullYear()} snapshot
            </span>
          </p>
        </div>

        <Link to="/transactions">
          <Button size="sm" className="flex items-center gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </Link>
      </div>

      {/* ── ROW 2 · Smart KPI Strip ─────────────────────────────── */}
      <section>
        <SectionLabel label="Key Metrics" />
        <SmartKPIStrip
          kpis={kpis}
          revenueVsExpenses={revenueVsExpenses}
          loading={loadDash}
          currency={currency}
        />
      </section>

      {/* ── ROW 3 · AI Financial Insights ───────────────────────── */}
      <section>
        <SectionLabel label="AI Financial Intelligence" />
        <AIInsightsPanel />
      </section>

      {/* ── ROW 4 · Forecasting Engine ──────────────────────────── */}
      <section>
        <SectionLabel label="Revenue & Cash Flow Forecast" />
        <ForecastWidget />
      </section>

      {/* ── ROW 5 · Accounting Workspace ────────────────────────── */}
      <section>
        <SectionLabel label="Accounting Workspace" to="/transactions" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: Recent Transactions */}
          <div className="lg:col-span-2 premium-card p-5">
            <div className="flex items-center justify-between border-b border-glass pb-3 mb-4">
              <h3 className="text-sm font-bold text-text-primary">Recent Transactions</h3>
              <Link to="/transactions" className="text-[11px] text-cyan hover:underline font-medium">
                View all
              </Link>
            </div>

            {loadTx ? (
              <SkeletonLoader count={5} />
            ) : recentTxs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted mb-3">No transactions yet.</p>
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-2 text-sm text-cyan font-medium hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Record your first transaction
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentTxs.map(tx => {
                  const inflow = txIsInflow(tx)
                  return (
                    <div
                      key={tx._id}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-glass-hover border border-transparent hover:border-glass transition-colors group"
                    >
                      {/* left */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'p-1.5 rounded-lg flex-shrink-0',
                          inflow ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400',
                        )}>
                          {inflow
                            ? <ArrowDownRight className="h-3.5 w-3.5" />
                            : <ArrowUpRight   className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary truncate max-w-[200px] text-sm leading-tight">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {formatDate(tx.transactionDate)}
                            {tx.transactionType && ` · ${tx.transactionType}`}
                          </p>
                        </div>
                      </div>

                      {/* right */}
                      <div className="text-right flex-shrink-0 ml-4 flex flex-col items-end gap-1">
                        <p className={cn(
                          'font-bold text-sm',
                          inflow ? 'text-emerald-400' : 'text-text-primary',
                        )}>
                          {inflow ? '+' : '−'}{formatCurrency(tx.amount, currency)}
                        </p>
                        {paymentBadge(tx.paymentStatus)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: AR/AP + Quick Actions */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* AR */}
            <ArApCard
              title="Accounts Receivable"
              value={kpis.accountsReceivable ?? 0}
              currency={currency}
              icon={ArrowDownRight}
              color="#a78bfa"
              to="/transactions"
              status={arStatus}
            />

            {/* AP */}
            <ArApCard
              title="Accounts Payable"
              value={kpis.accountsPayable ?? 0}
              currency={currency}
              icon={ArrowUpRight}
              color="#fb923c"
              to="/transactions"
              status={apStatus}
            />

            {/* Quick actions */}
            <QuickActions />
          </div>
        </div>
      </section>

      {/* ── ROW 6 · Business Analytics ──────────────────────────── */}
      <section>
        <SectionLabel label="Business Analytics" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <RevenueExpensesChart
            data={revenueVsExpenses}
            loading={loadDash}
            currency={currency}
          />
          <CashFlowTrendChart
            data={cashFlowTrend}
            loading={loadDash}
            currency={currency}
          />
        </div>
      </section>

    </div>
  )
}
