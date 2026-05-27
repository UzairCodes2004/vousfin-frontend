/**
 * chartTheme.js — shared Recharts configuration
 * Import these constants into any chart component for visual consistency.
 */

export const CHART_COLORS = {
  revenue:  '#06B6D4',
  expenses: '#F97316',
  profit:   '#34d399',
  cash:     '#a78bfa',
  neutral:  '#94A3B8',
}

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: 'rgba(255,255,255,0.06)',
  vertical: false,
}

export const AXIS_TICK = { fontSize: 11, fill: '#94A3B8' }

export const AXIS_STYLE = { axisLine: false, tickLine: false }

export const TOOLTIP_WRAPPER = {
  contentStyle: {
    background: 'rgba(30,41,59,0.97)',
    border: '1px solid rgba(6,182,212,0.18)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    padding: '10px 14px',
    fontSize: '12px',
  },
  labelStyle: { color: '#F8FAFC', fontWeight: 700, marginBottom: '4px' },
  itemStyle:  { color: '#CBD5E1' },
}

/** Format Y-axis tick values as K / M */
export function kFmt(v) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}
