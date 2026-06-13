import { useState } from 'react'
import { BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useComparativeIncome } from '@/hooks/useReports'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import Input from '@/components/ui/Input'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import ExportButton from '@/components/ui/ExportButton'

const THIS_YEAR  = new Date().getFullYear()
const LAST_YEAR  = THIS_YEAR - 1

const PRESETS = [
  {
    label: 'This Month vs Last Month',
    getCurrent: () => {
      const now  = new Date()
      const s    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const e    = now.toISOString().split('T')[0]
      return { s, e }
    },
    getPrior: () => {
      const now  = new Date()
      const ps   = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const pe   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      return { s: ps, e: pe }
    },
  },
  {
    label: `${THIS_YEAR} vs ${LAST_YEAR}`,
    getCurrent: () => ({ s: `${THIS_YEAR}-01-01`, e: `${THIS_YEAR}-12-31` }),
    getPrior:   () => ({ s: `${LAST_YEAR}-01-01`, e: `${LAST_YEAR}-12-31` }),
  },
  {
    label: 'YTD vs Prior YTD',
    getCurrent: () => ({
      s: `${THIS_YEAR}-01-01`,
      e: new Date().toISOString().split('T')[0],
    }),
    getPrior: () => {
      const now  = new Date()
      const s    = `${LAST_YEAR}-01-01`
      const e    = new Date(LAST_YEAR, now.getMonth(), now.getDate()).toISOString().split('T')[0]
      return { s, e }
    },
  },
]

