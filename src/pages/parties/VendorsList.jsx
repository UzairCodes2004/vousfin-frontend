/**
 * VendorsList — Vendor directory with search, status filter,
 * aggregate totals, and click-through to detail page.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Briefcase, Search, CreditCard } from 'lucide-react'

import { useVendors } from '@/hooks/useParties'
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
  { key: 'owing',    label: 'We Owe'    },
]

function KpiTile({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={cn(
      'premium-card p-4 flex items-center gap-3',
      accent && 'border-amber/30 bg-amber/5'
    )}>
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/15 text-amber-2">
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

export default function VendorsList() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [query, setQuery]   = useState('')
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useVendors()
  const currency = useBusinessStore((s) => s.currency)

  /* Backend returns { data: [...], total, page, limit }. */
  const vendors = useMemo(() => {
    if (Array.isArray(data?.data))    return data.data
    if (Array.isArray(data?.docs))    return data.docs
    if (Array.isArray(data?.vendors)) return data.vendors
    if (Array.isArray(data))          return data
    return []
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vendors.filter((v) => {
      const isActive = v.isActive !== false
      const owing = Number(v.currentPayableBalance || 0) > 0

      if (filter === 'active'   && !isActive) return false
      if (filter === 'inactive' && isActive)  return false
      if (filter === 'owing'    && !owing)    return false

      if (!q) return true
      const haystack = [
        v.vendorName, v.fullName, v.name, v.email, v.phone,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [vendors, query, filter])

  const totalPayable = vendors.reduce((sum, v) => sum + Number(v.currentPayableBalance || 0), 0)
  const owingCount   = vendors.filter((v) => Number(v.currentPayableBalance || 0) > 0).length
  const activeCount  = vendors.filter((v) => v.isActive !== false).length

  const columns = [
    {
      key: 'name',
      header: 'Vendor',
      className: 'w-1/3',
      render: (row) => (
        <div>
          <p className="font-bold text-text-primary">{row.vendorName || row.fullName || row.name || '—'}</p>
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
      header: 'Outstanding Payable',
      className: 'text-right',
      cellClassName: 'text-right font-bold text-text-primary',
      render: (row) => {
        const bal = Number(row.currentPayableBalance || 0)
        return bal > 0 ? (
          <span className="text-amber-2">{formatCurrency(bal, currency)}</span>
        ) : (
          <span className="text-text-muted">—</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Briefcase className="h-6 w-6 text-amber-2" />
            Vendors
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Manage your suppliers and track accounts payable.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
          Add Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile
          icon={Briefcase}
          label="Total Vendors"
          value={vendors.length}
          sub={`${activeCount} active`}
        />
        <KpiTile
          icon={CreditCard}
          label="Total Payable"
          value={formatCurrency(totalPayable, currency)}
          sub={`${owingCount} ${owingCount === 1 ? 'vendor outstanding' : 'vendors outstanding'}`}
          accent={totalPayable > 0}
        />
        <KpiTile
          icon={Briefcase}
          label="Pay These"
          value={owingCount}
          sub="Vendors with balance"
        />
      </div>

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

      <div className="premium-card">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/vendors/${row._id || row.id}`)}
          emptyMessage={
            query || filter !== 'all'
              ? 'No vendors match your filter. Try clearing it.'
              : "No vendors yet. Click 'Add Vendor' to create one."
          }
        />
      </div>

      <PartyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="vendor"
      />
    </div>
  )
}
