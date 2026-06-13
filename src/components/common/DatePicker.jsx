import { cn } from '@/utils/cn'

export default function DatePicker({
  label,
  value,
  onChange,
  range = false,
  startDate,
  endDate,
  onRangeChange,
  error,
  className,
  min,
  max,
}) {
  if (range) {
    return (
      <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">From</label>
          <input
            type="date"
            value={startDate || ''}
            min={min}
            max={endDate || max}
            onChange={(e) => onRangeChange?.({ startDate: e.target.value, endDate })}
            className="w-full rounded-lg border border-glass-2 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">To</label>
          <input
            type="date"
            value={endDate || ''}
            min={startDate || min}
            max={max}
            onChange={(e) => onRangeChange?.({ startDate, endDate: e.target.value })}
            className="w-full rounded-lg border border-glass-2 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-sm font-medium text-text-secondary">{label}</label>}
      <input
        type="date"
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          error ? 'border-negative' : 'border-glass-2'
        )}
      />
      {error && <p className="mt-1 text-xs text-negative">{error}</p>}
    </div>
  )
}
