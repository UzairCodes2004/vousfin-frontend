/**
 * ProcurementTimeline — Phase 3.2
 *
 * Vertical timeline of PO state changes and approval events.
 * Compatible with the data returned by purchaseOrderService.getTimeline().
 *
 * Props:
 *   timeline  — array of { type, timestamp, fromState, toState, actorName, action, note }
 */
import { Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react'

const STATE_LABEL = {
  draft:               'Draft',
  pending_approval:    'Pending Approval',
  approved:            'Approved',
  partially_received:  'Partially Received',
  fully_received:      'Fully Received',
  billed:              'Billed',
  closed:              'Closed',
  cancelled:           'Cancelled',
}

const STATE_COLOR = {
  approved:           'text-emerald-400',
  fully_received:     'text-cyan',
  billed:             'text-sky-400',
  closed:             'text-emerald-600',
  cancelled:          'text-red-400',
  rejected:           'text-red-400',
}

function entryIcon(entry) {
  if (entry.action === 'approved')  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  if (entry.action === 'rejected')  return <XCircle className="h-3.5 w-3.5 text-red-400" />
  if (entry.toState === 'cancelled') return <XCircle className="h-3.5 w-3.5 text-red-400" />
  if (entry.toState === 'approved' || entry.toState === 'fully_received') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  }
  return <Clock className="h-3.5 w-3.5 text-text-muted" />
}

function entryLabel(entry) {
  if (entry.type === 'approval') {
    const actor = entry.actorName || 'Unknown'
    if (entry.action === 'submitted') return `Submitted for approval by ${actor}`
    if (entry.action === 'approved')  return `Approved by ${actor}`
    if (entry.action === 'rejected')  return `Rejected by ${actor}`
    return `Approval action by ${actor}`
  }
  if (entry.type === 'state') {
    const from = STATE_LABEL[entry.fromState] || entry.fromState
    const to   = STATE_LABEL[entry.toState]   || entry.toState
    const actor = entry.actorName ? ` by ${entry.actorName}` : ''
    return (
      <span>
        {from}{' '}
        <ArrowRight className="inline h-3 w-3 mx-0.5 text-text-muted" />
        {' '}<span className={STATE_COLOR[entry.toState] || 'text-text-primary'}>{to}</span>
        {actor}
      </span>
    )
  }
  return 'Event'
}

export default function ProcurementTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null

  // Show newest first, cap at 8 entries
  const entries = [...timeline]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8)

  return (
    <div className="premium-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-text-primary">Activity Timeline</h3>

      <ol className="relative border-l border-glass ml-3 space-y-4">
        {entries.map((entry, i) => (
          <li key={i} className="ml-5">
            {/* dot */}
            <span className="absolute -left-[7px] flex items-center justify-center w-3.5 h-3.5 rounded-full bg-navy border border-glass">
              {entryIcon(entry)}
            </span>

            <div>
              <p className="text-xs text-text-primary leading-snug">{entryLabel(entry)}</p>
              {(entry.reason || entry.note) && (
                <p className="text-[11px] text-text-muted mt-0.5 italic">
                  {entry.reason || entry.note}
                </p>
              )}
              <time className="text-[10px] text-text-muted">
                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
