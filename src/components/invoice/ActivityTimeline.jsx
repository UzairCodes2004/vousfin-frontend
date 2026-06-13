/**
 * ActivityTimeline — Phase 1 — drawer-style component that renders the
 * combined state-history + approval-log + field-history feed for an
 * Invoice or Bill.  Used in detail panels to give a QuickBooks-style
 * activity feed.
 */
import { formatDate } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import {
  CheckCircle2, XCircle, Send, ClipboardCheck, RotateCcw,
  Pencil, ArrowRightCircle, Clock,
} from 'lucide-react'

const STATE_ICONS = {
  draft:            Pencil,
  pending_approval: ClipboardCheck,
  awaiting_approval:ClipboardCheck,
  approved:         CheckCircle2,
  sent:             Send,
  partially_paid:   ArrowRightCircle,
  paid:             CheckCircle2,
  overdue:          Clock,
  cancelled:        XCircle,
  disputed:         RotateCcw,
  written_off:      XCircle,
  rejected:         XCircle,
  scheduled:        Clock,
}

function TimelineRow({ icon: Icon, color, title, subtitle, timestamp, last }) {
  return (
    <div className="relative pl-9 pb-4">
      {/* vertical connector */}
      {!last && (
        <span className="absolute left-3.5 top-7 h-full w-px bg-glass" />
      )}
      <span className={cn(
        'absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border',
        color,
      )}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        {timestamp && <p className="text-[10px] uppercase tracking-wider text-text-muted/70">{formatDate(timestamp)}</p>}
      </div>
    </div>
  )
}

export default function ActivityTimeline({ timeline = [], loading = false, emptyText = 'No activity yet.' }) {
  if (loading) {
    return <div className="p-4 text-sm text-text-muted">Loading timeline…</div>
  }
  if (!timeline?.length) {
    return <div className="p-4 text-sm text-text-muted">{emptyText}</div>
  }
  return (
    <div className="p-4">
      {timeline.map((entry, i) => {
        const last = i === timeline.length - 1
        if (entry.type === 'state') {
          const Icon = STATE_ICONS[entry.toState] || ArrowRightCircle
          return (
            <TimelineRow
              key={i}
              icon={Icon}
              color="bg-cyan/10 text-cyan border-cyan/30"
              title={`State: ${entry.fromState} → ${entry.toState}`}
              subtitle={`${entry.actorName || 'System'}${entry.reason ? ` · ${entry.reason}` : ''}`}
              timestamp={entry.timestamp}
              last={last}
            />
          )
        }
        if (entry.type === 'approval') {
          const Icon = entry.action === 'approved' ? CheckCircle2
                     : entry.action === 'rejected' ? XCircle
                     : ClipboardCheck
          const color = entry.action === 'approved' ? 'bg-emerald/10 text-positive border-emerald/30'
                      : entry.action === 'rejected' ? 'bg-negative/10 text-negative border-negative/30'
                      : 'bg-amber/10 text-amber border-amber/30'
          const titleByAction = {
            submitted: 'Submitted for approval',
            approved:  'Approved',
            rejected:  'Rejected',
          }
          return (
            <TimelineRow
              key={i}
              icon={Icon}
              color={color}
              title={titleByAction[entry.action] || entry.action}
              subtitle={`${entry.actorName || 'Unknown'}${entry.actorRole ? ` (${entry.actorRole})` : ''}${entry.note ? ` · ${entry.note}` : ''}`}
              timestamp={entry.timestamp}
              last={last}
            />
          )
        }
        // field change
        return (
          <TimelineRow
            key={i}
            icon={Pencil}
            color="bg-glass-panel text-text-muted border-glass-2"
            title={`Field edited: ${entry.field}`}
            subtitle={`${String(entry.before ?? '—')} → ${String(entry.after ?? '—')}`}
            timestamp={entry.timestamp || entry.changedAt}
            last={last}
          />
        )
      })}
    </div>
  )
}
