import { useState, useMemo } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useGeneralLedger } from '@/hooks/useReports'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import ExportButton from '@/components/ui/ExportButton'
import Input from '@/components/ui/Input'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function GeneralLedgerPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  })
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})

  const { data, isLoading } = useGeneralLedger(dateRange)
  const currency = useBusinessStore(s => s.currency)

  const accounts = useMemo(() => {
    const all = data?.accounts || []
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter(a =>
      a.accountName.toLowerCase().includes(q) ||
      (a.accountCode || '').toLowerCase().includes(q)
    )
  }, [data, search])

  const toggleAccount = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))
  const expandAll     = ()  => setExpanded(Object.fromEntries(accounts.map(a => [a.accountId, true])))
  const collapseAll   = ()  => setExpanded({})

  const exportData = useMemo(() => {
    const rows = []
    for (const acc of accounts) {
      rows.push({ Code: acc.accountCode || '', Account: acc.accountName, Date: '', Description: 'Opening Balance', Debit: '', Credit: '', Balance: acc.openingBalance })
      for (const e of acc.entries || []) {
        rows.push({
          Code: acc.accountCode || '',
          Account: acc.accountName,
          Date: new Date(e.date).toLocaleDateString(),
          Description: e.description || '',
          Debit: e.debit || 0,
          Credit: e.credit || 0,
          Balance: e.runningBalance,
        })
      }
      rows.push({ Code: '', Account: acc.accountName, Date: '', Description: 'Closing Balance', Debit: '', Credit: '', Balance: acc.closingBalance })
      rows.push({ Code: '', Account: '', Date: '', Description: '', Debit: '', Credit: '', Balance: '' })
    }
    return rows
  }, [accounts])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <BookOpen className="h-6 w-6 text-cyan" />
            General Ledger
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Per-account transactions with running balance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={dateRange.startDate}
            onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))} className="w-36" />
          <span className="text-text-muted text-sm">to</span>
          <Input type="date" value={dateRange.endDate}
            onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))} className="w-36" />
          <ExportButton data={exportData} filename={`general-ledger-${dateRange.endDate}.csv`} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts..." className="pl-9" />
        </div>
        <button onClick={expandAll}   className="text-xs text-cyan hover:underline">Expand all</button>
        <button onClick={collapseAll} className="text-xs text-text-muted hover:underline">Collapse all</button>
        {data && (
          <span className="text-xs text-text-muted">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Account ledgers */}
      {isLoading ? (
        <div className="premium-card p-6"><SkeletonLoader count={8} /></div>
      ) : !data || accounts.length === 0 ? (
        <div className="premium-card p-10 text-center text-text-muted">
          {search ? 'No accounts match your search.' : 'No ledger entries for this period.'}
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => (
            <AccountLedger
              key={account.accountId}
              account={account}
              currency={currency}
              open={!!expanded[account.accountId]}
              onToggle={() => toggleAccount(account.accountId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AccountLedger({ account, currency, open, onToggle }) {
  return (
    <div className="premium-card overflow-hidden">
      {/* Account header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-glass-hover transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-cyan flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />}
          <div>
            <span className="font-bold text-text-primary">
              {account.accountCode && <span className="font-mono text-text-muted mr-2 text-xs">{account.accountCode}</span>}
              {account.accountName}
            </span>
            <span className="ml-2 text-xs text-text-muted">{account.accountType}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-text-muted">Opening</p>
            <p className="font-medium text-text-primary tabular-nums">{formatCurrency(account.openingBalance, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Closing</p>
            <p className={`font-bold tabular-nums ${account.closingBalance >= 0 ? 'text-cyan' : 'text-red-400'}`}>
              {formatCurrency(account.closingBalance, currency)}
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-text-muted">Entries</p>
            <p className="font-medium text-text-primary">{account.entries?.length || 0}</p>
          </div>
        </div>
      </button>

      {/* Entries table */}
      {open && (
        <div className="border-t border-glass overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-glass">
                <th className="py-2 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider w-28">Date</th>
                <th className="py-2 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Description</th>
                <th className="py-2 px-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider w-24">Ref</th>
                <th className="py-2 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider w-28">Debit</th>
                <th className="py-2 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider w-28">Credit</th>
                <th className="py-2 px-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider w-32">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass">
              {/* Opening balance row */}
              <tr className="bg-glass/50">
                <td className="py-2 px-4 text-text-muted text-xs">—</td>
                <td className="py-2 px-4 font-semibold text-text-secondary" colSpan={2}>Opening Balance</td>
                <td className="py-2 px-4" />
                <td className="py-2 px-4" />
                <td className="py-2 px-4 text-right tabular-nums font-semibold text-text-primary">{formatCurrency(account.openingBalance, currency)}</td>
              </tr>

              {(account.entries || []).map((entry, idx) => (
                <tr key={idx} className={`hover:bg-glass-hover transition-colors ${idx % 2 === 0 ? '' : 'bg-glass/20'}`}>
                  <td className="py-2 px-4 text-text-muted text-xs whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="py-2 px-4 text-text-primary max-w-xs truncate">{entry.description}</td>
                  <td className="py-2 px-4 text-text-muted text-xs font-mono">{entry.reference || ''}</td>
                  <td className="py-2 px-4 text-right tabular-nums text-text-primary">
                    {entry.debit > 0 ? formatCurrency(entry.debit, currency) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums text-text-primary">
                    {entry.credit > 0 ? formatCurrency(entry.credit, currency) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className={`py-2 px-4 text-right tabular-nums font-medium ${entry.runningBalance >= 0 ? 'text-text-primary' : 'text-red-400'}`}>
                    {formatCurrency(entry.runningBalance, currency)}
                  </td>
                </tr>
              ))}

              {(account.entries || []).length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-text-muted text-xs">No transactions in this period.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-glass border-t-2 border-glass">
                <td className="py-2.5 px-4 font-black text-text-primary text-xs uppercase" colSpan={3}>Closing Balance</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-text-primary">{formatCurrency(account.periodDebit, currency)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-text-primary">{formatCurrency(account.periodCredit, currency)}</td>
                <td className={`py-2.5 px-4 text-right tabular-nums font-black ${account.closingBalance >= 0 ? 'text-cyan' : 'text-red-400'}`}>
                  {formatCurrency(account.closingBalance, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
