/**
 * ProcurementDashboard — Phase 3.4
 *
 * Dense, information-rich AP dashboard.
 * Layout:
 *   Row 1 — KPI strip (5 tiles)
 *   Row 2 — AP Aging + Cash Requirements + Vendor Risk alerts (3 cols)
 *   Row 3 — Vendor Spend (bar) | Payment Behaviour (line) | Cycle Time tile
 *   Row 4 — Upcoming Bills (paginated table) | Recent Activity feed
 *   Row 5 — Quick Actions + Alerts strip
 */
import { useState, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown, AlertTriangle, CheckCircle, Clock,
  RefreshCw, ArrowRight, Zap, FileText, ShoppingCart,
  Activity, Users, CreditCard, BarChart2,
} from 'lucide-react'
import {
  useFullAnalytics, useDashboardForecast, useRecentActivity,
} from '@/hooks/useProcurementAnalytics'
import { useVendorRiskSummary }   from '@/hooks/useVendorRisk'
import { useBillReminderSummary } from '@/hooks/useBillSchedule'
import { useAgingReport }         from '@/hooks/useExpenseAllocation'
import BillAgingHeatmap           from '@/components/ap/BillAgingHeatmap'
import ReminderStateBadge         from '@/components/ap/ReminderStateBadge'
import SkeletonLoader             from '@/components/ui/SkeletonLoader'

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt  = (n) => n == null ? '—' : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(Math.round(n || 0))
const pct  = (v) => v == null ? '—' : `${v}%`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'
const fmtAgo  = (d) => {
  if (!d) return ''
  const secs = Math.floor((Date.now() - new Date(d)) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`
  if (secs < 86400)return `${Math.floor(secs/3600)}h ago`
  return fmtDate(d)
}

// ── KPI Strip ──────────────────────────────────────────────────────────────────

const KPI_STRIP = memo(function KPIStrip({ forecast, aging, reminder, risk }) {
  const reqs  = forecast?.requirements
  const tiles = [
    {
      label:  'Total AP',
      value:  fmt(reqs?.next90?.amount),
      sub:    `${reqs?.next90?.count ?? 0} bills`,
      icon:   CreditCard,
      color:  'text-cyan',
      bg:     'bg-cyan/10',
    },
    {
      label:  'Overdue',
      value:  fmt(reqs?.overdue?.amount),
      sub:    `${reqs?.overdue?.count ?? 0} bills`,
      icon:   AlertTriangle,
      color:  'text-negative',
      bg:     'bg-negative/10',
      alert:  (reqs?.overdue?.count ?? 0) > 0,
    },
    {
      label:  'Due (30d)',
      value:  fmt(reqs?.next30?.amount),
      sub:    `${reqs?.next30?.count ?? 0} bills`,
      icon:   Clock,
      color:  'text-amber',
      bg:     'bg-amber/10',
    },
    {
      label:  'Pending Approval',
      value:  reminder?.awaiting_approval?.count ?? '—',
      sub:    'bills awaiting',
      icon:   CheckCircle,
      color:  'text-cyan',
      bg:     'bg-cyan/10',
    },
    {
      label:  'Critical Risk',
      value:  risk?.critical ?? 0,
      sub:    'vendors',
      icon:   Users,
      color:  (risk?.critical ?? 0) > 0 ? 'text-negative' : 'text-positive',
      bg:     (risk?.critical ?? 0) > 0 ? 'bg-negative/10' : 'bg-positive/10',
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-2">
      {tiles.map(({ label, value, sub, icon: Icon, color, bg, alert }) => (
        <div key={label} className={`premium-card p-3 relative ${alert ? 'border-negative/30' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wide">{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
              <p className="text-[10px] text-text-muted">{sub}</p>
            </div>
            <div className={`${bg} rounded-lg p-1.5`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </div>
          {alert && (
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-negative rounded-full animate-pulse" />
          )}
        </div>
      ))}
    </div>
  )
})

// ── Obligations Bar ────────────────────────────────────────────────────────────

