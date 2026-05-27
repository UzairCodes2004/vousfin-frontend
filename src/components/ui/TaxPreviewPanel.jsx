/**
 * TaxPreviewPanel — Phase 5.4.8
 *
 * Inline tax breakdown panel shown in the transaction form.
 * Shows: gross → net → tax split for any enabled tax type.
 * Fires the /tax/preview API in real-time as amount changes.
 *
 * Props:
 *   amount         {number}  — raw entered amount
 *   transactionType{string}  — TRANSACTION_TYPE key
 *   mode           {'inclusive'|'exclusive'} — is amount tax-inclusive?
 *   taxType        {string?} — override tax type (e.g. 'SRB', 'VAT')
 *   taxRate        {number?} — override rate
 *   className      {string?}
 */
import { Receipt, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTaxPreview } from '@/hooks/useTax'

export default function TaxPreviewPanel({
  amount,
  transactionType,
  mode = 'inclusive',
  taxType,
  taxRate,
  className = '',
}) {
  const [expanded, setExpanded] = useState(true)

  const { data: preview, isLoading } = useTaxPreview({
    amount,
    transactionType,
    mode,
    taxType,
    taxRate,
  })

  // Don't render when tax is not applicable or amount is missing
  if (!amount || amount <= 0) return null
  if (!isLoading && preview && !preview.taxApplied) return null

  const fmt = (n) =>
    n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'

  return (
    <div className={`rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-amber-400">
          <Receipt className="h-4 w-4 shrink-0" />
          Tax Breakdown
          {preview && (
            <span className="ml-1 text-[10px] rounded px-1.5 py-px bg-amber-500/15 border border-amber-500/20 font-semibold uppercase tracking-wide">
              {preview.lines?.[0]?.taxType ?? ''} {preview.lines?.[0]?.rate ?? 0}%
            </span>
          )}
        </span>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
          : <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1 border-t border-amber-500/10">
          {isLoading ? (
            <p className="py-2 text-xs text-text-muted">Calculating…</p>
          ) : preview ? (
            <>
              {/* Per-line breakdown */}
              {preview.lines.map((line, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    {line.taxName}
                    {' '}
                    <span className="text-[10px] opacity-60">({line.side === 'output' ? 'on sale' : 'on purchase'})</span>
                  </span>
                  <span className="font-mono font-semibold text-amber-400 tabular-nums">
                    {fmt(line.taxAmount)}
                  </span>
                </div>
              ))}

              {/* Totals divider */}
              <div className="pt-1 border-t border-amber-500/10 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    Net Amount <span className="opacity-60">(ex-tax)</span>
                  </span>
                  <span className="font-mono tabular-nums text-text-secondary">{fmt(preview.netAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-text-secondary">Total Tax</span>
                  <span className="font-mono tabular-nums text-amber-400">{fmt(preview.totalTax)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-text-primary">Gross Amount</span>
                  <span className="font-mono tabular-nums text-text-primary">{fmt(preview.grossAmount)}</span>
                </div>
              </div>

              {/* Mode note */}
              <p className="pt-0.5 text-[10px] text-text-muted flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" />
                Amount is {mode === 'inclusive' ? 'tax-inclusive' : 'tax-exclusive'} · {preview.countryCode}
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
