/**
 * APWorkflowBoard — Phase 3.3
 *
 * Kanban-style AP board.  Bills are grouped into workflow columns:
 *   Inbox (draft) | Under Review (awaiting_approval) | Approved |
 *   Scheduled | Paid | Blocked (match issues)
 *
 * Also shows:
 *   • Bill aging heatmap (total panel)
 *   • Reminder badge chips
 *   • Vendor risk indicators
 *   • Recurring bill schedules list
 *   • Filters: vendor, state, date range
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw, Calendar, ExternalLink,
  ChevronDown, Clock, Repeat,
} from 'lucide-react'
import { useBills }          from '@/hooks/useInvoices'
import { useBillSchedules, useBillReminderSummary, useDeactivateBillSchedule } from '@/hooks/useBillSchedule'
import { useAgingReport }    from '@/hooks/useExpenseAllocation'
import { useVendorRiskSummary, useRefreshAllRisk } from '@/hooks/useVendorRisk'
import BillAgingHeatmap      from '@/components/ap/BillAgingHeatmap'
import VendorRiskBadge       from '@/components/ap/VendorRiskBadge'
import ReminderStateBadge    from '@/components/ap/ReminderStateBadge'

const COLUMNS = [
  { key: 'inbox',            label: 'Inbox',            states: ['draft'],               color: 'border-glass', headerBg: 'bg-glass/50' },
  { key: 'under_review',     label: 'Under Review',     states: ['awaiting_approval'],   color: 'border-amber/30',  headerBg: 'bg-amber/10'  },
  { key: 'approved',         label: 'Approved',         states: ['approved'],            color: 'border-positive/30',headerBg: 'bg-positive/10'},
  { key: 'scheduled',        label: 'Scheduled',        states: ['scheduled'],           color: 'border-cyan/30',    headerBg: 'bg-cyan/10'    },
  { key: 'paid',             label: 'Paid',             states: ['paid'],                color: 'border-positive/30',headerBg: 'bg-positive/10'},
  { key: 'blocked',          label: 'Blocked',          states: ['overdue', 'cancelled'],color: 'border-negative/30',    headerBg: 'bg-negative/10'    },
]

const MATCH_STATUS_COLORS = {
  matched:       'text-positive',
  over_billed:   'text-amber',
  under_received:'text-amber',
  mismatch:      'text-amber',
  blocked:       'text-negative',
}

const fmt = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(Math.round(n || 0))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day:'numeric', month:'short' }) : '—'

function BillCard({ bill }) {
  const matchStatus = bill.threeWayMatchStatus
  return (
    <Link
      to={`/purchases/bills/${bill._id}/edit`}
      className="block premium-card p-3 hover:border-cyan/30 transition-colors space-y-1.5"
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-mono text-cyan truncate">{bill.billNumber}</span>
        {bill.reminderState && <ReminderStateBadge state={bill.reminderState} />}
      </div>

      <p className="text-[11px] text-text-muted truncate">
        {bill.vendorSnapshot?.vendorName || 'Vendor'}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">
          {fmt(bill.totalAmount)}
        </span>
        <span className="text-[10px] text-text-muted">{fmtDate(bill.dueDate)}</span>
      </div>

      {matchStatus && matchStatus !== 'none' && matchStatus !== 'pending' && (
        <span className={`text-[10px] font-medium capitalize ${MATCH_STATUS_COLORS[matchStatus] || 'text-text-muted'}`}>
          {matchStatus.replace(/_/g, ' ')}
        </span>
      )}

      {bill.isRecurring && (
        <div className="flex items-center gap-1 text-[10px] text-cyan">
          <Repeat className="h-3 w-3" />
          Recurring
        </div>
      )}
    </Link>
  )
}

function Column({ col, bills }) {
  const total = bills.reduce((s, b) => s + (b.totalAmount || 0), 0)
  return (
    <div className={`flex flex-col rounded-xl border ${col.color} bg-navy/50 min-w-[200px] max-w-[260px] flex-shrink-0`}>
      <div className={`${col.headerBg} px-3 py-2.5 rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary">{col.label}</span>
          <span className="text-[10px] text-text-muted bg-glass rounded-full px-1.5 py-0.5">
            {bills.length}
          </span>
        </div>
        {bills.length > 0 && (
          <p className="text-[10px] text-text-muted mt-0.5">{fmt(total)}</p>
        )}
      </div>
      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[60vh]">
        {bills.length === 0 ? (
          <p className="text-[11px] text-text-muted text-center py-4">No bills</p>
        ) : (
          bills.map(b => <BillCard key={b._id} bill={b} />)
        )}
      </div>
    </div>
  )
}

function ScheduleRow({ schedule, onDeactivate }) {
  const deactivate = useDeactivateBillSchedule()
  return (
    <div className="flex items-center justify-between py-2 border-b border-glass last:border-0">
      <div>
        <p className="text-sm text-text-primary">{schedule.name}</p>
        <p className="text-[11px] text-text-muted">
          {schedule.recurrencePattern} · Next: {fmtDate(schedule.nextRunDate)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[11px] px-1.5 py-0.5 rounded ${schedule.isActive ? 'bg-positive/15 text-positive' : 'bg-glass text-text-muted'}`}>
          {schedule.isActive ? 'Active' : 'Inactive'}
        </span>
        {schedule.isActive && (
          <button
            type="button"
            onClick={() => deactivate.mutate(schedule._id)}
            disabled={deactivate.isPending}
            className="text-[11px] text-negative hover:text-negative transition-colors"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  )
}

export default function APWorkflowBoard() {
  const [showSchedules, setShowSchedules] = useState(false)
  const [stateFilter, setStateFilter]     = useState('all')

  const { data: billsRaw, isLoading, refetch, isFetching } = useBills({ limit: 200 })
  const { data: schedules }   = useBillSchedules({ isActive: true })
  const { data: agingData, isLoading: agingLoading } = useAgingReport()
  const { data: reminderData } = useBillReminderSummary()
  const { data: riskSummary }  = useVendorRiskSummary()
  const refreshRisk = useRefreshAllRisk()

  const bills = useMemo(() => {
    const arr = Array.isArray(billsRaw?.docs)  ? billsRaw.docs
              : Array.isArray(billsRaw?.data)  ? billsRaw.data
              : Array.isArray(billsRaw)         ? billsRaw : []
    if (stateFilter === 'all') return arr
    if (stateFilter === 'overdue')   return arr.filter(b => b.reminderState === 'overdue' || b.reminderState === 'critical_overdue')
    if (stateFilter === 'recurring') return arr.filter(b => b.isRecurring)
    return arr.filter(b => b.state === stateFilter)
  }, [billsRaw, stateFilter])

  const columns = COLUMNS.map(col => ({
    ...col,
    bills: bills.filter(b => col.states.includes(b.state)),
  }))

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">AP Workflow</h1>
          <p className="text-xs text-text-muted">All payables across the pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshRisk.mutate()}
            disabled={refreshRisk.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-glass rounded text-xs text-text-secondary hover:text-cyan transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshRisk.isPending ? 'animate-spin' : ''}`} />
            Refresh Risk
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-glass rounded text-xs text-text-secondary hover:text-cyan transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top summary row */}
      <div className="grid grid-cols-12 gap-3">
        {/* Aging heatmap */}
        <div className="col-span-7">
          <BillAgingHeatmap data={agingData} isLoading={agingLoading} />
        </div>

        {/* Reminder + Risk summary */}
        <div className="col-span-5 space-y-3">
          {/* Reminder summary */}
          {reminderData && (
            <div className="premium-card p-4 space-y-2">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-cyan" />
                Reminder Summary
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'upcoming', label: 'Upcoming', color: 'text-cyan' },
                  { key: 'due_today', label: 'Due Today', color: 'text-amber' },
                  { key: 'overdue', label: 'Overdue', color: 'text-amber' },
                  { key: 'critical_overdue', label: 'Critical', color: 'text-negative' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="text-center">
                    <p className={`text-lg font-bold ${color}`}>{reminderData[key]?.count || 0}</p>
                    <p className="text-[10px] text-text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor risk summary */}
          {riskSummary && (
            <div className="premium-card p-4 space-y-2">
              <h3 className="text-xs font-bold text-text-primary">Vendor Risk</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { level: 'low',      color: 'text-positive' },
                  { level: 'medium',   color: 'text-cyan'     },
                  { level: 'high',     color: 'text-amber'   },
                  { level: 'critical', color: 'text-negative'     },
                ].map(({ level, color }) => riskSummary[level] > 0 && (
                  <div key={level} className="text-center">
                    <p className={`text-base font-bold ${color}`}>{riskSummary[level]}</p>
                    <p className="text-[10px] text-text-muted capitalize">{level}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'overdue', 'recurring'].map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setStateFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize
              ${stateFilter === f ? 'bg-cyan text-navy' : 'bg-glass text-text-muted hover:text-text-primary'}`}
          >
            {f === 'all' ? 'All Bills' : f}
          </button>
        ))}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowSchedules(s => !s)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-cyan transition-colors"
          >
            <Repeat className="h-3.5 w-3.5" />
            Recurring Schedules
            <ChevronDown className={`h-3 w-3 transition-transform ${showSchedules ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Recurring schedules panel */}
      {showSchedules && (
        <div className="premium-card p-4 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-cyan" />
              Active Schedules
            </h3>
            <Link
              to="/purchases/bills/new"
              className="text-xs text-cyan hover:underline"
            >
              New Bill
            </Link>
          </div>
          {!schedules || schedules.length === 0 ? (
            <p className="text-sm text-text-muted py-2">No active recurring schedules</p>
          ) : (
            schedules.map(s => <ScheduleRow key={s._id} schedule={s} />)
          )}
        </div>
      )}

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {isLoading
            ? <div className="text-sm text-text-muted py-8">Loading bills…</div>
            : columns.map(col => <Column key={col.key} col={col} bills={col.bills} />)
          }
        </div>
      </div>
    </div>
  )
}
