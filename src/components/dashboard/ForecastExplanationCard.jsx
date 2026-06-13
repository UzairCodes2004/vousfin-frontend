/**
 * ForecastExplanationCard
 *
 * Explains the forecast in plain English, grounded in the business's real
 * numbers: typical level, volatility, recent trend, where the model thinks the
 * metric is headed, an honest data-sufficiency caveat, and the real measured
 * confidence (never a reconstructed NaN).
 *
 * Props:
 *   forecastData — result from revenue/cashflow/expenses forecast
 *   metric       — 'revenue' | 'cashflow' | 'expenses'
 *   horizon      — number (months)
 */
import { memo, useMemo } from 'react'
import {
  Lightbulb, TrendingUp, TrendingDown, AlertCircle, Activity,
} from 'lucide-react'

const METRIC_KEY = {
  revenue:  'revenue',
  cashflow: 'netCashFlow',
  expenses: 'expenses',
}
const METRIC_NOUN = {
  revenue:  'revenue',
  cashflow: 'net cash flow',
  expenses: 'expenses',
}

/* ── helpers ───────────────────────────────────────────────────────── */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

function valueOf(point, key) {
  if (point == null) return 0
  if (typeof point === 'number') return point
  const v = point[key] ?? point.value ?? point.predicted ?? point.actual ?? 0
  return isNum(v) ? v : 0
}

function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0 }
function coefVar(a) {
  if (a.length < 2) return 0
  const m = mean(a)
  if (m === 0) return 0
  const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
  return sd / Math.abs(m)
}

function fmtMoney(v, currency = '') {
  const n = Math.abs(v || 0)
  const sign = v < 0 ? '-' : ''
  const cur = currency ? `${currency} ` : ''
  if (n >= 1_000_000) return `${cur}${sign}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${cur}${sign}${(n / 1_000).toFixed(0)}K`
  return `${cur}${sign}${Math.round(n).toLocaleString()}`
}

/** Resolve a real confidence % — never NaN. Prefer the server's measured value;
 *  otherwise derive from the anomaly-risk OBJECT (not the object itself). */
function resolveConfidence(forecastData) {
  if (isNum(forecastData.confidenceNumeric)) return Math.round(forecastData.confidenceNumeric)
  const ar = forecastData.anomalyRisk
  const risk = typeof ar === 'object' && ar !== null ? Number(ar.riskScore) : Number(ar)
  if (isNum(risk)) return Math.round((1 - Math.min(0.9, Math.max(0, risk))) * 100)
  return null
}

