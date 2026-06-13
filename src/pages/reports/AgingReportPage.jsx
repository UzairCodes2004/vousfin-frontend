import { useState, useMemo } from 'react'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { useAgingReport } from '@/hooks/useReports'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import ExportButton from '@/components/ui/ExportButton'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

const BUCKET_ORDER  = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_over_90']
const BUCKET_COLORS = {
  current:      'text-positive bg-positive/10 border-positive/20',
  days_1_30:    'text-amber  bg-amber/10  border-amber/20',
  days_31_60:   'text-amber  bg-amber/10  border-amber/20',
  days_61_90:   'text-negative     bg-negative/10     border-negative/20',
  days_over_90: 'text-negative     bg-negative/10     border-negative/20',
}
const SEVERITY_ROW = {
  current:  '',
  warning:  'bg-amber/5',
  medium:   'bg-amber/5',
  critical: 'bg-negative/5',
}

export default function AgingReportPage() {
  const [type, setType]       = useState('receivable')
  const [bucket, setBucket]   = useState('all')
  const { data, isLoading }   = useAgingReport(type)
  const currency              = useBusinessStore(s => s.currency)

  const visibleItems = useMemo(() => {
    if (!data?.buckets) return []
    if (bucket === 'all') return BUCKET_ORDER.flatMap(k => data.buckets[k]?.items || [])
    return data.buckets[bucket]?.items || []
  }, [data, bucket])

  const exportData = useMemo(() =>
    visibleItems.map(item => ({
      Party:           item.party || '',
      Invoice:         item.invoiceNumber || '',
      Date:            item.date ? new Date(item.date).toLocaleDateString() : '',
      DueDate:         item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '',
      Bucket:          item.bucket,
      DaysOverdue:     item.daysOverdue || 0,
      OriginalAmount:  item.originalAmount || 0,
      Balance:         item.remainingBalance || 0,
    })),
  [visibleItems])

  const label = type === 'receivable' ? 'Accounts Receivable' : 'Accounts Payable'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Clock className="h-6 w-6 text-cyan" />
            Aging Report
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Outstanding {label} — bucketed by days overdue</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename={`aging-${type}-${new Date().toISOString().split('T')[0]}.csv`} />
        </div>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-glass-panel border border-glass w-fit">
        {['receivable', 'payable'].map(t => (
          <button key={t} onClick={() => { setType(t); setBucket('all') }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              type === t ? 'bg-cyan text-navy font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}>
            {t === 'receivable' ? 'Receivables (AR)' : 'Payables (AP)'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="premium-card p-6"><SkeletonLoader count={6} /></div>
      ) : !data ? (
        <div className="premium-card p-10 text-center text-text-muted">No data available.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {BUCKET_ORDER.map(key => {
              const b = data.buckets?.[key]
              if (!b) return null
              const pct = data.grandTotal > 0 ? ((b.total / data.grandTotal) * 100).toFixed(1) : '0.0'
              return (
                <button key={key} onClick={() => setBucket(bucket === key ? 'all' : key)}
                  className={`premium-card p-4 text-left border transition-all ${BUCKET_COLORS[key]} ${bucket === key ? 'ring-2 ring-cyan' : ''}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70">{b.label}</p>
                  <p className="text-lg font-black mt-1">{formatCurrency(b.total, currency)}</p>
                  <p className="text-xs opacity-60 mt-0.5">{b.items.length} items · {pct}%</p>
                </button>
              )
            })}
          </div>

          {/* Total bar */}
          <div className="flex items-center justify-between px-5 py-4 premium-card border border-glass">
            <div>
              <span className="text-sm text-text-secondary">Total {label}</span>
              {data.overdueTotal > 0 && (
                <span className="ml-3 inline-flex items-center gap-1 text-xs text-negative">
                  <AlertTriangle className="h-3 w-3" />
                  {formatCurrency(data.overdueTotal, currency)} overdue
                </span>
              )}
            </div>
            <span className="text-xl font-black text-text-primary">{formatCurrency(data.grandTotal, currency)}</span>
          </div>

          {/* Detail table */}
          <div className="premium-card overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-glass">
              <span className="text-sm font-bold text-text-primary">
                {bucket === 'all' ? 'All Outstanding Items' : data.buckets?.[bucket]?.label}
                <span className="ml-2 text-text-muted font-normal">({visibleItems.length})</span>
              </span>
              {bucket !== 'all' && (
                <button onClick={() => setBucket('all')} className="text-xs text-cyan hover:underline">Clear filter</button>
              )}
            </div>
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-glass border-b border-glass">
                  <th className="py-2.5 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Party</th>
                  <th className="py-2.5 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Invoice</th>
                  <th className="py-2.5 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Due Date</th>
                  <th className="py-2.5 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Days</th>
                  <th className="py-2.5 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Original</th>
                  <th className="py-2.5 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Balance Due</th>
                  <th className="py-2.5 px-4 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {visibleItems.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-text-muted">No outstanding items.</td></tr>
                ) : visibleItems.map((item, idx) => (
                  <tr key={item.transactionId || idx} className={`hover:bg-glass-hover transition-colors ${SEVERITY_ROW[item.severity] || ''}`}>
                    <td className="py-2.5 px-4 font-medium text-text-primary">{item.party}</td>
                    <td className="py-2.5 px-4 text-text-muted font-mono text-xs">{item.invoiceNumber || '—'}</td>
                    <td className="py-2.5 px-4 text-text-primary text-xs">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-bold text-xs tabular-nums ${item.isOverdue ? 'text-negative' : 'text-positive'}`}>
                      {item.isOverdue ? `+${item.daysOverdue}d` : 'current'}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-text-primary">{formatCurrency(item.originalAmount, currency)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-text-primary">{formatCurrency(item.remainingBalance, currency)}</td>
                    <td className="py-2.5 px-4 text-center">
                      {item.severity === 'current'  && <CheckCircle   className="h-4 w-4 text-positive mx-auto" />}
                      {item.severity === 'warning'  && <Clock         className="h-4 w-4 text-amber  mx-auto" />}
                      {item.severity === 'medium'   && <AlertTriangle className="h-4 w-4 text-amber  mx-auto" />}
                      {item.severity === 'critical' && <AlertTriangle className="h-4 w-4 text-negative     mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
