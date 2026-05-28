/**
 * POReceivingProgress — Phase 3.2
 *
 * Displays a progress bar per PO line item showing received / ordered quantity.
 * Also shows the overall GRN receipt state (none / partial / full).
 *
 * Props:
 *   po  — PurchaseOrder document (with lineItems[].quantityOrdered / quantityReceived)
 */
import { Package } from 'lucide-react'

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }))

function ProgressBar({ value, max, colorClass = 'bg-cyan' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="relative h-2 rounded-full bg-glass overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function POReceivingProgress({ po }) {
  if (!po) return null

  const lines = Array.isArray(po.lineItems) ? po.lineItems : []
  if (lines.length === 0) return null

  const totalOrdered  = lines.reduce((s, li) => s + (li.quantityOrdered  || 0), 0)
  const totalReceived = lines.reduce((s, li) => s + (li.quantityReceived || 0), 0)
  const overallPct    = totalOrdered > 0 ? Math.min(100, (totalReceived / totalOrdered) * 100) : 0

  const overallColor = overallPct >= 100 ? 'text-emerald-400'
                     : overallPct > 0    ? 'text-sky-400'
                     : 'text-text-muted'

  return (
    <div className="premium-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Package className="h-4 w-4 text-cyan" />
          Receiving Progress
        </h3>
        <span className={`text-sm font-semibold ${overallColor}`}>
          {overallPct.toFixed(0)}% received
        </span>
      </div>

      {/* Overall bar */}
      <div className="space-y-1">
        <ProgressBar
          value={totalReceived}
          max={totalOrdered}
          colorClass={overallPct >= 100 ? 'bg-emerald-400' : 'bg-cyan'}
        />
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>{fmt(totalReceived)} received</span>
          <span>{fmt(totalOrdered)} ordered</span>
        </div>
      </div>

      {/* Per-line breakdown */}
      {lines.length > 1 && (
        <div className="space-y-3 border-t border-glass pt-3">
          {lines.map((li, i) => {
            const qo = li.quantityOrdered  || 0
            const qr = li.quantityReceived || 0
            const linePct = qo > 0 ? Math.min(100, (qr / qo) * 100) : 0
            const lineColor = linePct >= 100 ? 'bg-emerald-400'
                            : linePct > 0    ? 'bg-sky-400'
                            : 'bg-glass'
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary truncate max-w-[65%]">
                    {li.name || `Line ${i + 1}`}
                  </span>
                  <span className="text-text-muted font-mono">
                    {fmt(qr)} / {fmt(qo)} {li.unit || 'pcs'}
                  </span>
                </div>
                <ProgressBar value={qr} max={qo} colorClass={lineColor} />
              </div>
            )
          })}
        </div>
      )}

      {/* Linked GRNs summary */}
      {Array.isArray(po.linkedGrnIds) && po.linkedGrnIds.length > 0 && (
        <p className="text-[10px] text-text-muted">
          {po.linkedGrnIds.length} GRN{po.linkedGrnIds.length !== 1 ? 's' : ''} linked
        </p>
      )}
    </div>
  )
}
