import { useState } from 'react'
import {
  AlertTriangle, CheckCircle, Flag, ShieldAlert, Activity,
  ChevronDown, ChevronUp, Eye, EyeOff, X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDate } from '@/utils/formatters'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

// ─── Config ────────────────────────────────────────────────────────────────────
const SEVERITY = {
  critical: { border: 'border-negative/40',    bg: 'bg-negative/5',    icon: 'text-negative',    scoreBg: 'bg-negative/20 text-negative',    badge: 'danger'  },
  high:     { border: 'border-amber/40', bg: 'bg-amber/5', icon: 'text-amber', scoreBg: 'bg-amber/20 text-amber', badge: 'warning' },
  medium:   { border: 'border-amber/40', bg: 'bg-amber/5', icon: 'text-amber', scoreBg: 'bg-amber/20 text-amber', badge: 'warning' },
  low:      { border: 'border-glass',         bg: 'bg-glass-panel',  icon: 'text-text-muted', scoreBg: 'bg-glass-panel text-text-muted',       badge: 'default' },
}

const RISK_COLOR = {
  critical: 'text-negative',
  high:     'text-amber',
  medium:   'text-amber',
  low:      'text-positive',
}

const STATUS_LABEL = {
  potentially_fraudulent: 'Potential Fraud',
  highly_suspicious:      'Highly Suspicious',
  suspicious:             'Suspicious',
}

// Human-readable rule names
const RULE_LABELS = {
  extreme_amount_spike:        'Extreme amount spike',
  high_amount_deviation:       'High amount deviation',
  elevated_amount:             'Elevated amount',
  off_hours_entry:             'Off-hours entry',
  weekend_transaction:         'Weekend transaction',
  round_large_amount:          'Suspiciously round amount',
  round_medium_amount:         'Round-number amount',
  micro_transaction:           'Micro-transaction',
  rare_account_pair:           'Rare account pair',
  extreme_type_deviation:      'Extreme type-baseline deviation',
  strong_type_deviation:       'Strong type-baseline deviation',
  mild_type_deviation:         'Mild type-baseline deviation',
  novel_vendor_or_description: 'Novel vendor/description',
  extreme_daily_burst:         'Extreme daily burst',
  high_daily_burst:            'High daily burst',
  moderate_daily_burst:        'Moderate daily burst',
}

