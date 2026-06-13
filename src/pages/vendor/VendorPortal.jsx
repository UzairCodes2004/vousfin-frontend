/**
 * VendorPortal — Phase 3.3
 *
 * Vendor self-service hub.  Tabbed layout:
 *   • Bills        — bill status tracker + upload bill
 *   • Documents    — all documents linked to this vendor
 *   • Balances     — outstanding payable balance + credits
 *   • Payment History — paid bills
 *   • Risk         — risk score card
 */
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FileText, Upload, BarChart2, CreditCard, History,
  ShieldAlert, ArrowLeft, RefreshCw, ExternalLink,
} from 'lucide-react'
import { useBills }             from '@/hooks/useInvoices'
import { useComputeVendorRisk } from '@/hooks/useVendorRisk'
import VendorRiskBadge          from '@/components/ap/VendorRiskBadge'
import ReminderStateBadge       from '@/components/ap/ReminderStateBadge'
import SkeletonLoader           from '@/components/ui/SkeletonLoader'

const TABS = [
  { key: 'bills',    label: 'Bills',          Icon: FileText    },
  { key: 'balances', label: 'Balances',        Icon: BarChart2   },
  { key: 'payments', label: 'Payment History', Icon: History     },
  { key: 'risk',     label: 'Risk Profile',    Icon: ShieldAlert },
]

const STATE_COLORS = {
  draft:             'bg-glass text-text-muted',
  awaiting_approval: 'bg-amber/15 text-amber',
  approved:          'bg-positive/15 text-positive',
  scheduled:         'bg-cyan/15 text-cyan',
  partially_paid:    'bg-cyan/15 text-cyan',
  paid:              'bg-positive/20 text-positive',
  overdue:           'bg-negative/15 text-negative',
  cancelled:         'bg-glass text-text-muted line-through',
}

const fmt = (n, currency = 'PKR') =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n || 0)

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