export default function ComparativeReportPage() {
  const [preset, setPreset] = useState(null)
  const [params, setParams] = useState({
    currentStart: `${THIS_YEAR}-01-01`,
    currentEnd:   new Date().toISOString().split('T')[0],
    priorStart:   `${LAST_YEAR}-01-01`,
    priorEnd:     `${LAST_YEAR}-12-31`,
  })

  const currency  = useBusinessStore(s => s.currency)
  const { data, isLoading } = useComparativeIncome(params)

  const applyPreset = (p, idx) => {
    setPreset(idx)
    const c = p.getCurrent()
    const pr = p.getPrior()
    setParams({ currentStart: c.s, currentEnd: c.e, priorStart: pr.s, priorEnd: pr.e })
  }

  const exportData = []
  if (data) {
    const rows = [
      { Metric: 'Revenue',         Current: data.revenue?.current,       Prior: data.revenue?.prior,         Change: data.revenue?.change,         ChangePct: data.revenue?.changePct },
      { Metric: 'Gross Profit',    Current: data.grossProfit?.current,   Prior: data.grossProfit?.prior,     Change: data.grossProfit?.change,     ChangePct: data.grossProfit?.changePct },
      { Metric: 'Operating Profit',Current: data.operatingProfit?.current,Prior:data.operatingProfit?.prior, Change: data.operatingProfit?.change, ChangePct: data.operatingProfit?.changePct },
      { Metric: 'EBITDA',          Current: data.ebitda?.current,        Prior: data.ebitda?.prior,          Change: data.ebitda?.change,          ChangePct: data.ebitda?.changePct },
      { Metric: 'Net Profit',      Current: data.netIncome?.current,     Prior: data.netIncome?.prior,       Change: data.netIncome?.change,       ChangePct: data.netIncome?.changePct },
      { Metric: 'Total Expenses',  Current: data.totalExpenses?.current, Prior: data.totalExpenses?.prior,  Change: data.totalExpenses?.change,   ChangePct: data.totalExpenses?.changePct },
    ]
    exportData.push(...rows)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <BarChart2 className="h-6 w-6 text-cyan" />
            Comparative Report
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Period vs period — Income Statement comparison</p>
        </div>
        <ExportButton data={exportData} filename={`comparative-${params.currentEnd}.csv`} />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, idx) => (
          <button key={p.label} onClick={() => applyPreset(p, idx)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              preset === idx ? 'bg-cyan text-navy border-cyan font-bold' : 'border-glass text-text-secondary hover:border-cyan/40 hover:text-text-primary'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="premium-card p-5">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Custom Date Ranges</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Current Period</p>
            <div className="flex items-center gap-2">
              <Input type="date" value={params.currentStart}
                onChange={e => { setPreset(null); setParams(p => ({ ...p, currentStart: e.target.value })) }} className="flex-1" />
              <span className="text-text-muted text-sm">to</span>
              <Input type="date" value={params.currentEnd}
                onChange={e => { setPreset(null); setParams(p => ({ ...p, currentEnd: e.target.value })) }} className="flex-1" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Prior Period</p>
            <div className="flex items-center gap-2">
              <Input type="date" value={params.priorStart}
                onChange={e => { setPreset(null); setParams(p => ({ ...p, priorStart: e.target.value })) }} className="flex-1" />
              <span className="text-text-muted text-sm">to</span>
              <Input type="date" value={params.priorEnd}
                onChange={e => { setPreset(null); setParams(p => ({ ...p, priorEnd: e.target.value })) }} className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="premium-card p-6"><SkeletonLoader count={6} /></div>
      ) : !data ? (
        <div className="premium-card p-10 text-center text-text-muted">Select a date range to compare periods.</div>
      ) : (
        <>
          {/* KPI change cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: 'revenue',         label: 'Revenue' },
              { key: 'grossProfit',     label: 'Gross Profit' },
              { key: 'operatingProfit', label: 'Operating Profit' },
              { key: 'ebitda',          label: 'EBITDA' },
              { key: 'netIncome',       label: 'Net Profit' },
            ].map(({ key, label }) => {
              const m = data[key]
              if (!m) return null
              const up = m.change >= 0
              return (
                <div key={key} className="premium-card px-4 py-3">
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</p>
                  <p className="text-base font-black text-text-primary mt-1 tabular-nums">{formatCurrency(m.current, currency)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {m.changePct !== null
                      ? (m.changePct > 0 ? <TrendingUp className="h-3 w-3 text-positive" /> : m.changePct < 0 ? <TrendingDown className="h-3 w-3 text-negative" /> : <Minus className="h-3 w-3 text-text-muted" />)
                      : <Minus className="h-3 w-3 text-text-muted" />}
                    <span className={`text-xs font-bold ${up ? 'text-positive' : 'text-negative'}`}>
                      {m.changePct !== null ? `${m.changePct > 0 ? '+' : ''}${m.changePct}%` : 'N/A'}
                    </span>
                    <span className="text-xs text-text-muted">vs prior</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">Prior: {formatCurrency(m.prior, currency)}</p>
                </div>
              )
            })}
          </div>

          {/* Detailed comparison table */}
          <div className="premium-card overflow-x-auto">
            <div className="px-5 py-4 border-b border-glass">
              <h3 className="font-bold text-text-primary">Detailed Comparison</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Current: {params.currentStart} — {params.currentEnd} &nbsp;|&nbsp;
                Prior: {params.priorStart} — {params.priorEnd}
              </p>
            </div>
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-glass border-b border-glass">
                  <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Metric</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Current Period</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Prior Period</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Change</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Change %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {[
                  { key: 'revenue',         label: 'Revenue',          isHighlight: false },
                  { key: 'grossProfit',     label: 'Gross Profit',     isHighlight: false },
                  { key: 'operatingProfit', label: 'Operating Profit', isHighlight: false },
                  { key: 'ebitda',          label: 'EBITDA',           isHighlight: false },
                  { key: 'totalExpenses',   label: 'Total Expenses',   isHighlight: false, invert: true },
                  { key: 'netIncome',       label: 'Net Profit',       isHighlight: true },
                ].map(({ key, label, isHighlight, invert }) => {
                  const m = data[key]
                  if (!m) return null
                  const up = invert ? m.change <= 0 : m.change >= 0
                  return (
                    <tr key={key} className={`hover:bg-glass-hover transition-colors ${isHighlight ? 'bg-glass' : ''}`}>
                      <td className={`py-3 px-4 ${isHighlight ? 'font-black text-text-primary' : 'text-text-primary'}`}>{label}</td>
                      <td className={`py-3 px-4 text-right tabular-nums ${isHighlight ? 'font-black text-text-primary' : 'font-medium text-text-primary'}`}>
                        {formatCurrency(m.current, currency)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-text-secondary">{formatCurrency(m.prior, currency)}</td>
                      <td className={`py-3 px-4 text-right tabular-nums font-bold ${up ? 'text-positive' : 'text-negative'}`}>
                        {m.change >= 0 ? '+' : ''}{formatCurrency(m.change, currency)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${up ? 'text-positive' : 'text-negative'}`}>
                        {m.changePct !== null
                          ? `${m.changePct > 0 ? '+' : ''}${m.changePct}%`
                          : <span className="text-text-muted">N/A</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
