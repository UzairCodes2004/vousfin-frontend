/**
 * SmartKPIStrip — Phase 5.6 redesign
 *
 * Two-tier layout:
 *   Primary row  (4 cards) — Revenue, Expenses, Net Profit, Cash Balance
 *   Secondary row (4 chips) — Receivables, Payables, Margin, Burn Rate
 *
 * Primary cards are larger and more prominent; secondary chips are compact.
 * Values are abbreviated (K / M) so they never overflow.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  Percent, Flame, Activity, Target,
} from 'lucide-react'
import { cn } from '@/utils/cn'

/* ── Compact value formatter ──────────────────────────────────────── */
function fmtVal(val, currency = 'PKR') {
  const sym  = currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : currency
  const abs  = Math.abs(val)
  const sign = val < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}${sym} ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${sym} ${(abs / 1_000).toFixed(0)}K`
  return `${sign}${sym} ${abs.toFixed(0)}`
}

function fmtPct(val) {
  return `${Number(val || 0).toFixed(1)}%`
}

/* ── Inline SVG sparkline ─────────────────────────────────────────── */
function Sparkline({ data = [], color, w = 72, h = 28 }) {
  if (data.length < 2) return null
  const min   = Math.min(...data)
  const max   = Math.max(...data)
  const range = max - min || 1
  const step  = w / (data.length - 1)
  const pts   = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 6) + 3).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.7" />
      {/* End dot */}
      <circle
        cx={(+(data.length - 1) * step).toFixed(1)}
        cy={(h - ((data[data.length - 1] - min) / range) * (h - 6) + 3).toFixed(1)}
        r="2.5" fill={color} opacity="0.9"
      />
    </svg>
  )
}

/* ── Trend badge ──────────────────────────────────────────────────── */
function TrendBadge({ trend, label }) {
  if (trend === 0 || trend == null) return null
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-bold',
      trend > 0 ? 'text-emerald-400' : 'text-red-400',
    )}>
      {trend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {label}
    </span>
  )
}

/* ── PRIMARY card — large ─────────────────────────────────────────── */
function PrimaryCard({ title, value, format, currency, icon: Icon, color, trend, trendLabel, sparkData, to, loading }) {
  const display = loading ? null : format === 'percent' ? fmtPct(value) : fmtVal(value, currency)

  const inner = (
    <div
      className={cn(
        'group premium-card p-5 flex flex-col gap-3 transition-all duration-200',
        'border-t-2 hover-scale',
        to && 'cursor-pointer',
      )}
      style={{ borderTopColor: color }}
    >
      {/* Icon + title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: color + '20' }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</span>
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-8 w-28 animate-pulse rounded-lg bg-glass-panel" />
      ) : (
        <p className="text-2xl font-black tracking-tight text-text-primary leading-none">{display}</p>
      )}

      {/* Sparkline + trend */}
      <div className="flex items-end justify-between gap-2 pt-1">
        {sparkData?.length > 1 && <Sparkline data={sparkData} color={color} />}
        {!loading && <TrendBadge trend={trend} label={trendLabel} />}
      </div>
    </div>
  )

  return to ? <Link to={to} className="contents">{inner}</Link> : inner
}

/* ── SECONDARY chip — compact ─────────────────────────────────────── */
function SecondaryChip({ title, value, format, currency, icon: Icon, color, trend, trendLabel, to, loading }) {
  const display = loading ? null
    : format === 'percent' ? fmtPct(value)
    : format === 'text'    ? String(value)
    : fmtVal(value, currency)

  const inner = (
    <div
      className={cn(
        'group premium-card px-4 py-3 flex items-center gap-3 transition-all duration-200 hover-scale',
        to && 'cursor-pointer',
      )}
    >
      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: color + '18' }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider truncate">{title}</p>
        {loading
          ? <div className="h-5 w-16 mt-0.5 animate-pulse rounded bg-glass-panel" />
          : <p className="text-sm font-black text-text-primary leading-tight">{display}</p>}
      </div>
      {!loading && <TrendBadge trend={trend} label={trendLabel} />}
    </div>
  )

  return to ? <Link to={to} className="contents">{inner}</Link> : inner
}

/* ══════════════════════════════════════════════════════════════════ */
export default function SmartKPIStrip({ kpis = {}, revenueVsExpenses = [], loading, currency }) {
  const {
    revenue = 0, expenses = 0, netProfit = 0, cashBalance = 0,
  } = kpis

  const revSpark    = useMemo(() => revenueVsExpenses.map(d => d.revenue  ?? 0), [revenueVsExpenses])
  const expSpark    = useMemo(() => revenueVsExpenses.map(d => d.expenses ?? 0), [revenueVsExpenses])
  const profitSpark = useMemo(() => revenueVsExpenses.map(d => (d.revenue ?? 0) - (d.expenses ?? 0)), [revenueVsExpenses])

  const monthsElapsed   = Math.max(1, new Date().getMonth() + 1)
  const burnRate        = expenses > 0 ? Math.round(expenses / monthsElapsed) : 0
  const avgMonthlyRev   = revenue  > 0 ? Math.round(revenue  / monthsElapsed) : 0
  const profitMarginPct = revenue  > 0 ? (netProfit / revenue) * 100 : 0

  return (
    <div className="space-y-3">
      {/* ── Primary row — 4 main metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PrimaryCard title="Total Revenue"  value={revenue}   icon={TrendingUp}  color="#34d399"
          trend={revenue > 0 ? 1 : 0}   trendLabel="YTD" sparkData={revSpark}
          currency={currency} loading={loading} to="/reports/income-statement" />

        <PrimaryCard title="Total Expenses" value={expenses}  icon={TrendingDown} color="#f87171"
          trend={expenses > 0 ? -1 : 0} trendLabel="YTD" sparkData={expSpark}
          currency={currency} loading={loading} to="/reports/income-statement" />

        <PrimaryCard title="Net Profit"     value={netProfit} icon={DollarSign}
          color={netProfit >= 0 ? '#34d399' : '#f87171'}
          trend={netProfit > 0 ? 1 : netProfit < 0 ? -1 : 0}
          trendLabel={netProfit >= 0 ? 'Profit' : 'Loss'} sparkData={profitSpark}
          currency={currency} loading={loading} to="/reports/income-statement" />

        <PrimaryCard title="Cash Balance"   value={cashBalance} icon={Wallet} color="#06b6d4"
          trend={cashBalance > 0 ? 1 : cashBalance < 0 ? -1 : 0}
          trendLabel={cashBalance > 0 ? 'Positive' : 'Deficit'}
          currency={currency} loading={loading} to="/reports/balance-sheet" />
      </div>

      {/* ── Secondary row — derived / rate metrics (NO AR/AP — shown in Financial Position sidebar) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SecondaryChip title="Profit Margin" value={profitMarginPct} format="percent" icon={Percent}
          color={profitMarginPct >= 0 ? '#34d399' : '#f87171'}
          trend={profitMarginPct > 0 ? 1 : profitMarginPct < 0 ? -1 : 0}
          trendLabel={`${profitMarginPct.toFixed(1)}%`}
          currency={currency} loading={loading} to="/reports/income-statement" />

        <SecondaryChip title="Monthly Burn" value={burnRate} icon={Flame} color="#facc15"
          trend={burnRate > 0 ? -1 : 0} trendLabel="/mo avg"
          currency={currency} loading={loading} to="/reports/income-statement" />

        <SecondaryChip title="Avg Monthly Rev" value={avgMonthlyRev} icon={Activity} color="#a78bfa"
          trend={avgMonthlyRev > 0 ? 1 : 0} trendLabel="/mo avg"
          currency={currency} loading={loading} to="/reports/income-statement" />

        <SecondaryChip title="Revenue Target" value={profitMarginPct >= 20 ? 'On track' : 'Below 20%'}
          format="text" icon={Target}
          color={profitMarginPct >= 20 ? '#34d399' : '#f87171'}
          trend={profitMarginPct >= 20 ? 1 : -1}
          trendLabel={profitMarginPct >= 20 ? 'Healthy' : 'Review'}
          currency={currency} loading={loading} to="/reports/income-statement" />
      </div>
    </div>
  )
}
