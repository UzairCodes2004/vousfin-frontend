import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useBalanceSheet } from '@/hooks/useReports'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import ExportButton from '@/components/ui/ExportButton'
import Input from '@/components/ui/Input'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const { data, isLoading } = useBalanceSheet({ endDate: asOfDate })
  const currency = useBusinessStore(s => s.currency)

  const totalAssets    = data?.totalAssets    || 0
  const totalLiabEquity = (data?.totalLiabilities || 0) + (data?.totalEquity || 0)
  const isBalanced     = !isLoading && !!data && Math.abs(totalAssets - totalLiabEquity) < 0.01

  const exportData = []
  if (data) {
    const push = (label, amt) => exportData.push({ Category: label, Amount: amt ?? 0 })
    ;(data.assets?.accounts || []).forEach(a => push(a.accountName, a.balance))
    push('Total Assets', data.totalAssets)
    ;(data.liabilities?.accounts || []).forEach(a => push(a.accountName, a.balance))
    push('Total Liabilities', data.totalLiabilities)
    ;(data.equity?.accounts || []).forEach(a => push(a.accountName, a.balance))
    push('Total Equity', data.totalEquity)
    push('Total Liabilities & Equity', totalLiabEquity)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Balance Sheet</h1>
          <p className="text-text-secondary mt-1 text-sm">Financial position — Assets, Liabilities, Equity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-text-muted text-sm">As of</span>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="w-36" />
          <ExportButton data={exportData} filename={`balance-sheet-${asOfDate}.csv`}
            headers={[{ key: 'Category', label: 'Category' }, { key: 'Amount', label: 'Amount' }]} />
        </div>
      </div>

      {/* Equation badge */}
      {!isLoading && data && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
          isBalanced ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400' : 'bg-red-400/10 border-red-400/30 text-red-400'
        }`}>
          {isBalanced ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <XCircle className="h-5 w-5 flex-shrink-0" />}
          <div>
            <p className="font-bold text-sm">
              {isBalanced ? 'Accounting Equation Satisfied' : 'Accounting Equation Imbalance Detected'}
            </p>
            <p className="text-xs opacity-80">
              Assets ({formatCurrency(totalAssets, currency)}) = Liabilities + Equity ({formatCurrency(totalLiabEquity, currency)})
              {!isBalanced && ` — Difference: ${formatCurrency(Math.abs(totalAssets - totalLiabEquity), currency)}`}
            </p>
          </div>
        </div>
      )}

      {/* KPI strip */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Assets',      val: data.totalAssets },
            { label: 'Total Liabilities', val: data.totalLiabilities },
            { label: 'Total Equity',      val: data.totalEquity },
          ].map(({ label, val }) => (
            <div key={label} className="premium-card px-4 py-3">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</p>
              <p className="text-lg font-black text-text-primary mt-1">{formatCurrency(val, currency)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="premium-card p-6 sm:p-8">
        {isLoading ? (
          <SkeletonLoader count={12} />
        ) : !data ? (
          <p className="text-center py-10 text-text-muted">No data for this date.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Assets */}
            <div className="space-y-6">
              <div className="text-center border-b border-glass pb-4">
                <h2 className="text-lg font-bold text-text-primary">Assets</h2>
              </div>
              <BSSection section={data.assets} currency={currency} />
              <TotalRow label="Total Assets" value={data.totalAssets} currency={currency} />
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-6">
              <div className="text-center border-b border-glass pb-4">
                <h2 className="text-lg font-bold text-text-primary">Liabilities &amp; Equity</h2>
              </div>
              <BSSection section={data.liabilities} currency={currency} title="Liabilities" />

              {/* Retained earnings */}
              {data.retainedEarnings !== undefined && (
                <div className="flex justify-between items-center px-4 py-2 bg-glass rounded-lg border border-glass">
                  <span className="text-sm text-text-secondary">Retained Earnings (cumulative)</span>
                  <span className={`text-sm font-bold tabular-nums ${data.retainedEarnings >= 0 ? 'text-cyan' : 'text-red-400'}`}>
                    {formatCurrency(data.retainedEarnings, currency)}
                  </span>
                </div>
              )}

              <BSSection section={data.equity} currency={currency} title="Equity" />

              <div className={`flex justify-between items-center py-4 px-5 rounded-xl border-2 ${
                isBalanced ? 'border-cyan/40 bg-cyan/5' : 'border-red-400/40 bg-red-400/5'
              }`}>
                <span className="text-lg font-black text-text-primary">Total Liabilities &amp; Equity</span>
                <span className={`text-lg font-black tabular-nums ${isBalanced ? 'text-text-primary' : 'text-red-400'}`}>
                  {formatCurrency(totalLiabEquity, currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BSSection({ section, currency, title }) {
  if (!section) return null
  const groups   = section.groups
  const accounts = section.accounts || []
  const total    = section.total ?? accounts.reduce((s, a) => s + (a.balance || 0), 0)

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-1">{title}</h3>
      )}
      {groups && groups.length > 0
        ? groups.map(g => <SubtypeGroup key={g.label} group={g} currency={currency} />)
        : accounts.map((acc, i) => (
          <div key={acc.accountId || i} className="flex justify-between items-center py-1.5 px-4 hover:bg-glass-hover rounded-lg transition-colors">
            <span className="text-sm text-text-primary">{acc.accountName}</span>
            <span className="text-sm font-medium text-text-primary tabular-nums">{formatCurrency(acc.balance, currency)}</span>
          </div>
        ))
      }
      <div className="flex justify-between items-center py-2 px-4 border-t border-glass">
        <span className="text-sm font-semibold text-text-secondary">Total {title || ''}</span>
        <span className="font-bold text-text-primary tabular-nums">{formatCurrency(total, currency)}</span>
      </div>
    </div>
  )
}

function SubtypeGroup({ group, currency }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-glass rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 bg-glass hover:bg-glass-hover transition-colors"
      >
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{group.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary tabular-nums">{formatCurrency(group.total, currency)}</span>
          {open ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
        </div>
      </button>
      {open && (
        <div className="divide-y divide-glass">
          {(group.accounts || []).map((acc, i) => (
            <div key={acc.accountId || i} className="flex justify-between items-center py-1.5 px-6 hover:bg-glass-hover transition-colors">
              <span className="text-sm text-text-primary">{acc.accountName}</span>
              <span className="text-sm font-medium text-text-primary tabular-nums">{formatCurrency(acc.balance, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TotalRow({ label, value, currency }) {
  return (
    <div className="flex justify-between items-center py-3 px-5 rounded-xl bg-cyan/5 border-2 border-cyan/40">
      <span className="text-lg font-black text-text-primary">{label}</span>
      <span className="text-lg font-black text-text-primary tabular-nums">{formatCurrency(value, currency)}</span>
    </div>
  )
}
