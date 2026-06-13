import { forwardRef, useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Select — custom dropdown rendered via React Portal.
 *
 * Why a portal?
 *   Ancestor elements with CSS transforms or animations (e.g. premium-card:hover,
 *   animate-fade-in, will-change) silently establish new containing blocks for
 *   `position: fixed` descendants. That made the dropdown drift away from its
 *   trigger. Rendering to `document.body` puts the panel outside every
 *   stacking context the trigger lives in, so positioning is bulletproof.
 *
 * Design:
 *  - Position is computed synchronously in the click handler so the panel paints
 *    in the correct spot on the first frame (no flash).
 *  - A capture-phase scroll listener closes the dropdown when an ancestor
 *    (other than the panel itself) scrolls — prevents stale positions.
 *  - Outside-click checks BOTH the container and the panel (the panel is in a
 *    different DOM tree now, so containerRef.contains() alone isn't enough).
 *  - Resize/escape close the dropdown.
 *  - Smart vertical flip: drops up if there isn't room below.
 */
export const Select = forwardRef(({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchable  = false,
  loading     = false,
  error,
  className,
  name,
}, ref) => {
  const [open,          setOpen]          = useState(false)
  const [query,         setQuery]         = useState('')
  const [dropdownStyle, setDropdownStyle] = useState(null)

  const containerRef = useRef(null)
  const triggerRef   = useRef(null)
  const panelRef     = useRef(null)

  /* ── Filtered options ──────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!searchable || !query) return options
    const q = query.toLowerCase()
    return options.filter(o => {
      const label    = String(o.label    || o.name || o).toLowerCase()
      const subtitle = String(o.subtitle || '').toLowerCase()
      const code     = String(o.accountCode || '').toLowerCase()
      // Match against name, subtitle (subtype group), or account code
      return label.includes(q) || subtitle.includes(q) || code.includes(q)
    })
  }, [options, query, searchable])

  const selected = options.find(o => (o.value ?? o._id ?? o.id) === value)

  /* ── Calculate position (viewport-relative) ─────────────────────────── */
  const calcStyle = useCallback(() => {
    if (!triggerRef.current) return null
    const rect      = triggerRef.current.getBoundingClientRect()
    const viewportH = window.innerHeight
    // Account options with subtitles are ~50px tall; plain options are ~40px
    const hasSubtitles = options.some(o => o.subtitle)
    const ITEM_H    = hasSubtitles ? 50 : 40
    const SEARCH_H  = searchable ? 48 : 0
    const neededH   = Math.min(320, options.length * ITEM_H + SEARCH_H + 8)
    const spaceDown = viewportH - rect.bottom - 8
    const spaceUp   = rect.top - 8

    const base = {
      position : 'fixed',
      left     : rect.left,
      width    : rect.width,
      zIndex   : 9999,
    }

    if (spaceDown >= neededH || spaceDown >= spaceUp) {
      return { ...base, top: rect.bottom + 4, maxHeight: Math.max(140, spaceDown) }
    }
    return { ...base, bottom: viewportH - rect.top + 4, maxHeight: Math.max(140, spaceUp) }
  }, [options.length, searchable])

  /* ── Trigger click ────────────────────────────────────────────────── */
  const handleTriggerClick = useCallback(() => {
    if (open) {
      setOpen(false)
      setQuery('')
      return
    }
    const style = calcStyle()
    if (style) setDropdownStyle(style)
    setOpen(true)
  }, [open, calcStyle])

  /* ── Outside-click (checks BOTH container and portal panel) ──────── */
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      const t = e.target
      if (containerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t))     return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  /* ── Escape key ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  /* ── Close on ancestor scroll (but not on panel internal scroll) ──── */
  useEffect(() => {
    if (!open) return
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
      setQuery('')
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  /* ── Reposition on viewport resize ────────────────────────────────── */
  useEffect(() => {
    if (!open) return
    const onResize = () => {
      const style = calcStyle()
      if (style) setDropdownStyle(style)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, calcStyle])

  /* ── Select an option ─────────────────────────────────────────────── */
  const handleSelect = useCallback((optVal) => {
    onChange(optVal)
    setOpen(false)
    setQuery('')
  }, [onChange])

  /* ── Dropdown panel (rendered into document.body via portal) ──────── */
  const panel = open && dropdownStyle ? (
    <div
      ref={panelRef}
      style={dropdownStyle}
      role="listbox"
      className="overflow-y-auto scrollbar-thin rounded-lg border border-glass bg-charcoal shadow-elevated"
    >
      {searchable && (
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-glass bg-charcoal px-3 py-2">
          <Search className="h-4 w-4 flex-shrink-0 text-text-muted" />
          <input
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}>
              <X className="h-4 w-4 text-text-muted hover:text-cyan transition-colors" />
            </button>
          )}
        </div>
      )}

      <div className="py-1">
        {filtered.length === 0 ? (
          <p className="px-4 py-3 text-center text-sm text-text-muted">No options found</p>
        ) : (
          (() => {
            /* Render with group separators. Each option may carry an optional
               `group` field; whenever that value changes between adjacent
               items, a small sticky header is inserted. */
            const nodes = []
            let lastGroup = undefined
            for (const opt of filtered) {
              const groupLabel = opt.group ?? null
              if (groupLabel !== undefined && groupLabel !== lastGroup) {
                lastGroup = groupLabel
                if (groupLabel) {
                  nodes.push(
                    <div
                      key={`__grp_${groupLabel}`}
                      className="sticky top-0 z-[1] px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted bg-charcoal/95 border-b border-glass/40"
                    >
                      {groupLabel}
                    </div>
                  )
                }
              }
              const optVal     = opt.value ?? opt._id ?? opt.id
              const isSelected = value === optVal
              // Build native tooltip: show account code if available, else nothing
              const tooltipTitle = opt.accountCode
                ? `${opt.label ?? opt.name} · ${opt.accountCode}`
                : undefined
              nodes.push(
                <button
                  key={optVal}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  title={tooltipTitle}
                  className={cn(
                    'w-full px-4 text-left text-sm transition-colors',
                    opt.subtitle ? 'py-2' : 'py-2.5',
                    isSelected
                      ? 'bg-glass-panel font-semibold text-cyan'
                      : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'
                  )}
                  onClick={() => handleSelect(optVal)}
                >
                  {/* Primary label */}
                  <span className="block leading-tight">{opt.label ?? opt.name}</span>
                  {/* Subtitle — account subtype shown as dim secondary line */}
                  {opt.subtitle && (
                    <span className={cn(
                      'block text-[10px] leading-tight mt-0.5',
                      isSelected ? 'text-cyan/60' : 'text-text-muted'
                    )}>
                      {opt.subtitle}
                    </span>
                  )}
                </button>
              )
            }
            return nodes
          })()
        )}
      </div>
    </div>
  ) : null

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      <input type="hidden" name={name} value={value ?? ''} ref={ref} />

      {label && (
        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}

      {/* ── Trigger ──────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border bg-glass-panel',
          'px-4 py-3 text-left text-sm transition-premium',
          'focus:outline-none focus:ring-2 focus:ring-cyan/20',
          error
            ? 'border-negative/50'
            : open
              ? 'border-cyan/50 bg-glass-hover'
              : 'border-glass hover:border-cyan/30 hover:bg-glass-hover focus:border-cyan'
        )}
      >
        <span className={cn('truncate', selected ? 'text-text-primary' : 'text-text-muted')}>
          {selected ? (selected.label ?? selected.name) : placeholder}
        </span>
        {loading ? (
          <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-text-muted border-t-cyan" />
        ) : (
          <ChevronDown className={cn(
            'h-4 w-4 flex-shrink-0 text-text-muted transition-transform duration-200',
            open && 'rotate-180'
          )} />
        )}
      </button>

      {/* ── Portal: dropdown rendered into document.body ─────────────── */}
      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}

      {error && <p className="mt-1.5 text-xs text-negative">{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
