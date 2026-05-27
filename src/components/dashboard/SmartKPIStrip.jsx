/**
 * SmartKPIStrip — Phase 5.6
 * Compact 8-metric strip with inline sparklines, trend arrows, and click-through links.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  ArrowDownRight, ArrowUpRight, Percent, Flame, ChevronRight,
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { cn } from '@/utils/cn'

/* ── Inline SVG sparkline ─────────────────────────────────────────── */
function Sparkline({ data = [], color = '#06b6d4', width = 56, height = 24 }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step  = width / (data.length - 1)
  const pts   = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 4) + 2).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        opacity="0.75"
      />
    </svg>
  )
}

/* ── Single KPI chip ──────────────────────────────────────────────── */
function KPIChip({ title, value, format = 'currency', currency, icon: Icon, trend, trendLabel, sparkData, color, to, loading }) {
  const display =
    loading ? null
    : format === 'percent' ? formatPercent(value)
    : value != null       ? formatCurrency(value, currency)
    : '—'

  const chip = (
    <div className={cn(
      'group premium-card p-3.5 flex flex-col gap-2',
      'hover:border-[var(--chip-color)]/30 transition-all duration-200',
      to && 'cursor-pointer hover-scale',
    )}
    style={{ '--chip-color': color }}
    >
      {/* title row */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && (
            <Icon className="h-3 w-3 shrink-0" style={{ color }} />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted truncate">
            {title}
          </span>
        </div>
        {to && (
          <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
        )}
      </div>

      {/* value */}
      {loading ? (
        <div className="h-6 w-20 animate-pulse rounded bg-glass-panel" />
      ) : (
        <p className="text-base font-black tracking-tight text-text-primary leading-none">{display}</p>
      )}

      {/* sparkline + trend */}
      <div className="flex items-end justify-between gap-1 mt-auto">
        {sparkData?.length > 1 && (
          <Sparkline data={sparkData} color={color} />
        )}
        {!loading && trend !== undefined && trend !== 0 && (
          <span className={cn(
            'flex items-center gap-0.5 text-[10px] font-bold ml-auto leading-none',
            trend > 0 ? 'text-emerald-400' : 'text-red-400',
          )}>
            {trend > 0
              ? <TrendingUp className="h-2.5 w-2.5" />
              : <TrendingDown className="h-2.5 w-2.5" />}
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  )

  if (to) return <Link to={to} className="contents">{chip}</Link>
  return chip
}

/* ── Main strip ───────────────────────────────────────────────────── */
export default function SmartKPIStrip({ kpis = {}, revenueVsExpenses = [], loading, currency }) {
  const {
    revenue = 0,
    expenses = 0,
    netProfit = 0,
    cashBalance = 0,
    accountsReceivable = 0,
    accountsPayable = 0,
  } = kpis

  /* Build sparklines from monthly revenueVsExpenses data */
  const revSpark    = useMemo(() => revenueVsExpenses.map(d => d.revenue  ?? 0), [revenueVsExpenses])
  const expSpark    = useMemo(() => revenueVsExpenses.map(d => d.expenses ?? 0), [revenueVsExpenses])
  const profitSpark = useMemo(
    () => revenueVsExpenses.map(d => (d.revenue ?? 0) - (d.expenses ?? 0)),
    [revenueVsExpenses],
  )

  /* Derived metrics */
  const monthsElapsed   = Math.max(1, new Date().getMonth() + 1)
  const burnRate        = revenue > 0 ? Math.round(expenses / monthsElapsed) : 0
  const profitMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const metrics = [
    {
      title: 'Revenue', value: revenue,
      icon: TrendingUp,
      trend: revenue > 0 ? 1 : 0, trendLabel: 'YTD',
      sparkData: revSpark, color: '#34d399',
      to: '/reports/income-statement',
    },
    {
      title: 'Expenses', value: expenses,
      icon: TrendingDown,
      trend: expenses > 0 ? -1 : 0, trendLabel: 'YTD',
      sparkData: expSpark, color: '#f87171',
      to: '/reports/income-statement',
    },
    {
      title: 'Net Profit', value: netProfit,
      icon: DollarSign,
      trend: netProfit > 0 ? 1 : netProfit < 0 ? -1 : 0,
      trendLabel: netProfit >= 0 ? 'Profit' : 'Loss',
      sparkData: profitSpark,
      color: netProfit >= 0 ? '#34d399' : '#f87171',
      to: '/reports/income-statement',
    },
    {
      title: 'Cash Balance', value: cashBalance,
      icon: Wallet,
      trend: cashBalance > 0 ? 1 : cashBalance < 0 ? -1 : 0,
      trendLabel: cashBalance > 0 ? 'Positive' : 'Negative',
      color: '#06b6d4',
      to: '/reports/balance-sheet',
    },
    {
      title: 'Receivables', value: accountsReceivable,
      icon: ArrowDownRight,
      trend: accountsReceivable > 0 ? 1 : 0, trendLabel: 'Due',
      color: '#a78bfa',
      to: '/transactions',
    },
    {
      title: 'Payables', value: accountsPayable,
      icon: ArrowUpRight,
      trend: accountsPayable > 0 ? -1 : 0, trendLabel: 'Owed',
      color: '#fb923c',
      to: '/transactions',
    },
    {
      title: 'Profit Margin', value: profitMarginPct,
      format: 'percent',
      icon: Percent,
      trend: profitMarginPct > 0 ? 1 : profitMarginPct < 0 ? -1 : 0,
      trendLabel: `${profitMarginPct.toFixed(1)}%`,
      color: profitMarginPct >= 0 ? '#34d399' : '#f87171',
      to: '/reports/income-statement',
    },
    {
      title: 'Burn Rate', value: burnRate,
      icon: Flame,
      trend: burnRate > 0 ? -1 : 0, trendLabel: '/mo',
      color: '#facc15',
      to: '/reports/income-statement',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {metrics.map(m => (
        <KPIChip key={m.title} {...m} currency={currency} loading={loading} />
      ))}
    </div>
  )
}
