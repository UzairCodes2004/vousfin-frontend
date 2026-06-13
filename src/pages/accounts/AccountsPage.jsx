import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'

import Button from '@/components/ui/Button'
import KPICard from '@/components/ui/KPICard'
import DataTable from '@/components/tables/DataTable'
import Badge from '@/components/ui/Badge'
import AccountFormModal from '@/components/forms/AccountFormModal'

const FILTERS = ['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense']

export default function AccountsPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  
  const { data: accounts, isLoading } = useAccounts()
  const currency = useBusinessStore((s) => s.currency)

  // Client-side filtering
  const filteredAccounts = useMemo(() => {
    if (!accounts) return []
    if (activeFilter === 'All') return accounts
    return accounts.filter((a) => a.accountType === activeFilter)
  }, [accounts, activeFilter])

  // KPIs
  const totals = useMemo(() => {
    if (!accounts) return { assets: 0, liabilities: 0, revenue: 0 }
    return accounts.reduce(
      (acc, account) => {
        if (account.accountType === 'Asset') acc.assets += account.runningBalance
        if (account.accountType === 'Liability') acc.liabilities += account.runningBalance
        if (account.accountType === 'Revenue') acc.revenue += account.runningBalance
        return acc
      },
      { assets: 0, liabilities: 0, revenue: 0 }
    )
  }, [accounts])

  const handleEdit = (account) => {
    setSelectedAccount(account)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedAccount(null)
    setIsModalOpen(true)
  }

  const columns = [
    {
      key: 'accountName',
      header: 'Account Name',
      className: 'w-1/3',
      render: (row) => (
        <div>
          <p className="font-bold text-text-primary">{row.accountName}</p>
          {row.isDefault && <span className="text-xs text-text-muted">System Default</span>}
        </div>
      ),
    },
    {
      key: 'accountType',
      header: 'Type',
      render: (row) => {
        const variantMap = {
          Asset: 'info',
          Liability: 'warning',
          Equity: 'default',
          Revenue: 'success',
          Expense: 'danger',
        }
        return <Badge variant={variantMap[row.accountType]}>{row.accountType}</Badge>
      },
    },
    {
      key: 'normalBalance',
      header: 'Normal Balance',
      render: (row) => <span className="text-sm font-medium">{row.normalBalance}</span>,
    },
    {
      key: 'runningBalance',
      header: 'Balance',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        const bal = row.runningBalance || 0
        // Revenue/Asset accounts: positive = healthy (emerald); negative = warning (red)
        // Expense/Liability: no positive coloring — neutral display
        const isPositiveGood = ['Asset', 'Revenue', 'Equity'].includes(row.accountType)
        const colorClass = bal === 0
          ? 'text-text-muted'
          : isPositiveGood
            ? bal > 0 ? 'text-positive' : 'text-negative'
            : 'text-text-primary'
        return (
          <span className={`font-bold tracking-tight ${colorClass}`}>
            {formatCurrency(bal, currency)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Chart of Accounts</h1>
          <p className="text-text-secondary mt-1">Manage your ledger accounts and view current balances.</p>
        </div>
        <Button onClick={handleCreate} icon={Plus}>Add Account</Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard title="Total Assets" value={totals.assets} loading={isLoading} currency={currency} />
        <KPICard title="Total Liabilities" value={totals.liabilities} loading={isLoading} currency={currency} />
        <KPICard title="Total Revenue" value={totals.revenue} loading={isLoading} currency={currency} />
      </div>

      {/* Main Table Area */}
      <div className="premium-card">
        {/* Filters */}
        <div className="border-b border-glass p-4 sm:px-6">
          <div className="flex space-x-2 overflow-x-auto scrollbar-thin pb-2 sm:pb-0">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === f
                    ? 'bg-cyan text-navy shadow-glow-cyan'
                    : 'bg-glass-panel text-text-secondary hover:bg-glass-hover hover:text-text-primary border border-glass'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredAccounts}
          isLoading={isLoading}
          onRowClick={handleEdit}
          emptyMessage={`No ${activeFilter === 'All' ? '' : activeFilter} accounts found.`}
        />
      </div>

      <AccountFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedAccount}
      />
    </div>
  )
}
