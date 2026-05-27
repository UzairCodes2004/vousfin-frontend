/**
 * CustomerDetail — ERP-style customer profile with statement ledger.
 *
 * Tabs:
 *   1. Transactions — raw transaction history (existing)
 *   2. Statement    — chronological AR ledger with running balance, date range
 *                     filter, and one-click CSV export
 */
import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Users, Mail, Phone, MapPin, Hash,
  TrendingUp, AlertCircle, CheckCircle2, Receipt,
  FileText, Download, Calendar, DollarSign,
} from 'lucide-react'

import {
  useCustomer, useCustomerBalance, useCustomerTransactions,
  useCustomerStats, useToggleCustomerActive, useCustomerStatement,
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

/** Convert statement lines to CSV and trigger a browser download. */
function exportStatementCSV(lines, customer, currency) {
  const name = customer?.fullName || customer?.businessName || customer?.name || 'Customer'
  const header = ['Date', 'Invoice #', 'Description', 'Type', `Debit (${currency})`, `Credit (${currency})`, `Balance (${currency})`, 'Status', 'Days Overdue']
  const rows = lines.map(l => [
    l.date ? new Date(l.date).toLocaleDateString() : '',
    l.invoiceNumber || '',
    (l.description || '').replace(/,/g, ';'),
    l.type || '',
    l.debit != null ? Number(l.debit).toFixed(2) : '',
    l.credit != null ? Number(l.credit).toFixed(2) : '',
    l.balance != null ? Number(l.balance).toFixed(2) : '',
    l.paymentStatus || '',
    l.daysOverdue != null ? l.daysOverdue : '',
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `statement_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Small KPI tile ─────────────────────────────────────────────────────── */
function KpiTile({ icon: Icon, label, value, sub, accent, accentColor = 'cyan' }) {
  return (
    <div className={cn(
      'premium-card p-5 flex flex-col gap-1.5',
      accent && accentColor === 'cyan'  && 'border-cyan/30 bg-cyan/5',
      accent && accentColor === 'red'   && 'border-red-500/30 bg-red-500/5',
      accent && accentColor === 'amber' && 'border-amber-400/30 bg-amber-400/5',
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
          ? 'border-cyan text-cyan'
          : 'border-transparent text-text-muted hover:text-text-primary hover:border-glass'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

/* ── Statement ledger status badge helpers ──────────────────────────────── */
const STATUS_VARIANT = {
  PAID:            'success',
  OVERDUE:         'danger',
  PARTIALLY_PAID:  'warning',
  UNPAID:          'default',
  Payment:         'info',
}

const STATUS_LABEL = {
  PAID:            'Paid',
  OVERDUE:         'Overdue',
  PARTIALLY_PAID:  'Partial',
  UNPAID:          'Unpaid',
  Payment:         'Payment',
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function CustomerDetail() {
  const { id }    = useParams()
  const currency  = useBusinessStore(s => s.currency)

  const [activeTab,  setActiveTab]  = useState('transactions')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')

  const { data: customer, isLoading: loadingCust } = useCustomer(id)
  const { data: balance,  isLoading: loadingBal  } = useCustomerBalance(id)
  const { data: txData,   isLoading: loadingTx   } = useCustomerTransactions(id)
  const { data: stats                            } = useCustomerStats(id)

  /* Statement — only fetch when tab is active */
  const stmtParams = useMemo(() => {
    const p = {}
    if (startDate) p.startDate = startDate
    if (endDate)   p.endDate   = endDate
    return p
  }, [startDate, endDate])
  const { data: stmt, isLoading: loadingStmt } = useCustomerStatement(
    activeTab === 'statement' ? id : null,
    stmtParams,
  )

  const toggleActive = useToggleCustomerActive()

  /* Flatten transaction list from various response shapes */
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
  const lifetimeSales    = stats?.lifetimeRevenue
    ?? transactions.reduce((s, t) => {
      const type = t.transactionType || t.type
      return s + (type === 'Income' || type === 'Credit Sale' ? Number(t.amount || 0) : 0)
    }, 0)
  const lastPaymentDate  = stats?.lastPaymentDate  ?? null
  const lastActivityDate = stats?.lastActivityDate ?? null
  const invoiceCount     = stats?.invoiceCount     ?? null
  const overdueCount     = stats?.overdueCount     ?? 0

  const isActive  = customer?.isActive !== false
  const receivable = balance?.balance
    ?? balance?.currentReceivableBalance
    ?? customer?.currentReceivableBalance
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
        return <Badge variant={t === 'Income' ? 'success' : 'info'}>{t}</Badge>
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
          (row.transactionType || row.type) === 'Income' ? 'text-emerald-300' : 'text-text-primary'
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
        const variant = s === 'settled'            ? 'success'
                      : s === 'partially_settled'  ? 'warning'
                      : s === 'overdue'            ? 'danger'
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
        <span className="text-cyan text-xs font-mono">{row.invoiceNumber || '—'}</span>
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
      header: 'Charges',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => row.debit > 0
        ? <span className="text-text-primary font-semibold">{formatCurrency(row.debit, currency)}</span>
        : <span className="text-text-muted">—</span>,
    },
    {
      key: 'credit',
      header: 'Payments',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => row.credit > 0
        ? <span className="text-emerald-400 font-semibold">{formatCurrency(row.credit, currency)}</span>
        : <span className="text-text-muted">—</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      className: 'text-right',
      cellClassName: 'text-right font-bold',
      render: (row) => (
        <span className={row.balance > 0 ? 'text-cyan' : 'text-text-primary'}>
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
        return (
          <Badge variant={STATUS_VARIANT[s] || 'default'}>
            {STATUS_LABEL[s] || s}
          </Badge>
        )
      },
    },
    {
      key: 'daysOverdue',
      header: 'Age',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        if (!row.daysOverdue && row.daysOverdue !== 0) return null
        if (row.daysOverdue <= 0) return <span className="text-xs text-emerald-400">Current</span>
        return <span className="text-xs text-red-400">{row.daysOverdue}d</span>
      },
    },
  ]

  /* ── Loading / not-found states ─────────────────────────────────────── */
  if (loadingCust) {
    return <div className="space-y-5 animate-fade-in"><SkeletonLoader count={5} /></div>
  }

  if (!customer) {
    return (
      <div className="premium-card p-8 text-center animate-fade-in">
        <AlertCircle className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-primary font-semibold mb-1">Customer not found</p>
        <Link to="/customers" className="text-sm text-cyan hover:underline">← Back to customers</Link>
      </div>
    )
  }

  const displayName = customer.fullName || customer.businessName || customer.name || 'Customer'

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-cyan transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to customers
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
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-cyan/15 border border-cyan/30">
            <Users className="h-6 w-6 text-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-text-primary tracking-tight">{displayName}</h1>
              <Badge variant={isActive ? 'success' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-text-secondary mt-1 text-sm">Customer · accounts receivable tracking</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FieldRow icon={Mail}   label="Email"   value={customer.email} />
              <FieldRow icon={Phone}  label="Phone"   value={customer.phone} />
              <FieldRow icon={MapPin} label="Address" value={customer.address} />
              <FieldRow icon={Hash}   label="Tax ID"  value={customer.taxId} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI tiles ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile
          icon={DollarSign}
          label="Outstanding Receivable"
          value={loadingBal ? '…' : formatCurrency(receivable, currency)}
          sub={receivable > 0 ? 'Awaiting payment' : 'Fully settled'}
          accent={receivable > 0}
          accentColor="cyan"
        />
        <KpiTile
          icon={TrendingUp}
          label="Lifetime Sales"
          value={formatCurrency(lifetimeSales, currency)}
          sub={invoiceCount !== null ? `${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''}` : '—'}
        />
        <KpiTile
          icon={Receipt}
          label="Last Payment"
          value={lastPaymentDate ? formatDate(lastPaymentDate) : '—'}
          sub={lastActivityDate ? `Last activity: ${formatDate(lastActivityDate)}` : 'No activity yet'}
        />
        <KpiTile
          icon={AlertCircle}
          label="Overdue Invoices"
          value={overdueCount}
          sub={overdueCount > 0 ? 'Needs follow-up' : 'All on time'}
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
            <div className="px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-text-muted">
                {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <DataTable
              columns={txColumns}
              data={transactions}
              isLoading={loadingTx}
              emptyMessage="No transactions linked to this customer yet."
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
                  placeholder="From"
                />
                <span className="text-text-muted text-sm">–</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-sm py-1.5 w-36"
                  placeholder="To"
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
                  onClick={() => exportStatementCSV(stmtLines, customer, currency)}
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
                  { label: 'Total Invoiced', value: formatCurrency(stmt.summary.totalInvoiced || 0, currency), color: 'text-text-primary' },
                  { label: 'Total Paid',     value: formatCurrency(stmt.summary.totalPaid     || 0, currency), color: 'text-emerald-400' },
                  { label: 'Outstanding',    value: formatCurrency(stmt.summary.outstanding   || 0, currency), color: 'text-cyan'        },
                  { label: 'Overdue',        value: formatCurrency(stmt.summary.overdueAmount || 0, currency), color: 'text-red-400'     },
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
              emptyMessage="No statement lines found for this customer. Try adjusting the date range."
            />
          </>
        )}
      </div>
    </div>
  )
}
