/**
 * ReconciliationBanner — AR/AP M7.
 * Surfaces the unified read model: the document-sourced outstanding total and
 * whether it reconciles with the general ledger (control account + open entries).
 */
import { ShieldCheck, AlertTriangle, BookOpen } from 'lucide-react'
import { useArApReport } from '@/hooks/useArApReport'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'

export default function ReconciliationBanner({ type }) {
  const currency = useBusinessStore(s => s.currency)
  const { data } = useArApReport(type)
  const r = data?.reconciliation
  if (!r) return null

  const isPayable = type === 'payable'
  return (
    <div className={cn(
      'premium-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2',
      r.inSync ? 'border-positive/20 bg-positive/5' : 'border-amber/30 bg-amber/5'
    )}>
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-cyan shrink-0" />
        <span className="text-xs text-text-muted">
          Source of truth ({isPayable ? 'Bills' : 'Invoices'}):
        </span>
        <span className="font-bold text-text-primary font-mono">{formatCurrency(r.documentTotal, currency)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-muted">GL control {isPayable ? '(2110)' : '(1110)'}:</span>
        <span className="font-mono text-text-secondary">{formatCurrency(r.ledgerControl, currency)}</span>
      </div>
      {r.inSync ? (
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-positive">
          <ShieldCheck className="h-4 w-4" /> Reconciled with the ledger
        </span>
      ) : (
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-amber" title="Document outstanding differs from the ledger — run reconciliation">
          <AlertTriangle className="h-4 w-4" /> Ledger discrepancy {formatCurrency(Math.abs(r.discrepancyVsEntries), currency)}
        </span>
      )}
    </div>
  )
}
