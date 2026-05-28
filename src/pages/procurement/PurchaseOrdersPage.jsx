/**
 * PurchaseOrdersPage — Phase 3.1
 * Landing page for the Purchase Order domain.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ShoppingBag, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { usePurchaseOrders, useArchivePO, useApprovePO, useCancelPO } from '@/hooks/useProcurement'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency, formatDate } from '@/utils/formatters'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import DataTable from '@/components/tables/DataTable'
import InvoiceStatusBadge from '@/components/invoice/InvoiceStatusBadge'
import ApprovalChip from '@/components/invoice/ApprovalChip'

const STATE_FILTERS = [
  { value: '',                   label: 'All' },
  { value: 'draft',              label: 'Draft' },
  { value: 'pending_approval',   label: 'Pending Approval' },
  { value: 'approved',           label: 'Approved' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'fully_received',     label: 'Fully Received' },
  { value: 'billed',             label: 'Billed' },
  { value: 'closed',             label: 'Closed' },
  { value: 'cancelled',          label: 'Cancelled' },
]

const STATE_COLOR = {
  draft:              'text-text-muted',
  pending_approval:   'text-amber-400',
  approved:           'text-sky-400',
  partially_received: 'text-indigo-400',
  fully_received:     'text-cyan',
  billed:             'text-emerald-400',
  closed:             'text-emerald-600',
  cancelled:          'text-red-400',
}

function POStateBadge({ state }) {
  const label = STATE_FILTERS.find(f => f.value === state)?.label || state
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATE_COLOR[state] || 'text-text-muted'} border-current/30 bg-current/5`}>
      {label}
    </span>
  )
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const currency = useBusinessStore(s => s.currency)
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('')

  const { data, isLoading } = usePurchaseOrders({
    search: query || undefined,
    state:  stateFilter || undefined,
    limit:  100,
  })

  const archivePO = useArchivePO()
  const approvePO = useApprovePO()
  const cancelPO  = useCancelPO()

  const orders = useMemo(() => {
    const arr = Array.isArray(data?.data) ? data.data
              : Array.isArray(data)       ? data : []
    return arr
  }, [data])

  const columns = [
    {
      key: 'poNumber',
      header: 'PO #',
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate(`/procurement/purchase-orders/${r._id}/edit`)}
          className="font-mono text-sm text-cyan hover:underline font-semibold"
        >
          {r.poNumber}
        </button>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor',
      render: (r) => (
        <div className="text-sm text-text-primary truncate max-w-[180px]">
          {r.vendorSnapshot?.vendorName || r.vendorId?.vendorName || '—'}
        </div>
      ),
    },
    {
      key: 'issueDate',
      header: 'Issued',
      render: (r) => <span className="text-xs text-text-secondary">{formatDate(r.issueDate)}</span>,
    },
    {
      key: 'expectedDelivery',
      header: 'Expected',
      render: (r) => (
        <span className="text-xs text-text-secondary">
          {r.expectedDeliveryDate ? formatDate(r.expectedDeliveryDate) : '—'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Lines',
      render: (r) => (
        <span className="text-xs text-text-secondary text-center">
          {(r.lineItems || []).length}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <span className="font-mono font-semibold text-sm text-text-primary">
          {formatCurrency(r.totalAmount || 0, r.currencyCode || currency)}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-wrap gap-1 items-center">
          <POStateBadge state={r.state} />
          {r.approvalStatus && r.approvalStatus !== 'not_required' && (
            <ApprovalChip status={r.approvalStatus} compact />
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.state === 'draft' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/procurement/purchase-orders/${r._id}/edit`) }}
              className="text-text-muted hover:text-cyan transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {r.state === 'pending_approval' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); approvePO.mutate({ id: r._id }) }}
              className="text-text-muted hover:text-emerald-400 transition-colors"
              title="Approve"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          {!['closed', 'cancelled', 'fully_received', 'billed'].includes(r.state) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const reason = window.prompt('Reason for cancellation (optional):')
                if (reason !== null) cancelPO.mutate({ id: r._id, reason })
              }}
              className="text-text-muted hover:text-red-400 transition-colors"
              title="Cancel"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Archive PO ${r.poNumber}?`)) archivePO.mutate({ id: r._id })
            }}
            className="text-text-muted hover:text-red-400 transition-colors"
            title="Archive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <ShoppingBag className="h-6 w-6 text-cyan" />
            Purchase Orders
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Create, approve, and track orders to vendors before goods arrive.
          </p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/procurement/purchase-orders/new')}>
          New PO
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Search by PO number..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-lg border border-glass bg-glass-panel px-3 py-2 text-sm text-text-secondary"
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
        >
          {STATE_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="premium-card overflow-x-auto">
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          emptyMessage={
            query
              ? 'No purchase orders match your search.'
              : 'No purchase orders yet. Click "New PO" to create one.'
          }
        />
      </div>
    </div>
  )
}
