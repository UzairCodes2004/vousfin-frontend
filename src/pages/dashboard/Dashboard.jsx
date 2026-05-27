/**
 * Dashboard — Phase 5.6 refined layout v3
 *
 * Changes vs v2:
 *  - AI Insights + Forecast are SIDE BY SIDE on xl screens (2/5 + 3/5)
 *  - Quick Actions moved to the TOP of the workspace right sidebar
 *  - Quick Actions use explicit Tailwind colour classes (CSS-var hover was broken)
 *  - "New Transaction" Quick Action opens TransactionFormModal inline
 *  - active:scale-95 + transition for click feedback on every action button
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Plus, Clock,
  TrendingUp, TrendingDown,
  ArrowDownRight, ArrowUpRight,
  BarChart2, BookOpen, Cpu,
  ExternalLink,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { useBusinessStore } from '@/stores/useBusinessStore'
import { useAuthStore }     from '@/stores/useAuthStore'
import { useTransactions }  from '@/hooks/useTransactions'
import { useDashboardAll }  from '@/hooks/useReports'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { cn } from '@/utils/cn'

import SmartKPIStrip           from '@/components/dashboard/SmartKPIStrip'
import AIInsightsPanel         from '@/components/dashboard/AIInsightsPanel'
import ForecastWidget          from '@/components/dashboard/ForecastWidget'
import RevenueExpensesChart    from '@/components/dashboard/RevenueExpensesChart'
import CashFlowTrendChart      from '@/components/dashboard/CashFlowTrendChart'
import TransactionFormModal    from '@/components/forms/TransactionFormModal'
import SkeletonLoader          from '@/components/ui/SkeletonLoader'

/* ── helpers ──────────────────────────────────────────────────────── */
const INFLOW_TYPES = new Set([
  'income', 'cash sale', 'credit sale', 'payment received',
  'revenue', 'sales', 'sale',
])
const isInflow = tx => INFLOW_TYPES.has((tx.transactionType || '').toLowerCase())

