/**
 * AIForecastPage — v3 (Premium Enterprise Redesign)
 *
 * Changes vs v2:
 *  - 5 tabs: AI Forecast · Revenue · Cash Flow · Expenses · Scenario Sim
 *  - Enhanced KPI cards with sparklines and trend arrows
 *  - Feature Importance panel (explainability)
 *  - Risk Indicators panel (smart business alerts)
 *  - Category Breakdown chart
 *  - Scenario simulation tab with sensitivity sliders
 *  - Optimistic / Pessimistic toggles on chart
 *  - Trend Momentum badges
 *  - Anomaly risk always visible in header
 *  - Better loading states and empty states
 *  - Fully responsive
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BrainCircuit, TrendingUp, TrendingDown, AlertTriangle,
  BarChart3, DollarSign, Activity, ChevronUp, ChevronDown,
  Info, Lightbulb, ShieldCheck, Zap, Layers, Settings2,
  CircleDot, Gauge, Target, ArrowUpRight, ArrowDownRight,
  CreditCard, FlaskConical,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'

import {
  useForecast,
  useRevenueForecast,
  useCashflowForecast,
  useExpensesForecast,
  useBusinessGrowthForecast,
  useScenarioForecast,
  useForecastHealth,
  useForecastAnomalyRisk,
} from '@/hooks/useAI'

import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import ForecastChart from '@/components/charts/ForecastChart'
import ForecastCard from '@/components/forecasting/ForecastCard'
import { formatCurrency } from '@/utils/formatters'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { cn } from '@/utils/cn'

/* ══════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'unified',  label: 'AI Forecast',    icon: BrainCircuit  },
  { id: 'revenue',  label: 'Revenue',        icon: DollarSign    },
  { id: 'cashflow', label: 'Cash Flow',      icon: Activity      },
  { id: 'expenses', label: 'Expenses',       icon: CreditCard    },
  { id: 'scenario', label: 'Scenario Sim',   icon: FlaskConical  },
]

const METRICS = [
  { value: 'revenue',     label: 'Revenue Forecast'       },
  { value: 'expenses',    label: 'Expense Forecast'       },
  { value: 'netCashFlow', label: 'Net Cash Flow Forecast' },
]

const HORIZONS = [
  { value: 1,  label: '1 Month'   },
  { value: 3,  label: '3 Months'  },
  { value: 6,  label: '6 Months'  },
  { value: 9,  label: '9 Months'  },
  { value: 12, label: '12 Months' },
]

/* ══════════════════════════════════════════════════════
   SMALL SHARED COMPONENTS
══════════════════════════════════════════════════════ */

