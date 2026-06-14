/**
 * FinancialReportsPage — Unified reports hub
 *
 * Mount-once / hide strategy: each tab stays mounted after first visit so
 * fetched data survives tab switches (no re-fetch or loading flash).
 *
 * URL: /financial-reports/:tab
 */
import { lazy, Suspense, useState, useCallback } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  LineChart, Scale, PieChart, BookOpen, Download,
  Clock, Receipt, BarChart2, Building2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import AINarrativePanel from '@/components/reports/AINarrativePanel'

const IncomeStatementPage   = lazy(() => import('./IncomeStatementPage'))
const BalanceSheetPage      = lazy(() => import('./BalanceSheetPage'))
const CashFlowPage          = lazy(() => import('./CashFlowPage'))
const TrialBalancePage      = lazy(() => import('./TrialBalancePage'))
const GeneralLedgerPage     = lazy(() => import('./GeneralLedgerPage'))
const AgingReportPage       = lazy(() => import('./AgingReportPage'))
const TaxReportPage         = lazy(() => import('./TaxReportPage'))
const ComparativeReportPage = lazy(() => import('./ComparativeReportPage'))
const ExportPage            = lazy(() => import('./ExportPage'))

const TABS = [
  { key: 'income-statement',  label: 'Income Statement',  short: 'P&L',        icon: LineChart,  Component: IncomeStatementPage   },
  { key: 'balance-sheet',     label: 'Balance Sheet',     short: 'Balance',    icon: Scale,      Component: BalanceSheetPage      },
  { key: 'cash-flow',         label: 'Cash Flow',         short: 'Cash',       icon: PieChart,   Component: CashFlowPage          },
  { key: 'trial-balance',     label: 'Trial Balance',     short: 'Trial',      icon: BookOpen,   Component: TrialBalancePage      },
  { key: 'general-ledger',    label: 'General Ledger',    short: 'Ledger',     icon: Building2,  Component: GeneralLedgerPage     },
  { key: 'aging',             label: 'Aging',             short: 'Aging',      icon: Clock,      Component: AgingReportPage       },
  { key: 'tax',               label: 'Tax Report',        short: 'Tax',        icon: Receipt,    Component: TaxReportPage         },
  { key: 'comparative',       label: 'Comparative',       short: 'Compare',    icon: BarChart2,  Component: ComparativeReportPage },
  { key: 'export',            label: 'Export',            short: 'Export',     icon: Download,   Component: ExportPage            },
]

const TabFallback = () => (
  <div className="w-full space-y-4 pt-2">
    <SkeletonLoader count={6} />
  </div>
)

export default function FinancialReportsPage() {
  const { tab }  = useParams()
  const navigate = useNavigate()

  const validTab = TABS.find(t => t.key === tab)

  // Eager-mount every report so they all load on entry and tab switches are
  // instant (no per-tab "click to load" flash). Each report hook fetches once
  // and shares its cache; transaction changes invalidate ['reports'] so they
  // refresh on the spot.
  const [mountedTabs] = useState(() => Object.fromEntries(TABS.map(t => [t.key, true])))

  const handleTabChange = useCallback((key) => {
    navigate(`/financial-reports/${key}`, { replace: true })
  }, [navigate])

  if (!validTab) return <Navigate to="/financial-reports/income-statement" replace />

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-glass-panel border border-glass overflow-x-auto">
        {TABS.map(t => {
          const isActive = t.key === tab
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                'transition-all whitespace-nowrap',
                isActive
                  ? 'bg-cyan text-ink-on-accent font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass-hover'
              )}
            >
              <t.icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">{t.label}</span>
              <span className="lg:hidden">{t.short}</span>
            </button>
          )
        })}
      </div>

      {/* FR-02.2 — CFO briefing (English/Urdu), grounded in the live GL */}
      {(tab === 'income-statement' || tab === 'balance-sheet') && <AINarrativePanel />}

      {/* Tab panels — mount-once, hide non-active */}
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
