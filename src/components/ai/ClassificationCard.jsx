/**
 * ClassificationCard — a single AI-classified transaction awaiting confirmation.
 *
 * The AI has resolved the transaction to the business's REAL debit/credit
 * accounts. Confirming posts a proper journal entry through the existing
 * transaction system (so it appears in the ledger, balances, and reports),
 * then marks the draft resolved and feeds the correction back to the model.
 */
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import classifierApi from '@/services/ai/classifierService'
import transactionService from '@/services/transaction.service'
import { useAccounts } from '@/hooks/useAccounts'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { getErrorMessage } from '@/utils/errorHandler'

const CONF_COLOR = (c) => (c >= 0.85 ? 'bg-positive' : c >= 0.5 ? 'bg-amber' : 'bg-negative')

export default function ClassificationCard({ draft, onResolved }) {
  const isExpense = draft.tx_type === 'DEBIT'
  const { data: accounts = [] } = useAccounts()
  const baseCurrency = useBusinessStore((s) => s.currency) || 'PKR'
  // A foreign-currency draft posts with its currency so the backend locks the
  // exchange rate as of the transaction date (IAS 21).
  const isForeign = !!draft.currency && draft.currency.toUpperCase() !== baseCurrency.toUpperCase()

  // The "category" account is the expense (debit) or revenue (credit) side.
  const defaultCategoryId = isExpense ? draft.debit_account_id : draft.credit_account_id
  const bankId            = isExpense ? draft.credit_account_id : draft.debit_account_id
  const bankName          = isExpense ? draft.credit_account_name : draft.debit_account_name

  // "On credit": counterparty becomes Accounts Payable (expense) / Receivable (income)
  const arApId   = isExpense ? draft.ap_account_id   : draft.ar_account_id
  const arApName = isExpense ? draft.ap_account_name : draft.ar_account_name
  const canOnCredit = !!arApId

  const [categoryId, setCategoryId] = useState(defaultCategoryId || '')
  const [onCredit, setOnCredit]     = useState(false)   // false = paid now (bank)
  const [editing, setEditing]       = useState(false)
  const [loading, setLoading]       = useState(false)

  const confidence = draft.confidence ?? 0
  const confPct    = Math.round(confidence * 100)

  const categoryName = useMemo(
    () => accounts.find(a => a._id === categoryId)?.accountName
          || (isExpense ? draft.debit_account_name : draft.credit_account_name)
          || '—',
    [accounts, categoryId, isExpense, draft],
  )

  // Effective counterparty: bank (paid now) or AP/AR (on credit)
  const counterpartyId   = onCredit ? arApId   : bankId
  const counterpartyName = onCredit ? arApName : bankName

  const canPost = categoryId && counterpartyId

  const handleConfirm = async () => {
    if (!canPost) { toast.error('Pick an account first'); return }
    setLoading(true)
    // 1) Claim the draft atomically (idempotency — prevents double-posting)
    try {
      await classifierApi.claim(draft.draft_id)
    } catch (err) {
      if (err?.response?.status === 409) { toast('Already processed', { icon: 'ℹ️' }); onResolved?.(draft.draft_id, 'claimed'); setLoading(false); return }
      toast.error('Could not claim draft'); setLoading(false); return
    }
    try {
      const debitAccountId  = isExpense ? categoryId : counterpartyId
      const creditAccountId = isExpense ? counterpartyId : categoryId
      // On credit → link the party so the backend creates the payable/receivable
      const party = onCredit && draft.party_name
        ? (isExpense ? { vendorName: draft.party_name } : { customerName: draft.party_name })
        : {}
      // 2) Post a real journal entry through the existing transaction system
      const res = await transactionService.create({
        transactionDate: draft.tx_date,
        description:     (draft.narration_raw || draft.payee_raw || 'AI transaction').slice(0, 200),
        amount:         Number(draft.amount),
        debitAccountId,
        creditAccountId,
        ...(isForeign ? { currencyCode: draft.currency.toUpperCase() } : {}),
        ...party,
      })
      // #6 — if approvals are on and this is over the limit, the backend parks
      // it (status 'pending') instead of posting. It's now tracked in Approvals,
      // so resolve the AI draft either way — just report it accurately.
      const posted    = res?.data?.data
      const isPending = posted?.status === 'pending'
      const jeId      = isPending ? null : (posted?._id || res?.data?._id)
      // 3) Mark the draft resolved + feed the correction back to the model
      await classifierApi.markConfirmed(draft.draft_id, {
        journal_entry_id:  jeId,
        corrected_account: categoryId !== defaultCategoryId ? categoryId : undefined,
      })
      if (isPending) toast('Sent for approval', { icon: '🕓' })
      else toast.success(onCredit ? 'Posted (linked to party)' : 'Posted to your ledger')
      onResolved?.(draft.draft_id, 'confirmed')
    } catch (err) {
      // Posting failed — release the claim so it can be retried
      try { await classifierApi.release(draft.draft_id) } catch { /* ignore */ }
      toast.error(getErrorMessage(err) || 'Failed to post')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    setLoading(true)
    try {
      await classifierApi.dismiss(draft.draft_id)
      toast('Dismissed', { icon: '🗑️' })
      onResolved?.(draft.draft_id, 'dismissed')
    } catch {
      toast.error('Failed to dismiss')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-navy-2 rounded-xl border border-glass p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary text-sm truncate">{draft.payee_raw}</p>
          <p className="text-xs text-text-muted">{draft.tx_date} · {draft.channel}</p>
        </div>
        <p className={`font-bold text-base shrink-0 ${isExpense ? 'text-negative' : 'text-positive'}`}>
          {isExpense ? '-' : '+'}{draft.currency} {Number(draft.amount).toLocaleString()}
        </p>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>AI Confidence</span><span className="font-medium">{confPct}%</span>
        </div>
        <div className="h-1.5 bg-glass-panel rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${CONF_COLOR(confidence)}`} style={{ width: `${confPct}%` }} />
        </div>
      </div>

      {/* Paid now vs On credit (AR/AP) */}
      {canOnCredit && (
        <div className="flex gap-1 p-0.5 bg-glass-panel rounded-lg text-xs">
          <button onClick={() => setOnCredit(false)}
            className={`flex-1 py-1 rounded-md font-medium ${!onCredit ? 'bg-navy-2 shadow text-text-primary' : 'text-text-muted'}`}>
            Paid now
          </button>
          <button onClick={() => setOnCredit(true)}
            className={`flex-1 py-1 rounded-md font-medium ${onCredit ? 'bg-navy-2 shadow text-text-primary' : 'text-text-muted'}`}>
            {isExpense ? 'On credit (bill)' : 'On credit (invoice)'}
          </button>
        </div>
      )}

      {/* Double-entry preview (REAL accounts) */}
      <div className="bg-glass-panel rounded-lg p-3 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-text-muted">Debit</span>
          <span className="font-medium text-text-primary">{isExpense ? categoryName : counterpartyName || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Credit</span>
          <span className="font-medium text-text-primary">{isExpense ? counterpartyName || '—' : categoryName}</span>
        </div>
        {onCredit && draft.party_name && (
          <div className="flex justify-between pt-1 border-t border-glass">
            <span className="text-text-muted">{isExpense ? 'Vendor' : 'Customer'}</span>
            <span className="font-medium text-cyan">{draft.party_name}</span>
          </div>
        )}
      </div>

      {/* Change account */}
      {editing ? (
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full text-xs border border-glass-2 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-cyan"
        >
          <option value="">Select account…</option>
          {accounts.map(a => (
            <option key={a._id} value={a._id}>{a.accountName} ({a.accountType})</option>
          ))}
        </select>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-cyan hover:underline">
          Change {isExpense ? 'expense' : 'income'} account
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleConfirm}
          disabled={loading || !canPost}
          className="flex-1 btn-gradient text-xs font-medium py-1.5 rounded-lg disabled:opacity-50"
        >
          ✓ Confirm &amp; Post
        </button>
        <button
          onClick={handleDismiss}
          disabled={loading}
          className="px-3 border border-glass-2 hover:bg-glass-hover text-text-secondary text-xs font-medium py-1.5 rounded-lg"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
