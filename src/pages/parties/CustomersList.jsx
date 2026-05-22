/**
 * CustomersList — Customer directory with search, status filter,
 * aggregate totals, and click-through to detail page.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Search, Wallet } from 'lucide-react'

import { useCustomers } from '@/hooks/useParties'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import DataTable from '@/components/tables/DataTable'
import PartyFormModal from '@/components/forms/PartyFormModal'
import Badge from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

const FILTERS = [
  { key: 'all',      label: 'All'       },
  { key: 'active',   label: 'Active'    },
  { key: 'inactive', label: 'Inactive'  },
  { key: 'owing',    label: 'Owing'     },
]

function KpiTile({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={cn(
      'premium-card p-4 flex items-center gap-3',
      accent && 'border-cyan/30 bg-cyan/5'
    )}>
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/15 text-cyan">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg font-black text-text-primary leading-tight">{value}</p>
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
      </div>
    </div>
  )
}

export default function CustomersList() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [query, setQuery]     = useState('')
  const [filter, setFilter]   = useState('all')

  const { data, isLoading } = useCustomers()
  const currency = useBusinessStore((s) => s.currency)

  /* Backend returns { data: [...], total, page, limit }. Be permissive for safety. */
  const customers = useMemo(() => {
    if (Array.isArray(data?.data))      return data.data
    if (Array.isArray(data?.docs))      return data.docs
    if (Array.isArray(data?.customers)) return data.customers
    if (Array.isArray(data))            return data
    return []
  }, [data])

  /* Apply filter + search */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers.filter((c) => {
      const isActive = c.isActive !== false
      const owing = Number(c.currentReceivableBalance || 0) > 0

      if (filter === 'active'   && !isActive) return false
      if (filter === 'inactive' && isActive)  return false
      if (filter === 'owing'    && !owing)    return false

      if (!q) return true
      const haystack = [
        c.fullName, c.businessName, c.name, c.email, c.phone,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [customers, query, filter])

  /* Aggregates */
  const totalReceivable  = customers.reduce((sum, c) => sum + Number(c.currentReceivableBalance || 0), 0)
  const owingCount       = customers.filter((c) => Number(c.currentReceivableBalance || 0) > 0).length
  const activeCount      = customers.filter((c) => c.isActive !== false).length

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      className: 'w-1/3',
      render: (row) => (
        <div>
          <p className="font-bold text-text-primary">{row.fullName || row.businessName || row.name || '—'}</p>
          {(row.email || row.phone) && (
            <p className="text-xs text-text-muted mt-0.5">
              {row.email}
              {row.email && row.phone && ' • '}
              {row.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive !== false ? 'success' : 'default'}>
          {row.isActive !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Outstanding Receivable',
      className: 'text-right',
      cellClassName: 'text-right font-bold text-text-primary',
      render: (row) => {
        const bal = Number(row.currentReceivableBalance || 0)
        return bal > 0 ? (
          <span className="text-cyan">{formatCurrency(bal, currency)}</span>
        ) : (
          <span className="text-text-muted">—</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Users className="h-6 w-6 text-cyan" />
            Customers
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Manage your clients and track accounts receivable.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
          Add Customer
        </Button>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile
          icon={Users}
          label="Total Customers"
          value={customers.length}
          sub={`${activeCount} active`}
        />
        <KpiTile
          icon={Wallet}
          label="Total Receivable"
          value={formatCurrency(totalReceivable, currency)}
          sub={`${owingCount} ${owingCount === 1 ? 'customer owes' : 'customers owe'}`}
          accent={totalReceivable > 0}
        />
        <KpiTile
          icon={Users}
          label="Awaiting Payment"
          value={owingCount}
          sub="Customers with balance"
        />
      </div>

      {/* ── Toolbar: search + filter chips ─────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Input
            icon={Search}
            placeholder="Search name, email, or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-glass-panel border border-glass">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filter === f.key
                  ? 'bg-cyan text-navy shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass-hover'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="premium-card">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/customers/${row._id || row.id}`)}
          emptyMessage={
            query || filter !== 'all'
              ? 'No customers match your filter. Try clearing it.'
              : "No customers yet. Click 'Add Customer' to create one."
          }
        />
      </div>

      <PartyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="customer"
      />
    </div>
  )
}