// ─── Score breakdown bar (visualises the 6 ensemble components) ──────────────
function BreakdownBar({ label, value, max = 1 }) {
  const pct = Math.round((value / max) * 100)
  const color = pct >= 60 ? 'bg-negative' : pct >= 30 ? 'bg-amber' : 'bg-cyan/60'
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-20 text-text-muted truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-glass-panel overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-text-secondary tabular-nums">{pct}%</span>
    </div>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AnomalyAlerts({ anomalies = [], onClassify }) {
  const [expandedId, setExpandedId] = useState(null)

  if (!Array.isArray(anomalies) || anomalies.length === 0) {
    return (
      <div className="premium-card p-12 text-center">
        <ShieldAlert className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-primary font-medium">No anomalies detected</p>
        <p className="text-text-muted text-sm mt-1">
          Run a scan to check your transaction patterns for irregularities.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {anomalies.map((a, i) => {
        const cfg         = SEVERITY[a.severity] || SEVERITY.medium
        const riskColor   = RISK_COLOR[a.fraudRiskLevel] || RISK_COLOR.medium
        const statusLabel = STATUS_LABEL[a.anomalyStatus] || 'Suspicious'
        const score       = typeof a.anomalyScore === 'number' ? a.anomalyScore : null
        const conf        = typeof a.confidence    === 'number' ? a.confidence    : null
        const rules       = Array.isArray(a.triggeredRules) ? a.triggeredRules : []
        const breakdown   = a.scoreBreakdown || {}
        const expanded    = expandedId === (a.alertId || a.id || i)

        return (
          <div
            key={a.alertId || a.id || i}
            className={cn('rounded-xl border transition-colors', cfg.border, cfg.bg)}
          >
            {/* ── Top row ─────────────────────────────────────────── */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn('h-5 w-5 flex-shrink-0 mt-0.5', cfg.icon)} />

                <div className="flex-1 min-w-0">
                  {/* Title + severity + status */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-text-primary text-sm truncate">
                      {a.title || a.description || 'Unknown Transaction'}
                    </span>
                    <Badge variant={cfg.badge} className="text-[10px] capitalize shrink-0">
                      {a.severity || 'medium'}
                    </Badge>
                    {a.anomalyStatus && (
                      <span className="text-[10px] font-medium text-text-muted capitalize shrink-0">
                        · {statusLabel}
                      </span>
                    )}
                    {a.status && a.status !== 'pending' && a.status !== 'pending_review' && (
                      <Badge variant="info" className="text-[10px] capitalize shrink-0">
                        {String(a.status).replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  {/* Short reason */}
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {a.reason || a.explanation || 'Unusual pattern detected by ML model.'}
                  </p>

                  {/* Triggered rule chips (top 4) */}
                  {rules.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rules.slice(0, 4).map((r, k) => (
                        <span key={k} className="px-1.5 py-0.5 rounded-full bg-glass-panel border border-glass text-[10px] text-text-secondary">
                          {RULE_LABELS[r] || r.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {rules.length > 4 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-text-muted">+{rules.length - 4} more</span>
                      )}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    {a.date && <span>{formatDate(a.date)}</span>}
                    {a.amount != null && (
                      <span className="font-semibold text-text-primary">{formatCurrency(a.amount)}</span>
                    )}
                    {a.transactionType && <span className="capitalize">{a.transactionType}</span>}
                    {score !== null && (
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', cfg.scoreBg)}>
                        <Activity className="h-3 w-3" />
                        Score {score}
                      </span>
                    )}
                    {conf !== null && (
                      <span className="text-[10px] text-text-secondary">
                        · {conf}% confidence
                      </span>
                    )}
                    {a.fraudRiskLevel && (
                      <span className={cn('font-medium capitalize', riskColor)}>{a.fraudRiskLevel} risk</span>
                    )}
                  </div>
                </div>

                {/* Expand/collapse toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : (a.alertId || a.id || i))}
                  className="text-text-muted hover:text-text-primary p-1 rounded transition-colors flex-shrink-0"
                  title={expanded ? 'Hide details' : 'Show details'}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* ── Action buttons ───────────────────────────────── */}
              <div className="mt-3 flex flex-wrap gap-2 pl-8">
                <Button
                  variant="ghost"
                  icon={CheckCircle}
                  onClick={() => onClassify?.(a, 'legitimate')}
                  className="text-positive hover:bg-positive/10 border border-positive/30 !py-1.5 !px-3 text-xs"
                >
                  Legitimate
                </Button>
                <Button
                  variant="ghost"
                  icon={Flag}
                  onClick={() => onClassify?.(a, 'fraud')}
                  className="text-negative hover:bg-negative/10 border border-negative/30 !py-1.5 !px-3 text-xs"
                >
                  Flag as Fraud
                </Button>
                <Button
                  variant="ghost"
                  icon={EyeOff}
                  onClick={() => onClassify?.(a, 'ignore')}
                  className="text-text-muted hover:bg-glass-panel border border-glass !py-1.5 !px-3 text-xs"
                >
                  Ignore
                </Button>
              </div>
            </div>

            {/* ── Expanded explainability panel ─────────────────── */}
            {expanded && (
              <div className="px-4 pb-4 pl-12 border-t border-glass animate-fade-in space-y-3">
                {/* Full explanation */}
                {a.explanation && a.explanation !== a.reason && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Why this was flagged</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{a.explanation}</p>
                  </div>
                )}

                {/* Score breakdown */}
                {Object.keys(breakdown).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">Ensemble component scores</p>
                    <div className="space-y-1">
                      <BreakdownBar label="Isolation Forest" value={breakdown.isolationForest || 0} />
                      <BreakdownBar label="Z-Score"          value={breakdown.zScore          || 0} />
                      <BreakdownBar label="Heuristics"       value={breakdown.heuristic       || 0} />
                      <BreakdownBar label="Behavioural"      value={breakdown.behavioral      || 0} />
                      <BreakdownBar label="Frequency"        value={breakdown.frequency       || 0} />
                      <BreakdownBar label="Velocity"         value={breakdown.velocity        || 0} />
                    </div>
                  </div>
                )}

                {/* All triggered rules */}
                {rules.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Triggered rules</p>
                    <div className="flex flex-wrap gap-1">
                      {rules.map((r, k) => (
                        <span key={k} className="px-1.5 py-0.5 rounded-full bg-glass-panel border border-glass text-[10px] text-text-secondary">
                          {RULE_LABELS[r] || r.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
