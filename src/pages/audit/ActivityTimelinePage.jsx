/**
 * ActivityTimelinePage — ERP Integration Refactor, Step 9.
 *
 * One cross-module activity feed that stitches together the durable audit log
 * (who-did-what state changes across every module) and the live business-event
 * stream (the cross-module signal flow: inventory moves, AR/AP balance changes,
 * goods received, tax, …). This is the "single pane of glass" that the
 * event-driven integration (Steps 2–8) makes possible.
 */
import { useMemo, useState } from 'react'
import { Activity, Zap, UserCog, RefreshCw, Filter, AlertTriangle } from 'lucide-react'
import { useActivityTimeline } from '@/hooks/useAudit'
import { formatDate } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import EmptyState from '@/components/ui/EmptyState'

const SOURCE_FILTERS = [
  { value: 'all',   label: 'All activity' },
  { value: 'audit', label: 'Audit log' },
  { value: 'event', label: 'System events' },
]

/* Colour a row by its action/event semantics. */
function toneFor(action = '') {
  const a = action.toLowerCase()
  if (/(delete|cancel|revers|reject|fail)/.test(a)) return 'text-negative bg-negative/10 border-negative/20'
  if (/(paid|approve|match|received|created|recorded)/.test(a)) return 'text-positive bg-positive/10 border-positive/20'
  if (/(balance_changed|valuation|low_stock|reduced|overdue)/.test(a)) return 'text-amber bg-amber/10 border-amber/20'
  return 'text-cyan bg-cyan/10 border-cyan/20'
}

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return formatDate(ts)
}

export default function ActivityTimelinePage() {
  const [source, setSource] = useState('all')
  const [limit, setLimit]   = useState(50)
  const { data, isLoading, isFetching, isError, refetch } = useActivityTimeline({ limit })

  const items = useMemo(() => {
    const all = data?.items ?? []
    return source === 'all' ? all : all.filter(i => i.source === source)
  }, [data, source])

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Activity className="h-6 w-6 text-cyan" />
            Activity Timeline
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Unified cross-module trail — audit-logged changes and live system events in one feed.
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => refetch()} loading={isFetching}>
          Refresh
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Filter className="h-3.5 w-3.5" /> Source:
        </div>
        <div className="inline-flex rounded-lg border border-glass overflow-hidden">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSource(f.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold transition-colors',
                source === f.value ? 'bg-cyan/15 text-cyan' : 'text-text-muted hover:text-text-primary'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          className="ml-auto rounded-lg border border-glass bg-glass-panel px-3 py-1.5 text-sm text-text-secondary"
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
        >
          {[25, 50, 100, 200].map(n => <option key={n} value={n}>Last {n}</option>)}
        </select>
      </div>

      {/* Summary chips */}
      {data && (
        <div className="flex gap-3 text-xs">
          <span className="rounded-lg border border-glass bg-glass-panel px-3 py-1.5 text-text-secondary">
            <UserCog className="inline h-3.5 w-3.5 mr-1 text-cyan" /> {data.auditCount} audit entries
          </span>
          <span className="rounded-lg border border-glass bg-glass-panel px-3 py-1.5 text-text-secondary">
            <Zap className="inline h-3.5 w-3.5 mr-1 text-amber" /> {data.eventCount} system events
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="premium-card p-5">
        {isLoading ? (
          <SkeletonLoader count={6} />
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load activity"
            description="Something went wrong fetching the activity trail. Please try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={source === 'all' ? 'No activity yet' : `No ${source} activity`}
            description="Actions across the system — ledger postings, approvals, payments, stock moves — will appear here in real time."
          />
        ) : (
          <ol className="relative border-l border-glass ml-2 space-y-4">
            {items.map((it, i) => (
              <li key={i} className="ml-4">
                <span className={cn(
                  'absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                  it.source === 'event' ? 'bg-amber/20 border-amber/40' : 'bg-cyan/20 border-cyan/40'
                )} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border', toneFor(it.action))}>
                        {it.source === 'event'
                          ? <Zap className="h-2.5 w-2.5" />
                          : <UserCog className="h-2.5 w-2.5" />}
                        {it.source}
                      </span>
                      <span className="text-sm font-semibold text-text-primary capitalize">{it.summary}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {it.entityType && <span className="capitalize">{String(it.entityType).replace(/_/g, ' ')}</span>}
                      {it.entityId && <span className="font-mono opacity-70"> · {String(it.entityId).slice(-6)}</span>}
                      {it.actorName && it.actorName !== 'system' && <span> · by {it.actorName}</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-text-muted whitespace-nowrap" title={it.timestamp ? new Date(it.timestamp).toLocaleString() : ''}>
                    {timeAgo(it.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
