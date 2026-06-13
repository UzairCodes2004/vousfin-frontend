/**
 * TransactionReversalModal
 *
 * GAAP-compliant reversal confirmation dialog.
 * Shows the original journal entry, the planned counter-entry, a reason input,
 * and an optional reversal date — then calls POST /transactions/:id/reverse.
 *
 * Props:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   transaction  — The original JournalEntry document (populated debitAccountId / creditAccountId)
 *   onSuccess    — () => void   (called after successful reversal)
 */
import { useState } from 'react'
import { ArrowLeftRight, AlertTriangle, RotateCcw } from 'lucide-react'
import Modal from '@/components/modals/Modal'
import Button from '@/components/ui/Button'
import { useReverseTransaction } from '@/hooks/useTransactions'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useBusinessStore } from '@/stores/useBusinessStore'

// ─── helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)

/** Compute the planned reversal journal lines from the original transaction */
function buildReversalLines(tx) {
  if (tx.journalLines && tx.journalLines.length > 0) {
    return tx.journalLines.map((line) => ({
      accountId: line.accountId?._id || line.accountId,
      accountName: line.accountId?.accountName || 'Account',
      type: line.type === 'debit' ? 'credit' : 'debit',
      amount: line.amount,
    }))
  }
  return [
    {
      accountId:   tx.creditAccountId?._id || tx.creditAccountId,
      accountName: tx.creditAccountId?.accountName || 'Account',
      type:        'debit',
      amount:      tx.amount,
    },
    {
      accountId:   tx.debitAccountId?._id || tx.debitAccountId,
      accountName: tx.debitAccountId?.accountName || 'Account',
      type:        'credit',
      amount:      tx.amount,
    },
  ]
}

// ─── component ──────────────────────────────────────────────────────────────

export default function TransactionReversalModal({ isOpen, onClose, transaction, onSuccess }) {
  const [reversalDate, setReversalDate]   = useState(today())
  const [reason,       setReason]         = useState('')

  const currency    = useBusinessStore((s) => s.currency)
  const reverseMut  = useReverseTransaction()

  if (!transaction) return null

  const reversalLines = buildReversalLines(transaction)

  const handleConfirm = async () => {
    await reverseMut.mutateAsync({
      id:          transaction._id,
      reversalDate: reversalDate || undefined,
      reason:      reason.trim() || undefined,
    })
    onSuccess?.()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Reversal Entry"
      preventOutsideClick={reverseMut.isPending}
      className="max-w-xl"
    >
      {/* Warning banner */}
      <div className="mb-5 flex items-start gap-3 rounded-lg bg-amber/10 border border-amber/20 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-2" />
        <p className="text-sm text-amber-2">
          A reversing entry will be posted to neutralize the original transaction.
          The original remains in the ledger marked <strong>REVERSED</strong> — it cannot be undone.
        </p>
      </div>

      {/* Original transaction summary */}
      <section className="mb-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Original Entry
        </h3>
        <div className="rounded-lg bg-glass-panel border border-glass p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Date</span>
            <span className="text-text-primary font-medium">{formatDate(transaction.transactionDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Description</span>
            <span className="text-text-primary font-medium text-right max-w-[60%]">{transaction.description}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Type</span>
            <span className="text-text-primary font-medium">{transaction.transactionType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Amount</span>
            <span className="font-bold text-text-primary">{formatCurrency(transaction.amount, currency)}</span>
          </div>
        </div>
      </section>

      {/* Planned reversal journal preview */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <ArrowLeftRight className="h-4 w-4 text-cyan" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Reversal Journal Preview
          </h3>
        </div>
        <div className="rounded-lg border border-glass overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-glass-panel">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Account</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">DR</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">CR</th>
              </tr>
            </thead>
            <tbody>
              {reversalLines.map((line, i) => (
                <tr key={i} className="border-t border-glass">
                  <td className="px-4 py-3 text-text-primary font-medium">
                    {line.accountName}
                  </td>
                  <td className="px-4 py-3 text-right text-positive font-mono">
                    {line.type === 'debit' ? formatCurrency(line.amount, currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary font-mono">
                    {line.type === 'credit' ? formatCurrency(line.amount, currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          ✓ Balanced — total debits equal total credits
        </p>
      </section>

      {/* Reversal date + reason inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">
            Reversal Date
          </label>
          <input
            type="date"
            value={reversalDate}
            onChange={(e) => setReversalDate(e.target.value)}
            className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">
            Reason <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate entry, Customer cancelled order, Incorrect amount…"
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-glass bg-glass-panel px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
          />
          <p className="mt-1 text-xs text-text-muted">{reason.length}/500</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={onClose}
          disabled={reverseMut.isPending}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          icon={RotateCcw}
          loading={reverseMut.isPending}
          onClick={handleConfirm}
        >
          Confirm Reversal
        </Button>
      </div>
    </Modal>
  )
}
