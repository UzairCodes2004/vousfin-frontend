/**
 * TransactionsList — Accounting Ledger
 *
 * Phase 1: Edit date (Calendar icon → modal)
 * Phase 2: Expanding-limit pagination ("Load more") — no 100-tx cap
 * Phase 3: Compound sort sent to backend (transactionDate DESC, createdAt DESC, _id DESC)
 * Phase 4: Mobile-first card layout — zero horizontal overflow
 * Phase 5: Compact spacing, truncated text, hidden low-priority cols on sm
 * Phase 6: memo() on all sub-components, single query key per limit
 */
import { useState, useMemo, memo, Fragment, useCallback, useRef, useEffect } from 'react'
import {
  Plus, ArrowUpRight, ArrowDownRight, Receipt,
  RotateCcw, History, ChevronUp, Loader2, Lock, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useInfiniteTransactions } from '@/hooks/useTransactions'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

import Button from '@/components/ui/Button'
import KPICard from '@/components/ui/KPICard'
import Badge from '@/components/ui/Badge'
import CurrencyBadge from '@/components/ui/CurrencyBadge'
import TransactionFormModal from '@/components/forms/TransactionFormModal'
import TransactionReversalModal from '@/components/forms/TransactionReversalModal'

// ─── constants ────────────────────────────────────────────────────────────────

const TYPE_GROUP = {
  'income': 'Income', 'cash sale': 'Income',
  'credit sale': 'AR/AP',
  'expense': 'Expense', 'cash purchase': 'Expense',
  'credit purchase': 'AR/AP', 'payment received': 'AR/AP', 'payment made': 'AR/AP',
  'transfer': 'Transfer',
  'fx gain': 'Income', 'fx loss': 'Expense', 'fx revaluation': 'Transfer',
}

const TYPE_VARIANT = {
  'income': 'success', 'cash sale': 'success',
  'expense': 'danger', 'cash purchase': 'danger',
  'credit sale': 'info', 'payment received': 'info',
  'credit purchase': 'warning', 'payment made': 'warning',
  'transfer': 'default',
  'fx gain': 'success', 'fx loss': 'danger', 'fx revaluation': 'default',
}

const INFLOW_TYPES = new Set(['income', 'cash sale', 'credit sale', 'payment received', 'fx gain'])
const OUTFLOW_TYPES = new Set(['expense', 'cash purchase', 'credit purchase', 'payment made', 'fx loss'])
const FILTERS = ['All', 'Income', 'Expense', 'AR/AP', 'Transfer']

// ─── memoized sub-components ──────────────────────────────────────────────────

const StatusBadge = memo(function StatusBadge({ row }) {
  if (row.status === 'reversed')        return <Badge variant="danger"  className="text-[10px] py-0.5 px-1.5">Reversed</Badge>
  if (row.installmentPlanId)            return <Badge variant="info"    className="text-[10px] py-0.5 px-1.5">Instalment</Badge>
  if (row.paymentStatus === 'unpaid')   return <Badge variant="warning" className="text-[10px] py-0.5 px-1.5">Unpaid</Badge>
  if (row.paymentStatus === 'partial')  return <Badge variant="warning" className="text-[10px] py-0.5 px-1.5">Partial</Badge>
  if (row.paymentStatus === 'paid')     return <Badge variant="success" className="text-[10px] py-0.5 px-1.5">Paid</Badge>
  return <Badge variant="default" className="text-[10px] py-0.5 px-1.5">Posted</Badge>
})

// EditDateModal removed — date editing is now part of the full Edit Transaction modal

// ─── history panel ────────────────────────────────────────────────────────────

const HistoryPanel = memo(function HistoryPanel({ history }) {
  if (!history) return <p className="text-xs text-text-muted">Could not load history.</p>
  const { reversal, auditTrail } = history
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1">
        <History className="h-3 w-3" /> Audit Trail
      </p>
      {reversal && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs">
          <RotateCcw className="h-3 w-3 text-red-400 shrink-0" />
          <span className="font-semibold text-red-400">Reversed</span>
          <span className="text-text-secondary truncate">{formatDate(reversal.transactionDate)} — {reversal.description}</span>
        </div>
      )}
      {auditTrail?.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="text-cyan font-mono shrink-0 text-[10px]">{formatDate(e.timestamp || e.createdAt)}</span>
          <span className={`shrink-0 rounded-full px-1.5 py-px font-semibold text-[10px] ${
            e.action === 'Reversed' ? 'bg-red-500/15 text-red-400' :
            e.action === 'Created'  ? 'bg-emerald-500/15 text-emerald-400' :
            e.action === 'Edited'   ? 'bg-amber/15 text-amber-2' :
            'bg-glass-panel text-text-muted'
          }`}>{e.action}</span>
          <span className="text-text-muted">by {e.performedByName || 'System'}</span>
        </div>
      ))}
      {!reversal && !auditTrail?.length && (
        <p className="text-xs text-text-muted">No history entries.</p>
      )}
    </div>
  )
})

