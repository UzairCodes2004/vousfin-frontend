import { useState, useEffect, useCallback } from 'react'
import {
  BrainCircuit, TrendingUp, TrendingDown, AlertTriangle,
  BarChart3, DollarSign, Activity, ChevronUp, ChevronDown,
  Info, Lightbulb, ShieldCheck, Zap,
} from 'lucide-react'
import {
  useForecast,
  useRevenueForecast,
  useCashflowForecast,
  useBusinessGrowthForecast,
  useForecastHealth,
} from '@/hooks/useAI'

import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import ForecastChart from '@/components/charts/ForecastChart'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { useBusinessStore } from '@/stores/useBusinessStore'

/* ══════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'unified',  label: 'AI Forecast',    icon: BrainCircuit },
  { id: 'revenue',  label: 'Revenue',        icon: DollarSign   },
  { id: 'cashflow', label: 'Cash Flow',      icon: Activity     },
  { id: 'growth',   label: 'Growth Report',  icon: BarChart3    },
]

const METRICS = [
  { value: 'revenue',     label: 'Revenue Forecast'       },
  { value: 'expenses',    label: 'Expense Forecast'       },
  { value: 'netCashFlow', label: 'Net Cash Flow Forecast' },
]

const HORIZONS = [
  { value: 1, label: '1 Month'  },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
]

/* ══════════════════════════════════════════════════════
   KPI CARD
   Shows one business metric in real PKR / % with trend.
══════════════════════════════════════════════════════ */
function KpiCard({ label, value, sub, isPositive, isCurrency = true, isPercent = false, accent = false }) {
  const currency = useBusinessStore(s => s.currency)
  const up = isPositive !== false && isPositive !== null

  const displayed = isCurrency
    ? formatCurrency(value, currency)
    : isPercent
      ? `${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}%`
      : value

  return (
    <div className={`premium-card p-4 flex flex-col gap-1 ${accent ? 'border-cyan/30 bg-cyan/5' : ''}`}>
      <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-xl font-black text-text-primary leading-none">{displayed}</span>
        {isPositive !== null && isPositive !== undefined && (
          <span className={`flex items-center text-xs font-semibold mb-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-text-muted mt-0.5">{sub}</span>}
    </div>
  )
}

/* ── Confidence badge ── */
function ConfBadge({ label, score }) {
  const color = label === 'High'   ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    : label === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
    : 'text-text-muted bg-glass border-glass'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${color}`}>
      <ShieldCheck className="h-3 w-3" />
      {label} Confidence · {score}%
    </span>
  )
}

/* ── Insight item in the panel ── */
const INSIGHT_ICONS = {
  trend:          TrendingUp,
  growth:         BarChart3,
  risk:           AlertTriangle,
  recommendation: Lightbulb,
  info:           Info,
}

function InsightItem({ insight }) {
  const Icon = INSIGHT_ICONS[insight.type] || Info
  const isWarning = insight.type === 'risk' || insight.type === 'warning'
  return (
    <div className="flex gap-3 py-2 border-b border-glass/50 last:border-0">
      <div className={`mt-0.5 shrink-0 ${isWarning ? 'text-warning' : 'text-cyan'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{insight.text}</p>
    </div>
  )
}

/* ── KPI row from kpiSummary object ── */
function KpiRow({ kpi, metric, currency }) {
  if (!kpi) return null
  const labelMap = {
    revenue:     'Revenue',
    expenses:    'Expenses',
    netCashFlow: 'Cash Flow',
  }
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
      />
      <KpiCard
        label="Month-on-Month Change"
        value={kpi.nextMonthChangePct}
        sub={`${formatCurrency(Math.abs(kpi.nextMonthChangeAmt), currency)} ${kpi.isPositiveTrend ? 'increase' : 'decrease'}`}
        isPositive={kpi.isPositiveTrend}
        isCurrency={false}
        isPercent
      />
      <KpiCard
        label="Peak Forecast Value"
        value={kpi.peakForecastValue}
        sub="Over forecast horizon"
        isPositive={null}
        isCurrency
      />
      <KpiCard
        label={`Model Confidence`}
        value={kpi.confidenceScore}
        sub={`${kpi.confidenceLabel} confidence tier`}
        isPositive={kpi.confidenceScore >= 85}
        isCurrency={false}
        isPercent={false}
      />
    </div>
  )
}

/* ── Loading overlay ── */
function LoadingOverlay({ label = 'Running LSTM inference…' }) {
  return (
    <div className="absolute inset-0 z-10 bg-navy/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-glass border-t-cyan animate-spin" />
        <BrainCircuit className="h-6 w-6 text-cyan animate-pulse" />
      </div>
      <p className="text-text-muted text-sm font-medium">{label}</p>
      <p className="text-text-muted text-xs">Processing accounting data through neural network…</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   UNIFIED AI FORECAST TAB  (uses /ai/forecast)
══════════════════════════════════════════════════════ */
function UnifiedTab() {
  const [metric, setMetric]   = useState('revenue')
  const [horizon, setHorizon] = useState(3)
  const mutation = useForecast()
  const currency = useBusinessStore(s => s.currency)

  const run = useCallback(() => mutation.mutate({ metric, horizon }), [mutation, metric, horizon])

  useEffect(() => { mutation.mutate({ metric: 'revenue', horizon: 3 }) }, []) // eslint-disable-line

  const result = mutation.data

  return (
    <div className="space-y-6">
      {/* KPI row */}
      {result?.kpiSummary && <KpiRow kpi={result.kpiSummary} metric={metric} currency={currency} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls + Insights */}
        <div className="lg:col-span-1 space-y-5">
          <div className="premium-card p-5">
            <h2 className="text-base font-bold text-text-primary mb-4 border-b border-glass pb-2">Parameters</h2>
            <div className="space-y-3">
              <Select label="Target Metric" options={METRICS} value={metric} onChange={setMetric} />
              <Select label="Time Horizon" options={HORIZONS} value={horizon} onChange={v => setHorizon(+v)} />
              <Button fullWidth onClick={run} loading={mutation.isPending} className="mt-2">
                Run AI Model
              </Button>
            </div>
          </div>

          {result?.modelMeta && (
            <div className="premium-card p-5 space-y-2 text-xs text-text-secondary">
              <h3 className="text-sm font-semibold text-text-primary border-b border-glass pb-1.5 mb-2">Model Info</h3>
              <p><span className="text-text-muted">Engine:</span> {result.modelMeta.modelType}</p>
              <p><span className="text-text-muted">Look-back:</span> {result.modelMeta.lookBack} months</p>
              <p><span className="text-text-muted">Data:</span> {result.modelMeta.dataSource === 'live' ? '✅ Live accounting data' : '📊 Reference dataset'}</p>
              {result.confidenceLabel && <ConfBadge label={result.confidenceLabel} score={result.confidenceNumeric} />}
            </div>
          )}

          {result?.insights?.length > 0 && (
            <div className="premium-card p-5 border-cyan/20 bg-cyan/5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3 border-b border-glass pb-2">
                <Zap className="h-4 w-4 text-cyan" />
                AI Insights
              </h2>
              <div>
                {result.insights.slice(0, 4).map((ins, i) => <InsightItem key={i} insight={ins} />)}
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="lg:col-span-3">
          <div className="premium-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-glass pb-3 mb-5">
              <h2 className="text-lg font-bold text-text-primary capitalize">
                {metric.replace(/([A-Z])/g, ' $1').trim()} — {horizon}-Month Projection
              </h2>
              {mutation.isPending && (
                <span className="text-xs text-cyan font-medium animate-pulse flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 animate-spin-slow" /> Processing…
                </span>
              )}
            </div>

            <div className="flex-1 min-h-[380px] relative">
              {mutation.isPending && <LoadingOverlay />}
              {result ? (
                <ForecastChart
                  historical={result.historical}
                  predicted={result.predicted}
                  upper={result.confidenceIntervals?.map(b => b.upper)}
                  lower={result.confidenceIntervals?.map(b => b.lower)}
                  metricName={metric}
                />
              ) : !mutation.isPending ? (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">
                  Select parameters and click <strong className="mx-1">Run AI Model</strong>.
                </div>
              ) : null}
            </div>

            {result && (
              <div className="mt-4 pt-3 border-t border-glass flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-3 h-3 rounded-sm" style={{ background: metric === 'expenses' ? '#f87171' : metric === 'netCashFlow' ? '#06b6d4' : '#34d399', opacity: 0.8 }} />
                    Historical actual
                  </span>
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-3 h-3 rounded-sm border-2 border-dashed" style={{ borderColor: metric === 'expenses' ? '#f87171' : metric === 'netCashFlow' ? '#06b6d4' : '#34d399' }} />
                    LSTM forecast
                  </span>
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-3 h-3 rounded-sm opacity-30" style={{ background: metric === 'expenses' ? '#f87171' : metric === 'netCashFlow' ? '#06b6d4' : '#34d399' }} />
                    Confidence band
                  </span>
                </div>
                <ConfBadge label={result.confidenceLabel || 'High'} score={result.confidenceNumeric || 92} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   METRIC FORECAST TAB  (revenue / cashflow)
══════════════════════════════════════════════════════ */
function MetricForecastTab({ useHook, label, metricKey }) {
  const [horizon, setHorizon] = useState(6)
  const mutation = useHook()
  const currency = useBusinessStore(s => s.currency)

  useEffect(() => { mutation.mutate({ horizon: 6 }) }, []) // eslint-disable-line

  const result = mutation.data

  return (
    <div className="space-y-6">
      {/* KPI row */}
      {result?.kpiSummary && <KpiRow kpi={result.kpiSummary} metric={metricKey} currency={currency} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-5">
          <div className="premium-card p-5">
            <h2 className="text-base font-bold text-text-primary mb-4 border-b border-glass pb-2">Parameters</h2>
            <div className="space-y-3">
              <Select label="Time Horizon" options={HORIZONS} value={horizon} onChange={v => setHorizon(+v)} />
              <Button fullWidth onClick={() => mutation.mutate({ horizon })} loading={mutation.isPending}>
                Generate Forecast
              </Button>
            </div>
          </div>

          {result?.modelMeta && (
            <div className="premium-card p-5 space-y-2 text-xs text-text-secondary">
              <h3 className="text-sm font-semibold text-text-primary border-b border-glass pb-1.5 mb-2">Model Info</h3>
              <p><span className="text-text-muted">Engine:</span> {result.modelMeta.modelType}</p>
              <p><span className="text-text-muted">Sequences:</span> {result.modelMeta.sequencesUsed} training windows</p>
              <p><span className="text-text-muted">Data:</span> {result.modelMeta.dataSource === 'live' ? '✅ Live accounting data' : '📊 Reference dataset'}</p>
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

        <div className="lg:col-span-3">
          <div className="premium-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-glass pb-3 mb-5">
              <h2 className="text-lg font-bold text-text-primary">
                {label} — {horizon}-Month LSTM Projection
              </h2>
              {mutation.isPending && (
                <span className="text-xs text-cyan animate-pulse flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 animate-spin-slow" /> Inferencing…
                </span>
              )}
            </div>

            <div className="flex-1 min-h-[380px] relative">
              {mutation.isPending && <LoadingOverlay />}
              {result ? (
                <ForecastChart
                  historical={result.historical}
                  predicted={result.predicted}
                  upper={result.confidenceIntervals?.map(b => b.upper)}
                  lower={result.confidenceIntervals?.map(b => b.lower)}
                  metricName={metricKey}
                />
              ) : !mutation.isPending ? (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">
                  Click <strong className="mx-1">Generate Forecast</strong> to begin.
                </div>
              ) : null}
            </div>

            {result?.confidenceLabel && (
              <div className="mt-4 pt-3 border-t border-glass flex justify-end">
                <ConfBadge label={result.confidenceLabel} score={result.confidenceNumeric} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   BUSINESS GROWTH TAB
══════════════════════════════════════════════════════ */
function GrowthTab() {
  const [horizon, setHorizon] = useState(6)
  const mutation = useBusinessGrowthForecast()
  const currency = useBusinessStore(s => s.currency)

  useEffect(() => { mutation.mutate({ horizon: 6 }) }, []) // eslint-disable-line

  const result = mutation.data

  const trendStyle = !result ? '' :
    result.growthTrend === 'Strong Growth'   ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
    : result.growthTrend === 'Moderate Growth' ? 'text-cyan border-cyan/30 bg-cyan/10'
    : result.growthTrend === 'Stable'          ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
    : 'text-red-400 border-red-400/30 bg-red-400/10'

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="w-44">
          <Select label="Forecast Horizon" options={HORIZONS} value={horizon} onChange={v => setHorizon(+v)} />
        </div>
        <Button onClick={() => mutation.mutate({ horizon })} loading={mutation.isPending}>
          Refresh Analysis
        </Button>
        {result?.growthTrend && (
          <span className={`text-sm font-bold px-4 py-2 rounded-full border ${trendStyle}`}>
            {result.growthTrend === 'Strong Growth'   && <TrendingUp   className="inline h-4 w-4 mr-1.5" />}
            {result.growthTrend === 'Moderate Growth' && <TrendingUp   className="inline h-4 w-4 mr-1.5" />}
            {result.growthTrend === 'Stable'          && <Activity     className="inline h-4 w-4 mr-1.5" />}
            {(result.growthTrend === 'Declining' || result.growthTrend === 'Slight Decline') && <TrendingDown className="inline h-4 w-4 mr-1.5" />}
            {result.growthTrend}
          </span>
        )}
      </div>

      {/* Growth KPI cards */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Avg Monthly Growth"
            value={result.avgMonthlyGrowthRate ?? 0}
            sub="Month-over-month average"
            isPositive={(result.avgMonthlyGrowthRate ?? 0) >= 0}
            isCurrency={false}
            isPercent
          />
          <KpiCard
            label={`${horizon}-Month Cumulative Growth`}
            value={result.cumulativeGrowthPercent ?? 0}
            sub="Total projected change"
            isPositive={(result.cumulativeGrowthPercent ?? 0) >= 0}
            isCurrency={false}
            isPercent
          />
          <KpiCard
            label="Peak Forecast Revenue"
            value={result.forecastRevenue?.length ? Math.max(...result.forecastRevenue) : 0}
            sub="Highest projected month"
            isPositive={null}
            isCurrency
          />
          <KpiCard
            label="Forecast Profit Peak"
            value={result.forecastProfit?.length ? Math.max(...result.forecastProfit) : 0}
            sub="Highest projected month"
            isPositive={null}
            isCurrency
          />
        </div>
      )}

      {/* Outlook text card */}
      {result?.outlookText && (
        <div className="premium-card p-5 border-cyan/20 bg-cyan/5 flex gap-3">
          <Lightbulb className="h-5 w-5 text-cyan shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary leading-relaxed">{result.outlookText}</p>
        </div>
      )}

      {/* Revenue trajectory chart */}
      {result && (
        <div className="premium-card p-6">
          <h3 className="text-base font-bold text-text-primary mb-4 border-b border-glass pb-2">
            Revenue Growth Trajectory (PKR)
          </h3>
          <ForecastChart
            historical={(result.historicalRevenue ?? []).map((value, i) => ({
              period: result.histLabels?.[i] ?? `M${i + 1}`,
              date:   new Date(new Date().getFullYear(), i, 1).toISOString(),
              value,
            }))}
            predicted={(result.forecastRevenue ?? []).map((value, i) => ({
              period: result.forecastLabels?.[i] ?? `F${i + 1}`,
              date:   new Date(new Date().getFullYear(), (result.histLabels?.length ?? 0) + i, 1).toISOString(),
              value,
            }))}
            metricName="revenue"
          />
        </div>
      )}

      {/* Profit trajectory chart */}
      {result && (
        <div className="premium-card p-6">
          <h3 className="text-base font-bold text-text-primary mb-4 border-b border-glass pb-2">
            Net Profit Growth Trajectory (PKR)
          </h3>
          <ForecastChart
            historical={(result.historicalProfit ?? []).map((value, i) => ({
              period: result.histLabels?.[i] ?? `M${i + 1}`,
              date:   new Date(new Date().getFullYear(), i, 1).toISOString(),
              value,
            }))}
            predicted={(result.forecastProfit ?? []).map((value, i) => ({
              period: result.forecastLabels?.[i] ?? `F${i + 1}`,
              date:   new Date(new Date().getFullYear(), (result.histLabels?.length ?? 0) + i, 1).toISOString(),
              value,
            }))}
            metricName="netCashFlow"
          />
        </div>
      )}

      {/* Data source note */}
      {result && (
        <p className="text-xs text-text-muted text-center">
          {result.dataSource === 'live'
            ? '✅ Analysis based on your live accounting transactions.'
            : '📊 Analysis based on reference industry data. Add transactions to personalise.'}
        </p>
      )}

      {mutation.isPending && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-glass border-t-cyan animate-spin" />
            <BarChart3 className="h-5 w-5 text-cyan animate-pulse" />
          </div>
          <p className="text-sm text-text-muted">Running LSTM growth analysis…</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function AIForecastPage() {
  const [activeTab, setActiveTab] = useState('unified')
  const { data: healthData }      = useForecastHealth()

  return (
    <div className="space-y-7 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <BrainCircuit className="h-6 w-6 text-cyan" />
            AI Financial Forecasting
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            LSTM neural network — forecasting revenue, cash flow, and business growth in real PKR values.
          </p>
        </div>

        {healthData && (
          <div className="flex items-center gap-2 text-xs bg-glass border border-glass rounded-lg px-3 py-2 self-start whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-text-muted">
              {healthData.models?.ensemble === 'ready'
                ? 'LightGBM + XGBoost ensemble · LSTM engine active'
                : 'LSTM forecasting engine active'}
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-glass border border-glass rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-cyan text-navy shadow-glow-cyan'
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'unified'  && <UnifiedTab />}
      {activeTab === 'revenue'  && (
        <MetricForecastTab useHook={useRevenueForecast}  label="Revenue"   metricKey="revenue"     />
      )}
      {activeTab === 'cashflow' && (
        <MetricForecastTab useHook={useCashflowForecast} label="Cash Flow" metricKey="netCashFlow" />
      )}
      {activeTab === 'growth'   && <GrowthTab />}
    </div>
  )
}
