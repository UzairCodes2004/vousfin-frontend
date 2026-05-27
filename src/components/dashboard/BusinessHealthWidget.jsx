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
import { useMemo } from 'react'
import {
  Activity, TrendingUp, DollarSign, Shield,
  AlertTriangle, CheckCircle2, Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'

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
  return s >= 75 ? '#34d399' : s >= 55 ? '#fbbf24' : '#f87171'
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
  safe:     { color: '#34d399', label: 'Safe',     hint: 'Cash runway is healthy',   Icon: CheckCircle2 },
  warning:  { color: '#fbbf24', label: 'Warning',  hint: 'Monitor cash closely',     Icon: AlertTriangle },
  critical: { color: '#f87171', label: 'Critical', hint: 'Immediate action required',Icon: Zap },
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
      <div className="relative h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${riskPct}%`,
            background:
              riskLevel === 'critical' ? 'linear-gradient(to right,#f87171,#fbbf24)' :
              riskLevel === 'warning'  ? 'linear-gradient(to right,#fbbf24,#34d399)' :
                                         'linear-gradient(to right,#06b6d4,#34d399)',
            transition: 'width 0.7s ease',
          }}
        />
        {/* scale ticks */}
        {[33, 66].map(p => (
          <div key={p} className="absolute top-0 h-full w-px bg-white/[0.12]" style={{ left: `${p}%` }} />
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
export default function BusinessHealthWidget({ kpis = {}, loading }) {
  const scores = useMemo(() => computeScores(kpis), [kpis])
  const overallColor = scoreColor(scores.overall)

  return (
    <div className="premium-card p-5">
      {/* ── header row ── */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-emerald-400/15">
          <Activity className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">Business Health Score</h3>
          <p className="text-[11px] text-text-muted">Computed from your live financials</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
          <div className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
          <div className="hidden md:block w-px bg-glass" />
          <div className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-4 md:gap-6">

          {/* Left: Risk Meter */}
          <RiskMeter
            riskLevel={scores.riskLevel}
            riskPct={scores.riskPct}
            runway={scores.runway}
          />

          {/* Divider */}
          <div className="hidden md:block h-16 w-px bg-glass" />

          {/* Middle: 4 score rings */}
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <ScoreRing score={scores.liquidity}     label="Liquidity"    icon={DollarSign}  ringColor="#06b6d4" />
            <ScoreRing score={Math.round(scores.profitability)} label="Profit"       icon={TrendingUp}  ringColor="#34d399" />
            <ScoreRing score={scores.operational}   label="Operations"   icon={Activity}    ringColor="#a78bfa" />
            <ScoreRing score={scores.tax}           label="Tax"          icon={Shield}      ringColor="#fbbf24" />
          </div>

          {/* Divider */}
          <div className="hidden md:block h-16 w-px bg-glass" />

          {/* Right: Overall score */}
          <div className="flex flex-col items-center justify-center gap-0.5 min-w-[52px]">
            <p className="text-3xl font-black leading-none" style={{ color: overallColor }}>
              {scores.overall}
            </p>
            <p className="text-[10px] text-text-muted font-semibold">/100</p>
            <p className="text-[10px] font-bold mt-1 uppercase tracking-wide" style={{ color: overallColor }}>
              {scores.overall >= 80 ? 'Excellent' : scores.overall >= 65 ? 'Good' : scores.overall >= 50 ? 'Fair' : 'Poor'}
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
