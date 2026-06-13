/**
 * ForecastWidget — Phase 5.6
 * Compact embedded AI forecasting engine for the dashboard.
 * Auto-loads revenue forecast on mount; lets user switch metric & horizon.
 */
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, BarChart2, DollarSign, RefreshCw, Cpu } from 'lucide-react'
import {
  useRevenueForecast,
  useCashflowForecast,
  useExpensesForecast,
  useForecastHealth,
} from '@/hooks/useAI'
import ForecastChart from '@/components/charts/ForecastChart'
import ForecastExplanationCard from '@/components/dashboard/ForecastExplanationCard'
import { cn } from '@/utils/cn'

const METRICS = [
  { key: 'revenue',  label: 'Revenue',   Icon: TrendingUp, color: 'var(--chart-revenue)',  metricName: 'revenue'     },
  { key: 'cashflow', label: 'Cash Flow',  Icon: DollarSign, color: 'var(--c-accent)',       metricName: 'netCashFlow' },
  { key: 'expenses', label: 'Expenses',   Icon: BarChart2,  color: 'var(--chart-expenses)', metricName: 'expenses'    },
]
const HORIZONS = [3, 6, 12]

export default function ForecastWidget() {
  const [activeMetric, setActiveMetric] = useState('revenue')
  const [horizon,      setHorizon]      = useState(6)
  // cache: key=`${metric}-${horizon}` → forecast result
  const cache = useRef({})
  const [, forceRender] = useState(0)

  const revMut  = useRevenueForecast()
  const cashMut = useCashflowForecast()
  const expMut  = useExpensesForecast()

  const { data: health } = useForecastHealth()
  const engineOnline = health?.status === 'healthy' || health?.ready === true

  const mutations = { revenue: revMut, cashflow: cashMut, expenses: expMut }

  async function runForecast(metric, h) {
    const key = `${metric}-${h}`
    if (cache.current[key]) return                     // already cached
    const mut = mutations[metric]
    if (!mut) return
    try {
      const result = await mut.mutateAsync({ horizon: h })
      cache.current[key] = result
      forceRender(n => n + 1)
    } catch { /* toast handled by hook */ }
  }

  /* Auto-run revenue 6-month on mount */
  useEffect(() => { runForecast('revenue', 6) }, []) // eslint-disable-line

  const currentKey  = `${activeMetric}-${horizon}`
  const currentData = cache.current[currentKey]
  const activeMut   = mutations[activeMetric]
  const isLoading   = activeMut?.isPending
  const metricCfg   = METRICS.find(m => m.key === activeMetric) || METRICS[0]

  return (
    <div className="premium-card p-5 w-full bg-gradient-to-br from-glass-panel to-accent-2/5 border-accent-2/15">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent-2/15">
            <Cpu className="h-4 w-4 text-accent-2" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              AI Forecasting Engine
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                engineOnline ? 'bg-positive/15 text-positive' : 'bg-glass-panel text-text-muted',
              )}>
                {engineOnline ? '● Online' : '○ Standby'}
              </span>
            </h2>
            <p className="text-[11px] text-text-muted">
              {engineOnline
                ? 'Global transfer model + ensemble · confidence bands included'
                : 'Ensemble forecast · confidence bands included'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric tabs */}
          <div className="flex gap-0.5 bg-glass-panel rounded-lg p-0.5">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => {
                  setActiveMetric(m.key)
                  runForecast(m.key, horizon)
                }}
                className={cn(
                  'flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all',
                  activeMetric === m.key
                    ? 'shadow-sm'
                    : 'text-text-muted hover:text-text-secondary',
                )}
                style={activeMetric === m.key ? { background: `rgb(${m.color} / 0.13)`, color: `rgb(${m.color})` } : {}}
              >
                <m.Icon className="h-3 w-3" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Horizon pills */}
          <div className="flex gap-0.5 bg-glass-panel rounded-lg p-0.5">
            {HORIZONS.map(h => (
              <button
                key={h}
                onClick={() => {
                  setHorizon(h)
                  runForecast(activeMetric, h)
                }}
                className={cn(
                  'text-[11px] font-medium px-2.5 py-1 rounded-md transition-all',
                  horizon === h
                    ? 'bg-cyan/15 text-cyan shadow-sm'
                    : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {h}M
              </button>
            ))}
          </div>

          {/* Run button */}
          <button
            onClick={() => {
              delete cache.current[currentKey]   // force fresh run
              runForecast(activeMetric, horizon)
            }}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all',
              isLoading
                ? 'border-glass text-text-muted cursor-not-allowed'
                : 'border-cyan/30 text-cyan bg-cyan/5 hover:bg-cyan/10',
            )}
          >
            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
            {isLoading ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {/* ── Chart area ── */}
      {isLoading ? (
        <div className="h-52 flex flex-col items-center justify-center gap-3">
          <div className="relative h-8 w-8">
            <Cpu className="h-8 w-8 text-accent-2/20 absolute inset-0" />
            <Cpu className="h-8 w-8 text-accent-2 animate-ping absolute inset-0 opacity-25" />
          </div>
          <p className="text-xs text-text-muted">
            Generating {metricCfg.label.toLowerCase()} forecast for {horizon} months…
          </p>
        </div>
      ) : currentData ? (
        <ForecastChart
          historical={currentData.historical || []}
          predicted={currentData.predicted  || currentData.forecast || []}
          upper={currentData.upper          || currentData.upperBound || []}
          lower={currentData.lower          || currentData.lowerBound || []}
          metricName={metricCfg.metricName}
          scenarios={currentData.scenarios   || null}
          anomalyRisk={currentData.anomalyRisk ?? 0}
          height={220}
        />
      ) : (
        <div className="h-52 flex flex-col items-center justify-center gap-3 text-center">
          <div className="p-3 rounded-full bg-glass-panel">
            <Cpu className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-secondary">Generate a forecast</p>
            <p className="text-xs text-text-muted mt-1">
              Click <span className="text-cyan">Run</span> to generate AI-powered predictions
            </p>
          </div>
        </div>
      )}

      {/* ── Forecast Explanation ── */}
      {currentData && (
        <ForecastExplanationCard
          forecastData={currentData}
          metric={activeMetric}
          horizon={horizon}
        />
      )}

      {/* ── Footer ── */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[10px] text-text-muted">
          {currentData?.modelInfo
            ? `Model: ${currentData.modelInfo}`
            : 'LSTM auto-tuned per your transaction history'}
        </p>
        <Link to="/ai/forecast" className="text-[11px] text-cyan hover:underline font-medium flex-shrink-0">
          Full forecast →
        </Link>
      </div>
    </div>
  )
}
