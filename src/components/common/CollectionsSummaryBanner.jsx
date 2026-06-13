/**
 * CollectionsSummaryBanner — AR/AP M8 (dunning / collections).
 * Surfaces the dunning ladder: how many overdue invoices sit at each escalation
 * level and the outstanding exposure, sourced from the document-authoritative
 * dunning engine. Renders nothing when no invoice has been escalated.
 */
import { Megaphone } from 'lucide-react'
import { useDunningSummary } from '@/hooks/useArApEnterprise'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'

const LEVEL_STYLES = {
  reminder:      'text-cyan border-cyan/30 bg-cyan/5',
  first_notice:  'text-amber border-amber/30 bg-amber/5',
  second_notice: 'text-amber border-amber/30 bg-amber/5',
  final_notice:  'text-negative border-negative/30 bg-negative/5',
  collections:   'text-negative border-negative/40 bg-negative/10',
}

export default function CollectionsSummaryBanner() {
  const currency = useBusinessStore((s) => s.currency)
  const { data } = useDunningSummary()
  if (!Array.isArray(data) || data.length === 0) return null

  return (
    <div className="premium-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="h-4 w-4 text-cyan shrink-0" />
        <span className="text-sm font-semibold text-text-primary">Collections &amp; Dunning</span>
        <span className="text-xs text-text-muted">overdue receivables by escalation level</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.map((row) => (
          <div
            key={row.level}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${LEVEL_STYLES[row.levelKey] || 'text-text-secondary border-border'}`}
          >
            <span className="font-semibold">{row.label || row.levelKey}</span>
            <span className="font-mono">{row.count}</span>
            <span className="text-text-muted font-mono">{formatCurrency(row.outstanding, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