function BillRow({ bill }) {
  return (
    <tr className="border-b border-glass hover:bg-glass/40 transition-colors">
      <td className="px-4 py-3 text-sm text-cyan font-mono">
        <Link to={`/purchases/bills/${bill._id}/edit`} className="hover:underline flex items-center gap-1">
          {bill.billNumber}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">{fmtDate(bill.issueDate)}</td>
      <td className="px-4 py-3 text-sm text-text-secondary">{fmtDate(bill.dueDate)}</td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-text-primary">
        {fmt(bill.totalAmount, bill.currencyCode)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATE_COLORS[bill.state] || 'bg-glass text-text-muted'}`}>
          {bill.state?.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        {bill.reminderState && <ReminderStateBadge state={bill.reminderState} />}
      </td>
    </tr>
  )
}

export default function VendorPortal() {
  const { id: vendorId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab]   = useState('bills')

  const { data: billsData, isLoading: billsLoading } = useBills({ vendorId, limit: 50 })
  const computeRisk = useComputeVendorRisk()

  const bills    = Array.isArray(billsData?.docs)  ? billsData.docs
                 : Array.isArray(billsData?.data)  ? billsData.data
                 : Array.isArray(billsData)         ? billsData : []

  const activeBills = bills.filter(b => !['paid', 'cancelled'].includes(b.state))
  const paidBills   = bills.filter(b => b.state === 'paid')
  const overdueAmt  = bills
    .filter(b => b.state === 'overdue' || b.reminderState === 'critical_overdue')
    .reduce((s, b) => s + (b.remainingBalance || 0), 0)
  const totalPayable = bills
    .filter(b => !['paid', 'cancelled'].includes(b.state))
    .reduce((s, b) => s + (b.remainingBalance || 0), 0)

  // Risk from first bill's vendor (if populated)
  const vendorMeta = bills[0]?.vendorId
  const riskLevel  = typeof vendorMeta === 'object' ? vendorMeta.riskLevel  : null
  const riskScore  = typeof vendorMeta === 'object' ? vendorMeta.riskScore  : null
  const riskFactors= typeof vendorMeta === 'object' ? vendorMeta.riskFactors : null

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="text-text-muted hover:text-cyan transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Vendor Portal</h1>
            <p className="text-xs text-text-muted">Self-service AP hub</p>
          </div>
        </div>

        {vendorId && (
          <button
            type="button"
            onClick={() => computeRisk.mutate({ vendorId })}
            disabled={computeRisk.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-glass rounded text-xs
                       text-text-secondary hover:text-cyan transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${computeRisk.isPending ? 'animate-spin' : ''}`} />
            Refresh Risk
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="premium-card p-4">
          <p className="text-xs text-text-muted">Total Outstanding</p>
          <p className="text-xl font-bold text-text-primary mt-1">{fmt(totalPayable)}</p>
          <p className="text-[11px] text-text-muted mt-0.5">{activeBills.length} open bills</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-text-muted">Overdue</p>
          <p className={`text-xl font-bold mt-1 ${overdueAmt > 0 ? 'text-negative' : 'text-text-primary'}`}>
            {fmt(overdueAmt)}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {bills.filter(b => b.state === 'overdue').length} overdue bills
          </p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-text-muted">Risk Profile</p>
          <div className="mt-1.5">
            <VendorRiskBadge riskLevel={riskLevel} riskScore={riskScore} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="premium-card overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-glass">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
                ${tab === key
                  ? 'text-cyan border-b-2 border-cyan'
                  : 'text-text-muted hover:text-text-primary'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">

          {/* ── Bills tab ─────────────────────────────────────────────────────── */}
          {tab === 'bills' && (
            <div className="space-y-3">
              {/* Upload CTA */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Open Bills</h3>
                <Link
                  to="/purchases/bills/new"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan text-navy
                             rounded text-xs font-medium hover:bg-cyan/80 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Bill
                </Link>
              </div>
              {billsLoading ? <SkeletonLoader count={3} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-glass">
                        {['Bill #', 'Issued', 'Due', 'Amount', 'Status', 'Reminder'].map(h => (
                          <th key={h} className="px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeBills.length === 0
                        ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">No open bills</td></tr>
                        : activeBills.map(b => <BillRow key={b._id} bill={b} />)
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Balances tab ─────────────────────────────────────────────────── */}
          {tab === 'balances' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Outstanding Balances</h3>
              {billsLoading ? <SkeletonLoader count={3} /> : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-glass">
                      {['Bill #', 'Due Date', 'Original', 'Remaining', 'State'].map(h => (
                        <th key={h} className="px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeBills.length === 0
                      ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No outstanding balances</td></tr>
                      : activeBills.map(b => (
                        <tr key={b._id} className="border-b border-glass hover:bg-glass/40">
                          <td className="px-4 py-3 text-sm text-cyan font-mono">{b.billNumber}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{fmtDate(b.dueDate)}</td>
                          <td className="px-4 py-3 text-sm text-right">{fmt(b.totalAmount, b.currencyCode)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-amber">{fmt(b.remainingBalance, b.currencyCode)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] capitalize ${STATE_COLORS[b.state] || ''}`}>
                              {b.state?.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Payment History tab ──────────────────────────────────────────── */}
          {tab === 'payments' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Payment History</h3>
              {billsLoading ? <SkeletonLoader count={3} /> : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-glass">
                      {['Bill #', 'Issue Date', 'Amount', 'Paid'].map(h => (
                        <th key={h} className="px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paidBills.length === 0
                      ? <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">No payments yet</td></tr>
                      : paidBills.map(b => (
                        <tr key={b._id} className="border-b border-glass hover:bg-glass/40">
                          <td className="px-4 py-3 text-sm text-cyan font-mono">{b.billNumber}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{fmtDate(b.issueDate)}</td>
                          <td className="px-4 py-3 text-sm text-right">{fmt(b.totalAmount, b.currencyCode)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-positive/15 text-positive">Paid</span>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Risk Profile tab ─────────────────────────────────────────────── */}
          {tab === 'risk' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Vendor Risk Profile</h3>
              <VendorRiskBadge
                riskLevel={riskLevel}
                riskScore={riskScore}
                riskFactors={riskFactors}
                showDetails
              />
              <p className="text-xs text-text-muted">
                Risk score is computed from the last 12 months of billing activity:
                late payment frequency, dispute rate, duplicate invoices, over-billing, and price anomalies.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
