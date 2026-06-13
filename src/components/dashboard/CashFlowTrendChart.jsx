import { memo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { GRID_PROPS, AXIS_TICK, AXIS_STYLE, CHART_COLORS, kFmt } from '@/utils/chartTheme'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

const CustomTooltip = memo(({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="rounded-xl border border-glass bg-charcoal/95 backdrop-blur-sm p-3 shadow-elevated text-xs">
      <p className="font-bold text-text-primary mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${value >= 0 ? 'bg-positive' : 'bg-negative'}`} />
        <span className="text-text-secondary">Net Cash:</span>
        <span className={`font-bold ${value >= 0 ? 'text-positive' : 'text-negative'}`}>
          {formatCurrency(value, currency)}
        </span>
      </div>
    </div>
  )
})
CustomTooltip.displayName = 'CashFlowTooltip'

const CashFlowTrendChart = memo(function CashFlowTrendChart({ data = [], loading, currency }) {
  if (loading) return <SkeletonLoader type="card" count={1} className="h-80" />

  return (
    <div className="premium-card p-5 h-full">
      <div className="mb-5">
        <h3 className="text-sm font-bold text-text-primary">Cash Flow Trend</h3>
        <p className="text-[11px] text-text-muted mt-0.5">Net cash movement · YTD</p>
      </div>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-text-muted text-sm border border-dashed border-glass rounded-xl">
          No cash flow data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="period" tick={AXIS_TICK} {...AXIS_STYLE} />
            <YAxis tickFormatter={kFmt} tick={AXIS_TICK} {...AXIS_STYLE} width={52} />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="netCashFlow"
              stroke={CHART_COLORS.cash}
              strokeWidth={2.5}
              dot={{ fill: CHART_COLORS.cash, strokeWidth: 0, r: 4 }}
              activeDot={{ fill: '#fff', stroke: CHART_COLORS.cash, strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
})

export default CashFlowTrendChart
