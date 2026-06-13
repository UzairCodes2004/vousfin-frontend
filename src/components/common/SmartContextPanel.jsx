/**
 * SmartContextPanel — ERP Integration Refactor, Step 8 (Smart Contextual UI).
 *
 * Renders the contextual intelligence derived for a Bill / Invoice: the
 * recommended next step (with reasoning), contextual alerts (overdue, 3-way
 * mismatch, duplicate, stock/COGS impact, partial payment…), and cross-module
 * navigation links (PO, GRNs, party profile) unlocked by Steps 3–7.
 *
 * Pure presentational — all logic lives in utils/contextualEngine. It does NOT
 * duplicate the editor's action buttons; the recommendation is guidance. An
 * optional `onAction(actionId)` enables a one-click button for callers that can
 * perform the action (e.g. list-row quick actions).
 */
import { Link } from 'react-router-dom'
import { Sparkles, Lightbulb, AlertTriangle, Info, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react'
import { deriveEntityContext } from '@/utils/contextualEngine'
import { cn } from '@/utils/cn'

const ALERT_STYLE = {
  danger:  { wrap: 'border-negative/30 bg-negative/5 text-negative',       Icon: AlertCircle },
  warning: { wrap: 'border-amber/30 bg-amber/5 text-amber', Icon: AlertTriangle },
  info:    { wrap: 'border-cyan/25 bg-cyan/5 text-cyan',                Icon: Info },
  success: { wrap: 'border-positive/30 bg-positive/5 text-positive', Icon: Info },
}

export default function SmartContextPanel({ kind, entity, onAction, className = '' }) {
  if (!entity) return null
  const { recommended, alerts, links } = deriveEntityContext(kind, entity)
  if (!recommended && alerts.length === 0 && links.length === 0) return null

  return (
    <div className={cn('premium-card p-5 space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-bold text-text-primary">Smart Assistant</h3>
      </div>

      {/* Recommended next step */}
      {recommended && (
        <div className="rounded-lg border border-cyan/25 bg-cyan/5 p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-cyan mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Recommended: {recommended.label}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{recommended.reason}</p>
            </div>
            {onAction && (
              <button
                type="button"
                onClick={() => onAction(recommended.actionId)}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-cyan hover:underline"
              >
                {recommended.label} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contextual alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((a, i) => {
            const s = ALERT_STYLE[a.level] || ALERT_STYLE.info
            const Icon = s.Icon
            return (
              <div key={i} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', s.wrap)}>
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{a.message}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Cross-module links */}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {links.map((l, i) => (
            <Link
              key={i}
              to={l.to}
              className="inline-flex items-center gap-1 rounded-lg border border-glass bg-glass-panel px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-cyan hover:border-cyan/30 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
