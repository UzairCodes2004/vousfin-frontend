/**
 * AI Review Queue — the finance reviewer's workflow.
 *
 * Every AI-classified transaction lands here resolved to the business's REAL
 * accounts. Confirm posts a proper journal entry through the existing
 * transaction system (appears in the ledger, balances, reports). "Confirm all"
 * posts every high-confidence item in one click.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCheck, Loader2 } from 'lucide-react'
import classifierApi from '@/services/ai/classifierService'
import transactionService from '@/services/transaction.service'
import ClassificationCard from '@/components/ai/ClassificationCard'
import ClassificationHealthPanel from '@/components/ai/ClassificationHealthPanel'

const AUTO_CONFIDENCE = 0.85   // items at/above this are safe for one-click "confirm all"

function ReviewList() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [bulkBusy, setBulkBusy] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey:  ['ai-drafts', page],
    queryFn:   () => classifierApi.getDrafts({ page, limit: 12 }).then(r => r.data),
    staleTime: 20_000,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['ai-drafts'] })

  // Post one draft as a real journal entry (used by Confirm-all), with idempotent claim
  const postOne = async (d) => {
    const isExpense = d.tx_type === 'DEBIT'
    const categoryId = isExpense ? d.debit_account_id : d.credit_account_id
    const bankId     = isExpense ? d.credit_account_id : d.debit_account_id
    if (!categoryId || !bankId) throw new Error('unresolved accounts')
    // Claim atomically — skip silently if already taken (idempotency)
    try { await classifierApi.claim(d.draft_id) }
    catch (e) { if (e?.response?.status === 409) return; throw e }
    try {
      const res = await transactionService.create({
        transactionDate: d.tx_date,
        description:     (d.narration_raw || d.payee_raw || 'AI transaction').slice(0, 200),
        amount:         Number(d.amount),
        debitAccountId:  isExpense ? categoryId : bankId,
        creditAccountId: isExpense ? bankId : categoryId,
      })
      const posted = res?.data?.data
      const jeId = posted?.status === 'pending' ? null : (posted?._id || res?.data?._id)
      await classifierApi.markConfirmed(d.draft_id, { journal_entry_id: jeId })
    } catch (e) {
      try { await classifierApi.release(d.draft_id) } catch { /* ignore */ }
      throw e
    }
  }

  const confirmAll = async () => {
    const ready = items.filter(d => (d.confidence ?? 0) >= AUTO_CONFIDENCE && d.debit_account_id && d.credit_account_id)
    if (ready.length === 0) { toast('Nothing high-confidence to confirm', { icon: 'ℹ️' }); return }
    setBulkBusy(true)
    let ok = 0, fail = 0
    for (const d of ready) {
      try { await postOne(d); ok++ } catch { fail++ }
    }
    setBulkBusy(false)
    toast.success(`Posted ${ok} transaction${ok !== 1 ? 's' : ''}${fail ? `, ${fail} failed` : ''}`)
    refresh()
  }

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-glass-panel animate-pulse rounded-xl" />)}
    </div>
  )

  if (items.length === 0) return (
    <div className="text-center py-20 text-text-muted">
      <p className="text-4xl mb-3">✓</p>
      <p className="text-sm">Nothing to review — all caught up!</p>
      <p className="text-xs mt-1">New transactions appear here after you import them via Record Transaction → AI Auto-Classify.</p>
    </div>
  )

  const readyCount = items.filter(d => (d.confidence ?? 0) >= AUTO_CONFIDENCE && d.debit_account_id && d.credit_account_id).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">{items.length} awaiting review on this page</p>
        <button
          onClick={confirmAll}
          disabled={bulkBusy || readyCount === 0}
          className="flex items-center gap-1.5 text-xs font-medium bg-emerald-2 hover:bg-emerald disabled:opacity-40 text-white px-3 py-1.5 rounded-lg"
        >
          {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
          Confirm all confident ({readyCount})
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(d => <ClassificationCard key={d.draft_id} draft={d} onResolved={refresh} />)}
      </div>

      <div className="flex justify-center gap-2 pt-2">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
          className="text-xs px-3 py-1 border rounded disabled:opacity-40">← Prev</button>
        <span className="text-xs text-text-muted self-center">Page {page}</span>
        <button disabled={items.length < 12} onClick={() => setPage(p => p + 1)}
          className="text-xs px-3 py-1 border rounded disabled:opacity-40">Next →</button>
      </div>
    </div>
  )
}

