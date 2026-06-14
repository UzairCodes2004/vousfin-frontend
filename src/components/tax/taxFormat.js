/**
 * taxFormat.js — shared helpers for the Tax Autopilot surface (FR-04.1).
 * Compact money for headline figures + a single source of truth for how
 * "urgency" maps to the theme's semantic tokens.
 */

/** Compact currency for headline numbers — Rs 2.07M / Rs 970.15M / Rs 12.3K. */
export function compactMoney(value, currency = 'PKR') {
  const sym  = currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : currency
  const v    = Number(value) || 0
  const abs  = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}${sym} ${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}${sym} ${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${sym} ${(abs / 1e3).toFixed(1)}K`
  return `${sign}${sym} ${abs.toLocaleString('en-PK')}`
}

/**
 * Map days-until-deadline to the theme's urgency tokens.
 * overdue / ≤3d → negative, ≤7d → amber, ≤14d → cyan, else calm muted.
 */
export function deadlineTone(days) {
  if (days == null)  return { text: 'text-text-muted', dot: 'bg-text-muted',  chip: 'bg-glass-panel border-glass' }
  if (days < 0)      return { text: 'text-negative',   dot: 'bg-negative',    chip: 'bg-negative-muted border-negative/30' }
  if (days <= 3)     return { text: 'text-negative',   dot: 'bg-negative',    chip: 'bg-negative-muted border-negative/30' }
  if (days <= 7)     return { text: 'text-amber',      dot: 'bg-amber',       chip: 'bg-amber/15 border-amber/30' }
  if (days <= 14)    return { text: 'text-cyan',       dot: 'bg-cyan',        chip: 'bg-cyan/10 border-cyan/25' }
  return { text: 'text-text-secondary', dot: 'bg-text-muted', chip: 'bg-glass-panel border-glass' }
}

/** Human phrase for a deadline: "due in 4 days" / "due today" / "overdue by 2 days". */
export function deadlinePhrase(days) {
  if (days == null) return 'No deadline'
  if (days < 0)     return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
  if (days === 0)   return 'Due today'
  if (days === 1)   return 'Due tomorrow'
  return `Due in ${days} days`
}