// ─── mobile card (no table, no overflow) ─────────────────────────────────────

const MobileCard = memo(function MobileCard({
  row, currency, onEdit, onReverse, canReverse, isEditLocked, onToggleHistory, isExpanded, historyState,
}) {
  const type = (row.transactionType || '').toLowerCase()
  const isInflow  = INFLOW_TYPES.has(type)
  const isReversed = row.status === 'reversed'
  const locked = isEditLocked(row)

  return (
    <div className={`px-3 py-2.5 border-b border-glass last:border-0 ${isReversed ? 'opacity-55' : ''}`}>
      {/* Row 1: description + amount */}
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold leading-snug truncate flex-1 ${isReversed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
          {row.description}
        </p>
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <span className={`text-sm font-bold tabular-nums ${isReversed ? 'line-through text-text-muted' : isInflow ? 'text-emerald-400' : 'text-text-primary'}`}>
            {isInflow ? '+' : '−'}{formatCurrency(row.baseCurrencyAmount ?? row.amount, currency)}
          </span>
          {row.currencyCode && row.currencyCode !== currency && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted tabular-nums">
                {row.amount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <CurrencyBadge code={row.currencyCode} baseCurrency={currency} />
            </div>
          )}
        </div>
      </div>

      {/* Row 2: accounts */}
      <p className="text-[11px] text-text-muted mt-0.5 truncate">
        {row.debitAccountId?.accountName} → {row.creditAccountId?.accountName}
      </p>

      {/* Row 3: meta + actions */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-[11px] text-text-muted shrink-0">{formatDate(row.transactionDate)}</span>
          <Badge variant={TYPE_VARIANT[type] || 'default'} className="text-[10px] py-0 px-1.5">
            {row.transactionType || 'Unknown'}
          </Badge>
          <StatusBadge row={row} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Edit button — locked after 30 days */}
          {locked || isReversed ? (
            <span
              title={isReversed ? 'Reversed transactions cannot be edited' : 'Transactions older than 30 days cannot be edited — use Reverse to correct'}
              className="rounded p-1 text-text-muted/35 cursor-not-allowed">
              <Lock className="h-3.5 w-3.5" />
            </span>
          ) : (
            <button onClick={() => onEdit(row)} title="Edit transaction"
              className="rounded p-1 text-text-muted hover:text-cyan hover:bg-glass-hover transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => onToggleHistory(row)} title="History"
            className="rounded p-1 text-text-muted hover:text-cyan hover:bg-glass-hover transition-colors">
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
          </button>
          {canReverse(row) && (
            <button onClick={() => onReverse(row)} title="Reverse this transaction"
              className="rounded p-1 text-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline history */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-glass/50">
          {historyState?.loading
            ? <p className="text-xs text-text-muted">Loading…</p>
            : <HistoryPanel history={historyState?.data} />
          }
        </div>
      )}
    </div>
  )
})

// ─── main page ────────────────────────────────────────────────────────────────

export default function TransactionsList() {
  const [activeFilter,   setActiveFilter]   = useState('All')
  const [isFormOpen,     setIsFormOpen]     = useState(false)
  const [reversalTarget, setReversalTarget] = useState(null)
  const [editTarget,     setEditTarget]     = useState(null)   // full-edit modal
  const [expandedRows,   setExpandedRows]   = useState({})

  const currency = useBusinessStore(s => s.currency)

  const queryParams = useMemo(() => ({
    sortBy: 'transactionDate',
    sortOrder: -1,
  }), [])

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteTransactions(queryParams)

  // Flatten all fetched pages into a single array — new pages are appended
  // in-place so existing rows never unmount during a fetch.
  const docs  = useMemo(() => data?.pages?.flatMap(p => p.docs) ?? [], [data?.pages])
  const total = data?.pages?.[0]?.total ?? 0

  // Client-side filter (applied on top of loaded pages)
  const filtered = useMemo(() => {
    if (activeFilter === 'All') return docs
    return docs.filter(t => TYPE_GROUP[(t.transactionType || '').toLowerCase()] === activeFilter)
  }, [docs, activeFilter])

  // KPI totals over loaded docs only
  const totals = useMemo(() => docs.reduce((acc, t) => {
    if (t.status === 'reversed') return acc
    const type = (t.transactionType || '').toLowerCase()
    if (INFLOW_TYPES.has(type))  acc.inflow  += t.amount || 0
    if (OUTFLOW_TYPES.has(type)) acc.outflow += t.amount || 0
    return acc
  }, { inflow: 0, outflow: 0 }), [docs])

  // Lazy-load audit history
  const toggleHistory = useCallback(async (row) => {
    const id = row._id
    if (expandedRows[id]) {
      setExpandedRows(prev => { const n = { ...prev }; delete n[id]; return n })
      return
    }
    setExpandedRows(prev => ({ ...prev, [id]: { loading: true, data: null } }))
    try {
      const { default: api } = await import('@/services/api')
      const res = await api.get(`/transactions/${id}/history`)
      setExpandedRows(prev => ({ ...prev, [id]: { loading: false, data: res.data?.data ?? {} } }))
    } catch {
      setExpandedRows(prev => ({ ...prev, [id]: { loading: false, data: null } }))
    }
  }, [expandedRows])

  /**
   * GAAP edit time-lock — transactions older than 30 days are read-only.
   *
   * We check BOTH the transaction date (accounting date) AND the recording date
   * (createdAt). If either is older than 30 days the entry is considered locked:
   *  • transactionDate: April entry → locked in May regardless of when recorded
   *  • createdAt:       entry recorded > 30 days ago → locked even if date is recent
   * This prevents both backdating into stale periods and editing aged postings.
   */
  const EDIT_LOCK_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
  const isEditLocked = useCallback((row) => {
    const isOld = (d) => d && Date.now() - new Date(d).getTime() > EDIT_LOCK_MS
    return isOld(row.transactionDate) || isOld(row.createdAt)
  }, [])

  const canReverse = useCallback(
    (row) => row.status !== 'reversed' && !row.installmentPlanId && !(row.partiallyPaidAmount > 0),
    []
  )

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const sentinelRef = useRef(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="space-y-3 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-text-primary tracking-tight sm:text-2xl">
            <Receipt className="h-5 w-5 text-cyan sm:h-6 sm:w-6" />
            Transactions Ledger
          </h1>
          <p className="hidden sm:block text-text-secondary text-sm mt-0.5">Double-entry accounting journal</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} icon={Plus} size="sm">
          Record
        </Button>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <KPICard title="Inflows"  value={totals.inflow}  loading={isLoading} currency={currency} icon={ArrowDownRight} />
        <KPICard title="Outflows" value={totals.outflow} loading={isLoading} currency={currency} icon={ArrowUpRight} />
        <KPICard
          title="Net"
          value={totals.inflow - totals.outflow}
          loading={isLoading}
          currency={currency}
          icon={Receipt}
          trend={totals.inflow - totals.outflow >= 0 ? 1 : -1}
        />
      </div>

      {/* ── Main card ─────────────────────────────────────────────── */}
      <div className="premium-card">
        {/* Filter pills */}
        <div className="border-b border-glass px-3 py-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeFilter === f
                    ? 'bg-cyan text-navy shadow-glow-cyan'
                    : 'bg-glass-panel text-text-secondary hover:bg-glass-hover border border-glass'
                }`}
              >{f}</button>
            ))}
          </div>
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-glass">
          <span className="text-[11px] text-text-muted">
            {filtered.length}{activeFilter !== 'All' ? ` ${activeFilter}` : ''} / {total} total
          </span>
          {isFetching && <Loader2 className="h-3 w-3 animate-spin text-cyan" />}
        </div>

        {/* Content */}
        {isLoading && !docs.length ? (
          <div className="py-12 text-center text-sm text-text-muted">Loading transactions…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-muted">No transactions found.</div>
        ) : (
          <>
            {/* ── Desktop table (hidden on mobile) ────────────────── */}
            <div className="hidden sm:block overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-glass-panel text-[10px] uppercase text-text-muted tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold w-24">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                    <th className="px-4 py-2.5 font-semibold w-28 hidden lg:table-cell">Type</th>
                    <th className="px-4 py-2.5 font-semibold w-20">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-right w-28">Amount</th>
                    <th className="px-4 py-2.5 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass text-text-secondary">
                  {filtered.map((row, ri) => {
                    const type = (row.transactionType || '').toLowerCase()
                    const isInflow   = INFLOW_TYPES.has(type)
                    const isReversed = row.status === 'reversed'
                    return (
                      <Fragment key={row._id || ri}>
                        <tr className={`hover:bg-glass-hover transition-colors ${isReversed ? 'opacity-55' : ''}`}>
                          {/* Date */}
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatDate(row.transactionDate)}</td>

                          {/* Description + accounts */}
                          <td className="px-4 py-2.5 max-w-[260px]">
                            <p className={`text-sm font-semibold truncate ${isReversed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                              {row.description}
                            </p>
                            <p className="text-[11px] text-text-muted truncate">
                              {row.debitAccountId?.accountName} → {row.creditAccountId?.accountName}
                            </p>
                          </td>

                          {/* Type (large screens only) */}
                          <td className="px-4 py-2.5 hidden lg:table-cell">
                            <Badge variant={TYPE_VARIANT[type] || 'default'} className="text-[10px] py-0.5">
                              {row.transactionType || 'Unknown'}
                            </Badge>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-2.5"><StatusBadge row={row} /></td>

                          {/* Amount */}
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`text-sm font-bold tabular-nums ${isReversed ? 'line-through text-text-muted' : isInflow ? 'text-emerald-400' : 'text-text-primary'}`}>
                                {isInflow ? '+' : '−'}{formatCurrency(row.baseCurrencyAmount ?? row.amount, currency)}
                              </span>
                              {row.currencyCode && row.currencyCode !== currency && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-text-muted tabular-nums">
                                    {row.amount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </span>
                                  <CurrencyBadge code={row.currencyCode} baseCurrency={currency} rate={row.exchangeRate} />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              {/* Edit — locked after 30 days or if reversed */}
                              {isEditLocked(row) || isReversed ? (
                                <span
                                  title={isReversed ? 'Reversed transactions cannot be edited' : 'Transactions older than 30 days cannot be edited — use Reverse to correct'}
                                  className="rounded p-1.5 text-text-muted/35 cursor-not-allowed">
                                  <Lock className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <button onClick={() => setEditTarget(row)} title="Edit transaction"
                                  className="rounded p-1.5 text-text-muted hover:text-cyan hover:bg-glass-hover transition-colors">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button onClick={() => toggleHistory(row)} title="History"
                                className="rounded p-1.5 text-text-muted hover:text-cyan hover:bg-glass-hover transition-colors">
                                {expandedRows[row._id] ? <ChevronUp className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
                              </button>
                              {canReverse(row) && (
                                <button onClick={() => setReversalTarget(row)} title="Reverse this transaction"
                                  className="rounded p-1.5 text-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded history */}
                        {expandedRows[row._id] && (
                          <tr className="bg-white/[0.04]">
                            <td colSpan={6} className="px-4 py-3">
                              {expandedRows[row._id].loading
                                ? <p className="text-xs text-text-muted">Loading history…</p>
                                : <HistoryPanel history={expandedRows[row._id].data} />
                              }
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards (visible only on mobile) ───────────── */}
            <div className="sm:hidden divide-y divide-glass">
              {filtered.map((row, ri) => (
                <MobileCard
                  key={row._id || ri}
                  row={row}
                  currency={currency}
                  onEdit={setEditTarget}
                  onReverse={setReversalTarget}
                  canReverse={canReverse}
                  isEditLocked={isEditLocked}
                  onToggleHistory={toggleHistory}
                  isExpanded={!!expandedRows[row._id]}
                  historyState={expandedRows[row._id]}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Infinite scroll sentinel ──────────────────────────── */}
        <div ref={sentinelRef} className="border-t border-glass">
          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan" />
              Loading more transactions…
            </div>
          )}
          {!hasNextPage && !isLoading && docs.length > 0 && (
            <p className="py-3 text-center text-[11px] text-text-muted">
              All {total} transactions loaded
            </p>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}

      {/* Create new transaction */}
      <TransactionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      {/* Edit existing transaction (within 30-day GAAP window) */}
      <TransactionFormModal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        transaction={editTarget}
      />

      <TransactionReversalModal
        isOpen={Boolean(reversalTarget)}
        onClose={() => setReversalTarget(null)}
        transaction={reversalTarget}
        onSuccess={() => setReversalTarget(null)}
      />
    </div>
  )
}
