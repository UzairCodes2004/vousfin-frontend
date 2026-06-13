import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import Spinner from '@/components/common/Spinner'

export default function BalanceSheetTable({ data, loading }) {
  if (loading) return <Spinner size="lg" />
  if (!data) return null

  const assets = data.assets?.total ?? data.totals?.assets ?? 0
  const liabilities = data.liabilities?.total ?? data.totals?.liabilities ?? 0
  const equity = data.equity?.total ?? data.totals?.equity ?? 0
  const balanced = Math.abs(assets - (liabilities + equity)) < 0.01

  const renderSection = (title, items = []) => (
    <div className="mb-6">
      <h4 className="mb-2 font-semibold text-text-primary">{title}</h4>
      <table className="w-full text-sm">
        <tbody>
          {(items.lines || items || []).map((row, i) => (
            <tr key={i} className="border-b border-glass">
              <td className="py-2">{row.name}</td>
              <td className="py-2 text-right">{formatCurrency(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <div className={cn('mb-4 rounded-lg px-4 py-2 text-sm', balanced ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative')}>
        {balanced ? '? Balance sheet balances (Assets = Liabilities + Equity)' : '? Assets do not equal Liabilities + Equity'}
      </div>
      <div className="grid gap-6 rounded-xl border border-glass bg-navy-2 p-6 shadow-card lg:grid-cols-2">
        {renderSection('Assets', data.assets)}
        <div>
          {renderSection('Liabilities', data.liabilities)}
          {renderSection('Equity', data.equity)}
        </div>
      </div>
    </div>
  )
}
