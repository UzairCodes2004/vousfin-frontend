import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { useBusinessStore } from '@/stores/useBusinessStore'

/* ── Y-axis tick: format raw PKR into readable scale ── */
function formatPKR(val) {
  if (val == null || isNaN(val)) return '0'
  const abs = Math.abs(val)
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(val / 1_000).toFixed(0)}K`
  return String(Math.round(val))
}

/* ── Rich tooltip ── */
function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-charcoal border border-glass p-3 rounded-xl shadow-lg min-w-[160px]">
      <p className="text-text-muted text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry, i) => {
        if (entry.value == null) return null
        const isConf = entry.name === 'Upper Bound' || entry.name === 'Lower Bound'
        if (isConf) return null   // hide raw confidence lines from tooltip
        return (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-xs" style={{ color: entry.color }}>{entry.name}</span>
            <span className="text-sm font-bold" style={{ color: entry.color }}>
              {formatCurrency(entry.value, currency)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * ForecastChart
 *
 * Props
 *   historical  – [{period, date, value}]  raw PKR integers
 *   predicted   – [{period, date, value}]  raw PKR integers
 *   upper       – number[]  upper confidence bound per predicted point (optional)
 *   lower       – number[]  lower confidence bound per predicted point (optional)
 *   metricName  – 'revenue' | 'expenses' | 'netCashFlow'
 */
export default function ForecastChart({
  historical = [],
  predicted  = [],
  upper      = [],
  lower      = [],
  metricName = 'revenue',
}) {
  const currency = useBusinessStore(s => s.currency)

  const COLOR = {
    revenue:     '#34d399',
    expenses:    '#f87171',
    netCashFlow: '#06b6d4',
  }[metricName] || '#06b6d4'

  const CONF_COLOR = COLOR   // same hue, low opacity for band

  /* ── Build unified chart dataset ── */
  const chartData = useMemo(() => {
    const data = []

    // Historical points
    historical.forEach(pt => {
      data.push({
        label:    pt.period || '',
        date:     pt.date,
        actual:   pt.value ?? 0,
        forecast: null,
        bandUpper: null,
        bandLower: null,
        isProjected: false,
      })
    })

    // Stitch connector — carry last actual value so chart line doesn't break
    if (historical.length > 0 && predicted.length > 0) {
      const last = historical[historical.length - 1]
      data.push({
        label:    last.period || '',
        date:     last.date,
        actual:   null,
        forecast: last.value ?? 0,
        bandUpper: upper[0] ?? (last.value ? last.value * 1.04 : null),
        bandLower: lower[0] ?? (last.value ? last.value * 0.96 : null),
        isProjected: true,
      })
    }

    // Predicted points with confidence bands
    predicted.forEach((pt, i) => {
      data.push({
        label:    pt.period || '',
        date:     pt.date,
        actual:   null,
        forecast: pt.value ?? 0,
        bandUpper: upper[i] != null ? upper[i] : (pt.value ? Math.round(pt.value * (1.04 + i * 0.015)) : null),
        bandLower: lower[i] != null ? lower[i] : (pt.value ? Math.round(pt.value * (1 - 0.04 - i * 0.015)) : null),
        isProjected: true,
      })
    })

    return data
  }, [historical, predicted, upper, lower])

  const projectionStart = useMemo(
    () => chartData.find(d => d.isProjected)?.label,
    [chartData]
  )

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted border border-glass border-dashed rounded-xl text-sm">
        No forecast data available.
      </div>
    )
  }

  return (
    <div className="w-full h-80 sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-actual-${metricName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLOR} stopOpacity={0.35} />
              <stop offset="95%" stopColor={COLOR} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`grad-forecast-${metricName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLOR} stopOpacity={0.18} />
              <stop offset="95%" stopColor={COLOR} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`grad-band-${metricName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={CONF_COLOR} stopOpacity={0.10} />
              <stop offset="100%" stopColor={CONF_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />

          <XAxis
            dataKey="label"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatPKR}
            width={52}
          />

          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ stroke: COLOR, strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {projectionStart && (
            <ReferenceLine
              x={projectionStart}
              stroke="#64748B"
              strokeDasharray="4 4"
              label={{ position: 'insideTopRight', value: 'Forecast →', fill: '#64748B', fontSize: 10 }}
            />
          )}

          {/* Confidence band — upper fill */}
          <Area
            type="monotone"
            dataKey="bandUpper"
            name="Upper Bound"
            stroke="none"
            fill={`url(#grad-band-${metricName})`}
            fillOpacity={1}
            connectNulls
            legendType="none"
            dot={false}
            activeDot={false}
          />

          {/* Confidence band — lower fill (covers the inner area so band = upper - lower) */}
          <Area
            type="monotone"
            dataKey="bandLower"
            name="Lower Bound"
            stroke="none"
            fill="transparent"
            fillOpacity={1}
            connectNulls
            legendType="none"
            dot={false}
            activeDot={false}
          />

          {/* Historical actual line */}
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke={COLOR}
            strokeWidth={2.5}
            fill={`url(#grad-actual-${metricName})`}
            fillOpacity={1}
            dot={{ fill: COLOR, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: COLOR }}
            connectNulls
          />

          {/* Forecast dashed line */}
          <Area
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke={COLOR}
            strokeWidth={2}
            strokeDasharray="6 4"
            fill={`url(#grad-forecast-${metricName})`}
            fillOpacity={1}
            dot={{ fill: COLOR, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: COLOR }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
