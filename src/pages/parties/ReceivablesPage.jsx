/**
 * ReceivablesPage — Outstanding Accounts Receivable.
 *
 * Phase 5.5 Step 2 — ERP AR Engine:
 *   - Invoice number, due date, payment status columns
 *   - Inline "Record Payment" mini-form per row
 *   - AR aging buckets with colored bars
 *   - Overdue refresh + Reconcile AR/AP buttons
 *   - Customer link to detail page
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet, Search, AlertTriangle, Wrench, RefreshCw,
  DollarSign, X, CheckCircle2,
} from 'lucide-react'

import {
  useOutstandingBalances,
  useRepairARAPTransactions,
  useRefreshOverdueAR,
  useRecordPayment,
} from '@/hooks/useParties'
import { useAccounts } from '@/hooks/useAccounts'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import DataTable from '@/components/tables/DataTable'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import InvoiceStatusBadge from '@/components/invoice/InvoiceStatusBadge'
import ApprovalChip from '@/components/invoice/ApprovalChip'
import ReconciliationBanner from '@/components/common/ReconciliationBanner'
import CollectionsSummaryBanner from '@/components/common/CollectionsSummaryBanner'
import { cn } from '@/utils/cn'

/* ── Phase 1: map legacy paymentStatus to new InvoiceStatusBadge state ────── */
function paymentStatusToInvoiceState(ps) {
  switch ((ps || '').toLowerCase()) {
    case 'paid':           return 'paid'
    case 'partially_paid': return 'partially_paid'
    case 'overdue':        return 'overdue'
    case 'unpaid':         return 'sent' // unpaid = invoice issued and waiting for payment
    default:               return null
  }
}

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

