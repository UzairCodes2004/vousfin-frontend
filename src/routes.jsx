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
const ReceivablesPage   = lazy(() => import('@/pages/parties/ReceivablesPage'))
const PayablesPage      = lazy(() => import('@/pages/parties/PayablesPage'))
/* Phase 2 — Invoice & Bill editors */
const InvoicesListPage  = lazy(() => import('@/pages/parties/InvoicesListPage'))
const InvoiceEditorPage = lazy(() => import('@/pages/parties/InvoiceEditorPage'))
const BillsListPage     = lazy(() => import('@/pages/parties/BillsListPage'))
const BillEditorPage    = lazy(() => import('@/pages/parties/BillEditorPage'))
const AIAssistantPage = lazy(() => import('@/pages/ai/AIAssistantPage'))

/* ── New unified hub pages ── */
const FinancialReportsPage = lazy(() => import('@/pages/reports/FinancialReportsPage'))
const AIAnalystPage        = lazy(() => import('@/pages/ai/AIAnalystPage'))
const FiscalYearPage       = lazy(() => import('@/pages/accounting/FiscalYearPage'))
const CurrencyRatesPage    = lazy(() => import('@/pages/settings/CurrencyRatesPage'))
const TaxConfigPage        = lazy(() => import('@/pages/settings/TaxConfigPage'))    // Phase 5.4.8
const InventoryPage        = lazy(() => import('@/pages/inventory/InventoryPage'))    // Phase 5.5 Step 4
/* Phase 3.1 — Procurement */
const PurchaseOrdersPage     = lazy(() => import('@/pages/procurement/PurchaseOrdersPage'))
const PurchaseOrderEditorPage = lazy(() => import('@/pages/procurement/PurchaseOrderEditorPage'))
const GoodsReceiptsPage      = lazy(() => import('@/pages/procurement/GoodsReceiptsPage'))
/* Phase 3.3 — Vendor Portal & AP Automation */
const VendorPortal         = lazy(() => import('@/pages/vendor/VendorPortal'))
const APWorkflowBoard      = lazy(() => import('@/pages/ap/APWorkflowBoard'))
/* Phase 3.4 — Procurement Dashboard */
const ProcurementDashboard = lazy(() => import('@/pages/ap/ProcurementDashboard'))

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
          /* Phase 2 — Invoice generator */
          { path: 'sales/invoices',          element: withSuspense(InvoicesListPage)  },
          { path: 'sales/invoices/new',      element: withSuspense(InvoiceEditorPage) },
          { path: 'sales/invoices/:id/edit', element: withSuspense(InvoiceEditorPage) },
          { path: 'sales',                  element: <Navigate to="/customers" replace /> },
          { path: 'sales/customers',        element: <Navigate to="/customers" replace /> },

          /* ── Purchases (Vendors + AP) ─────────────────────────────────── */
          { path: 'vendors',                element: withSuspense(VendorsList)    },
          { path: 'vendors/:id',            element: withSuspense(VendorDetail)   },
          { path: 'purchases/payables',     element: withSuspense(PayablesPage)   },
          /* Phase 2 — Bill generator */
          { path: 'purchases/bills',          element: withSuspense(BillsListPage)   },
          { path: 'purchases/bills/new',      element: withSuspense(BillEditorPage)  },
          { path: 'purchases/bills/:id/edit', element: withSuspense(BillEditorPage)  },
          { path: 'purchases',              element: <Navigate to="/vendors" replace /> },
          { path: 'purchases/vendors',      element: <Navigate to="/vendors" replace /> },
          /* Phase 3.1 — Procurement */
          { path: 'procurement/purchase-orders',          element: withSuspense(PurchaseOrdersPage)      },
          { path: 'procurement/purchase-orders/new',      element: withSuspense(PurchaseOrderEditorPage) },
          { path: 'procurement/purchase-orders/:id/edit', element: withSuspense(PurchaseOrderEditorPage) },
          { path: 'procurement/goods-receipts',           element: withSuspense(GoodsReceiptsPage)       },
          { path: 'procurement', element: <Navigate to="/procurement/purchase-orders" replace /> },
          /* Phase 3.3 — Vendor Portal + AP Workflow */
          { path: 'vendors/:id/portal', element: withSuspense(VendorPortal) },
          { path: 'purchases/ap-workflow', element: withSuspense(APWorkflowBoard) },
          /* Phase 3.4 — Procurement Dashboard */
          { path: 'purchases/procurement-dashboard', element: withSuspense(ProcurementDashboard) },
          { path: 'business/settings', element: withSuspense(BusinessSettings)  },
          { path: 'accounting/fiscal-years',    element: withSuspense(FiscalYearPage)     },
          { path: 'settings/exchange-rates',    element: withSuspense(CurrencyRatesPage)  },
          { path: 'settings/tax',               element: withSuspense(TaxConfigPage)      }, // Phase 5.4.8
          { path: 'inventory',                  element: withSuspense(InventoryPage)      }, // Phase 5.5 Step 4

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
