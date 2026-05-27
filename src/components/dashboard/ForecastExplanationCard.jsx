/**
 * ForecastExplanationCard — Phase 5.6 Step 2
 *
 * Explains WHY the AI forecast changed — derives drivers from the
 * historical + predicted data returned by the LSTM model.
 *
 * Props:
 *   forecastData  — result from revenueForecast / cashflowForecast / expensesForecast
 *   metric        — 'revenue' | 'cashflow' | 'expenses'
 *   horizon       — number (months)
 */
import { memo, useMemo } from 'react'
import {
  Lightbulb, TrendingUp, TrendingDown, AlertCircle, Info,
} from 'lucide-react'
import { cn } from '@/utils/cn'

/* ── Metric → data key map ─────────────────────────────────────────── */
const METRIC_KEY = {
  revenue:  'revenue',
  cashflow: 'netCashFlow',
  expenses: 'expenses',
}

/* ── Extract a numeric value from a data point ─────────────────────── */
function valueOf(point, key) {
  if (!point) return 0
  return point[key] ?? point.value ?? point.predicted ?? point.actual ?? 0
}

/* ── Core driver computation ───────────────────────────────────────── */
function deriveDrivers(forecastData, metric, horizon) {
  if (!forecastData) return null

  const hist = forecastData.historical || []
  const pred = forecastData.predicted  || forecastData.forecast || []
  const key  = METRIC_KEY[metric] || 'revenue'

  if (hist.length < 2 && pred.length < 1) return null

  /* Historical trend: slope over last 3 data points */
  const hVals = hist.slice(-4).map(p => valueOf(p, key))
  const pVals = pred.slice(0, 3).map(p => valueOf(p, key))

  const lastHist  = hVals[hVals.length - 1] ?? 0
  const firstPred = pVals[0] ?? lastHist
  const lastPred  = pVals[pVals.length - 1] ?? firstPred

  /* Month-on-month trend in history (%) */
  const histTrend = hVals.length >= 2 && hVals[0] !== 0
    ? ((hVals[hVals.length - 1] - hVals[0]) / Math.abs(hVals[0])) * 100
    : 0

  /* Jump from last actual to first forecast (%) */
  const jumpPct = lastHist !== 0
    ? ((firstPred - lastHist) / Math.abs(lastHist)) * 100
    : 0

  /* Projected total change over full horizon (%) */
  const totalPct = lastHist !== 0 && pVals.length > 1
    ? ((lastPred - lastHist) / Math.abs(lastHist)) * 100
    : 0

  /* Anomaly risk (0–1) */
  const rawRisk  = forecastData.anomalyRisk ?? 0
  const confPct  = Math.round((1 - Math.min(0.9, rawRisk)) * 100)

  /* Compose driver chips */
  const drivers = []

  /* Driver 1: historical momentum */
  if (Math.abs(histTrend) >= 2) {
    drivers.push({
      Icon:  histTrend > 0 ? TrendingUp : TrendingDown,
      color: histTrend > 0 ? '#34d399' : '#f87171',
      text:  `Recent ${metric} ${histTrend > 0 ? 'growing' : 'declining'} ${Math.abs(histTrend).toFixed(1)}% over past ${hVals.length} months`,
    })
  } else {
    drivers.push({
      Icon: Info, color: '#94a3b8',
      text: `${metric.charAt(0).toUpperCase() + metric.slice(1)} trend stable over recent months`,
    })
  }

  /* Driver 2: model projection jump */
  if (Math.abs(jumpPct) >= 2) {
    drivers.push({
      Icon:  jumpPct > 0 ? TrendingUp : TrendingDown,
      color: jumpPct > 0 ? '#06b6d4' : '#fbbf24',
      text:  `Model projects ${jumpPct > 0 ? '+' : ''}${jumpPct.toFixed(1)}% shift entering the forecast window`,
    })
  }

  /* Driver 3: full-horizon outlook */
  if (Math.abs(totalPct) >= 3 && pVals.length > 1) {
    drivers.push({
      Icon:  totalPct > 0 ? TrendingUp : TrendingDown,
      color: totalPct > 0 ? '#34d399' : '#f87171',
      text:  `${horizon}-month total projection: ${totalPct > 0 ? '+' : ''}${totalPct.toFixed(1)}% from current`,
    })
  }

  /* Driver 4: model confidence */
  drivers.push({
    Icon:  confPct >= 70 ? Lightbulb : AlertCircle,
    color: confPct >= 70 ? '#a78bfa' : '#fbbf24',
    text:  `Model confidence: ${confPct}% — ${confPct >= 80 ? 'strong signal' : confPct >= 60 ? 'moderate signal' : 'limited data — add more transactions for accuracy'}`,
  })

  return drivers
}

/* ══════════════════════════════════════════════════════════════════ */
const ForecastExplanationCard = memo(function ForecastExplanationCard({ forecastData, metric = 'revenue', horizon = 6 }) {
  const drivers = useMemo(
    () => deriveDrivers(forecastData, metric, horizon),
    [forecastData, metric, horizon],
  )

  if (!drivers) return null

  return (
    <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5">
      {/* header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1 rounded-md bg-violet-500/15">
          <Lightbulb className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <p className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">
          Why this forecast changed
        </p>
      </div>

      {/* driver chips */}
      <div className="space-y-2">
        {drivers.map((d, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="p-0.5 rounded flex-shrink-0 mt-0.5" style={{ color: d.color }}>
              <d.Icon className="h-3 w-3" />
            </div>
            <p className="text-[11px] text-text-secondary leading-snug">{d.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
})

export default ForecastExplanationCard
