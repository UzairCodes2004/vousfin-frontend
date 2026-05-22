/**
 * VendorDetail — ERP-style vendor profile page.
 *
 * Mirror of CustomerDetail but for accounts payable side.
 */
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, Mail, Phone, MapPin, Hash,
  TrendingDown, AlertCircle, CheckCircle2, Receipt,
} from 'lucide-react'

import {
  useVendor, useVendorBalance, useVendorTransactions,
  useVendorStats, useToggleVendorActive,
} from '@/hooks/useParties'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/tables/DataTable'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import { cn } from '@/utils/cn'

function KpiTile({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={cn(
      'premium-card p-5 flex flex-col gap-1.5',
      accent && 'border-amber/30 bg-amber/5'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-text-muted/70" />}
      </div>
      <span className="text-2xl font-black text-text-primary leading-tight">{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  )
}

function FieldRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="h-4 w-4 flex-shrink-0 text-text-muted mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-text-primary break-words">{value}</p>
      </div>
    </div>
  )
}

export default function VendorDetail() {
  const { id } = useParams()
  const currency = useBusinessStore(s => s.currency)

  const { data: vendor,  isLoading: loadingV   } = useVendor(id)
  const { data: balance, isLoading: loadingBal } = useVendorBalance(id)
  const { data: txData,  isLoading: loadingTx  } = useVendorTransactions(id)
  const { data: stats                          } = useVendorStats(id)

  const toggleActive = useToggleVendorActive()

  /* Backend returns { data: [...], total, page, limit } */
  const transactions = useMemo(() => {
    if (Array.isArray(txData?.data))         return txData.data
    if (Array.isArray(txData?.docs))         return txData.docs
    if (Array.isArray(txData?.transactions)) return txData.transactions
    if (Array.isArray(txData))               return txData
    return []
  }, [txData])

  /* Prefer server-side stats; fall back to client-side aggregation */
  const lifetimePurchases = stats?.lifetimePurchases
    ?? transactions.reduce((sum, t) => {
      const type = t.transactionType || t.type
      return sum + (type === 'Expense' || type === 'Credit Purchase' ? Number(t.amount || 0) : 0)
    }, 0)
  const lastPaymentDate  = stats?.lastPaymentDate ?? null
  const lastActivityDate = stats?.lastActivityDate ?? null
  const billCount        = stats?.billCount ?? null
  const overdueCount     = stats?.overdueCount ?? 0

  const isActive = vendor?.isActive !== false
  /* Balance endpoint returns { balance: number }; fall back to denormalized doc field */
  const payable  = balance?.balance
    ?? balance?.currentPayableBalance
    ?? vendor?.currentPayableBalance
    ?? 0

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => (
        <span className="text-text-secondary">
          {formatDate(row.date || row.transactionDate)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-text-primary">
          {row.description || row.narration || '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const t = row.transactionType || row.type || 'Other'
        const isExpense = t === 'Expense'
        return (
          <Badge variant={isExpense ? 'warning' : 'info'}>
            {t}
          </Badge>
        )
      },
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (row) => (
        <span className="text-xs text-text-muted capitalize">
          {row.transactionMode || row.mode || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      cellClassName: 'text-right font-bold',
      render: (row) => (
        <span className={cn(
          (row.transactionType || row.type) === 'Expense' ? 'text-amber-2' : 'text-text-primary'
        )}>
          {formatCurrency(row.amount, currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = row.status || row.settlementStatus
        if (!s) return null
        const variant = s === 'settled'              ? 'success'
                      : s === 'partially_settled'   ? 'warning'
                      : s === 'overdue'             ? 'danger'
                      : 'default'
        return <Badge variant={variant}>{s.replace(/_/g, ' ')}</Badge>
      },
    },
  ]

  if (loadingV) {
    return (
      <div className="space-y-5 animate-fade-in">
        <SkeletonLoader count={5} />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="premium-card p-8 text-center animate-fade-in">
        <AlertCircle className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-primary font-semibold mb-1">Vendor not found</p>
        <Link to="/vendors" className="text-sm text-cyan hover:underline">
          ← Back to vendors
        </Link>
      </div>
    )
  }

  const displayName = vendor.vendorName || vendor.fullName || vendor.name || 'Vendor'

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/vendors"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-cyan transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to vendors
        </Link>
        <Button
          variant={isActive ? 'outline' : 'primary'}
          onClick={() => toggleActive.mutate(id)}
          loading={toggleActive.isPending}
          icon={isActive ? AlertCircle : CheckCircle2}
        >
          {isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
      </div>

      <div className="premium-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-amber/15 border border-amber/30">
            <Briefcase className="h-6 w-6 text-amber-2" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-text-primary tracking-tight">
                {displayName}
              </h1>
              <Badge variant={isActive ? 'success' : 'default'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-text-secondary mt-1 text-sm">
              Vendor · accounts payable tracking
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FieldRow icon={Mail}   label="Email"   value={vendor.email} />
              <FieldRow icon={Phone}  label="Phone"   value={vendor.phone} />
              <FieldRow icon={MapPin} label="Address" value={vendor.address} />
              <FieldRow icon={Hash}   label="Tax ID"  value={vendor.taxId} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiTile
          icon={AlertCircle}
          label="Outstanding Payable"
          value={loadingBal ? '…' : formatCurrency(payable, currency)}
          sub={payable > 0 ? 'Amount owed to vendor' : 'No outstanding balance'}
          accent={payable > 0}
        />
        <KpiTile
          icon={TrendingDown}
          label="Lifetime Purchases"
          value={formatCurrency(lifetimePurchases, currency)}
          sub={billCount !== null ? `${billCount} ${billCount === 1 ? 'bill' : 'bills'}` : '—'}
        />
        <KpiTile
          icon={Receipt}
          label="Last Payment"
          value={lastPaymentDate ? formatDate(lastPaymentDate) : '—'}
          sub={lastActivityDate
            ? `Last activity: ${formatDate(lastActivityDate)}`
            : 'No activity yet'}
        />
        <KpiTile
          icon={AlertCircle}
          label="Overdue Bills"
          value={overdueCount}
          sub={overdueCount > 0 ? 'Pay these first' : 'All on time'}
          accent={overdueCount > 0}
        />
      </div>

      <div className="premium-card">
        <div className="px-6 py-4 border-b border-glass flex items-center justify-between flex-wrap gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
            <Receipt className="h-4 w-4 text-cyan" />
            Transaction History
          </h2>
          <span className="text-xs text-text-muted">
            {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <DataTable
          columns={columns}
          data={transactions}
          isLoading={loadingTx}
          emptyMessage="No transactions linked to this vendor yet."
        />
      </div>
    </div>
  )
}
