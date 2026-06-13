/**
 * CurrencyBadge
 * Small pill that shows a 3-letter ISO 4217 code.
 * When the transaction currency differs from the business base currency it
 * renders in amber to signal a foreign-currency entry.
 *
 * Props:
 *   code         – ISO currency code, e.g. "USD"
 *   baseCurrency – business base currency, e.g. "PKR"
 *   rate         – optional exchange rate to show on hover
 *   size         – "xs" (default) | "sm"
 */
export default function CurrencyBadge({ code, baseCurrency, rate, size = 'xs' }) {
  if (!code) return null

  const isForeign = baseCurrency && code !== baseCurrency
  const title = rate && isForeign
    ? `1 ${code} = ${rate} ${baseCurrency}`
    : code

  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-1.5 py-px text-[10px]'

  return (
    <span
      title={title}
      className={`
        inline-flex items-center rounded font-mono font-semibold tracking-wide
        ${sizeClass}
        ${isForeign
          ? 'bg-amber/15 text-amber border border-amber/25'
          : 'bg-glass-panel text-text-muted border border-glass'}
      `}
    >
      {code}
    </span>
  )
}
