/**
 * ReceivablesPage — Outstanding Accounts Receivable.
 *
 * Lists every credit-mode income transaction that still has an outstanding
 * balance, with aging buckets and per-row link to the customer.
 *
 * Backend: GET /transactions/outstanding?type=ar
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Search, AlertTriangle } from 'lucide-react'

import { useOutstandingBalances } from '@/hooks/useParties'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

import Badge from '@/components/ui/Badge'
import DataTable from '@/components/tables/DataTable'
import Input from '@/components/ui/Input'
import { cn } from '@/utils/cn'

/* ── Helpers ────────────────────────────────────────────────────────── */

function ageBucket(days) {
  if (days <= 0)  return { label: 'Current',  variant: 'success' }
  if (days <= 30) return { label: '1–30 d',   variant: 'info'    }
  if (days <= 60) return { label: '31–60 d',  variant: 'warning' }
  if (days <= 90) return { label: '61–90 d',  variant: 'warning' }
  return                  { label: '90+ d',    variant: 'danger'  }
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

/* ── KPI tile ───────────────────────────────────────────────────────── */
function KpiTile({ label, value, sub, accent }) {
  return (
    <div className={cn(
      'premium-card p-5 flex flex-col gap-1',
      accent && 'border-cyan/30 bg-cyan/5'
    )}>
      <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-black text-text-primary leading-tight">{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  )
}

export default function ReceivablesPage() {
  const currency = useBusinessStore(s => s.currency)
  const { data, isLoading } = useOutstandingBalances('receivable', { withAging: true })
  const [query, setQuery] = useState('')

  /* With withAging=true the backend returns { rows: [...], aging: {...} } */
  const aging = data?.aging || null

  const rows = useMemo(() => {
    const list = Array.isArray(data?.rows)         ? data.rows
              : Array.isArray(data?.docs)         ? data.docs
              : Array.isArray(data?.transactions) ? data.transactions
              : Array.isArray(data?.outstanding)  ? data.outstanding
              : Array.isArray(data)               ? data
              : []
    return list.map((r) => {
      /* Backend populates customerId as { _id, fullName, businessName } (Mongoose .populate) */
      const cust = typeof r.customerId === 'object' && r.customerId !== null ? r.customerId : null
      const custIdStr = cust?._id || cust?.id || (typeof r.customerId === 'string' ? r.customerId : null)
      return {
        ...r,
        _outstanding: Number(
          r.remainingBalance ?? r.outstandingAmount ?? r.outstandingBalance ?? r.balance ?? r.amount ?? 0
        ),
        _customerName:
          cust?.fullName
          ?? cust?.businessName
          ?? r.customerName
          ?? r.partyName
          ?? '—',
        _customerId: custIdStr,
        _date: r.transactionDate || r.date || r.dueDate,
        _dueDate: r.dueDate,
        _paymentStatus: r.paymentStatus,
      }
    })
  }, [data])

  /* Filter by customer name */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r._customerName.toLowerCase().includes(q) ||
      String(r.description || '').toLowerCase().includes(q)
    )
  }, [rows, query])

  /* Prefer server-side aging totals; fall back to client-side aggregates */
  const totalOutstanding = aging?.total?.amount ?? rows.reduce((sum, r) => sum + r._outstanding, 0)
  const overdueCount = aging
    ? (aging['1-30'].count + aging['31-60'].count + aging['61-90'].count + aging['90+'].count)
    : rows.filter((r) => daysSince(r._date) > 0).length

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="text-text-secondary">{formatDate(r._date)}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => r._customerId ? (
        <Link
          to={`/customers/${r._customerId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-text-primary hover:text-cyan transition-colors"
        >
          {r._customerName}
        </Link>
      ) : (
        <span className="font-semibold text-text-primary">{r._customerName}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => (
        <span className="text-text-secondary">{r.description || r.narration || '—'}</span>
      ),
    },
    {
      key: 'age',
      header: 'Age',
      render: (r) => {
        const d = daysSince(r._date)
        const bucket = ageBucket(d)
        return (
          <div className="flex items-center gap-2">
            <Badge variant={bucket.variant}>{bucket.label}</Badge>
            <span className="text-xs text-text-muted">{d}d</span>
          </div>
        )
      },
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      className: 'text-right',
      cellClassName: 'text-right font-bold text-text-primary',
      render: (r) => formatCurrency(r._outstanding, currency),
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Wallet className="h-6 w-6 text-cyan" />
            Outstanding Receivables
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Invoices and credit sales still awaiting customer payment.
          </p>
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding, currency)}
          sub={`${rows.length} ${rows.length === 1 ? 'invoice' : 'invoices'}`}
          accent
        />
        <KpiTile
          label="Overdue"
          value={overdueCount}
          sub={overdueCount > 0 ? 'Past due date' : 'All current'}
        />
        <KpiTile
          label="Unique Customers"
          value={new Set(rows.map((r) => r._customerId).filter(Boolean)).size}
          sub="With outstanding balance"
        />
      </div>

      {/* ── Aging buckets (server-side) ───────────────────────────── */}
      {aging && (
        <div className="premium-card p-5">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-cyan" /> AR Aging
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'current', label: 'Current',  variant: 'success' },
              { key: '1-30',    label: '1–30 d',   variant: 'info'    },
              { key: '31-60',   label: '31–60 d',  variant: 'warning' },
              { key: '61-90',   label: '61–90 d',  variant: 'warning' },
              { key: '90+',     label: '90+ d',    variant: 'danger'  },
            ].map((b) => {
              const bucket = aging[b.key]
              return (
                <div key={b.key} className="rounded-xl border border-glass bg-glass-panel p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={b.variant}>{b.label}</Badge>
                    <span className="text-[10px] text-text-muted">
                      {bucket.count} {bucket.count === 1 ? 'inv' : 'invs'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-text-primary">
                    {formatCurrency(bucket.amount, currency)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Search ────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <Input
          placeholder="Search by customer or description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="premium-card">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={
            query
              ? 'No outstanding receivables match your search.'
              : 'No outstanding receivables — every invoice is settled.'
          }
        />
      </div>

      {/* ── Empty / good state ────────────────────────────────────── */}
      {!isLoading && rows.length === 0 && (
        <div className="premium-card p-6 border-emerald/20 bg-emerald/5 text-sm text-emerald-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          You have no unpaid invoices. Cash flow looks healthy.
        </div>
      )}
    </div>
  )
}
