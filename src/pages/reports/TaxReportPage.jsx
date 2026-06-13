import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { useTaxSummary } from '@/hooks/useReports'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import ExportButton from '@/components/ui/ExportButton'
import Input from '@/components/ui/Input'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function TaxReportPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useTaxSummary(dateRange)
  const currency = useBusinessStore(s => s.currency)

  const exportData = []
  if (data) {
    ;(data.outputTax || []).forEach(r => exportData.push({
      Type: 'Output Tax', TaxType: r._id?.taxType || '', TransactionType: r._id?.transactionType || '',
      Count: r.count, BaseAmount: r.totalBaseAmount, TaxAmount: r.totalTaxAmount,
    }))
    ;(data.inputTax || []).forEach(r => exportData.push({
      Type: 'Input Tax', TaxType: r._id?.taxType || '', TransactionType: r._id?.transactionType || '',
      Count: r.count, BaseAmount: r.totalBaseAmount, TaxAmount: r.totalTaxAmount,
    }))
    exportData.push({ Type: 'Net Tax Liability', TaxType: '', TransactionType: '', Count: '', BaseAmount: '', TaxAmount: data.netTaxLiability })
  }

  const netPositive = (data?.netTaxLiability || 0) >= 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <Receipt className="h-6 w-6 text-cyan" />
            Tax Report
          </h1>
          <p className="text-text-secondary mt-1 text-sm">GST/VAT, WHT, Sales Tax — Output vs Input</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={dateRange.startDate}
            onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))} containerClassName="w-36" />
          <span className="text-text-muted text-sm">to</span>
          <Input type="date" value={dateRange.endDate}
            onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))} containerClassName="w-36" />
          <ExportButton data={exportData} filename={`tax-report-${dateRange.endDate}.csv`} />
        </div>
      </div>

      {isLoading ? (
        <div className="premium-card p-6"><SkeletonLoader count={6} /></div>
      ) : !data ? (
        <div className="premium-card p-10 text-center text-text-muted">No tax data for this period.</div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="premium-card px-5 py-4">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Output Tax Collected</p>
              <p className="text-xl font-black text-positive mt-1">{formatCurrency(data.totalOutputTax, currency)}</p>
              <p className="text-xs text-text-muted mt-0.5">Tax on sales</p>
            </div>
            <div className="premium-card px-5 py-4">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Input Tax Paid</p>
              <p className="text-xl font-black text-text-primary mt-1">{formatCurrency(data.totalInputTax, currency)}</p>
              <p className="text-xs text-text-muted mt-0.5">Tax on purchases</p>
            </div>
            <div className={`premium-card px-5 py-4 border-2 ${netPositive ? 'border-negative/30 bg-negative/5' : 'border-positive/30 bg-positive/5'}`}>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Net Tax Liability</p>
              <p className={`text-xl font-black mt-1 ${netPositive ? 'text-negative' : 'text-positive'}`}>
                {formatCurrency(data.netTaxLiability, currency)}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{netPositive ? 'Amount payable to authority' : 'Refund due'}</p>
            </div>
          </div>

          {/* GST/VAT breakdown */}
          {(data.gstSummary?.rows?.length > 0) && (
            <TaxTable
              title="GST / VAT Summary"
              subtitle={`Output: ${formatCurrency(data.gstSummary.totalOutput, currency)} — Input: ${formatCurrency(data.gstSummary.totalInput, currency)}`}
              rows={data.gstSummary.rows}
              currency={currency}
            />
          )}

          {/* WHT breakdown */}
          {(data.whtSummary?.rows?.length > 0) && (
            <TaxTable
              title="Withholding Tax (WHT)"
              subtitle={`Total WHT: ${formatCurrency(data.whtSummary.total, currency)}`}
              rows={data.whtSummary.rows}
              currency={currency}
            />
          )}

          {/* Full breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaxTable
              title="Output Tax (Sales)"
              subtitle="Tax collected on sales transactions"
              rows={data.outputTax || []}
              currency={currency}
              outputStyle
            />
            <TaxTable
              title="Input Tax (Purchases)"
              subtitle="Tax paid on purchase transactions"
              rows={data.inputTax || []}
              currency={currency}
            />
          </div>
        </>
      )}
    </div>
  )
}

function TaxTable({ title, subtitle, rows, currency, outputStyle }) {
  if (!rows?.length) return null
  const total = rows.reduce((s, r) => s + r.totalTaxAmount, 0)
  return (
    <div className="premium-card overflow-hidden">
      <div className="px-5 py-4 border-b border-glass">
        <h3 className="font-bold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-glass border-b border-glass">
            <th className="py-2 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Tax Type</th>
            <th className="py-2 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Transaction Type</th>
            <th className="py-2 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Count</th>
            <th className="py-2 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Base Amount</th>
            <th className="py-2 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Tax Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-glass">
          {rows.map((r, idx) => (
            <tr key={idx} className="hover:bg-glass-hover transition-colors">
              <td className="py-2.5 px-4 font-medium text-text-primary">{r._id?.taxType || 'N/A'}</td>
              <td className="py-2.5 px-4 text-text-secondary">{r._id?.transactionType || ''}</td>
              <td className="py-2.5 px-4 text-right text-text-muted tabular-nums">{r.count}</td>
              <td className="py-2.5 px-4 text-right tabular-nums text-text-primary">{formatCurrency(r.totalBaseAmount, currency)}</td>
              <td className={`py-2.5 px-4 text-right tabular-nums font-bold ${outputStyle ? 'text-positive' : 'text-text-primary'}`}>
                {formatCurrency(r.totalTaxAmount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-glass border-t-2 border-glass">
            <td colSpan={4} className="py-2.5 px-4 font-black text-text-primary text-sm uppercase">Total</td>
            <td className={`py-2.5 px-4 text-right font-black tabular-nums text-sm ${outputStyle ? 'text-positive' : 'text-text-primary'}`}>
              {formatCurrency(total, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
