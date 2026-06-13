import { useState, useMemo } from 'react'
import { CheckCircle, XCircle, Scale } from 'lucide-react'
import { useTrialBalance } from '@/hooks/useReports'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import ExportButton from '@/components/ui/ExportButton'
import Input from '@/components/ui/Input'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function TrialBalancePage() {
  const [asOfDate,  setAsOfDate]  = useState(new Date().toISOString().split('T')[0])
  const [fromDate,  setFromDate]  = useState('')
  const [showFull,  setShowFull]  = useState(false)  // toggle full columns
  const [filterZero, setFilterZero] = useState(true)  // hide zero-balance rows

  const { data, isLoading } = useTrialBalance({ endDate: asOfDate, startDate: fromDate || undefined })
  const currency = useBusinessStore(s => s.currency)

  const rows = useMemo(() => {
    const all = data?.rows || []
    return filterZero ? all.filter(r => (r.closingDebit || r.debit || 0) > 0 || (r.closingCredit || r.credit || 0) > 0) : all
  }, [data, filterZero])

  const hasOpening = rows.some(r => r.openingDebit > 0 || r.openingCredit > 0)
  const totalDebits  = data?.totalDebits  || 0
  const totalCredits = data?.totalCredits || 0
  const isBalanced   = !isLoading && !!data && Math.abs(totalDebits - totalCredits) < 0.01

  const exportData = useMemo(() => {
    const arr = rows.map(r => ({
      Code:         r.accountCode || '',
      Account:      r.accountName,
      Type:         r.accountType,
      OpeningDr:    r.openingDebit  || 0,
      OpeningCr:    r.openingCredit || 0,
      PeriodDr:     r.periodDebit   || 0,
      PeriodCr:     r.periodCredit  || 0,
      ClosingDr:    r.closingDebit  || r.debit  || 0,
      ClosingCr:    r.closingCredit || r.credit || 0,
    }))
    arr.push({ Code: '', Account: 'TOTAL', Type: '', OpeningDr: '', OpeningCr: '', PeriodDr: '', PeriodCr: '', ClosingDr: totalDebits, ClosingCr: totalCredits })
    return arr
  }, [rows, totalDebits, totalCredits])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Scale className="h-6 w-6 text-cyan" />
            Trial Balance
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Verify debits equal credits — with opening & closing balances</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-text-muted text-xs">From</span>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} containerClassName="w-32" />
          <span className="text-text-muted text-xs">As of</span>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} containerClassName="w-32" />
          <ExportButton data={exportData} filename={`trial-balance-${asOfDate}.csv`} />
        </div>
      </div>

      {/* Options bar */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showFull} onChange={e => setShowFull(e.target.checked)}
            className="rounded border-glass" />
          <span className="text-sm text-text-secondary">Show opening/period columns</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={filterZero} onChange={e => setFilterZero(e.target.checked)}
            className="rounded border-glass" />
          <span className="text-sm text-text-secondary">Hide zero-balance accounts</span>
        </label>
      </div>

      {/* Balance badge */}
      {!isLoading && data && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
          isBalanced ? 'bg-positive/10 border-positive/30 text-positive' : 'bg-negative/10 border-negative/30 text-negative'
        }`}>
          {isBalanced ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <XCircle className="h-5 w-5 flex-shrink-0" />}
          <div>
            <p className="font-bold text-sm">{isBalanced ? 'Books are Balanced' : 'Books are Out of Balance'}</p>
            <p className="text-xs opacity-80">
              {isBalanced
                ? `Total Debits = Total Credits = ${formatCurrency(totalDebits, currency)}`
                : `Difference: ${formatCurrency(Math.abs(totalDebits - totalCredits), currency)} — investigate journal entries`}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="premium-card overflow-x-auto">
        {isLoading ? (
          <div className="p-6"><SkeletonLoader count={8} /></div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-glass border-b border-glass">
                <th className="text-left py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-16">Code</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Account</th>
                {showFull && hasOpening && <>
                  <th className="text-right py-3 px-3 text-xs font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">Open Dr</th>
                  <th className="text-right py-3 px-3 text-xs font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">Open Cr</th>
                  <th className="text-right py-3 px-3 text-xs font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">Period Dr</th>
                  <th className="text-right py-3 px-3 text-xs font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">Period Cr</th>
                </>}
                <th className="text-right py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Debit</th>
                <th className="text-right py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass">
              {rows.length === 0 ? (
                <tr><td colSpan={showFull && hasOpening ? 8 : 4} className="text-center py-10 text-text-muted">No account balances found.</td></tr>
              ) : rows.map((r, idx) => {
                const closingDr = r.closingDebit  ?? r.debit  ?? 0
                const closingCr = r.closingCredit ?? r.credit ?? 0
                return (
                  <tr key={r.accountId || idx} className="hover:bg-glass-hover transition-colors">
                    <td className="py-2.5 px-4 text-text-muted font-mono text-xs">{r.accountCode || ''}</td>
                    <td className="py-2.5 px-4 text-text-primary">
                      {r.accountName}
                      <span className="ml-2 text-xs text-text-muted">{r.accountType}</span>
                    </td>
                    {showFull && hasOpening && <>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-primary">{r.openingDebit  > 0 ? formatCurrency(r.openingDebit,  currency) : <span className="text-text-muted">—</span>}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-primary">{r.openingCredit > 0 ? formatCurrency(r.openingCredit, currency) : <span className="text-text-muted">—</span>}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-primary">{r.periodDebit   > 0 ? formatCurrency(r.periodDebit,   currency) : <span className="text-text-muted">—</span>}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-primary">{r.periodCredit  > 0 ? formatCurrency(r.periodCredit,  currency) : <span className="text-text-muted">—</span>}</td>
                    </>}
                    <td className="py-2.5 px-4 text-right tabular-nums font-medium text-text-primary">{closingDr > 0 ? formatCurrency(closingDr, currency) : <span className="text-text-muted">—</span>}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-medium text-text-primary">{closingCr > 0 ? formatCurrency(closingCr, currency) : <span className="text-text-muted">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!isLoading && rows.length > 0 && (
          <div className="flex border-t-2 border-glass bg-glass-hover">
            <div className="py-3 px-4 font-black text-text-primary text-sm w-16" />
            <div className={`py-3 px-4 font-black text-text-primary text-sm ${showFull && hasOpening ? 'flex-1' : 'flex-1'}`}>TOTAL</div>
            {showFull && hasOpening && <>
              <div className="py-3 px-3 text-right font-black text-text-primary text-sm w-28 tabular-nums">{formatCurrency(data?.totals?.opening?.debit  || 0, currency)}</div>
              <div className="py-3 px-3 text-right font-black text-text-primary text-sm w-28 tabular-nums">{formatCurrency(data?.totals?.opening?.credit || 0, currency)}</div>
              <div className="py-3 px-3 text-right font-black text-text-primary text-sm w-28 tabular-nums">{formatCurrency(data?.totals?.period?.debit   || 0, currency)}</div>
              <div className="py-3 px-3 text-right font-black text-text-primary text-sm w-28 tabular-nums">{formatCurrency(data?.totals?.period?.credit  || 0, currency)}</div>
            </>}
            <div className="py-3 px-4 text-right font-black text-text-primary text-sm w-36 tabular-nums">{formatCurrency(totalDebits, currency)}</div>
            <div className={`py-3 px-4 text-right font-black text-sm w-36 tabular-nums ${isBalanced ? 'text-text-primary' : 'text-negative'}`}>{formatCurrency(totalCredits, currency)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
