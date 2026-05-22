/**
 * FinancialReportsPage — Unified reports hub
 *
 * Consolidates Balance Sheet, Income Statement, Cash Flow,
 * Trial Balance and Export into one tabbed page.
 *
 * "Mount-once / hide" strategy keeps each report mounted after its first
 * visit so that fetched data is preserved when switching tabs, avoiding
 * redundant API calls and loading-state flashes.
 *
 * URL structure:
 *   /financial-reports                    → redirect to income-statement
 *   /financial-reports/income-statement   → Income Statement
 *   /financial-reports/balance-sheet      → Balance Sheet
 *   /financial-reports/cash-flow          → Cash Flow
 *   /financial-reports/trial-balance      → Trial Balance
 *   /financial-reports/export             → Export Reports
 */
import { lazy, Suspense, useState, useCallback } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { LineChart, Scale, PieChart, BookOpen, Download } from 'lucide-react'
import { cn } from '@/utils/cn'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

const IncomeStatementPage = lazy(() => import('./IncomeStatementPage'))
const BalanceSheetPage    = lazy(() => import('./BalanceSheetPage'))
const CashFlowPage        = lazy(() => import('./CashFlowPage'))
const TrialBalancePage    = lazy(() => import('./TrialBalancePage'))
const ExportPage          = lazy(() => import('./ExportPage'))

const TABS = [
  { key: 'income-statement', label: 'Income Statement', short: 'Income',  icon: LineChart, Component: IncomeStatementPage },
  { key: 'balance-sheet',    label: 'Balance Sheet',    short: 'Balance', icon: Scale,     Component: BalanceSheetPage    },
  { key: 'cash-flow',        label: 'Cash Flow',        short: 'Cash',    icon: PieChart,  Component: CashFlowPage        },
  { key: 'trial-balance',    label: 'Trial Balance',    short: 'Trial',   icon: BookOpen,  Component: TrialBalancePage    },
  { key: 'export',           label: 'Export Reports',   short: 'Export',  icon: Download,  Component: ExportPage          },
]

const TabFallback = () => (
  <div className="w-full space-y-4 pt-2">
    <SkeletonLoader count={6} />
  </div>
)

export default function FinancialReportsPage() {
  const { tab }    = useParams()
  const navigate   = useNavigate()

  const validTab   = TABS.find(t => t.key === tab)
  const initialTab = validTab ? tab : 'income-statement'
  const [mountedTabs, setMountedTabs] = useState(() => ({ [initialTab]: true }))

  /* All hooks before any early return */
  const handleTabChange = useCallback((key) => {
    setMountedTabs(prev => prev[key] ? prev : { ...prev, [key]: true })
    navigate(`/financial-reports/${key}`, { replace: true })
  }, [navigate])

  if (!validTab) return <Navigate to="/financial-reports/income-statement" replace />

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-glass-panel border border-glass overflow-x-auto">
        {TABS.map((t) => {
          const isActive = t.key === tab
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
                'transition-all whitespace-nowrap',
                isActive
                  ? 'bg-cyan text-navy font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass-hover'
              )}
            >
              <t.icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
            </button>
          )
        })}
      </div>

      {/* ── Tab panels (mount-once, hide non-active) ─────────────────── */}
      {TABS.map(t => (
        <div key={t.key} className={t.key === tab ? '' : 'hidden'}>
          {mountedTabs[t.key] && (
            <Suspense fallback={<TabFallback />}>
              <t.Component />
            </Suspense>
          )}
        </div>
      ))}
    </div>
  )
}
