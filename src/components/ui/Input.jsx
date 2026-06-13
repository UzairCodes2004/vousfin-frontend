import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'

export const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  type = 'text',
  className,
  containerClassName,
  id,
  name,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || name
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className={containerClassName ?? 'w-full'}>
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
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          className={cn(
            'w-full rounded-lg border bg-glass-panel px-4 py-3 text-sm text-text-primary transition-premium placeholder:text-text-muted focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:bg-glass-hover',
            Icon && 'pl-10',
            isPassword && 'pr-10',
            error ? 'border-negative/50 focus:border-negative focus:ring-negative/20' : 'border-glass',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-cyan transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-negative">{error}</p>}
      {!error && helperText && <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>}
    </div>
  )
})
Input.displayName = 'Input'
export default Input