/* AutoPostFeed — zero-touch postings with single-action Dispute & Reverse */
function AutoPostFeed() {
  const qc = useQueryClient()
  const [busyId, setBusyId] = useState(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey:  ['ai-auto-posted'],
    queryFn:   () => classifierApi.getAutoPosted({ limit: 20 }).then(r => r.data),
    staleTime: 15_000,
  })

  // Single action: reverse the real JE through the engine, then record the
  // dispute as a correction (feeds the model + resets vendor trust).
  const disputeOne = async (d) => {
    setBusyId(d.draft_id)
    try {
      let reversalId = null
      if (d.journal_entry_id) {
        const res = await transactionService.reverse(d.journal_entry_id)
        reversalId = res?.data?.data?._id || null
      }
      await classifierApi.dispute(d.draft_id, { reversal_je_id: reversalId })
      toast.success('Reversed — recorded as a correction for the model')
      qc.invalidateQueries({ queryKey: ['ai-auto-posted'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    } catch {
      toast.error('Dispute failed — the entry was not changed')
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) return <div className="h-40 bg-glass-panel animate-pulse rounded-xl" />

  if (items.length === 0) return (
    <div className="text-center py-16 text-text-muted">
      <p className="text-sm">No auto-posted transactions yet.</p>
      <p className="text-xs mt-1">High-confidence transactions from trusted vendors post here automatically.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-glass">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-muted border-b border-glass">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Payee</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2">Posted as</th>
            <th className="px-3 py-2 text-right">Confidence</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map(d => (
            <tr key={d.draft_id} className="border-b border-glass last:border-0">
              <td className="px-3 py-2 whitespace-nowrap">{d.tx_date}</td>
              <td className="px-3 py-2 max-w-[220px] truncate" title={d.narration_raw}>{d.payee_raw}</td>
              <td className="px-3 py-2 text-right tabular-nums">{Number(d.amount).toLocaleString()}</td>
              <td className="px-3 py-2 text-xs text-text-secondary">
                Dr {d.debit_account_name || '—'} / Cr {d.credit_account_name || '—'}
              </td>
              <td className="px-3 py-2 text-right">
                <span className="inline-block text-xs font-semibold text-positive bg-positive/10 px-2 py-0.5 rounded">
                  A · {Math.round((d.confidence ?? 0) * 100)}%
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => disputeOne(d)}
                  disabled={busyId === d.draft_id}
                  className="text-xs font-medium text-negative hover:text-negative disabled:opacity-40 border border-negative/30 hover:border-negative px-2.5 py-1 rounded-lg"
                >
                  {busyId === d.draft_id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Dispute & Reverse'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TABS = [
  { key: 'review', label: 'To Review' },
  { key: 'autoposted', label: 'Auto-posted' },
  { key: 'health', label: 'Health' },
]

export default function TransactionReviewQueuePage() {
  const [tab, setTab] = useState('review')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">AI Review Queue</h1>
        <p className="text-sm text-text-muted mt-1">
          AI-classified transactions resolved to your real accounts. Confirm to post them to your ledger.
        </p>
      </div>

      <div className="flex gap-1 border-b border-glass">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'review' && <ReviewList />}
      {tab === 'autoposted' && <AutoPostFeed />}
      {tab === 'health' && <ClassificationHealthPanel />}
    </div>
  )
}
