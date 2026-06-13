import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export const TextArea = forwardRef(({
  label,
  error,
  helperText,
  className,
  id,
  name,
  rows = 4,
  ...props
}, ref) => {
  const inputId = id || name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={ref}
          id={inputId}
          name={name}
          rows={rows}
          className={cn(
            'w-full rounded-lg border bg-glass-panel px-4 py-3 text-sm text-text-primary transition-premium placeholder:text-text-muted focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:bg-glass-hover scrollbar-thin',
            error ? 'border-negative/50 focus:border-negative focus:ring-negative/20' : 'border-glass',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-negative">{error}</p>}
      {!error && helperText && <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>}
    </div>
  )
})
TextArea.displayName = 'TextArea'
export default TextArea