const ObligationsBar = memo(function ObligationsBar({ data }) {
  if (!data?.length) return <p className="text-xs text-text-muted">No data</p>
  const max = Math.max(...data.map(d => d.amount), 1)
  const colors = ['bg-cyan', 'bg-cyan', 'bg-amber', 'bg-amber', 'bg-negative', 'bg-negative']
  return (
    <div className="space-y-2">
      {data.map((row, i) => (
        <div key={row.bucket} className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted">{row.bucket}</span>
            <span className="text-text-primary font-medium">{fmt(row.amount)} ({row.billCount})</span>
          </div>
          <div className="h-1.5 bg-glass rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[i % colors.length]} rounded-full transition-all`}
              style={{ width: `${Math.round((row.amount / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
})

// ── Vendor Spend Bars ──────────────────────────────────────────────────────────

const VendorSpendBars = memo(function VendorSpendBars({ vendors }) {
  if (!vendors?.length) return <p className="text-xs text-text-muted">No data</p>
  const maxSpend = Math.max(...vendors.map(v => v.totalSpend), 1)
  return (
    <div className="space-y-2">
      {vendors.slice(0, 8).map((v) => (
        <div key={v.vendorId} className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted truncate max-w-[130px]">{v.vendorName || 'Unknown'}</span>
            <span className="text-text-primary font-medium">{fmt(v.totalSpend)} <span className="text-text-muted">({v.sharePercent}%)</span></span>
          </div>
          <div className="h-1.5 bg-glass rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan rounded-full transition-all"
              style={{ width: `${Math.round((v.totalSpend / maxSpend) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
})

// ── Payment Behaviour Sparkline ────────────────────────────────────────────────

const PaymentBehaviourChart = memo(function PaymentBehaviourChart({ data }) {
  if (!data?.length) return <p className="text-xs text-text-muted">No data</p>
  return (
    <div className="space-y-1.5">
      {data.slice(-6).map((row) => (
        <div key={row.month} className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted w-14 shrink-0">{row.month}</span>
          <div className="flex-1 h-3 bg-glass rounded-full overflow-hidden flex">
            <div className="h-full bg-positive" style={{ width: `${Math.round((row.early  / Math.max(row.total, 1)) * 100)}%` }} title={`Early: ${row.early}`} />
            <div className="h-full bg-cyan"     style={{ width: `${Math.round((row.on_time/ Math.max(row.total, 1)) * 100)}%` }} title={`On-time: ${row.on_time}`} />
            <div className="h-full bg-negative"     style={{ width: `${Math.round((row.late   / Math.max(row.total, 1)) * 100)}%` }} title={`Late: ${row.late}`} />
          </div>
          <span className={`text-[10px] font-medium w-10 text-right ${(row.onTimeRate ?? 0) >= 80 ? 'text-positive' : 'text-amber'}`}>
            {pct(row.onTimeRate)}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        {[['bg-positive','Early'],['bg-cyan','On-time'],['bg-negative','Late']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${c}`} />
            <span className="text-[10px] text-text-muted">{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

// ── Upcoming Bills Table ───────────────────────────────────────────────────────

const UpcomingBillsTable = memo(function UpcomingBillsTable({ bills }) {
  if (!bills?.length) return <p className="text-xs text-text-muted py-2">No upcoming bills</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-glass">
            {['Bill', 'Vendor', 'Due', 'Balance', 'State'].map(h => (
              <th key={h} className="text-left py-1.5 px-1 text-text-muted font-medium text-[10px] uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-glass/50">
          {bills.map(b => (
            <tr key={b._id} className="hover:bg-glass/20 transition-colors">
              <td className="py-1.5 px-1">
                <Link to={`/purchases/bills/${b._id}/edit`} className="text-cyan hover:underline font-mono">
                  {b.billNumber}
                </Link>
              </td>
              <td className="py-1.5 px-1 text-text-muted max-w-[120px] truncate">{b.vendorSnapshot?.vendorName || '—'}</td>
              <td className="py-1.5 px-1 text-amber">{fmtDate(b.dueDate)}</td>
              <td className="py-1.5 px-1 text-text-primary font-medium">{fmt(b.remainingBalance)}</td>
              <td className="py-1.5 px-1">
                {b.reminderState
                  ? <ReminderStateBadge state={b.reminderState} />
                  : <span className="text-text-muted capitalize">{b.state}</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

// ── Activity Feed ──────────────────────────────────────────────────────────────

const ACTION_ICON = {
  created:    { icon: FileText,  color: 'text-cyan'     },
  approved:   { icon: CheckCircle, color: 'text-positive' },
  rejected:   { icon: AlertTriangle, color: 'text-negative' },
  state_changed: { icon: Activity, color: 'text-amber' },
  bill_matched: { icon: CheckCircle, color: 'text-positive' },
  bill_paid:  { icon: CreditCard, color: 'text-positive' },
  risk_refreshed: { icon: Users, color: 'text-cyan'        },
  default:    { icon: Activity,  color: 'text-text-muted'  },
}

const ActivityFeed = memo(function ActivityFeed({ events }) {
  if (!events?.length) return <p className="text-xs text-text-muted">No recent activity</p>
  return (
    <div className="space-y-2">
      {events.slice(0, 12).map((e, i) => {
        const cfg = ACTION_ICON[e.action] || ACTION_ICON.default
        const Icon = cfg.icon
        return (
          <div key={e._id ?? i} className="flex items-start gap-2">
            <div className="shrink-0 mt-0.5">
              <Icon className={`h-3 w-3 ${cfg.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-text-secondary leading-tight">
                <span className="capitalize">{e.action?.replace(/_/g, ' ')}</span>
                {e.entityRef && <span className="text-cyan ml-1 font-mono">{e.entityRef}</span>}
              </p>
              <p className="text-[10px] text-text-muted">
                {e.actorName || 'System'} · {fmtAgo(e.occurredAt)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
})

// ── Cycle Time Tile ────────────────────────────────────────────────────────────

const CycleTimeTile = memo(function CycleTimeTile({ data }) {
  const rows = [
    { label: 'PO → Bill',    value: data?.avgPoToBillDays,    unit: 'days' },
    { label: 'Bill → Paid',  value: data?.avgBillToPayDays,   unit: 'days' },
    { label: 'Payment Terms',value: data?.avgPaymentTermDays, unit: 'days' },
    { label: 'On-time Rate', value: data?.onTimeRate,         unit: '%'    },
  ]
  return (
    <div className="space-y-2">
      {rows.map(({ label, value, unit }) => (
        <div key={label} className="flex items-center justify-between py-1.5 border-b border-glass last:border-0">
          <span className="text-xs text-text-muted">{label}</span>
          <span className={`text-sm font-bold ${value != null ? 'text-text-primary' : 'text-text-muted'}`}>
            {value != null ? `${value}${unit === '%' ? '%' : ` ${unit}`}` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
})

// ── Efficiency Tile ────────────────────────────────────────────────────────────

const EfficiencyTile = memo(function EfficiencyTile({ data }) {
  const rows = [
    { label: 'PO-backed bills', value: pct(data?.poBackedRate),     color: data?.poBackedRate >= 70 ? 'text-positive' : 'text-amber' },
    { label: '3-way match pass', value: pct(data?.matchPassRate),   color: data?.matchPassRate >= 80 ? 'text-positive' : 'text-amber' },
    { label: 'Match issues',    value: data?.matchIssues ?? 0,      color: data?.matchIssues > 0 ? 'text-negative' : 'text-positive' },
    { label: 'Total spend',     value: fmt(data?.totalSpend),       color: 'text-text-primary' },
  ]
  return (
    <div className="space-y-2">
      {rows.map(({ label, value, color }) => (
        <div key={label} className="flex items-center justify-between py-1.5 border-b border-glass last:border-0">
          <span className="text-xs text-text-muted">{label}</span>
          <span className={`text-sm font-bold ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  )
})

// ── Alerts Strip ──────────────────────────────────────────────────────────────

function AlertsStrip({ overdue, matchIssues, criticalVendors }) {
  const alerts = [
    overdue?.totalOverdueCount    > 0 && { msg: `${overdue.totalOverdueCount} bills overdue (${fmt(overdue.totalOverdueAmount)})`, href: '/purchases/ap-workflow', color: 'bg-negative/10 text-negative border-negative/20' },
    (matchIssues ?? 0)            > 0 && { msg: `${matchIssues} 3-way match issues`, href: '/procurement/purchase-orders', color: 'bg-amber/10 text-amber border-amber/20' },
    (criticalVendors ?? 0)        > 0 && { msg: `${criticalVendors} critical-risk vendors`, href: '/purchases/ap-workflow', color: 'bg-negative/10 text-negative border-negative/20' },
  ].filter(Boolean)

  if (!alerts.length) return (
    <div className="flex items-center gap-2 premium-card p-2.5 border-positive/20">
      <CheckCircle className="h-4 w-4 text-positive shrink-0" />
      <span className="text-xs text-positive">All clear — no active procurement alerts</span>
    </div>
  )

  return (
    <div className="flex flex-wrap gap-2">
      {alerts.map((a, i) => (
        <Link key={i} to={a.href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${a.color}`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {a.msg}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ))}
    </div>
  )
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'New Bill',           to: '/purchases/bills/new',                    icon: FileText,      color: 'text-cyan'       },
  { label: 'New PO',             to: '/procurement/purchase-orders/new',        icon: ShoppingCart,  color: 'text-cyan'    },
  { label: 'AP Workflow',        to: '/purchases/ap-workflow',                  icon: BarChart2,     color: 'text-amber'  },
  { label: 'Vendor List',        to: '/vendors',                                icon: Users,         color: 'text-positive'},
]

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProcurementDashboard() {
  const [months, setMonths] = useState('6')

  const { data: analytics, isLoading: analyticsLoading } = useFullAnalytics({ months })
  const { data: forecast,  isLoading: forecastLoading  } = useDashboardForecast()
  const { data: activity,  isLoading: activityLoading  } = useRecentActivity({ limit: 15 })
  const { data: riskSummary } = useVendorRiskSummary()
  const { data: reminder   } = useBillReminderSummary()
  const { data: agingData, isLoading: agingLoading } = useAgingReport()

  const isLoading = analyticsLoading || forecastLoading

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Procurement Dashboard</h1>
          <p className="text-xs text-text-muted">AP analytics, cash forecasting & risk</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={months}
            onChange={e => setMonths(e.target.value)}
            className="text-xs bg-glass border border-glass rounded px-2 py-1 text-text-secondary"
          >
            {[3,6,12,24].map(m => (
              <option key={m} value={m}>{m} months</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            {QUICK_ACTIONS.map(({ label, to, icon: Icon, color }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-glass rounded text-xs text-text-secondary hover:text-cyan transition-colors"
              >
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1 — KPI strip */}
      {isLoading
        ? <div className="grid grid-cols-5 gap-2"><SkeletonLoader count={5} /></div>
        : <KPI_STRIP forecast={forecast} aging={agingData} reminder={reminder} risk={riskSummary} />
      }

      {/* Row 2 — Alerts */}
      <AlertsStrip
        overdue={analytics?.overdue}
        matchIssues={analytics?.efficiency?.matchIssues}
        criticalVendors={riskSummary?.critical}
      />

      {/* Row 3 — Aging + Cash Requirements + Obligations */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-5">
          <BillAgingHeatmap data={agingData} isLoading={agingLoading} />
        </div>
        <div className="col-span-3 premium-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-cyan" />
            Cash Requirements
          </h3>
          {forecastLoading ? <SkeletonLoader count={3} /> : (
            <div className="space-y-2">
              {[
                { label: 'Overdue',  data: forecast?.requirements?.overdue,  color: 'text-negative'     },
                { label: 'Next 30d', data: forecast?.requirements?.next30,   color: 'text-amber'   },
                { label: 'Next 60d', data: forecast?.requirements?.next60,   color: 'text-cyan'     },
                { label: 'Next 90d', data: forecast?.requirements?.next90,   color: 'text-text-primary'},
              ].map(({ label, data, color }) => (
                <div key={label} className="flex justify-between items-baseline py-1 border-b border-glass last:border-0">
                  <span className="text-[11px] text-text-muted">{label}</span>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${color}`}>{fmt(data?.amount)}</p>
                    <p className="text-[10px] text-text-muted">{data?.count ?? 0} bills</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-4 premium-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyan" />
            Payable Timeline
          </h3>
          {forecastLoading ? <SkeletonLoader count={4} /> : (
            <ObligationsBar data={forecast?.obligations} />
          )}
        </div>
      </div>

      {/* Row 4 — Vendor Spend | Payment Behaviour | Efficiency + Cycle Time */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 premium-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-text-primary">Top Vendor Spend</h3>
          {analyticsLoading ? <SkeletonLoader count={5} /> : (
            <VendorSpendBars vendors={analytics?.spend?.topVendors} />
          )}
        </div>
        <div className="col-span-4 premium-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-text-primary">Payment Behaviour</h3>
          {analyticsLoading ? <SkeletonLoader count={5} /> : (
            <PaymentBehaviourChart data={analytics?.paymentBehavior} />
          )}
        </div>
        <div className="col-span-2 premium-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber" />
            Cycle Times
          </h3>
          {analyticsLoading ? <SkeletonLoader count={4} /> : (
            <CycleTimeTile data={analytics?.cycleTime} />
          )}
        </div>
        <div className="col-span-2 premium-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
            <BarChart2 className="h-3.5 w-3.5 text-cyan" />
            Efficiency
          </h3>
          {analyticsLoading ? <SkeletonLoader count={4} /> : (
            <EfficiencyTile data={analytics?.efficiency} />
          )}
        </div>
      </div>

      {/* Row 5 — Upcoming Bills + Activity Feed */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 premium-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary">Upcoming Bills (14d)</h3>
            <Link to="/purchases/bills" className="text-[11px] text-cyan hover:underline">
              View all →
            </Link>
          </div>
          {forecastLoading ? <SkeletonLoader count={5} /> : (
            <UpcomingBillsTable bills={forecast?.urgentBills} />
          )}
        </div>
        <div className="col-span-4 premium-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-cyan" />
              Recent Activity
            </h3>
            {activityLoading && <RefreshCw className="h-3 w-3 text-text-muted animate-spin" />}
          </div>
          <ActivityFeed events={activity} />
        </div>
      </div>

    </div>
  )
}