function isStaleDate(dateStr) {
  if (!dateStr) return false
  return daysSince(dateStr) > 5 * 365
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

/* ── Inline Payment Form ─────────────────────────────────────────────── */
function PaymentForm({ row, currency, onClose, bankAccounts }) {
  const record = useRecordPayment()
  const [amount, setAmount]   = useState(String(row._outstanding))
  const [acctId, setAcctId]   = useState(bankAccounts[0]?.value || '')
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]     = useState('')

  const max   = row._outstanding
  const valid = parseFloat(amount) > 0 && parseFloat(amount) <= max && acctId

  const handleSubmit = async () => {
    if (!valid) return
    await record.mutateAsync({
      parentTransactionId: row._id,
      amount:              parseFloat(amount),
      paymentAccountId:    acctId,
      transactionDate:     date,
      notes:               notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="bg-navy/80 border border-cyan/20 rounded-xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-cyan flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" /> Record Payment
        </p>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-text-muted">
        Outstanding: <span className="font-semibold text-text-primary">{formatCurrency(max, currency)}</span>
        {row._customerName && <> · <span className="text-cyan">{row._customerName}</span></>}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Amount"
          type="number" step="0.01" min="0.01" max={max}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Select
        label="Payment Account (Bank/Cash)"
        options={bankAccounts}
        value={acctId}
        onChange={(v) => setAcctId(v)}
      />
      <Input
        label="Notes (optional)"
        placeholder="Cheque no., reference…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={record.isPending}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} loading={record.isPending} disabled={!valid}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Save Payment
        </Button>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function ReceivablesPage() {
  const currency = useBusinessStore(s => s.currency)
  const { data, isLoading } = useOutstandingBalances('receivable', { withAging: true })
  const repair      = useRepairARAPTransactions()
  const refreshAR   = useRefreshOverdueAR()
  const { data: rawAccounts } = useAccounts()
  const [query, setQuery]           = useState('')
  const [payingRowId, setPayingRowId] = useState(null)

  /* Bank/cash accounts for payment form */
  const bankAccounts = useMemo(() => {
    const accts = Array.isArray(rawAccounts?.docs) ? rawAccounts.docs
                : Array.isArray(rawAccounts?.data) ? rawAccounts.data
                : Array.isArray(rawAccounts)       ? rawAccounts : []
    return accts
      .filter(a => ['Cash', 'Bank', 'Current Assets'].some(k => (a.accountName || '').toLowerCase().includes(k.toLowerCase())))
      .map(a => ({ value: a._id, label: a.accountName }))
  }, [rawAccounts])

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
      const cust = typeof r.customerId === 'object' && r.customerId !== null ? r.customerId : null
      const custIdStr = cust?._id || cust?.id || (typeof r.customerId === 'string' ? r.customerId : null)
      return {
        ...r,
        _outstanding:  Number(r.remainingBalance ?? r.outstandingAmount ?? r.amount ?? 0),
        _customerName: cust?.fullName ?? cust?.businessName ?? r.customerName ?? r.partyName ?? '—',
        _customerId:   custIdStr,
        _date:         r.transactionDate || r.date,
        _dueDate:      r.dueDate,
        _paymentStatus:r.paymentStatus,
        _invoice:      r.invoiceNumber || r.transactionReference || null,
      }
    })
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r._customerName.toLowerCase().includes(q) ||
      String(r.description || '').toLowerCase().includes(q) ||
      String(r._invoice || '').toLowerCase().includes(q)
    )
  }, [rows, query])

  const totalOutstanding = aging?.total?.amount ?? rows.reduce((sum, r) => sum + r._outstanding, 0)
  const overdueCount = aging
    ? (aging['1-30'].count + aging['31-60'].count + aging['61-90'].count + aging['90+'].count)
    : rows.filter((r) => daysSince(r._dueDate || r._date) > 0).length

  const payingRow = payingRowId ? rows.find(r => r._id === payingRowId) : null

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span
          className={cn(
            'text-xs',
            isStaleDate(r._date) ? 'text-red-400 font-semibold' : 'text-text-secondary'
          )}
          title={isStaleDate(r._date) ? 'Date may be incorrect' : undefined}
        >
          {formatDate(r._date)}
          {isStaleDate(r._date) && <AlertTriangle className="inline ml-1 h-3 w-3 text-red-400" />}
        </span>
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
      key: 'invoice',
      header: 'Invoice #',
      render: (r) => r._invoice
        ? <span className="font-mono text-xs text-cyan">{r._invoice}</span>
        : <span className="text-text-muted text-xs">—</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => (
        <span className="text-text-secondary text-sm truncate max-w-[180px] block">
          {r.description || '—'}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (r) => {
        if (!r._dueDate) return <span className="text-text-muted text-xs">—</span>
        const overdue = daysSince(r._dueDate) > 0
        return (
          <span className={cn('text-xs', overdue ? 'text-red-400 font-semibold' : 'text-text-secondary')}>
            {formatDate(r._dueDate)}
            {overdue && <AlertTriangle className="inline ml-1 h-3 w-3" />}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        // Phase 1: prefer first-class Invoice.state if present, fall back to legacy paymentStatus.
        const invoiceState = r.invoiceState || paymentStatusToInvoiceState(r._paymentStatus) || 'sent'
        return (
          <div className="flex items-center gap-1.5">
            <InvoiceStatusBadge state={invoiceState} kind="invoice" size="sm" />
            {r.approvalStatus && r.approvalStatus !== 'not_required'
              ? <ApprovalChip status={r.approvalStatus} compact />
              : null}
          </div>
        )
      },
    },
    {
      key: 'age',
      header: 'Age',
      render: (r) => {
        const d = daysSince(r._dueDate || r._date)
        const bucket = ageBucket(d)
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={bucket.variant} className="text-[10px]">{bucket.label}</Badge>
            <span className="text-[10px] text-text-muted">{d}d</span>
          </div>
        )
      },
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <span className="font-bold text-text-primary font-mono text-sm">
          {formatCurrency(r._outstanding, currency)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPayingRowId(r._id === payingRowId ? null : r._id) }}
          className="text-xs text-cyan hover:underline font-semibold whitespace-nowrap"
        >
          {r._id === payingRowId ? 'Cancel' : '+ Pay'}
        </button>
      ),
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
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm" variant="secondary" icon={RefreshCw}
            onClick={() => refreshAR.mutate()}
            loading={refreshAR.isPending}
            title="Mark overdue entries where due date has passed"
          >
            Refresh Overdue
          </Button>
          <Button
            size="sm" variant="secondary" icon={Wrench}
            onClick={() => repair.mutate()}
            loading={repair.isPending}
            title="Fix transactions where correct accounts were used but type label bypassed AR workflow"
          >
            Reconcile AR
          </Button>
        </div>
      </div>

      {/* ── M7: reconciled read model (document source of truth vs GL) ── */}
      <ReconciliationBanner type="receivable" />

      {/* ── M8: collections / dunning ladder summary ── */}
      <CollectionsSummaryBanner />

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
            <AlertTriangle className="h-4 w-4 text-amber-400" /> AR Aging Analysis
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'current', label: 'Current',  variant: 'success' },
              { key: '1-30',    label: '1–30 d',   variant: 'info'    },
              { key: '31-60',   label: '31–60 d',  variant: 'warning' },
              { key: '61-90',   label: '61–90 d',  variant: 'warning' },
              { key: '90+',     label: '90+ d',    variant: 'danger'  },
            ].map((b) => {
              const bucket = aging[b.key] || { count: 0, amount: 0 }
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
          placeholder="Search customer, invoice, or description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Inline Payment Form ───────────────────────────────────── */}
      {payingRow && (
        <PaymentForm
          row={payingRow}
          currency={currency}
          bankAccounts={bankAccounts}
          onClose={() => setPayingRowId(null)}
        />
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="premium-card overflow-x-auto">
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

      {!isLoading && rows.length === 0 && (
        <div className="premium-card p-6 border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          You have no unpaid invoices. Cash flow looks healthy!
        </div>
      )}
    </div>
  )
}
