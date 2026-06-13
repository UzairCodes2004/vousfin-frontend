/**
 * chartTheme.js — shared Recharts configuration (theme-driven)
 * Colors are CSS variables; Recharts renders SVG so var() resolves live and
 * re-themes automatically. Fallbacks keep charts sane if a var is missing.
 *
 * Series semantics: money in = positive, money out = negative, cash = highlight.
 */

export const CHART_COLORS = {
  revenue:  'var(--chart-revenue, #3DDC97)',
  expenses: 'var(--chart-expenses, #F2705B)',
  profit:   'var(--chart-profit, #6FE8B4)',
  cash:     'var(--chart-cash, #D4A94E)',
  neutral:  'var(--chart-neutral, #6C7A71)',
}

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: 'rgb(var(--c-text) / 0.06)',
  vertical: false,
}

export const AXIS_TICK = { fontSize: 11, fill: 'rgb(var(--c-text3))' }

export const AXIS_STYLE = { axisLine: false, tickLine: false }

export const TOOLTIP_WRAPPER = {
  contentStyle: {
    background: 'rgb(var(--c-bg2) / 0.95)',
    border: '1px solid var(--c-border2)',
    borderRadius: '12px',
    backdropFilter: 'blur(12px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 40px rgba(0,0,0,0.6)',
    padding: '10px 14px',
    fontSize: '12px',
  },
  labelStyle: { color: 'rgb(var(--c-text))', fontWeight: 700, marginBottom: '4px' },
  itemStyle:  { color: 'rgb(var(--c-text2))' },
}

/** Format Y-axis tick values as K / M */
export function kFmt(v) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}
