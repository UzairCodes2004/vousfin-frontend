/**
 * BillAgingHeatmap — Phase 3.3
 *
 * Visual AP aging report: stacked bar showing how much outstanding AP balance
 * sits in each aging bucket (current, 1-30, 31-60, 61-90, 90+ days).
 *
 * Props: data — { buckets: { current, '1_30', '31_60', '61_90', '90_plus' }, billCount }
 *        isLoading
 */
import { BarChart2 } from 'lucide-react'

const BUCKETS = [
  { key: 'current',   label: 'Current',  color: 'bg-emerald-400' },
  { key: '1_30',      label: '1–30d',    color: 'bg-sky-400'     },
  { key: '31_60',     label: '31–60d',   color: 'bg-amber-400'   },
  { key: '61_90',     label: '61–90d',   color: 'bg-orange-400'  },
  { key: '90_plus',   label: '90+ days', color: 'bg-red-400'     },
]

const fmt = (n) =>
  n == null ? '—'
  : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K`
  : String(Math.round(n))

export default function BillAgingHeatmap({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="premium-card p-4 animate-pulse space-y-3">
        <div className="h-4 w-32 bg-glass rounded" />
        <div className="h-6 bg-glass rounded" />
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-glass rounded" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { buckets = {}, billCount = 0 } = data
  const total = Object.values(buckets).reduce((s, v) => s + v, 0)

  return (
    <div className="premium-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <BarChart2 className="h-4 w-4 text-cyan" />
          AP Aging
        </h3>
        <span className="text-[11px] text-text-muted">{billCount} open bills</span>
      </div>

      {/* Stacked progress bar */}
      {total > 0 ? (
        <div className="flex h-4 rounded-full overflow-hidden gap-px">
          {BUCKETS.map(({ key, color }) => {
            const pct = total > 0 ? (buckets[key] || 0) / total * 100 : 0
            return pct > 0 ? (
              <div
                key={key}
                className={`${color} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${key}: ${fmt(buckets[key])}`}
              />
            ) : null
          })}
        </div>
      ) : (
        <div className="h-4 rounded-full bg-glass" />
      )}

      {/* Bucket cards */}
      <div className="grid grid-cols-5 gap-1.5">
        {BUCKETS.map(({ key, label, color }) => (
          <div key={key} className="text-center space-y-0.5">
            <div className={`h-1 rounded-full ${color} mx-auto w-3/4`} />
            <p className="text-[11px] font-semibold text-text-primary">{fmt(buckets[key] || 0)}</p>
            <p className="text-[9px] text-text-muted">{label}</p>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="flex justify-between text-[10px] text-text-muted border-t border-glass pt-2">
          <span>Total outstanding</span>
          <span className="font-semibold text-text-primary">{fmt(total)}</span>
        </div>
      )}
    </div>
  )
}