function fmtAmt(val, currency = 'PKR') {
  const sym  = currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : currency
  const abs  = Math.abs(val)
  const sign = val < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}${sym} ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${sym} ${(abs / 1_000).toFixed(0)}K`
  return formatCurrency(val, currency)
}

/* ── Section divider ──────────────────────────────────────────────── */
function Section({ label, to, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
        <div className="flex-1 h-px bg-glass" />
        {to && (
          <Link to={to} className="flex items-center gap-1 text-[11px] text-cyan hover:underline font-medium shrink-0">
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/* ── Transaction row ─────────────────────────────────────────────── */
function TxRow({ tx, currency }) {
  const inflow   = isInflow(tx)
  const isUnpaid = tx.paymentStatus === 'unpaid' || tx.paymentStatus === 'partial'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-glass-hover transition-colors">
      <div className={cn(
        'p-2 rounded-lg flex-shrink-0',
        inflow ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400',
      )}>
        {inflow ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate leading-tight">
          {tx.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-text-muted">{formatDate(tx.transactionDate, 'MMM d')}</span>
          {tx.transactionType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-glass-panel text-text-muted capitalize">
              {tx.transactionType}
            </span>
          )}
          {isUnpaid && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 font-medium capitalize">
              {tx.paymentStatus}
            </span>
          )}
        </div>
      </div>

      <p className={cn(
        'text-sm font-bold flex-shrink-0 tabular-nums',
        inflow ? 'text-emerald-400' : 'text-text-primary',
      )}>
        {inflow ? '+' : '−'}{fmtAmt(tx.amount, currency)}
      </p>
    </div>
  )
}

/* ── Quick Actions — horizontal toolbar pills ────────────────────── */
/* Rendered right below the header greeting; uses explicit Tailwind    */
/* colour classes (CSS-var opacity modifiers break Tailwind JIT).      */
const ACTION_DEFS = [
  {
    label: 'New Transaction',
    Icon: Plus,
    action: 'modal',
    iconClass:    'bg-cyan/15 text-cyan',
    wrapperHover: 'hover:bg-cyan/10 hover:border-cyan/40',
    labelHover:   'group-hover:text-cyan',
  },
  {
    label: 'Reports',
    to: '/reports',
    Icon: BarChart2,
    iconClass:    'bg-violet-500/15 text-violet-400',
    wrapperHover: 'hover:bg-violet-500/10 hover:border-violet-500/40',
    labelHover:   'group-hover:text-violet-400',
  },
  {
    label: 'AI Forecast',
    to: '/ai/forecast',
    Icon: Cpu,
    iconClass:    'bg-emerald-400/15 text-emerald-400',
    wrapperHover: 'hover:bg-emerald-400/10 hover:border-emerald-400/40',
    labelHover:   'group-hover:text-emerald-400',
  },
  {
    label: 'Journal',
    to: '/journal',
    Icon: BookOpen,
    iconClass:    'bg-orange-400/15 text-orange-400',
    wrapperHover: 'hover:bg-orange-400/10 hover:border-orange-400/40',
    labelHover:   'group-hover:text-orange-400',
  },
]

function QuickActionsBar({ onNewTransaction }) {
  const pillBase = cn(
    'group flex items-center gap-2 px-4 py-2 rounded-xl border border-glass',
    'transition-all duration-150 active:scale-95 cursor-pointer',
  )

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ACTION_DEFS.map(({ label, to, Icon, action, iconClass, wrapperHover, labelHover }) => {
        const content = (
          <>
            <div className={cn('p-1.5 rounded-lg transition-transform duration-150 group-hover:scale-110 flex-shrink-0', iconClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className={cn('text-xs font-semibold text-text-secondary transition-colors whitespace-nowrap', labelHover)}>
              {label}
            </span>
          </>
        )

        if (action === 'modal') {
          return (
            <button key={label} type="button" onClick={onNewTransaction}
              className={cn(pillBase, wrapperHover)}>
              {content}
            </button>
          )
        }
        return (
          <Link key={label} to={to} className={cn(pillBase, wrapperHover)}>
            {content}
          </Link>
        )
      })}
    </div>
  )
}

/* ── Financial Snapshot (AR / AP unified) ────────────────────────── */
function FinancialSnapshot({ ar, ap, currency, loading }) {
  const total = ar + ap
  const arPct = total > 0 ? (ar / total) * 100 : 50

  return (
    <div className="premium-card p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-4">
        Financial Position
      </h3>

      {loading ? (
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded-xl bg-glass-panel" />
          <div className="h-14 animate-pulse rounded-xl bg-glass-panel" />
        </div>
      ) : (
        <>
          {/* Receivable — always show absolute value */}
          <Link to="/transactions" className="flex items-center justify-between mb-3 p-3 rounded-xl bg-violet-500/8 border border-violet-500/15 hover:border-violet-500/35 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <ArrowDownRight className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Accounts Receivable</p>
                <p className="text-base font-black text-text-primary leading-tight">{fmtAmt(Math.abs(ar), currency)}</p>
                <p className="text-[10px] text-text-muted mt-0.5">Due from customers</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-violet-300 bg-violet-400/15 px-2 py-1 rounded-full">Due</span>
          </Link>

          {/* Payable — always show absolute value */}
          <Link to="/transactions" className="flex items-center justify-between mb-4 p-3 rounded-xl bg-orange-500/8 border border-orange-500/15 hover:border-orange-500/35 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-orange-500/20">
                <ArrowUpRight className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Accounts Payable</p>
                <p className="text-base font-black text-text-primary leading-tight">{fmtAmt(Math.abs(ap), currency)}</p>
                <p className="text-[10px] text-text-muted mt-0.5">Owed to vendors</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-orange-300 bg-orange-400/15 px-2 py-1 rounded-full">Owed</span>
          </Link>

          {/* Net exposure bar */}
          {total > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
                <span>AR {arPct.toFixed(0)}%</span>
                <span>AP {(100 - arPct).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-glass-panel overflow-hidden flex">
                <div className="bg-violet-400 rounded-l-full transition-all duration-700" style={{ width: `${arPct}%` }} />
                <div className="bg-orange-400 rounded-r-full flex-1" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user }                     = useAuthStore()
  const { currency, activeBusiness } = useBusinessStore()
  const queryClient                  = useQueryClient()

  /* New-transaction modal */
  const [showNewTx, setShowNewTx] = useState(false)

  const dateRange = useMemo(() => ({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  }), [])

  const { data: dashData, isLoading: loadDash } = useDashboardAll(dateRange)
  const { data: txData,   isLoading: loadTx   } = useTransactions({ limit: 6 })

  const recentTxs = Array.isArray(txData?.docs)         ? txData.docs
    : Array.isArray(txData?.transactions)               ? txData.transactions
    : Array.isArray(txData)                             ? txData
    : []

  const kpis              = dashData?.kpis            || {}
  const revenueVsExpenses = dashData?.revenueVsExpenses ?? []
  const cashFlowTrend     = dashData?.cashFlowTrend     ?? []

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.fullName || user?.name || 'there').split(' ')[0]

  function handleTxSuccess() {
    setShowNewTx(false)
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  return (
    <div className="space-y-7 animate-fade-in pb-10">

      {/* ── 1. HEADER + QUICK ACTIONS ───────────────────────────── */}
      <div className="space-y-4">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">
              {greeting}, <span className="text-cyan">{firstName}</span> 👋
            </h1>
            <p className="text-sm text-text-secondary mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-text-primary">
                {activeBusiness?.businessName || 'Your Business'}
              </span>
              <span className="text-text-muted">·</span>
              <span className="flex items-center gap-1.5 text-text-muted">
                <Clock className="h-3.5 w-3.5" />
                YTD {new Date().getFullYear()} snapshot
              </span>
            </p>
          </div>
        </div>

        {/* Quick Actions — horizontal pill bar right below the greeting */}
        <QuickActionsBar onNewTransaction={() => setShowNewTx(true)} />
      </div>

      {/* ── 2. KPI STRIP ────────────────────────────────────────── */}
      <Section label="Key Metrics">
        <SmartKPIStrip
          kpis={kpis}
          revenueVsExpenses={revenueVsExpenses}
          loading={loadDash}
          currency={currency}
        />
      </Section>

      {/* ── 3. ANALYTICS ────────────────────────────────────────── */}
      <Section label="Business Analytics">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-3">
            <RevenueExpensesChart
              data={revenueVsExpenses}
              loading={loadDash}
              currency={currency}
            />
          </div>
          <div className="xl:col-span-2">
            <CashFlowTrendChart
              data={cashFlowTrend}
              loading={loadDash}
              currency={currency}
            />
          </div>
        </div>
      </Section>

      {/* ── 4. AI INSIGHTS + FORECAST — side by side on xl ─────── */}
      {/* items-start: each panel is only as tall as its content,    */}
      {/* so AI Insights doesn't stretch to match the chart height.  */}
      <Section label="AI Intelligence & Forecasting">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
          {/* AI Insights — narrower (text cards, compact) */}
          <div className="xl:col-span-2">
            <AIInsightsPanel />
          </div>
          {/* Forecast — wider (chart needs horizontal space) */}
          <div className="xl:col-span-3">
            <ForecastWidget />
          </div>
        </div>
      </Section>

      {/* ── 5. WORKSPACE ────────────────────────────────────────── */}
      <Section label="Recent Activity" to="/transactions">
        {/* items-start: right sidebar only as tall as its own content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Left: Recent Transactions */}
          <div className="lg:col-span-2 premium-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-glass">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Recent Transactions</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Last 6 entries</p>
              </div>
              <Link to="/transactions"
                className="flex items-center gap-1 text-[11px] text-cyan hover:underline font-medium">
                View all <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="p-3">
              {loadTx ? (
                <SkeletonLoader count={4} />
              ) : recentTxs.length === 0 ? (
                <div className="py-10 text-center">
                  <LayoutDashboard className="h-8 w-8 text-text-muted mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted mb-2">No transactions yet</p>
                  <button
                    onClick={() => setShowNewTx(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-cyan font-semibold hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record your first transaction
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentTxs.map(tx => (
                    <TxRow key={tx._id} tx={tx} currency={currency} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Financial Snapshot only */}
          <div className="lg:col-span-1">
            <FinancialSnapshot
              ar={kpis.accountsReceivable ?? 0}
              ap={kpis.accountsPayable    ?? 0}
              currency={currency}
              loading={loadDash}
            />
          </div>

        </div>
      </Section>

      {/* ── New Transaction Modal ────────────────────────────────── */}
      <TransactionFormModal
        isOpen={showNewTx}
        onClose={() => setShowNewTx(false)}
        transaction={null}
      />

    </div>
  )
}
