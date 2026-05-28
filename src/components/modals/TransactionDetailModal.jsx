/**
 * TransactionDetailModal — Phase 2.1 — full read-only details of a single
 * journal entry: header info, both sides of the entry, all journal lines
 * (for compound entries), settlements, currency conversion, audit trail,
 * and linked AR/AP balances.
 */
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  X, FileText, Calendar, Repeat, Coins, Link2, History, RotateCcw,
  ArrowRight, Building2, User as UserIcon, Receipt, Tag, AlertTriangle,
} from 'lucide-react'
import api from '@/services/api'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters'
import Modal from '@/components/modals/Modal'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function TransactionDetailModal({ isOpen, onClose, transactionId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction-detail', transactionId],
    enabled: isOpen && !!transactionId,
    queryFn: async () => {
      const { data } = await api.get(`/transactions/${transactionId}`)
      return data.data
    },
    staleTime: 30 * 1000,
  })

  const tx = data
  const currency = tx?.currencyCode || 'PKR'

  // Compound journal lines (if present) override the simple debit/credit pair
  const lines = useMemo(() => {
    if (tx?.journalLines?.length > 0) {
      return tx.journalLines.map(l => ({
        side: l.type === 'debit' ? 'DR' : 'CR',
        accountName: l.account?.accountName || l.accountId?.toString() || '—',
        amount: l.amount,
        description: l.description,
      }))
    }
    if (!tx) return []
    return [
      { side: 'DR', accountName: tx.debitAccount?.accountName || '—', amount: tx.amount },
      { side: 'CR', accountName: tx.creditAccount?.accountName || '—', amount: tx.amount },
    ]
  }, [tx])

  const totalDebits  = lines.filter(l => l.side === 'DR').reduce((s, l) => s + (l.amount || 0), 0)
  const totalCredits = lines.filter(l => l.side === 'CR').reduce((s, l) => s + (l.amount || 0), 0)
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Details" className="sm:max-w-3xl">
      {isLoading && <div className="space-y-3"><SkeletonLoader count={4} /></div>}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Failed to load transaction details.
        </div>
      )}
      {tx && (
        <div className="space-y-5 text-sm">
          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-glass">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-cyan flex-shrink-0" />
                <h3 className="font-bold text-text-primary truncate">{tx.description}</h3>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(tx.transactionDate)}</span>
                <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{tx.transactionType}</span>
                {tx.invoiceNumber && <span className="font-mono">#{tx.invoiceNumber}</span>}
                {tx.transactionReference && <span className="font-mono">ref: {tx.transactionReference}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-text-primary tabular-nums">
                {formatCurrency(tx.amount, currency)}
              </div>
              {tx.status === 'reversed' && (
                <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-1">
                  <RotateCcw className="h-3 w-3" /> Reversed
                </span>
              )}
            </div>
          </div>

          {/* ── Journal Lines ────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Journal Entry
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-glass text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="text-left py-1.5 w-12">Side</th>
                  <th className="text-left py-1.5">Account</th>
                  <th className="text-right py-1.5 w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-glass/40">
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        l.side === 'DR' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>{l.side}</span>
                    </td>
                    <td className="py-2 text-text-primary">
                      {l.accountName}
                      {l.description && <div className="text-[10px] text-text-muted">{l.description}</div>}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-text-primary">
                      {formatCurrency(l.amount, currency)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2"></td>
                  <td className="py-2 text-right text-xs text-text-muted">Totals</td>
                  <td className="py-2 text-right">
                    <span className={`font-mono ${balanced ? 'text-emerald-400' : 'text-red-400'}`}>
                      DR {formatCurrency(totalDebits, currency)} · CR {formatCurrency(totalCredits, currency)}
                    </span>
                    {!balanced && (
                      <div className="text-[10px] text-red-400 flex items-center justify-end gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Not balanced
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Party + meta grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {tx.customer && (
              <DetailRow icon={UserIcon} label="Customer" value={tx.customer.businessName || tx.customer.fullName} />
            )}
            {tx.vendor && (
              <DetailRow icon={Building2} label="Vendor" value={tx.vendor.businessName || tx.vendor.fullName} />
            )}
            {tx.paymentMethod && (
              <DetailRow icon={Coins} label="Payment Method" value={tx.paymentMethod} />
            )}
            {tx.dueDate && (
              <DetailRow icon={Calendar} label="Due Date" value={formatDate(tx.dueDate)} />
            )}
            {tx.paymentStatus && (
              <DetailRow icon={Tag} label="Payment Status" value={tx.paymentStatus} />
            )}
            {tx.transactionMode && (
              <DetailRow icon={Tag} label="Mode" value={tx.transactionMode} />
            )}
          </div>

          {/* ── Currency / FX ───────────────────────────────────── */}
          {tx.currencyCode && tx.exchangeRate && tx.exchangeRate !== 1 && (
            <div className="rounded-lg border border-cyan/20 bg-cyan/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan mb-1.5 flex items-center gap-1">
                <Coins className="h-3 w-3" /> Multi-Currency
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-text-muted text-[10px]">Original</div>
                  <div className="font-mono text-text-primary">{formatCurrency(tx.amount, tx.currencyCode)}</div>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-3 w-3 text-text-muted" />
                  <span className="text-text-muted text-[10px] ml-1">× {tx.exchangeRate}</span>
                </div>
                <div>
                  <div className="text-text-muted text-[10px]">Base</div>
                  <div className="font-mono text-text-primary">{formatCurrency(tx.baseCurrencyAmount, 'PKR')}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Settlements ─────────────────────────────────────── */}
          {tx.settlements?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Settlements ({tx.settlements.length})
              </p>
              <div className="space-y-1.5">
                {tx.settlements.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded bg-glass-panel/40 px-3 py-1.5 text-xs">
                    <span className="text-text-muted">{formatDate(s.date)}</span>
                    <span className="font-mono text-emerald-400">{formatCurrency(s.amount, currency)}</span>
                  </div>
                ))}
                {(tx.remainingBalance !== null && tx.remainingBalance !== undefined) && (
                  <div className="flex items-center justify-between gap-3 rounded bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs mt-2">
                    <span className="font-semibold text-amber-300">Outstanding Balance</span>
                    <span className="font-mono font-bold text-amber-300">{formatCurrency(tx.remainingBalance, currency)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Inventory link ──────────────────────────────────── */}
          {tx.inventoryItemId && tx.inventoryQty && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-1">Inventory Movement</p>
              <p className="text-text-primary">{tx.inventoryQty} units of {tx.inventoryItem?.name || 'item'}</p>
            </div>
          )}

          {/* ── Reversal ────────────────────────────────────────── */}
          {tx.reversalOf && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-2 text-xs">
              <RotateCcw className="h-4 w-4 text-red-400" />
              <span className="text-red-300">This entry is a reversal of journal entry <span className="font-mono">{tx.reversalOf}</span></span>
            </div>
          )}

          {/* ── Audit Trail ─────────────────────────────────────── */}
          {tx.auditTrail?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1">
                <History className="h-3 w-3" /> Audit Trail
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                {tx.auditTrail.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-cyan font-mono shrink-0 text-[10px] whitespace-nowrap">{formatDateTime(e.timestamp || e.createdAt)}</span>
                    <span className={`shrink-0 rounded-full px-1.5 py-px font-semibold text-[10px] ${
                      e.action === 'Reversed' ? 'bg-red-500/15 text-red-400' :
                      e.action === 'Created'  ? 'bg-emerald-500/15 text-emerald-400' :
                      e.action === 'Edited'   ? 'bg-amber-500/15 text-amber-300' :
                      'bg-glass-panel text-text-muted'
                    }`}>{e.action}</span>
                    <span className="text-text-muted">by {e.performedByName || 'System'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Notes / tags ────────────────────────────────────── */}
          {tx.notes && (
            <div className="rounded bg-glass-panel/40 p-3 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Notes</p>
              <p className="text-text-secondary">{tx.notes}</p>
            </div>
          )}
          {tx.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tx.tags.map((t, i) => (
                <span key={i} className="text-[10px] bg-cyan/10 text-cyan rounded px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}

          {/* ── Footer / close ──────────────────────────────────── */}
          <div className="flex justify-end pt-3 border-t border-glass">
            <button onClick={onClose} className="btn-outline rounded-lg px-4 py-2 text-sm font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {Icon && <Icon className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />}
      <span className="text-text-muted">{label}:</span>
      <span className="text-text-primary font-medium truncate">{value}</span>
    </div>
  )
}
