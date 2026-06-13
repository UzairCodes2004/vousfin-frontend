import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function Input({
  label,
  error,
  helperText,
  icon: Icon,
  type = 'text',
  className,
  id,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || props.name
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        )}
        <input
          id={inputId}
          type={inputType}
          className={cn(
            'w-full rounded-lg border bg-navy-2 px-3 py-2.5 text-sm text-text-primary transition placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            Icon && 'pl-10',
            isPassword && 'pr-10',
            error ? 'border-negative' : 'border-glass-2',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-negative">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-text-muted">{helperText}</p>}
    </div>
  )
}
