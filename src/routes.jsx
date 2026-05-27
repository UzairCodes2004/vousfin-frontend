/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAuthHydrated } from '@/hooks/useAuthHydrated'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import ErrorBoundary from '@/components/common/ErrorBoundary'

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const BusinessSetup = lazy(() => import('@/pages/business/BusinessSetup'))
const BusinessSettings = lazy(() => import('@/pages/business/BusinessSettings'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage'))
const TransactionsList = lazy(() => import('@/pages/transactions/TransactionsList'))
const CustomersList   = lazy(() => import('@/pages/parties/CustomersList'))
const VendorsList     = lazy(() => import('@/pages/parties/VendorsList'))
const CustomerDetail  = lazy(() => import('@/pages/parties/CustomerDetail'))
const VendorDetail    = lazy(() => import('@/pages/parties/VendorDetail'))
const ReceivablesPage = lazy(() => import('@/pages/parties/ReceivablesPage'))
const PayablesPage    = lazy(() => import('@/pages/parties/PayablesPage'))
const AIAssistantPage = lazy(() => import('@/pages/ai/AIAssistantPage'))

/* ── New unified hub pages ── */
const FinancialReportsPage = lazy(() => import('@/pages/reports/FinancialReportsPage'))
const AIAnalystPage        = lazy(() => import('@/pages/ai/AIAnalystPage'))
const FiscalYearPage       = lazy(() => import('@/pages/accounting/FiscalYearPage'))
const CurrencyRatesPage    = lazy(() => import('@/pages/settings/CurrencyRatesPage'))
const TaxConfigPage        = lazy(() => import('@/pages/settings/TaxConfigPage'))    // Phase 5.4.8

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-navy">
    <div className="w-64 max-w-sm space-y-4">
      <SkeletonLoader count={3} />
    </div>
  </div>
)

const withSuspense = (Component) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
)

const hasBusiness = (user) => !!(user?.businessId?._id || user?.businessId)

/** Smart entry: / → login | setup | dashboard */
function RootRedirect() {
  const hydrated = useAuthHydrated()
  const { isAuthenticated, user } = useAuthStore()

  if (!hydrated) return <LoadingFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!hasBusiness(user)) return <Navigate to="/business/setup" replace />
  return <Navigate to="/dashboard" replace />
}

/** Logged in but no business yet */
function RequireSetup() {
  const hydrated = useAuthHydrated()
  const { isAuthenticated, user } = useAuthStore()

  if (!hydrated) return <LoadingFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (hasBusiness(user)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

/** Logged in with business — dashboard area */
function RequireBusiness() {
  const hydrated = useAuthHydrated()
  const { isAuthenticated, user } = useAuthStore()

  if (!hydrated) return <LoadingFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!hasBusiness(user)) return <Navigate to="/business/setup" replace />
  return <Outlet />
}

export const routes = [
  { path: '/', element: <RootRedirect /> },

  /* Public auth pages — always reachable (no auto-redirect away) */
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: withSuspense(Login) },
      { path: 'register', element: withSuspense(Register) },
      { path: 'forgot-password', element: withSuspense(ForgotPassword) },
    ],
  },

  /* Business setup — new users only */
  {
    element: <RequireSetup />,
    children: [
      { path: 'business/setup', element: withSuspense(BusinessSetup) },
    ],
  },

  /* App — existing users with a business */
  {
    element: <RequireBusiness />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: 'dashboard',         element: withSuspense(Dashboard)         },
          { path: 'accounts',          element: withSuspense(AccountsPage)      },
          { path: 'transactions',      element: withSuspense(TransactionsList)  },
          /* ── Sales (Customers + AR) ───────────────────────────────────── */
          { path: 'customers',              element: withSuspense(CustomersList)   },
          { path: 'customers/:id',          element: withSuspense(CustomerDetail)  },
          { path: 'sales/receivables',      element: withSuspense(ReceivablesPage) },
          { path: 'sales',                  element: <Navigate to="/customers" replace /> },
          { path: 'sales/customers',        element: <Navigate to="/customers" replace /> },

          /* ── Purchases (Vendors + AP) ─────────────────────────────────── */
          { path: 'vendors',                element: withSuspense(VendorsList)    },
          { path: 'vendors/:id',            element: withSuspense(VendorDetail)   },
          { path: 'purchases/payables',     element: withSuspense(PayablesPage)   },
          { path: 'purchases',              element: <Navigate to="/vendors" replace /> },
          { path: 'purchases/vendors',      element: <Navigate to="/vendors" replace /> },
          { path: 'business/settings', element: withSuspense(BusinessSettings)  },
          { path: 'accounting/fiscal-years',    element: withSuspense(FiscalYearPage)     },
          { path: 'settings/exchange-rates',    element: withSuspense(CurrencyRatesPage)  },
          { path: 'settings/tax',               element: withSuspense(TaxConfigPage)      }, // Phase 5.4.8

          /* ── Financial Reports hub ─────────────────────────────────────── */
          /* /financial-reports  → default tab */
          { path: 'financial-reports',      element: <Navigate to="/financial-reports/income-statement" replace /> },
          { path: 'financial-reports/:tab', element: withSuspense(FinancialReportsPage) },

          /* Backward-compat redirects for old /reports/* bookmarks */
          { path: 'reports/income-statement', element: <Navigate to="/financial-reports/income-statement" replace /> },
          { path: 'reports/balance-sheet',    element: <Navigate to="/financial-reports/balance-sheet"    replace /> },
          { path: 'reports/cash-flow',        element: <Navigate to="/financial-reports/cash-flow"        replace /> },
          { path: 'reports/trial-balance',    element: <Navigate to="/financial-reports/trial-balance"    replace /> },
          { path: 'reports/export',           element: <Navigate to="/financial-reports/export"           replace /> },

          /* ── AI Analyst hub ────────────────────────────────────────────── */
          /* /ai-analyst  → default tab */
          { path: 'ai-analyst',      element: <Navigate to="/ai-analyst/forecast" replace /> },
          { path: 'ai-analyst/:tab', element: withSuspense(AIAnalystPage) },

          /* Backward-compat redirects for old /ai/* bookmarks */
          { path: 'ai/forecast',   element: <Navigate to="/ai-analyst/forecast"  replace /> },
          { path: 'ai/anomaly',    element: <Navigate to="/ai-analyst/anomalies" replace /> },

          /* ai/assistant stays accessible directly (also exposed in AI Analyst → Insights tab) */
          { path: 'ai/assistant', element: withSuspense(AIAssistantPage) },
        ],
      },
    ],
  },

  { path: '*', element: <RootRedirect /> },
]
