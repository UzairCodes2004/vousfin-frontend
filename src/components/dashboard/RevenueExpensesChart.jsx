import { memo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { GRID_PROPS, AXIS_TICK, AXIS_STYLE, CHART_COLORS, TOOLTIP_WRAPPER, kFmt } from '@/utils/chartTheme'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

const CustomTooltip = memo(({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-glass bg-charcoal/95 backdrop-blur-sm p-3 shadow-elevated text-xs">
      <p className="font-bold text-text-primary mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mt-1">
          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill }} />
          <span className="text-text-secondary capitalize">{entry.name}:</span>
          <span className="font-bold text-text-primary ml-auto pl-3">{formatCurrency(entry.value, currency)}</span>
        </div>
      ))}
    </div>
  )
})
CustomTooltip.displayName = 'RevExpTooltip'

const RevenueExpensesChart = memo(function RevenueExpensesChart({ data = [], loading, currency }) {
  if (loading) return <SkeletonLoader type="card" count={1} className="h-72" />

  return (
    <div className="premium-card p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Revenue vs Expenses</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Monthly comparison · YTD</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-text-muted text-sm border border-dashed border-glass rounded-xl">
          No transaction data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barGap={4} barCategoryGap="30%">
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="period" tick={AXIS_TICK} {...AXIS_STYLE} />
            <YAxis tickFormatter={kFmt} tick={AXIS_TICK} {...AXIS_STYLE} width={48} />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend formatter={(v) => <span className="text-xs text-text-secondary capitalize">{v}</span>} />
            <Bar dataKey="revenue"  name="Revenue"  fill={CHART_COLORS.revenue}  radius={[4,4,0,0]} maxBarSize={36} />
            <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.expenses} radius={[4,4,0,0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
})

export default RevenueExpensesChart