/** Enhanced KPI card with trend arrow and optional accent */
function KpiCard({ label, value, sub, isPositive, isCurrency = true, isPercent = false, accent = false, icon: Icon }) {
  const currency = useBusinessStore(s => s.currency)
  const up = isPositive !== false && isPositive !== null

  const displayed = isCurrency
    ? formatCurrency(value, currency)
    : isPercent
      ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(1)}%`
      : value

  return (
    <div className={cn(
      'premium-card p-4 flex flex-col gap-1.5 group hover:shadow-lg transition-shadow',
      accent ? 'border-cyan/30 bg-cyan/5' : ''
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 text-text-muted/60" />}
      </div>
      <div className="flex items-end justify-between mt-0.5">
        <span className="text-xl font-black text-text-primary leading-none">{displayed}</span>
        {isPositive !== null && isPositive !== undefined && (
          <span className={cn(
            'flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full',
            up ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'
          )}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-text-muted leading-tight mt-0.5">{sub}</span>}
    </div>
  )
}

/** Confidence badge */
function ConfBadge({ label, score }) {
  const color = label === 'High'   ? 'text-positive bg-positive/10 border-positive/30'
    : label === 'Medium' ? 'text-amber bg-amber/10 border-amber/30'
    : 'text-text-muted bg-glass border-glass'
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border', color)}>
      <ShieldCheck className="h-3 w-3" />
      {label} Confidence · {score}%
    </span>
  )
}

/** Honest engine/source labels — reflect the engine that ACTUALLY ran. */
const STRONG_SOURCES = new Set(['global', 'statistical', 'worker', 'lstm_live'])
const SOURCE_LABEL = {
  global:      '🌐 Global transfer model (cross-business ML)',
  statistical: '📈 Statistical model (conformal)',
  worker:      '🤖 AI worker (live data)',
  lstm_live:   '🤖 AI worker (live data)',
  live:        '✅ Live transactions',
  seed:        '🌱 Demo data',
}
function sourceLabel(ds) { return SOURCE_LABEL[ds] || '📊 Your data' }

/** Model source badge — shows the real model name, not a fixed brand. */
function ModelBadge({ dataSource, modelType }) {
  if (!dataSource || dataSource === 'none') return null
  const strong = STRONG_SOURCES.has(dataSource)
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border',
      strong ? 'text-cyan bg-cyan/10 border-cyan/30' : 'text-text-muted bg-glass border-glass'
    )}>
      <BrainCircuit className="h-3 w-3" />
      {modelType || (strong ? 'ML worker' : 'Statistical model')}
    </span>
  )
}

/** Anomaly risk chip */
function AnomalyRiskChip({ score, count }) {
  if (score == null || score === 0) return null
  const pct   = Math.round(score * 100)
  const color = pct >= 60 ? 'text-negative bg-negative/10 border-negative/30'
    : pct >= 30 ? 'text-amber bg-amber/10 border-amber/30'
    : 'text-positive bg-positive/10 border-positive/30'
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border', color)}>
      <AlertTriangle className="h-3 w-3" />
      {pct >= 30 ? `Anomaly risk: ${pct}%` : 'Clean data'}
      {count > 0 && <span className="opacity-70">({count} alerts)</span>}
    </span>
  )
}

/** Momentum badge */
function MomentumBadge({ momentum }) {
  if (!momentum) return null
  const short = momentum.short || 0
  const accel = momentum.acceleration || 0
  const isPos = short >= 0
  const accelerating = accel > 2
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
      isPos
        ? 'text-positive bg-positive/8 border-positive/20'
        : 'text-negative bg-negative/8 border-negative/20'
    )}>
      {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {short >= 0 ? '+' : ''}{short.toFixed(1)}% MoM
      {accelerating && <Zap className="h-2.5 w-2.5 ml-0.5" />}
    </span>
  )
}

/** Insight list item */
const INSIGHT_ICONS = {
  trend:          TrendingUp,
  growth:         BarChart3,
  risk:           AlertTriangle,
  recommendation: Lightbulb,
  info:           Info,
}
function InsightItem({ insight }) {
  const Icon     = INSIGHT_ICONS[insight.type] || Info
  const isWarn   = insight.type === 'risk' || insight.type === 'warning'
  const isRec    = insight.type === 'recommendation'
  return (
    <div className="flex gap-3 py-2.5 border-b border-glass/40 last:border-0">
      <div className={cn('mt-0.5 shrink-0', isWarn ? 'text-amber' : isRec ? 'text-positive' : 'text-cyan')}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{insight.text}</p>
    </div>
  )
}

/**
 * Data sufficiency banner — shown when the service returns dataSufficiency metadata.
 * Tiers: insufficient → sparse → adequate → rich.
 * When insufficient, it replaces the chart with an actionable no-data message.
 */
function DataSufficiencyBanner({ ds }) {
  if (!ds) return null

  const cfg = {
    insufficient: {
      icon: AlertTriangle,
      color: 'border-amber/40 bg-amber/5 text-amber',
      title: 'No Transaction Data',
    },
    sparse: {
      icon: Info,
      color: 'border-cyan/30 bg-cyan/5 text-cyan',
      title: 'Limited History',
    },
    adequate: {
      icon: ShieldCheck,
      color: 'border-positive/30 bg-positive/5 text-positive',
      title: 'Moderate History',
    },
    rich: {
      icon: ShieldCheck,
      color: 'border-positive/30 bg-positive/5 text-positive',
      title: 'Rich History',
    },
  }[ds.tier] || { icon: Info, color: 'border-glass bg-glass text-text-muted', title: 'Data Quality' }

  const Icon = cfg.icon

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${cfg.color}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold mb-0.5">{cfg.title}</p>
        <p className="opacity-80 leading-relaxed">{ds.message}</p>
        {ds.tier !== 'insufficient' && ds.nonZeroMonths != null && (
          <p className="mt-1 opacity-60">{ds.nonZeroMonths} active month{ds.nonZeroMonths !== 1 ? 's' : ''} of data</p>
        )}
      </div>
    </div>
  )
}

/** Risk indicator card */
const RISK_LEVEL_STYLE = {
  critical: 'border-negative/40 bg-negative/5 text-negative',
  warning:  'border-amber/40 bg-amber/5 text-amber',
  info:     'border-cyan/30 bg-cyan/5 text-cyan',
}
function RiskIndicatorCard({ indicator }) {
  const style = RISK_LEVEL_STYLE[indicator.level] || RISK_LEVEL_STYLE.info
  const Icon  = indicator.level === 'critical' ? AlertTriangle
    : indicator.level === 'warning' ? AlertTriangle
    : Lightbulb
  return (
    <div className={cn('flex gap-3 p-3 rounded-xl border', style)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold mb-0.5">{indicator.title}</p>
        <p className="text-[11px] opacity-80 leading-relaxed">{indicator.message}</p>
      </div>
    </div>
  )
}

/** Feature importance horizontal bar */
function FeatureBar({ name, pct, description }) {
  const color = pct >= 30 ? 'rgb(var(--c-accent))'
    : pct >= 20 ? 'rgb(var(--chart-revenue))'
    : 'rgb(var(--c-text3))'
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-text-secondary">{name}</span>
        <span className="text-[11px] font-bold text-text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 bg-glass rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-[10px] text-text-muted mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {description}
      </p>
    </div>
  )
}

/** KPI row from kpiSummary */
function KpiRow({ kpi, metric, currency }) {
  if (!kpi) return null
  const labelMap = { revenue: 'Revenue', expenses: 'Expenses', netCashFlow: 'Cash Flow' }
  const label = labelMap[metric] || kpi.target || 'Value'
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard
        label={`Next Month ${label}`}
        value={kpi.nextMonthValue}
        sub={`vs ${formatCurrency(kpi.lastActualValue, currency)} last month`}
        isPositive={kpi.isPositiveTrend}
        isCurrency
        accent
        icon={Target}
      />
      <KpiCard
        label="Month-on-Month Change"
        value={kpi.nextMonthChangePct}
        sub={`${formatCurrency(Math.abs(kpi.nextMonthChangeAmt), currency)} ${kpi.isPositiveTrend ? 'increase' : 'decrease'}`}
        isPositive={kpi.isPositiveTrend}
        isCurrency={false}
        isPercent
        icon={TrendingUp}
      />
      <KpiCard
        label="Peak Forecast"
        value={kpi.peakForecastValue}
        sub="Over forecast horizon"
        isPositive={null}
        isCurrency
        icon={Gauge}
      />
      <KpiCard
        label="Model Confidence"
        value={kpi.confidenceScore}
        sub={`${kpi.confidenceLabel} tier`}
        isPositive={kpi.confidenceScore >= 80}
        isCurrency={false}
        icon={ShieldCheck}
      />
    </div>
  )
}

/** Loading overlay */
function LoadingOverlay({ label = 'Running forecast engine…' }) {
  return (
    <div className="absolute inset-0 z-10 bg-navy/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-glass border-t-cyan animate-spin" />
        <BrainCircuit className="h-7 w-7 text-cyan animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-text-primary text-sm font-semibold">{label}</p>
        <p className="text-text-muted text-xs mt-1">Holt-Winters seasonal analysis in progress…</p>
      </div>
    </div>
  )
}

/** Category bar chart tooltip */
function CatTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v        = payload[0]?.value
  const currency = useBusinessStore(s => s.currency)
  return (
    <div className="bg-charcoal border border-glass p-2.5 rounded-lg shadow-lg text-xs">
      <p className="text-text-muted font-medium mb-1">{label}</p>
      <p className="text-cyan font-bold">{formatCurrency(v, currency)}</p>
      <p className="text-text-muted">{payload[0]?.payload?.count} transactions</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   EXPLAINABILITY PANEL (Feature Importance + Risk Indicators)
══════════════════════════════════════════════════════ */
function ExplainabilityPanel({ featureImportance = [], riskIndicators = [], momentum }) {
  const hasFeatures = featureImportance.length > 0
  const hasRisks    = riskIndicators.length > 0
  if (!hasFeatures && !hasRisks) return null

  return (
    <div className="space-y-4">
      {hasRisks && (
        <div className="premium-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 border-b border-glass pb-2">
            <AlertTriangle className="h-4 w-4 text-amber" />
            Risk Indicators
          </h3>
          <div className="space-y-2">
            {riskIndicators.slice(0, 4).map((r, i) => (
              <RiskIndicatorCard key={i} indicator={r} />
            ))}
          </div>
        </div>
      )}

      {hasFeatures && (
        <div className="premium-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 border-b border-glass pb-2">
            <Layers className="h-4 w-4 text-cyan" />
            Forecast Drivers
          </h3>
          <div className="space-y-3">
            {featureImportance.map((f, i) => (
              <FeatureBar key={i} name={f.name} pct={f.pct} description={f.description} />
            ))}
          </div>
          {momentum && (
            <div className="mt-3 pt-3 border-t border-glass/40 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-text-muted">Momentum:</span>
              <MomentumBadge momentum={momentum} />
              <span className="text-[10px] text-text-muted">
                Long-run: {momentum.long >= 0 ? '+' : ''}{momentum.long?.toFixed(1)}% / mo
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CATEGORY BREAKDOWN MINI-CHART
══════════════════════════════════════════════════════ */
function CategoryBreakdown({ businessCategories }) {
  if (!businessCategories?.length) return null

  const CAT_COLORS = ['rgb(var(--c-accent))', 'rgb(var(--chart-revenue))', 'rgb(var(--c-highlight))', 'rgb(var(--c-accent2))', 'rgb(var(--chart-expenses))', 'rgb(var(--c-accent))', 'rgb(var(--c-accent2))', 'rgb(var(--c-positive))']

  return (
    <div className="premium-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-4 border-b border-glass pb-2">
        <BarChart3 className="h-4 w-4 text-cyan" />
        Category Breakdown
        <span className="text-[10px] font-normal text-text-muted ml-1">(last 3 months)</span>
      </h3>
      <div style={{ width: '100%', height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={businessCategories.slice(0, 6)}
            layout="vertical"
            margin={{ top: 0, right: 50, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="rgb(var(--c-text) / 0.08)" horizontal={false} />
            <XAxis type="number" stroke="rgb(var(--c-text3))" fontSize={10} tickFormatter={formatCompact} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" stroke="rgb(var(--c-text3))" fontSize={10} tickLine={false} axisLine={false} width={80} />
            <Tooltip content={<CatTooltip />} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {businessCategories.slice(0, 6).map((_, i) => (
                <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Compact number formatter for axis ticks (no currency prefix — axes are labelled separately) */
function formatCompact(v) {
  const abs = Math.abs(v || 0)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v || 0))
}

/* ══════════════════════════════════════════════════════
   UNIFIED AI FORECAST TAB
══════════════════════════════════════════════════════ */
function UnifiedTab() {
  const [metric,  setMetric]  = useState('revenue')
  const [horizon, setHorizon] = useState(3)
  const mutation  = useForecast()
  const currency  = useBusinessStore(s => s.currency)
  const run       = useCallback(() => mutation.mutate({ metric, horizon }), [mutation, metric, horizon])

  useEffect(() => { mutation.mutate({ metric: 'revenue', horizon: 3 }) }, []) // eslint-disable-line

  const result = mutation.data

  return (
    <div className="space-y-5">
      {result?.kpiSummary && <KpiRow kpi={result.kpiSummary} metric={metric} currency={currency} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Controls */}
          <div className="premium-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-4 border-b border-glass pb-2">
              <Settings2 className="h-4 w-4 text-cyan" /> Parameters
            </h2>
            <div className="space-y-3">
              <Select label="Target Metric" options={METRICS} value={metric} onChange={setMetric} />
              <Select label="Time Horizon"  options={HORIZONS} value={horizon} onChange={v => setHorizon(+v)} />
              <Button fullWidth onClick={run} loading={mutation.isPending} icon={BrainCircuit} className="mt-1">
                Run AI Model
              </Button>
            </div>
          </div>

          {/* Data sufficiency banner */}
          {result?.dataSufficiency && (
            <DataSufficiencyBanner ds={result.dataSufficiency} />
          )}

          {/* Model info */}
          {result?.modelMeta && !result?.dataSufficiency?.isInsufficient && (
            <div className="premium-card p-4 space-y-1.5 text-xs text-text-secondary">
              <h3 className="text-xs font-semibold text-text-primary border-b border-glass pb-1.5 mb-2 flex items-center gap-1.5">
                <CircleDot className="h-3 w-3 text-cyan" /> Model Info
              </h3>
              <p><span className="text-text-muted">Engine:</span> {result.modelMeta.modelType}</p>
              <p><span className="text-text-muted">Look-back:</span> {result.modelMeta.lookBack} months</p>
              <p><span className="text-text-muted">Source:</span> {sourceLabel(result.modelMeta.dataSource)}</p>
              <div className="flex flex-wrap gap-2 pt-1.5">
                <ModelBadge dataSource={result.modelMeta.dataSource} modelType={result.modelMeta.modelType} />
                {result.confidenceLabel && (
                  <ConfBadge label={result.confidenceLabel} score={result.confidenceNumeric} />
                )}
                {result.anomalyRisk && (
                  <AnomalyRiskChip score={result.anomalyRisk.riskScore} count={result.anomalyRisk.total} />
                )}
              </div>
            </div>
          )}

          {/* Insights */}
          {result?.insights?.length > 0 && (
            <div className="premium-card p-5 border-cyan/20 bg-cyan/5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 border-b border-glass pb-2">
                <Zap className="h-4 w-4 text-cyan" /> AI Insights
              </h2>
              <div>
                {result.insights.slice(0, 5).map((ins, i) => <InsightItem key={i} insight={ins} />)}
              </div>
            </div>
          )}
        </div>

        {/* Chart column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between border-b border-glass pb-3 mb-5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-text-primary capitalize">
                  {metric.replace(/([A-Z])/g, ' $1').trim()} — {horizon}-Month Projection
                </h2>
                {result?.momentum && <MomentumBadge momentum={result.momentum} />}
              </div>
              {mutation.isPending && (
                <span className="text-xs text-cyan font-medium animate-pulse flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 animate-spin-slow" /> Processing…
                </span>
              )}
            </div>

            <div className="relative" style={{ minHeight: 380 }}>
              {mutation.isPending && <LoadingOverlay />}
              {result?.dataSufficiency?.isInsufficient ? (
                <div className="h-[380px] flex flex-col items-center justify-center gap-4 text-center px-8">
                  <AlertTriangle className="h-10 w-10 text-amber/60" />
                  <div>
                    <p className="text-text-primary font-semibold text-sm">No Forecast Available</p>
                    <p className="text-text-muted text-xs mt-1.5 leading-relaxed max-w-sm">
                      {result.dataSufficiency.message}
                    </p>
                  </div>
                </div>
              ) : result ? (
                <ForecastChart
                  historical={result.historical}
                  predicted={result.predicted}
                  upper={result.confidenceIntervals?.map(b => b.upper)}
                  lower={result.confidenceIntervals?.map(b => b.lower)}
                  metricName={metric}
                  scenarios={result.scenarios}
                  anomalyRisk={result.anomalyRisk?.riskScore || 0}
                  height={380}
                />
              ) : !mutation.isPending ? (
                <div className="h-[380px] flex items-center justify-center text-text-muted text-sm">
                  Select parameters and click <strong className="mx-1 text-cyan">Run AI Model</strong>.
                </div>
              ) : null}
            </div>
          </div>

          {/* Explainability + Category side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExplainabilityPanel
              featureImportance={result?.featureImportance}
              riskIndicators={result?.riskIndicators}
              momentum={result?.momentum}
            />
            {result?.categoryBreakdown?.length > 0 && (
              <CategoryBreakdown businessCategories={result.categoryBreakdown} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   GENERIC METRIC FORECAST TAB (Revenue / Cash Flow / Expenses)
══════════════════════════════════════════════════════ */
function MetricForecastTab({ useHook, label, metricKey }) {
  const [horizon, setHorizon] = useState(6)
  const mutation = useHook()
  const currency = useBusinessStore(s => s.currency)

  useEffect(() => { mutation.mutate({ horizon: 6 }) }, []) // eslint-disable-line

  const result = mutation.data

  return (
    <div className="space-y-5">
      {result?.kpiSummary && <KpiRow kpi={result.kpiSummary} metric={metricKey} currency={currency} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <div className="premium-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-4 border-b border-glass pb-2">
              <Settings2 className="h-4 w-4 text-cyan" /> Parameters
            </h2>
            <div className="space-y-3">
              <Select label="Time Horizon" options={HORIZONS} value={horizon} onChange={v => setHorizon(+v)} />
              <Button fullWidth onClick={() => mutation.mutate({ horizon })} loading={mutation.isPending}>
                Generate Forecast
              </Button>
            </div>
          </div>

          {/* Data sufficiency banner */}
          {result?.dataSufficiency && (
            <DataSufficiencyBanner ds={result.dataSufficiency} />
          )}

          {result?.modelMeta && !result?.dataSufficiency?.isInsufficient && (
            <div className="premium-card p-4 space-y-1.5 text-xs text-text-secondary">
              <h3 className="text-xs font-semibold text-text-primary border-b border-glass pb-1.5 mb-2">Model Info</h3>
              <p><span className="text-text-muted">Engine:</span> {result.modelMeta.modelType}</p>
              <p><span className="text-text-muted">Sequences:</span> {result.modelMeta.sequencesUsed} windows</p>
              <p><span className="text-text-muted">Source:</span> {sourceLabel(result.modelMeta.dataSource)}</p>
              <div className="flex flex-wrap gap-2 pt-1.5">
                {result.anomalyRisk && (
                  <AnomalyRiskChip score={result.anomalyRisk.riskScore} count={result.anomalyRisk.total} />
                )}
                {result.confidenceLabel && (
                  <ConfBadge label={result.confidenceLabel} score={result.confidenceNumeric} />
                )}
              </div>
            </div>
          )}

          {result?.insights?.length > 0 && (
            <div className="premium-card p-5 border-cyan/20 bg-cyan/5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 border-b border-glass pb-2">
                <Zap className="h-4 w-4 text-cyan" /> Insights
              </h2>
              {result.insights.map((ins, i) => <InsightItem key={i} insight={ins} />)}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between border-b border-glass pb-3 mb-5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-text-primary">
                  {label} — {horizon}-Month Seasonal Forecast
                </h2>
                {result?.momentum && <MomentumBadge momentum={result.momentum} />}
              </div>
              {mutation.isPending && (
                <span className="text-xs text-cyan animate-pulse flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 animate-spin-slow" /> Inferencing…
                </span>
              )}
            </div>

            <div className="relative" style={{ minHeight: 380 }}>
              {mutation.isPending && <LoadingOverlay />}
              {result?.dataSufficiency?.isInsufficient ? (
                <div className="h-[380px] flex flex-col items-center justify-center gap-4 text-center px-8">
                  <AlertTriangle className="h-10 w-10 text-amber/60" />
                  <div>
                    <p className="text-text-primary font-semibold text-sm">No Forecast Available</p>
                    <p className="text-text-muted text-xs mt-1.5 leading-relaxed max-w-sm">
                      {result.dataSufficiency.message}
                    </p>
                  </div>
                </div>
              ) : result ? (
                <ForecastChart
                  historical={result.historical}
                  predicted={result.predicted}
                  upper={result.confidenceIntervals?.map(b => b.upper)}
                  lower={result.confidenceIntervals?.map(b => b.lower)}
                  metricName={metricKey}
                  scenarios={result.scenarios}
                  anomalyRisk={result.anomalyRisk?.riskScore || 0}
                  height={380}
                />
              ) : !mutation.isPending ? (
                <div className="h-[380px] flex items-center justify-center text-text-muted text-sm">
                  Click <strong className="mx-1 text-cyan">Generate Forecast</strong> to begin.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExplainabilityPanel
              featureImportance={result?.featureImportance}
              riskIndicators={result?.riskIndicators}
              momentum={result?.momentum}
            />
            {result?.categoryBreakdown?.length > 0 && (
              <CategoryBreakdown businessCategories={result.categoryBreakdown} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SCENARIO SIMULATION TAB  — What-if analysis
══════════════════════════════════════════════════════ */
function ScenarioTab() {
  const [metric,           setMetric]           = useState('revenue')
  const [horizon,          setHorizon]          = useState(6)
  const [revenueMulti,     setRevenueMulti]     = useState(1.0)
  const [expenseMulti,     setExpenseMulti]     = useState(1.0)
  const [scenarioLabel,    setScenarioLabel]    = useState('Custom Scenario')
  const mutation = useScenarioForecast()
  const currency = useBusinessStore(s => s.currency)

  const run = useCallback(() => {
    mutation.mutate({
      metric,
      horizon,
      revenueMultiplier:  revenueMulti,
      expenseMultiplier:  expenseMulti,
      label:              scenarioLabel || 'Custom Scenario',
    })
  }, [mutation, metric, horizon, revenueMulti, expenseMulti, scenarioLabel])

  const result = mutation.data

  const PRESETS = [
    { label: 'Optimistic +20%',   rev: 1.20, exp: 0.95, color: 'text-positive' },
    { label: 'Revenue drop −15%', rev: 0.85, exp: 1.00, color: 'text-negative'     },
    { label: 'Cost spike +25%',   rev: 1.00, exp: 1.25, color: 'text-amber'  },
    { label: 'Worst case',        rev: 0.75, exp: 1.30, color: 'text-negative'      },
  ]

  const pctLabel = v => {
    const diff = Math.round((v - 1) * 100)
    return diff >= 0 ? `+${diff}%` : `${diff}%`
  }

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="premium-card p-5 border-cyan/20 bg-cyan/5 flex gap-3">
        <FlaskConical className="h-5 w-5 text-cyan shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-text-primary mb-1">What-if Scenario Simulation</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Adjust revenue and expense multipliers to simulate different business conditions.
            The AI model re-runs the Holt-Winters forecast with your adjusted parameters to show
            the impact on projected financials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Scenario controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="premium-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-4 border-b border-glass pb-2">
              <Settings2 className="h-4 w-4 text-cyan" /> Scenario Setup
            </h2>
            <div className="space-y-4">
              <Select label="Target Metric" options={METRICS} value={metric} onChange={setMetric} />
              <Select label="Forecast Horizon" options={HORIZONS} value={horizon} onChange={v => setHorizon(+v)} />

              {/* Revenue multiplier slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-text-secondary">Revenue Factor</label>
                  <span className={cn('text-xs font-bold', revenueMulti >= 1 ? 'text-positive' : 'text-negative')}>
                    {pctLabel(revenueMulti)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5" max="2.0" step="0.05"
                  value={revenueMulti}
                  onChange={e => setRevenueMulti(+e.target.value)}
                  className="w-full h-1.5 bg-glass rounded-full appearance-none cursor-pointer accent-cyan"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                  <span>−50%</span><span>0%</span><span>+100%</span>
                </div>
              </div>

              {/* Expense multiplier slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-text-secondary">Expense Factor</label>
                  <span className={cn('text-xs font-bold', expenseMulti <= 1 ? 'text-positive' : 'text-negative')}>
                    {pctLabel(expenseMulti)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5" max="2.0" step="0.05"
                  value={expenseMulti}
                  onChange={e => setExpenseMulti(+e.target.value)}
                  className="w-full h-1.5 bg-glass rounded-full appearance-none cursor-pointer accent-cyan"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                  <span>−50%</span><span>0%</span><span>+100%</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Scenario Name</label>
                <input
                  type="text"
                  value={scenarioLabel}
                  onChange={e => setScenarioLabel(e.target.value)}
                  placeholder="Custom Scenario"
                  className="w-full text-xs bg-glass border border-glass rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20"
                />
              </div>

              <Button fullWidth onClick={run} loading={mutation.isPending} icon={FlaskConical}>
                Run Simulation
              </Button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="premium-card p-4">
            <h3 className="text-xs font-bold text-text-primary mb-3 border-b border-glass pb-2">
              Quick Presets
            </h3>
            <div className="space-y-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setRevenueMulti(p.rev); setExpenseMulti(p.exp); setScenarioLabel(p.label); }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-glass hover:bg-glass transition-colors"
                >
                  <span className={cn('font-semibold', p.color)}>{p.label}</span>
                  <span className="text-text-muted ml-2 text-[10px]">
                    Rev {pctLabel(p.rev)} / Exp {pctLabel(p.exp)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scenario chart */}
        <div className="lg:col-span-3 space-y-4">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between border-b border-glass pb-3 mb-5">
              <h2 className="text-base font-bold text-text-primary">
                {result?.scenarioLabel || scenarioLabel} — {horizon}-Month Projection
              </h2>
              {mutation.isPending && (
                <span className="text-xs text-cyan animate-pulse flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 animate-bounce" /> Simulating…
                </span>
              )}
            </div>

            <div className="relative" style={{ minHeight: 380 }}>
              {mutation.isPending && <LoadingOverlay label="Running scenario simulation…" />}
              {result ? (
                <>
                  {/* Scenario KPIs */}
                  {result.kpiSummary && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <KpiCard
                        label="Next Month (Scenario)"
                        value={result.kpiSummary.nextMonthValue}
                        sub={`${result.kpiSummary.nextMonthChangePct >= 0 ? '+' : ''}${result.kpiSummary.nextMonthChangePct}% MoM`}
                        isPositive={result.kpiSummary.isPositiveTrend}
                        isCurrency
                        accent
                        icon={Target}
                      />
                      <KpiCard
                        label="Scenario Peak"
                        value={result.kpiSummary.peakForecastValue}
                        sub="Highest projected month"
                        isPositive={null}
                        isCurrency
                        icon={Gauge}
                      />
                      <KpiCard
                        label="Confidence"
                        value={result.kpiSummary.confidenceScore}
                        sub={result.kpiSummary.confidenceLabel}
                        isPositive={result.kpiSummary.confidenceScore >= 80}
                        isCurrency={false}
                        icon={ShieldCheck}
                      />
                    </div>
                  )}
                  <ForecastChart
                    historical={result.historical}
                    predicted={result.predicted}
                    upper={result.confidenceIntervals?.map(b => b.upper)}
                    lower={result.confidenceIntervals?.map(b => b.lower)}
                    metricName={metric}
                    scenarios={result.scenarios}
                    anomalyRisk={result.anomalyRisk?.riskScore || 0}
                    height={320}
                  />
                </>
              ) : !mutation.isPending ? (
                <div className="h-[380px] flex flex-col items-center justify-center text-text-muted gap-3">
                  <FlaskConical className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Adjust parameters and click <strong className="text-cyan">Run Simulation</strong></p>
                  <p className="text-xs opacity-60">See how different conditions affect your projected financials</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Scenario risk indicators */}
          {result?.riskIndicators?.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 border-b border-glass pb-2">
                <AlertTriangle className="h-4 w-4 text-amber" /> Scenario Risk Analysis
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.riskIndicators.map((r, i) => <RiskIndicatorCard key={i} indicator={r} />)}
              </div>
            </div>
          )}

          {/* Scenario insights */}
          {result?.insights?.length > 0 && (
            <div className="premium-card p-5 border-cyan/20 bg-cyan/5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 border-b border-glass pb-2">
                <Zap className="h-4 w-4 text-cyan" /> Scenario Insights
              </h3>
              {result.insights.slice(0, 4).map((ins, i) => <InsightItem key={i} insight={ins} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function AIForecastPage() {
  const [activeTab, setActiveTab] = useState('unified')
  const { data: healthData }      = useForecastHealth()
  const { data: anomalyRiskData } = useForecastAnomalyRisk()

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <BrainCircuit className="h-6 w-6 text-cyan" />
            AI Financial Forecasting
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Holt-Winters seasonal analysis — forecasting revenue, cash flow, and business growth in your business currency.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Anomaly risk in header */}
          {anomalyRiskData && anomalyRiskData.riskScore > 0 && (
            <AnomalyRiskChip score={anomalyRiskData.riskScore} count={anomalyRiskData.total} />
          )}
          {healthData && (
            <div className="flex items-center gap-2 text-xs bg-glass border border-glass rounded-lg px-3 py-2">
              <span className={cn(
                'h-2 w-2 rounded-full',
                healthData.lstmReady ? 'bg-cyan animate-pulse' : 'bg-positive animate-pulse'
              )} />
              <span className="text-text-muted whitespace-nowrap">
                {healthData.lstmReady
                  ? '🤖 AI forecast worker active'
                  : 'Built-in forecast engine'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── A3: trustworthy at-a-glance forecast cards (measured accuracy + confidence) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ForecastCard target="Revenue" horizon={6} />
        <ForecastCard target="Net Cash Flow" horizon={6} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-glass border border-glass rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(tab => {
          const Icon   = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
                active
                  ? tab.id === 'scenario'
                    ? 'bg-accent-2 text-white shadow-md'
                    : 'bg-cyan text-navy shadow-glow-cyan'
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'unified'  && <UnifiedTab />}
      {activeTab === 'revenue'  && (
        <MetricForecastTab useHook={useRevenueForecast}  label="Revenue"    metricKey="revenue"     />
      )}
      {activeTab === 'cashflow' && (
        <MetricForecastTab useHook={useCashflowForecast} label="Cash Flow"  metricKey="netCashFlow" />
      )}
      {activeTab === 'expenses' && (
        <MetricForecastTab useHook={useExpensesForecast} label="Expenses"   metricKey="expenses"    />
      )}
      {activeTab === 'scenario' && <ScenarioTab />}
    </div>
  )
}
