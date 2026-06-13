import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { cn } from '@/utils/cn'

export default function KPIWidget({ title, value, format = 'currency', trend, loading, currency }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-glass bg-navy-2 p-5 shadow-card">
        <div className="h-4 w-24 animate-pulse rounded bg-glass-hover" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-glass-hover" />
      </div>
    )
  }

  const display =
    format === 'percent'
      ? formatPercent(value)
      : format === 'currency'
        ? formatCurrency(value, currency)
        : value

  return (
    <div className="rounded-xl border border-glass bg-navy-2 p-5 shadow-card transition hover:shadow-md">
      <p className="text-sm font-medium text-text-muted">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{display}</p>
      {trend !== undefined && (
        <p
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            trend >= 0 ? 'text-positive' : 'text-negative'
          )}
        >
          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {Math.abs(trend).toFixed(1)}% vs prior period
        </p>
      )}
    </div>
  )
}
