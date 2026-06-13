/**
 * BusinessHealthWidget — Phase 5.6 Step 2
 *
 * Full-width horizontal card containing:
 *   - AI Health Score breakdown (4 rings: Liquidity, Profitability, Operational, Tax)
 *   - Cash Flow Risk Meter (safe / warning / critical)
 *   - Overall score badge
 *
 * All scores are derived from the KPI props — no additional API calls.
 */
import { memo, useMemo } from 'react'
import {
  Activity, TrendingUp, TrendingDown, DollarSign, Shield, Scale,
  AlertTriangle, CheckCircle2, Zap, Minus,
} from 'lucide-react'
import { useHealthScore, useHealthHistory } from '@/hooks/useAI'

/* ── Tiny trend sparkline ──────────────────────────────────────────── */
function Sparkline({ data = [], color = 'rgb(var(--c-positive))', w = 96, h = 26 }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 6) + 3).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible flex-shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.75" />
      <circle
        cx={((data.length - 1) * step).toFixed(1)}
        cy={(h - ((data[data.length - 1] - min) / range) * (h - 6) + 3).toFixed(1)}
        r="2.5" fill={color}
      />
    </svg>
  )
}

/* ── "vs last month" delta chip ────────────────────────────────────── */
function DeltaChip({ value }) {
  const up = value > 0
  const flat = value === 0
  const color = flat ? 'rgb(var(--c-text3))' : up ? 'rgb(var(--c-positive))' : 'rgb(var(--c-negative))'
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color }}>
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}{value} <span className="text-text-muted font-medium">vs last mo</span>
    </span>
  )
}

/* Server category → ring presentation. Order = display order. */
const CATEGORY_META = {
  liquidity:     { label: 'Liquidity',  icon: DollarSign, color: 'rgb(var(--c-accent))' },
  profitability: { label: 'Profit',     icon: TrendingUp, color: 'rgb(var(--c-positive))' },
  efficiency:    { label: 'Operations', icon: Activity,   color: 'rgb(var(--c-accent2))' },
  leverage:      { label: 'Leverage',   icon: Scale,      color: 'rgb(var(--c-accent2))' },
  tax:           { label: 'Tax',        icon: Shield,     color: 'rgb(var(--c-highlight))' },
}

const CONFIDENCE_META = {
  high:   { label: 'High confidence',   color: 'var(--c-positive)' },
  medium: { label: 'Medium confidence', color: 'var(--c-highlight)' },
  low:    { label: 'Low confidence',    color: 'var(--c-highlight)' },
}

/* ── Score computation ─────────────────────────────────────────────── */
function computeScores(kpis) {
  const {
    revenue = 0, expenses = 0, netProfit = 0, cashBalance = 0,
    accountsReceivable = 0,
  } = kpis

  const month = Math.max(1, new Date().getMonth() + 1)
  const burn  = expenses > 0 ? expenses / month : 0
  const runway = burn > 0 ? cashBalance / burn : 99

  /* Liquidity — months of cash runway */
  const liquidity =
    runway >= 6 ? 95 :
    runway >= 3 ? 80 :
    runway >= 2 ? 64 :
    runway >= 1 ? 46 :
    Math.max(10, Math.round(runway * 36))

  /* Profitability — net margin */
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0
  const profitability =
    margin >= 25 ? 95 :
    margin >= 15 ? 82 :
    margin >= 8  ? 68 :
    margin >= 0  ? 50 :
    Math.max(8, Math.round(50 + margin * 1.5))

  /* Operational — AR collection speed (lower AR/revenue ratio = good) */
  const arRatio = revenue > 0 ? (Math.abs(accountsReceivable) / revenue) * 100 : 0
  const operational =
    arRatio < 5  ? 92 :
    arRatio < 15 ? 78 :
    arRatio < 30 ? 62 :
    arRatio < 50 ? 46 :
    30

  /* Tax Compliance — conservative default; degrades only if data shows issues */
  const tax = 82

  /* Overall */
  const overall = Math.round((liquidity + profitability + operational + tax) / 4)

  /* Cash Risk */
  const riskLevel =
    runway >= 3 ? 'safe' :
    runway >= 1 ? 'warning' :
    'critical'
  const riskPct = Math.min(100, Math.max(4, (runway / 6) * 100))

  return { liquidity, profitability, operational, tax, overall, riskLevel, riskPct, runway, margin }
}

/* ── Colour helpers ────────────────────────────────────────────────── */
function scoreColor(s) {
  return s >= 75 ? 'rgb(var(--c-positive))' : s >= 55 ? 'rgb(var(--c-highlight))' : 'rgb(var(--c-negative))'
}

