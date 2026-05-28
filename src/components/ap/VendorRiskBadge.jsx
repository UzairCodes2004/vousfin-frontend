/**
 * VendorRiskBadge — Phase 3.3
 *
 * Compact risk indicator chip + optional score bar.
 * Props: riskLevel, riskScore, riskFactors, showDetails
 */
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react'

const LEVEL_CONFIG = {
  low:      { label: 'Low Risk',      bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', Icon: ShieldCheck },
  medium:   { label: 'Medium Risk',   bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     Icon: Shield      },
  high:     { label: 'High Risk',     bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   Icon: ShieldAlert },
  critical: { label: 'Critical Risk', bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     Icon: ShieldAlert },
}

const FACTOR_LABELS = {
  late_payment:      'Late payments',
  dispute_frequency: 'Dispute frequency',
  duplicate_billing: 'Duplicate billing',
  over_billing:      'Over-billing',
  price_anomaly:     'Price anomalies',
}

function ScoreBar({ score, level }) {
  const color = level === 'low' ? 'bg-emerald-400'
              : level === 'medium' ? 'bg-sky-400'
              : level === 'high' ? 'bg-amber-400'
              : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-glass overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-text-muted font-mono">{score}</span>
    </div>
  )
}

export default function VendorRiskBadge({ riskLevel, riskScore, riskFactors, showDetails = false }) {
  if (!riskLevel) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]
                        bg-glass text-text-muted border border-glass">
        No data
      </span>
    )
  }

  const cfg = LEVEL_CONFIG[riskLevel] || LEVEL_CONFIG.medium
  const { Icon } = cfg

  return (
    <div className={`inline-block rounded-lg border ${cfg.border} ${cfg.bg} px-2 py-1`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
      </div>

      {riskScore != null && (
        <ScoreBar score={riskScore} level={riskLevel} />
      )}

      {showDetails && riskFactors && (
        <div className="mt-2 space-y-0.5 border-t border-glass pt-1.5">
          {Object.entries(riskFactors)
            .filter(([, v]) => v > 5)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-[10px]">
                <span className="text-text-muted">{FACTOR_LABELS[key] || key}</span>
                <span className={`font-mono ${cfg.text}`}>{Math.round(val)}%</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
