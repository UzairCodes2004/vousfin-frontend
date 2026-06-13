/**
 * VendorDetail — ERP-style vendor profile with AP statement ledger.
 *
 * Tabs:
 *   1. Transactions — raw transaction history
 *   2. Statement    — chronological AP ledger with running balance, date range
 *                     filter, and one-click CSV export
 */
import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, Mail, Phone, MapPin, Hash,
  TrendingDown, AlertCircle, CheckCircle2, Receipt,
  FileText, Download, Calendar, DollarSign,
} from 'lucide-react'

import {
  useVendor, useVendorBalance, useVendorTransactions,
  useVendorStats, useToggleVendorActive, useVendorStatement,
} from '@/hooks/useParties'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/tables/DataTable'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import Input from '@/components/ui/Input'
import { cn } from '@/utils/cn'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function exportStatementCSV(lines, vendor, currency) {
  const name = vendor?.vendorName || vendor?.fullName || vendor?.name || 'Vendor'
  const header = ['Date', 'Bill #', 'Description', 'Type', `Debit (${currency})`, `Credit (${currency})`, `Balance (${currency})`, 'Status', 'Days Overdue']
  const rows = lines.map(l => [
    l.date ? new Date(l.date).toLocaleDateString() : '',
    l.invoiceNumber || l.billNumber || '',
    (l.description || '').replace(/,/g, ';'),
    l.type || '',
    l.debit  != null ? Number(l.debit).toFixed(2)  : '',
    l.credit != null ? Number(l.credit).toFixed(2) : '',
    l.balance != null ? Number(l.balance).toFixed(2) : '',
    l.paymentStatus || '',
    l.daysOverdue != null ? l.daysOverdue : '',
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `statement_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Small KPI tile ─────────────────────────────────────────────────────── */
function KpiTile({ icon: Icon, label, value, sub, accent, accentColor = 'amber' }) {
  return (
    <div className={cn(
      'premium-card p-5 flex flex-col gap-1.5',
      accent && accentColor === 'amber' && 'border-amber/30 bg-amber/5',
      accent && accentColor === 'red'   && 'border-negative/30 bg-negative/5',
      accent && accentColor === 'cyan'  && 'border-cyan/30 bg-cyan/5',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-text-muted/70" />}
      </div>
      <span className="text-2xl font-black text-text-primary leading-tight">{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  )
}

/* ── Profile field row ──────────────────────────────────────────────────── */
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

/* ── Tab button ─────────────────────────────────────────────────────────── */
function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
        active
          ? 'border-amber text-amber'
          : 'border-transparent text-text-muted hover:text-text-primary hover:border-glass'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

/* ── Status badge helpers ───────────────────────────────────────────────── */
const STATUS_VARIANT = {
  PAID:           'success',
  OVERDUE:        'danger',
  PARTIALLY_PAID: 'warning',
  UNPAID:         'default',
  Payment:        'info',
}
const STATUS_LABEL = {
  PAID:           'Paid',
  OVERDUE:        'Overdue',
  PARTIALLY_PAID: 'Partial',
  UNPAID:         'Unpaid',
  Payment:        'Payment',
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function VendorDetail() {
  const { id }   = useParams()
  const currency = useBusinessStore(s => s.currency)

  const [activeTab, setActiveTab] = useState('transactions')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')

  const { data: vendor,  isLoading: loadingV   } = useVendor(id)
  const { data: balance, isLoading: loadingBal } = useVendorBalance(id)
  const { data: txData,  isLoading: loadingTx  } = useVendorTransactions(id)
  const { data: stats                          } = useVendorStats(id)

  /* Statement — only fetch when tab is active */
  const stmtParams = useMemo(() => {
    const p = {}
    if (startDate) p.startDate = startDate
    if (endDate)   p.endDate   = endDate
    return p
  }, [startDate, endDate])
  const { data: stmt, isLoading: loadingStmt } = useVendorStatement(
    activeTab === 'statement' ? id : null,
    stmtParams,
  )

  const toggleActive = useToggleVendorActive()

  /* Flatten transaction list */
  const transactions = useMemo(() => {
    if (Array.isArray(txData?.data))         return txData.data
    if (Array.isArray(txData?.docs))         return txData.docs
    if (Array.isArray(txData?.transactions)) return txData.transactions
    if (Array.isArray(txData))               return txData
    return []
  }, [txData])

  const stmtLines = useMemo(() => {
    if (Array.isArray(stmt?.lines)) return stmt.lines
    if (Array.isArray(stmt))        return stmt
    return []
  }, [stmt])

  /* Prefer server-side stats; fall back to client-side aggregation */
  const lifetimePurchases = stats?.lifetimePurchases
    ?? transactions.reduce((s, t) => {
      const type = t.transactionType || t.type
      return s + (type === 'Expense' || type === 'Credit Purchase' ? Number(t.amount || 0) : 0)
    }, 0)
  const lastPaymentDate  = stats?.lastPaymentDate  ?? null
  const lastActivityDate = stats?.lastActivityDate ?? null
  const billCount        = stats?.billCount        ?? null
  const overdueCount     = stats?.overdueCount     ?? 0

  const isActive = vendor?.isActive !== false
  const payable  = balance?.balance
    ?? balance?.currentPayableBalance
    ?? vendor?.currentPayableBalance
    ?? 0

  /* ── Transaction history columns ────────────────────────────────────── */
  const txColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => (
        <span className="text-text-secondary">{formatDate(row.date || row.transactionDate)}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-text-primary">{row.description || row.narration || '—'}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const t = row.transactionType || row.type || 'Other'
        return <Badge variant={t === 'Expense' ? 'warning' : 'info'}>{t}</Badge>
      },
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (row) => (
        <span className="text-xs text-text-muted capitalize">{row.transactionMode || row.mode || '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      cellClassName: 'text-right font-bold',
      render: (row) => (
        <span className={cn(
          (row.transactionType || row.type) === 'Expense' ? 'text-amber' : 'text-text-primary'
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
        const variant = s === 'settled'           ? 'success'
                      : s === 'partially_settled' ? 'warning'
                      : s === 'overdue'           ? 'danger'
                      : 'default'
        return <Badge variant={variant}>{s.replace(/_/g, ' ')}</Badge>
      },
    },
  ]

  /* ── Statement ledger columns ───────────────────────────────────────── */
  const stmtColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => (
        <span className="text-text-secondary text-xs">{formatDate(row.date)}</span>
      ),
    },
    {
      key: 'invoiceNumber',
      header: 'Ref #',
      render: (row) => (
        <span className="text-amber text-xs font-mono">{row.invoiceNumber || row.billNumber || '—'}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-text-primary text-sm">{row.description || '—'}</span>
      ),
    },
    {
      key: 'debit',
      header: 'Payments',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => row.debit > 0
        ? <span className="text-positive font-semibold">{formatCurrency(row.debit, currency)}</span>
        : <span className="text-text-muted">—</span>,
    },
    {
      key: 'credit',
      header: 'Bills',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => row.credit > 0
        ? <span className="text-amber font-semibold">{formatCurrency(row.credit, currency)}</span>
        : <span className="text-text-muted">—</span>,
    },
    {
      key: 'balance',
      header: 'Balance Owed',
      className: 'text-right',
      cellClassName: 'text-right font-bold',
      render: (row) => (
        <span className={row.balance > 0 ? 'text-amber' : 'text-text-primary'}>
          {formatCurrency(row.balance ?? 0, currency)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      render: (row) => {
        const s = row.paymentStatus || row.type
        if (!s) return null
        return <Badge variant={STATUS_VARIANT[s] || 'default'}>{STATUS_LABEL[s] || s}</Badge>
      },
    },
    {
      key: 'daysOverdue',
      header: 'Age',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        if (!row.daysOverdue && row.daysOverdue !== 0) return null
        if (row.daysOverdue <= 0) return <span className="text-xs text-positive">Current</span>
        return <span className="text-xs text-negative">{row.daysOverdue}d</span>
      },
    },
  ]

  /* ── Loading / not-found ────────────────────────────────────────────── */
  if (loadingV) {
    return <div className="space-y-5 animate-fade-in"><SkeletonLoader count={5} /></div>
  }

  if (!vendor) {
    return (
      <div className="premium-card p-8 text-center animate-fade-in">
        <AlertCircle className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-primary font-semibold mb-1">Vendor not found</p>
        <Link to="/vendors" className="text-sm text-cyan hover:underline">← Back to vendors</Link>
      </div>
    )
  }

  const displayName = vendor.vendorName || vendor.fullName || vendor.name || 'Vendor'

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
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

      {/* ── Profile card ───────────────────────────────────────────────── */}
      <div className="premium-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-amber/15 border border-amber/30">
            <Briefcase className="h-6 w-6 text-amber" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-text-primary tracking-tight">{displayName}</h1>
              <Badge variant={isActive ? 'success' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-text-secondary mt-1 text-sm">Vendor · accounts payable tracking</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FieldRow icon={Mail}   label="Email"   value={vendor.email} />
              <FieldRow icon={Phone}  label="Phone"   value={vendor.phone} />
              <FieldRow icon={MapPin} label="Address" value={vendor.address} />
              <FieldRow icon={Hash}   label="Tax ID"  value={vendor.taxId} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI tiles ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile
          icon={DollarSign}
          label="Outstanding Payable"
          value={loadingBal ? '…' : formatCurrency(payable, currency)}
          sub={payable > 0 ? 'Amount owed to vendor' : 'No outstanding balance'}
          accent={payable > 0}
          accentColor="amber"
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
          sub={lastActivityDate ? `Last activity: ${formatDate(lastActivityDate)}` : 'No activity yet'}
        />
        <KpiTile
          icon={AlertCircle}
          label="Overdue Bills"
          value={overdueCount}
          sub={overdueCount > 0 ? 'Pay these first' : 'All on time'}
          accent={overdueCount > 0}
          accentColor="red"
        />
      </div>

      {/* ── Tab panel ──────────────────────────────────────────────────── */}
      <div className="premium-card">
        {/* Tab bar */}
        <div className="border-b border-glass flex items-center px-4 gap-1">
          <Tab
            active={activeTab === 'transactions'}
            onClick={() => setActiveTab('transactions')}
            icon={Receipt}
            label="Transactions"
          />
          <Tab
            active={activeTab === 'statement'}
            onClick={() => setActiveTab('statement')}
            icon={FileText}
            label="Account Statement"
          />
        </div>

        {/* ── Transactions tab ──────────────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <>
            <div className="px-6 py-3 flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">
                {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <DataTable
              columns={txColumns}
              data={transactions}
              isLoading={loadingTx}
              emptyMessage="No transactions linked to this vendor yet."
            />
          </>
        )}

        {/* ── Statement tab ────────────────────────────────────────────── */}
        {activeTab === 'statement' && (
          <>
            {/* Filters + export */}
            <div className="px-6 py-4 flex flex-wrap items-end gap-3 border-b border-glass/50">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-text-muted flex-shrink-0" />
                <span className="text-xs text-text-muted font-semibold">Period:</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-sm py-1.5 w-36"
                />
                <span className="text-text-muted text-sm">–</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-sm py-1.5 w-36"
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => { setStartDate(''); setEndDate('') }}
                    className="text-xs text-text-muted hover:text-cyan transition-colors px-2"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={() => exportStatementCSV(stmtLines, vendor, currency)}
                  disabled={stmtLines.length === 0}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Statement summary cards */}
            {stmt?.summary && (
              <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Billed',  value: formatCurrency(stmt.summary.totalBilled  || 0, currency), color: 'text-amber' },
                  { label: 'Total Paid',    value: formatCurrency(stmt.summary.totalPaid    || 0, currency), color: 'text-positive' },
                  { label: 'Outstanding',   value: formatCurrency(stmt.summary.outstanding  || 0, currency), color: 'text-amber'  },
                  { label: 'Overdue',       value: formatCurrency(stmt.summary.overdueAmount || 0, currency), color: 'text-negative'   },
                ].map(c => (
                  <div key={c.label} className="bg-glass/30 rounded-lg px-4 py-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{c.label}</p>
                    <p className={cn('text-base font-black mt-0.5', c.color)}>{c.value}</p>
                  </div>
                ))}
              </div>
            )}

            <DataTable
              columns={stmtColumns}
              data={stmtLines}
              isLoading={loadingStmt}
              emptyMessage="No statement lines found for this vendor. Try adjusting the date range."
            />
          </>
        )}
      </div>
    </div>
  )
}