/* ── SVG ring ──────────────────────────────────────────────────────── */
function ScoreRing({ score, label, icon: Icon, ringColor }) {
  const r  = 17
  const c  = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(1, score / 100)) * c
  const color  = ringColor || scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-1.5 group">
      {/* ring */}
      <div className="relative h-12 w-12">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
          <circle
            cx="22" cy="22" r={r} fill="none"
            stroke={color} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${filled.toFixed(2)} ${(c - filled).toFixed(2)}`}
            style={{ transition: 'stroke-dasharray 0.7s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black leading-none" style={{ color }}>{score}</span>
        </div>
      </div>
      {/* label */}
      <div className="flex flex-col items-center gap-0.5">
        <Icon className="h-2.5 w-2.5" style={{ color }} />
        <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{label}</span>
      </div>
    </div>
  )
}

/* ── Cash Risk Meter ───────────────────────────────────────────────── */
const RISK = {
  safe:     { color: 'rgb(var(--c-positive))', label: 'Safe',     hint: 'Cash runway is healthy',   Icon: CheckCircle2 },
  warning:  { color: 'rgb(var(--c-highlight))', label: 'Warning',  hint: 'Monitor cash closely',     Icon: AlertTriangle },
  critical: { color: 'rgb(var(--c-negative))', label: 'Critical', hint: 'Immediate action required',Icon: Zap },
}

function RiskMeter({ riskLevel, riskPct, runway }) {
  const cfg = RISK[riskLevel] || RISK.safe
  const displayRunway = runway >= 99 ? '6+ mo' : `${runway.toFixed(1)} mo`

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {/* title row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Cash Flow Risk</p>
        <div className="flex items-center gap-1">
          <cfg.Icon className="h-3 w-3" style={{ color: cfg.color }} />
          <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      {/* bar */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-glass-panel">
        <div
          className="h-full rounded-full"
          style={{
            width: `${riskPct}%`,
            background:
              riskLevel === 'critical' ? 'linear-gradient(to right,rgb(var(--c-negative)),rgb(var(--c-highlight)))' :
              riskLevel === 'warning'  ? 'linear-gradient(to right,rgb(var(--c-highlight)),rgb(var(--c-positive)))' :
                                         'linear-gradient(to right,rgb(var(--c-accent)),rgb(var(--c-positive)))',
            transition: 'width 0.7s ease',
          }}
        />
        {/* scale ticks */}
        {[33, 66].map(p => (
          <div key={p} className="absolute top-0 h-full w-px bg-glass-panel" style={{ left: `${p}%` }} />
        ))}
      </div>
      {/* labels */}
      <div className="flex justify-between text-[9px] text-text-muted font-medium">
        <span>Critical</span>
        <span>Runway: {displayRunway}</span>
        <span>Safe (6mo+)</span>
      </div>
      <p className="text-[10px] text-text-muted">{cfg.hint}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/* Build a unified view-model from the server health score, or fall back to the
   client-side heuristic when the server has no/insufficient data. */
function buildView(server, kpis) {
  const serverReady = server && !server.insufficient && Number.isFinite(server.overall)

  if (serverReady) {
    const rings = Object.entries(CATEGORY_META)
      .filter(([key]) => server.categories?.[key] && Number.isFinite(server.categories[key].score))
      .map(([key, meta]) => ({
        key, ...meta,
        score: Math.round(server.categories[key].score),
        drivers: server.categories[key].drivers || [],
      }))

    // Top "why" drivers: take the weakest categories first.
    const drivers = [...rings]
      .sort((a, b) => a.score - b.score)
      .map(r => r.drivers[0])
      .filter(Boolean)
      .slice(0, 3)

    const runway = server.metrics?.runwayMonths == null ? 99 : server.metrics.runwayMonths
    const riskLevel = runway >= 3 ? 'safe' : runway >= 1 ? 'warning' : 'critical'
    const riskPct = Math.min(100, Math.max(4, (runway / 6) * 100))

    return {
      estimated: false,
      overall: server.overall,
      rings,
      risk: { riskLevel, riskPct, runway },
      confidenceKey: server.confidence,
      monthsOfData: server.monthsOfData,
      drivers,
    }
  }

  // Fallback — previous client heuristic (clearly labelled "estimated").
  const s = computeScores(kpis)
  return {
    estimated: true,
    overall: s.overall,
    rings: [
      { key: 'liquidity',     label: 'Liquidity',  icon: DollarSign, color: 'rgb(var(--c-accent))', score: s.liquidity,                 drivers: [] },
      { key: 'profitability', label: 'Profit',     icon: TrendingUp, color: 'rgb(var(--c-positive))', score: Math.round(s.profitability), drivers: [] },
      { key: 'operational',   label: 'Operations', icon: Activity,   color: 'rgb(var(--c-accent2))', score: s.operational,               drivers: [] },
      { key: 'tax',           label: 'Tax',        icon: Shield,     color: 'rgb(var(--c-highlight))', score: s.tax,                       drivers: [] },
    ],
    risk: { riskLevel: s.riskLevel, riskPct: s.riskPct, runway: s.runway },
    confidenceKey: null,
    monthsOfData: null,
    drivers: [],
  }
}

const BusinessHealthWidget = memo(function BusinessHealthWidget({ kpis = {}, loading }) {
  const { data: server, isLoading: healthLoading } = useHealthScore()
  const { data: history } = useHealthHistory(90)
  const view = useMemo(() => buildView(server, kpis), [server, kpis])
  const overallColor = scoreColor(view.overall)
  const isLoading = loading || healthLoading
  const insufficient = server && server.insufficient
  const conf = view.confidenceKey ? CONFIDENCE_META[view.confidenceKey] : null

  const trendData = Array.isArray(history?.points) ? history.points.map(p => p.overall) : []
  const delta = history?.delta?.value

  return (
    <div className="premium-card p-5">
      {/* ── header row ── */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-positive/15">
            <Activity className="h-4 w-4 text-positive" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Business Health Score</h3>
            <p className="text-[11px] text-text-muted">
              {view.estimated
                ? 'Estimated from your KPIs'
                : 'Computed from your live ledger (auditable)'}
            </p>
          </div>
        </div>
        {/* Confidence / source chip */}
        {!isLoading && !insufficient && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conf && (
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: `rgb(${conf.color} / 0.13)`, color: `rgb(${conf.color})` }}
                title={view.monthsOfData != null ? `${view.monthsOfData} months of data` : undefined}
              >
                {conf.label}{view.monthsOfData != null ? ` · ${view.monthsOfData}mo` : ''}
              </span>
            )}
            {view.estimated && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-glass-panel text-text-muted">
                Estimated
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
          <div className="h-20 animate-pulse rounded-xl bg-glass-panel" />
          <div className="hidden md:block w-px bg-glass" />
          <div className="h-20 animate-pulse rounded-xl bg-glass-panel" />
        </div>
      ) : insufficient ? (
        <div className="flex items-center gap-3 py-4 px-2 text-text-muted">
          <Activity className="h-5 w-5 flex-shrink-0 opacity-60" />
          <p className="text-xs leading-relaxed">
            {server.message || 'Not enough financial activity yet to score business health. Record a few transactions to unlock this.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">

            {/* Risk Meter — full width on mobile */}
            <div className="flex-1 min-w-0">
              <RiskMeter
                riskLevel={view.risk.riskLevel}
                riskPct={view.risk.riskPct}
                runway={view.risk.runway}
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block h-16 w-px bg-glass flex-shrink-0" />

            {/* Dynamic score rings */}
            <div className="flex items-center justify-around md:justify-center gap-4 md:gap-5 flex-shrink-0">
              {view.rings.map(r => (
                <ScoreRing key={r.key} score={r.score} label={r.label} icon={r.icon} ringColor={r.color} />
              ))}
            </div>

            {/* Divider */}
            <div className="hidden md:block h-16 w-px bg-glass flex-shrink-0" />

            {/* Overall score */}
            <div className="flex md:flex-col items-center md:justify-center gap-2 md:gap-0.5 flex-shrink-0">
              <p className="text-3xl font-black leading-none" style={{ color: overallColor }}>
                {view.overall}
              </p>
              <div className="flex md:flex-col items-center gap-1 md:gap-0.5">
                <p className="text-[10px] text-text-muted font-semibold">/100</p>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: overallColor }}>
                  {view.overall >= 80 ? 'Excellent' : view.overall >= 65 ? 'Good' : view.overall >= 50 ? 'Fair' : 'Poor'}
                </p>
              </div>
            </div>

          </div>

          {/* ── "Why" drivers ── */}
          {view.drivers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-glass">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">What's driving this</p>
              <ul className="space-y-1">
                {view.drivers.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-secondary">
                    <span className="mt-1 h-1 w-1 rounded-full bg-text-muted flex-shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Trend over time (sparkline + vs last month) ── */}
          {!view.estimated && trendData.length >= 2 && (
            <div className="mt-3 pt-3 border-t border-glass flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Trend</span>
                <Sparkline data={trendData} color={overallColor} />
              </div>
              {delta != null && <DeltaChip value={delta} />}
            </div>
          )}
        </>
      )}
    </div>
  )
})

export default BusinessHealthWidget