/* ── narrative + drivers ───────────────────────────────────────────── */
function build(forecastData, metric, horizon) {
  if (!forecastData) return null
  const key  = METRIC_KEY[metric]  || 'revenue'
  const noun = METRIC_NOUN[metric] || 'revenue'
  const cur  = forecastData.currency || ''

  const histAll = (forecastData.historical || []).map((p) => valueOf(p, key))
  const pred    = (forecastData.predicted || forecastData.forecast || []).map((p) => valueOf(p, key))
  const hist    = histAll.filter((v) => v !== 0)

  if (hist.length < 1 && pred.length < 1) return null

  const months = forecastData.dataSufficiency?.nonZeroMonths ?? hist.length
  const recent = hist.slice(-6)
  const avg    = recent.length ? mean(recent) : (pred[0] ?? 0)
  const cv     = coefVar(recent)
  const volWord = cv < 0.15 ? 'steady' : cv < 0.4 ? 'somewhat variable' : 'highly volatile'

  const histTrendPct = recent.length >= 2 && recent[0] !== 0
    ? ((recent[recent.length - 1] - recent[0]) / Math.abs(recent[0])) * 100
    : null

  const firstP = pred[0] ?? avg
  const lastP  = pred[pred.length - 1] ?? firstP
  const fcastPct = isNum(firstP) && firstP !== 0 ? ((lastP - firstP) / Math.abs(firstP)) * 100 : 0

  const conf = resolveConfidence(forecastData)

  /* ── Plain-English summary sentences ── */
  const sentences = []
  if (recent.length >= 1) {
    sentences.push(
      `Your monthly ${noun} has averaged about ${fmtMoney(avg, cur)} over the last ${months} month${months === 1 ? '' : 's'}, and has been ${volWord}.`
    )
  }
  if (histTrendPct != null && Math.abs(histTrendPct) >= 5) {
    sentences.push(
      `It ${histTrendPct > 0 ? 'rose' : 'fell'} about ${Math.abs(histTrendPct).toFixed(0)}% across that period.`
    )
  }
  if (pred.length >= 1) {
    if (Math.abs(fcastPct) >= 5) {
      sentences.push(
        `The model expects ${noun} to ${fcastPct > 0 ? 'rise' : 'ease'} toward ${fmtMoney(lastP, cur)} over the next ${horizon} months.`
      )
    } else {
      sentences.push(
        `The model expects ${noun} to hold around ${fmtMoney(firstP, cur)} over the next ${horizon} months.`
      )
    }
  }
  if (months < 6) {
    sentences.push(
      `With only ${months} month${months === 1 ? '' : 's'} of history this is an early estimate — accuracy improves a lot past 6–12 months of data.`
    )
  }

  /* ── Driver chips ── */
  const drivers = []
  if (histTrendPct != null && Math.abs(histTrendPct) >= 2) {
    drivers.push({
      Icon: histTrendPct > 0 ? TrendingUp : TrendingDown,
      color: histTrendPct > 0 ? 'rgb(var(--chart-revenue))' : 'rgb(var(--chart-expenses))',
      text: `Recent ${noun} ${histTrendPct > 0 ? 'up' : 'down'} ${Math.abs(histTrendPct).toFixed(0)}% over ${recent.length} months`,
    })
  } else {
    drivers.push({ Icon: Activity, color: 'rgb(var(--c-text3))', text: `${noun[0].toUpperCase() + noun.slice(1)} has been ${volWord} recently` })
  }
  if (Math.abs(fcastPct) >= 5 && pred.length > 1) {
    drivers.push({
      Icon: fcastPct > 0 ? TrendingUp : TrendingDown,
      color: fcastPct > 0 ? 'rgb(var(--c-accent))' : 'rgb(var(--c-highlight))',
      text: `${horizon}-month projection: ${fcastPct > 0 ? '+' : ''}${fcastPct.toFixed(0)}% vs first forecast month`,
    })
  }
  if (conf != null) {
    drivers.push({
      Icon: conf >= 70 ? Lightbulb : AlertCircle,
      color: conf >= 70 ? 'rgb(var(--c-accent2))' : 'rgb(var(--c-highlight))',
      text: `Model confidence ${conf}% — ${conf >= 75 ? 'strong signal' : conf >= 55 ? 'moderate signal' : 'limited data, treat as directional'}`,
    })
  }

  return { summary: sentences.join(' '), drivers }
}

/* ══════════════════════════════════════════════════════════════════ */
const ForecastExplanationCard = memo(function ForecastExplanationCard({ forecastData, metric = 'revenue', horizon = 6 }) {
  const data = useMemo(() => build(forecastData, metric, horizon), [forecastData, metric, horizon])
  if (!data) return null

  return (
    <div className="mt-3 rounded-xl border border-accent-2/20 bg-accent-2/5 p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1 rounded-md bg-accent-2/15">
          <Lightbulb className="h-3.5 w-3.5 text-accent-2" />
        </div>
        <p className="text-[11px] font-bold text-accent-2 uppercase tracking-wider">
          What this means for your business
        </p>
      </div>

      {/* plain-English summary */}
      {data.summary && (
        <p className="text-[12px] text-text-secondary leading-relaxed mb-3">{data.summary}</p>
      )}

      {/* driver chips */}
      <div className="space-y-2">
        {data.drivers.map((d, i) => (
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
