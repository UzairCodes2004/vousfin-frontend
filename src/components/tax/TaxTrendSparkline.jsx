/**
 * TaxTrendSparkline — a tiny area sparkline of a liability over recent snapshots.
 * Gracefully degrades: a single point shows a calm baseline + caption, since the
 * trend is built one daily snapshot at a time (FR-04.1, Phase 2).
 */
import { memo, useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis } from 'recharts'
import { formatCurrency, formatDate } from '@/utils/formatters'

const TinyTooltip = memo(({ active, payload, currency }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-glass bg-charcoal/95 backdrop-blur-sm px-2.5 py-1.5 shadow-elevated text-[11px]">
      <p className="font-bold text-text-primary leading-none mb-0.5">{formatCurrency(p.value, currency)}</p>
      <p className="text-text-muted leading-none">{formatDate(p.date, 'd MMM')}</p>
    </div>
  )
})
TinyTooltip.displayName = 'SparkTooltip'

function TaxTrendSparkline({ series = [], color = 'rgb(var(--chart-cash))', currency = 'PKR', height = 40 }) {
  const gid = `spark${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const points = Array.isArray(series) ? series.filter(p => p && Number.isFinite(Number(p.value))) : []

  if (points.length < 2) {
    return (
      <div className="flex items-center gap-2 text-[11.5px] text-text-muted" style={{ height }}>
        <div className="h-px flex-1 bg-glass" />
        <span className="shrink-0">Trend builds daily</span>
        <div className="h-px flex-1 bg-glass" />
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Tooltip content={<TinyTooltip currency={currency} />} cursor={{ stroke: 'rgb(var(--c-text) / 0.2)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gid})`}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default memo(TaxTrendSparkline)
