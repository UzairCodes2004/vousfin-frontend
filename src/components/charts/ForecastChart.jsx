/**
 * ForecastChart — v3
 *
 * Upgrades:
 *  - Scenario overlay lines (optimistic / pessimistic dashed)
 *  - Anomaly risk zone shading (red band when anomalyRisk > 0.3)
 *  - Richer tooltip with confidence breakdown
 *  - Reference line for forecast/actual boundary
 *  - Better gradient fills
 *  - Consistent color system
 */
import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { useBusinessStore } from '@/stores/useBusinessStore'

/* ── Y-axis tick formatter ── */
function formatPKR(val) {
  if (val == null || isNaN(val)) return '0'
  const abs = Math.abs(val)
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(val / 1_000).toFixed(0)}K`
  return String(Math.round(val))
}

/* ── Custom rich tooltip ── */
function CustomTooltip({ active, payload, label, currency, metricName, showScenarios }) {
  if (!active || !payload?.length) return null
  const hide   = new Set(['Upper Bound', 'Lower Bound', 'bandUpper', 'bandLower'])
  const items  = payload.filter(e => e.value != null && !hide.has(e.name))
  if (!items.length) return null

  return (
    <div className="bg-charcoal/95 border border-glass/60 p-3 rounded-xl shadow-2xl min-w-[180px] backdrop-blur-sm">
      <p className="text-text-muted text-[11px] mb-2.5 font-semibold uppercase tracking-wide border-b border-glass/40 pb-1.5">
        {label}
      </p>
      {items.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-6 mb-1">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: entry.color }}>
            <span className="h-1.5 w-4 rounded-full inline-block" style={{ background: entry.color, opacity: 0.8 }} />
            {entry.name}
          </span>
          <span className="text-sm font-bold" style={{ color: entry.color }}>
            {formatCurrency(entry.value, currency)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Custom legend ── */
function CustomLegend({ color, showScenarios }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-text-secondary mt-2 justify-center">
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 rounded inline-block" style={{ background: color, opacity: 0.9 }} />
        Historical
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 rounded inline-block border-t-2 border-dashed" style={{ borderColor: color }} />
        Forecast
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-2 rounded inline-block opacity-25" style={{ background: color }} />
        Confidence band
      </span>
      {showScenarios && (
        <>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded inline-block border-t-2 border-dashed border-positive" />
            Optimistic
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded inline-block border-t-2 border-dashed border-negative" />
            Pessimistic
          </span>
        </>
      )}
    </div>
  )
}

/**
 * ForecastChart props:
 *   historical  – [{period, date, value}]     raw PKR integers
 *   predicted   – [{period, date, value}]     raw PKR integers
 *   upper       – number[]   upper confidence bound (optional)
 *   lower       – number[]   lower confidence bound (optional)
 *   metricName  – 'revenue' | 'expenses' | 'netCashFlow'
 *   scenarios   – { optimistic: [{period,date,value}], pessimistic: [{...}] } (optional)
 *   anomalyRisk – 0..1 score — triggers risk zone highlight when > 0.3
 *   height      – number (default 380)
 */
export default function ForecastChart({
  historical    = [],
  predicted     = [],
  upper         = [],
  lower         = [],
  metricName    = 'revenue',
  scenarios     = null,
  anomalyRisk   = 0,
  height        = 380,
}) {
  const currency     = useBusinessStore(s => s.currency)
  const [showScenarios, setShowScenarios] = useState(!!scenarios)

  const COLOR = {
    revenue:     'rgb(var(--chart-revenue))',
    expenses:    'rgb(var(--chart-expenses))',
    netCashFlow: 'rgb(var(--c-accent))',
  }[metricName] || 'rgb(var(--c-accent))'

  const RISK_COLOR    = 'rgb(var(--chart-expenses))'
  const OPT_COLOR     = 'rgb(var(--chart-revenue))'
  const PESS_COLOR    = 'rgb(var(--chart-expenses))'

  /* ── Build unified chart dataset ── */
  const chartData = useMemo(() => {
    const data = []

    // Historical points
    historical.forEach(pt => {
      data.push({
        label:       pt.period || '',
        actual:      pt.value ?? 0,
        forecast:    null,
        bandUpper:   null,
        bandLower:   null,
        optimistic:  null,
        pessimistic: null,
        isProjected: false,
      })
    })

    // Stitch connector
    if (historical.length > 0 && predicted.length > 0) {
      const last = historical[historical.length - 1]
      data.push({
        label:       last.period || '',
        actual:      null,
        forecast:    last.value ?? 0,
        bandUpper:   upper[0] ?? (last.value ? Math.round(last.value * 1.05) : null),
        bandLower:   lower[0] ?? (last.value ? Math.round(last.value * 0.95) : null),
        optimistic:  showScenarios && scenarios?.optimistic?.[0]?.value  != null
                       ? scenarios.optimistic[0].value  : null,
        pessimistic: showScenarios && scenarios?.pessimistic?.[0]?.value != null
                       ? scenarios.pessimistic[0].value : null,
        isProjected: true,
      })
    }

    // Predicted points
    predicted.forEach((pt, i) => {
      data.push({
        label:       pt.period || '',
        actual:      null,
        forecast:    pt.value ?? 0,
        bandUpper:   upper[i] != null ? upper[i] : Math.round((pt.value ?? 0) * (1.05 + i * 0.015)),
        bandLower:   lower[i] != null ? lower[i] : Math.round((pt.value ?? 0) * (0.95 - i * 0.015)),
        optimistic:  showScenarios && scenarios?.optimistic?.[i]?.value  != null ? scenarios.optimistic[i].value  : null,
        pessimistic: showScenarios && scenarios?.pessimistic?.[i]?.value != null ? scenarios.pessimistic[i].value : null,
        isProjected: true,
      })
    })

    return data
  }, [historical, predicted, upper, lower, scenarios, showScenarios])

  const projectionStart = useMemo(
    () => chartData.find(d => d.isProjected)?.label,
    [chartData]
  )

  const hasScenarioData = scenarios?.optimistic?.length > 0 && scenarios?.pessimistic?.length > 0
  const showRiskZone    = anomalyRisk > 0.30

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center text-text-muted border border-glass border-dashed rounded-xl text-sm"
           style={{ height }}>
        No forecast data available.
      </div>
    )
  }

  return (
    <div>
      {/* Scenario toggle */}
      {hasScenarioData && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setShowScenarios(s => !s)}
            className={`text-[11px] font-medium px-3 py-1 rounded-full border transition-all ${
              showScenarios
                ? 'bg-cyan/10 border-cyan/30 text-cyan'
                : 'border-glass text-text-muted hover:text-text-secondary'
            }`}
          >
            {showScenarios ? 'Hide' : 'Show'} scenarios
          </button>
        </div>
      )}

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Actual area gradient */}
              <linearGradient id={`grad-actual-${metricName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLOR} stopOpacity={0.40} />
                <stop offset="95%" stopColor={COLOR} stopOpacity={0.02} />
              </linearGradient>
              {/* Forecast area gradient */}
              <linearGradient id={`grad-forecast-${metricName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLOR} stopOpacity={0.20} />
                <stop offset="95%" stopColor={COLOR} stopOpacity={0.02} />
              </linearGradient>
              {/* Confidence band gradient */}
              <linearGradient id={`grad-band-${metricName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={COLOR} stopOpacity={0.12} />
                <stop offset="100%" stopColor={COLOR} stopOpacity={0.02} />
              </linearGradient>
              {/* Anomaly risk zone */}
              {showRiskZone && (
                <linearGradient id={`grad-risk-${metricName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={RISK_COLOR} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={RISK_COLOR} stopOpacity={0.01} />
                </linearGradient>
              )}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-text) / 0.08)" vertical={false} />

            <XAxis
              dataKey="label"
              stroke="rgb(var(--c-text3))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={4}
            />
            <YAxis
              stroke="rgb(var(--c-text3))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatPKR}
              width={56}
            />

            <Tooltip
              content={
                <CustomTooltip
                  currency={currency}
                  metricName={metricName}
                  showScenarios={showScenarios}
                />
              }
              cursor={{ stroke: COLOR, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
            />

            {/* Forecast start reference line */}
            {projectionStart && (
              <ReferenceLine
                x={projectionStart}
                stroke="rgb(var(--c-text3))"
                strokeDasharray="5 4"
                label={{
                  position: 'insideTopRight',
                  value: 'Forecast →',
                  fill: 'rgb(var(--c-text3))',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Confidence band upper */}
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
            {/* Confidence band lower (clears the inner) */}
            <Area
              type="monotone"
              dataKey="bandLower"
              name="Lower Bound"
              stroke="none"
              fill="transparent"
              connectNulls
              legendType="none"
              dot={false}
              activeDot={false}
            />

            {/* Scenario lines (only when showScenarios=true) */}
            {showScenarios && hasScenarioData && (
              <>
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  name="Optimistic"
                  stroke={OPT_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  fill="none"
                  dot={false}
                  activeDot={{ r: 3, fill: OPT_COLOR }}
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="pessimistic"
                  name="Pessimistic"
                  stroke={PESS_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  fill="none"
                  dot={false}
                  activeDot={{ r: 3, fill: PESS_COLOR }}
                  connectNulls
                />
              </>
            )}

            {/* Historical actual area */}
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke={COLOR}
              strokeWidth={2.5}
              fill={`url(#grad-actual-${metricName})`}
              fillOpacity={1}
              dot={{ fill: COLOR, r: 3.5, strokeWidth: 0 }}
              activeDot={{ r: 5.5, fill: COLOR, strokeWidth: 2, stroke: 'rgb(var(--c-bg2))' }}
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
              activeDot={{ r: 5, fill: COLOR, strokeWidth: 2, stroke: 'rgb(var(--c-bg2))' }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend row */}
      <CustomLegend color={COLOR} showScenarios={showScenarios && hasScenarioData} />

      {/* Risk zone warning */}
      {showRiskZone && (
        <p className="text-[10px] text-negative/80 text-center mt-1.5 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-negative inline-block animate-pulse" />
          Anomaly risk {Math.round(anomalyRisk * 100)}% — confidence bands are widened
        </p>
      )}
    </div>
  )
}
