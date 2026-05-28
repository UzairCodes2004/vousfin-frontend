/**
 * GoodsReceiptsPage — Phase 3.1
 * List view for Goods Receipt Notes (GRNs).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Search, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { useGoodsReceipts, useConfirmGRN, useCancelGRN, useArchiveGRN } from '@/hooks/useProcurement'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency, formatDate } from '@/utils/formatters'
import Input from '@/components/ui/Input'
import DataTable from '@/components/tables/DataTable'

const STATE_FILTERS = [
  { value: '',                      label: 'All' },
  { value: 'draft',                 label: 'Draft' },
  { value: 'confirmed',             label: 'Confirmed' },
  { value: 'discrepancy_reported',  label: 'Discrepancy' },
  { value: 'reconciled',            label: 'Reconciled' },
  { value: 'cancelled',             label: 'Cancelled' },
]

const STATE_COLOR = {
  draft:                'text-text-muted',
  confirmed:            'text-cyan',
  discrepancy_reported: 'text-amber-400',
  reconciled:           'text-emerald-400',
  cancelled:            'text-red-400',
}

function GRNStateBadge({ state }) {
  const label = STATE_FILTERS.find(f => f.value === state)?.label || state
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border border-current/30 ${STATE_COLOR[state] || 'text-text-muted'}`}>
      {label}
    </span>
  )
}

export default function GoodsReceiptsPage() {
  const navigate = useNavigate()
  const currency = useBusinessStore(s => s.currency)
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [discrepancyFilter, setDiscrepancyFilter] = useState('')

  const { data, isLoading } = useGoodsReceipts({
    search: query || undefined,
    state:  stateFilter || undefined,
    hasDiscrepancies: discrepancyFilter === 'yes' ? true
                    : discrepancyFilter === 'no'  ? false
                    : undefined,
    limit:  100,
  })

  const confirmGRN = useConfirmGRN()
  const cancelGRN  = useCancelGRN()
  const archiveGRN = useArchiveGRN()

  const receipts = useMemo(() => {
    const arr = Array.isArray(data?.data) ? data.data
              : Array.isArray(data)       ? data : []
    return arr
  }, [data])

  const columns = [
    {
      key: 'grnNumber',
      header: 'GRN #',
      render: (r) => (
        <span className="font-mono text-sm text-cyan font-semibold">{r.grnNumber}</span>
      ),
    },
    {
      key: 'po',
      header: 'PO',
      render: (r) => (
        <button
          type="button"
          onClick={() => r.purchaseOrderId?._id && navigate(`/procurement/purchase-orders/${r.purchaseOrderId._id}/edit`)}
          className="font-mono text-xs text-text-secondary hover:text-cyan"
        >
          {r.purchaseOrderId?.poNumber || '—'}
        </button>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor',
      render: (r) => (
        <span className="text-sm text-text-primary truncate max-w-[150px]">
          {r.vendorId?.vendorName || '—'}
        </span>
      ),
    },
    {
      key: 'receivedDate',
      header: 'Received',
      render: (r) => <span className="text-xs text-text-secondary">{formatDate(r.receivedDate)}</span>,
    },
    {
      key: 'discrepancies',
      header: 'Issues',
      render: (r) => r.hasDiscrepancies ? (
        <span className="flex items-center gap-1 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {r.discrepancies?.length || ''}
        </span>
      ) : <span className="text-xs text-emerald-400">—</span>,
    },
    {
      key: 'total',
      header: 'Value',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <span className="font-mono text-sm font-semibold text-text-primary">
          {formatCurrency(r.totalReceivedValue || 0, currency)}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'Status',
      render: (r) => <GRNStateBadge state={r.state} />,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.state === 'draft' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); confirmGRN.mutate({ id: r._id }) }}
              className="text-text-muted hover:text-emerald-400 transition-colors"
              title="Confirm receipt"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Archive GRN ${r.grnNumber}?`)) archiveGRN.mutate({ id: r._id })
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Truck className="h-6 w-6 text-cyan" />
            Goods Receipts
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Record what was physically received against purchase orders.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Search by GRN number..."
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
        <select
          className="rounded-lg border border-glass bg-glass-panel px-3 py-2 text-sm text-text-secondary"
          value={discrepancyFilter}
          onChange={e => setDiscrepancyFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="yes">Has Discrepancies</option>
          <option value="no">No Discrepancies</option>
        </select>
      </div>

      <div className="premium-card overflow-x-auto">
        <DataTable
          columns={columns}
          data={receipts}
          isLoading={isLoading}
          emptyMessage="No goods receipts yet. GRNs are created when you receive goods against a PO."
        />
      </div>
    </div>
  )
}
