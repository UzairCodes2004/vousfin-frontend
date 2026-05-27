import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import vousFinLogo from '@/assets/vousfin-logo.png'
import {
  LayoutDashboard,
  Receipt,
  Users,
  Briefcase,
  BrainCircuit,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileBarChart2,
  ShoppingCart,
  PackageOpen,
  Boxes,
  Wallet,
  CreditCard,
  TrendingUp,
  ShieldAlert,
  Lightbulb,
  Sparkles,
  CalendarDays,
  DollarSign,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

/*
 * Two kinds of entries:
 *   - { kind: 'link',  name, href, icon }
 *   - { kind: 'group', name, icon, key, children: [...links] }
 *
 * ERP-style hierarchy: Reports and AI Analyst are expandable groups so users
 * can deep-link to a specific tab. Each child links to a tab route — the page
 * itself manages the active-tab UI on landing.
 */
const NAV = [
  { kind: 'link',  name: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { kind: 'link',  name: 'Accounts',     href: '/accounts',     icon: BookOpen        },
  { kind: 'link',  name: 'Transactions', href: '/transactions', icon: Receipt         },
  {
    kind: 'group', name: 'Sales', icon: ShoppingCart, key: 'sales',
    children: [
      { name: 'Customers',   href: '/customers',         icon: Users  },
      { name: 'Receivables', href: '/sales/receivables', icon: Wallet },
    ],
  },
  {
    kind: 'group', name: 'Purchases', icon: PackageOpen, key: 'purchases',
    children: [
      { name: 'Vendors',  href: '/vendors',            icon: Briefcase  },
      { name: 'Payables', href: '/purchases/payables', icon: CreditCard },
    ],
  },
  { kind: 'link', name: 'Inventory',         href: '/inventory',                          icon: Boxes },
  { kind: 'link', name: 'Financial Reports', href: '/financial-reports/income-statement', activePrefix: '/financial-reports', icon: FileBarChart2 },
  {
    kind: 'group', name: 'AI Analyst', icon: BrainCircuit, key: 'ai-analyst',
    children: [
      { name: 'Forecast',          href: '/ai-analyst/forecast',  icon: TrendingUp   },
      { name: 'Anomaly Detection', href: '/ai-analyst/anomalies', icon: ShieldAlert  },
      { name: 'AI Insights',       href: '/ai-analyst/insights',  icon: Lightbulb    },
    ],
  },
  { kind: 'link',  name: 'Fiscal Years',    href: '/accounting/fiscal-years',    icon: CalendarDays },
  { kind: 'link',  name: 'Exchange Rates', href: '/settings/exchange-rates',    icon: DollarSign, activePrefix: '/settings/exchange-rates' },
  { kind: 'link',  name: 'Tax Engine',    href: '/settings/tax',               icon: Receipt,   activePrefix: '/settings/tax' },
  { kind: 'link',  name: 'AI Assistant',   href: '/ai/assistant',               icon: Sparkles  },
  { kind: 'link',  name: 'Settings',       href: '/business/settings',          icon: Settings  },
]

/* Decide which group should be expanded based on current URL */
function activeGroupKey(pathname) {
  for (const item of NAV) {
    if (item.kind === 'group') {
      if (item.children.some((c) => pathname.startsWith(c.href))) return item.key
    }
  }
  return null
}

export default function Sidebar({ isCollapsed, toggleCollapse, isMobile = false, closeMobile }) {
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  /*
   * Group open state is DERIVED from the active route, with a manual override
   * map that lets the user collapse/expand against the default. Auto-derived
   * state in render avoids the "setState in effect" anti-pattern.
   */
  const activeKey = activeGroupKey(location.pathname)
  const [overrides, setOverrides] = useState({})

  const compact = isCollapsed && !isMobile  // text-hidden mode

  const isGroupOpen = (key) =>
    Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : key === activeKey

  const toggleGroup = (key) =>
    setOverrides((m) => ({ ...m, [key]: !isGroupOpen(key) }))

  /* ── Renderers ────────────────────────────────────────────────────── */

  const linkClass = (isActive) => cn(
    'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-premium',
    isActive
      ? 'bg-glass-panel text-cyan border border-glass shadow-glow-cyan/10'
      : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary',
    compact && 'justify-center px-0'
  )

  const renderLink = (item) => (
    <NavLink
      key={item.name}
      to={item.href}
      onClick={isMobile ? closeMobile : undefined}
      className={({ isActive }) =>
        linkClass(item.activePrefix
          ? location.pathname.startsWith(item.activePrefix)
          : isActive)
      }
      title={compact ? item.name : undefined}
    >
      <item.icon className={cn('flex-shrink-0', compact ? 'h-5 w-5' : 'mr-3 h-5 w-5')} />
      {!compact && item.name}
    </NavLink>
  )

  const renderGroupChild = (child, depth = 1) => (
    <NavLink
      key={child.name}
      to={child.href}
      onClick={isMobile ? closeMobile : undefined}
      className={({ isActive }) => cn(
        'group flex items-center rounded-lg text-sm font-medium transition-premium',
        depth === 1 && !compact ? 'pl-10 pr-3 py-2' : 'px-3 py-2.5',
        isActive
          ? 'bg-glass-panel text-cyan border border-glass'
          : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary',
        compact && 'justify-center px-0'
      )}
      title={compact ? child.name : undefined}
    >
      <child.icon className={cn('flex-shrink-0', compact ? 'h-5 w-5' : 'mr-3 h-4 w-4')} />
      {!compact && child.name}
    </NavLink>
  )

  const renderGroup = (item) => {
    /* In collapsed mode: show children as flat icons (no expand toggle) */
    if (compact) {
      return (
        <div key={item.key} className="space-y-1.5">
          {item.children.map((c) => renderGroupChild(c, 0))}
        </div>
      )
    }

    const isOpen = isGroupOpen(item.key)
    const anyChildActive = item.children.some((c) => location.pathname.startsWith(c.href))

    return (
      <div key={item.key}>
        <button
          type="button"
          onClick={() => toggleGroup(item.key)}
          className={cn(
            'group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-premium',
            anyChildActive
              ? 'text-cyan'
              : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'
          )}
        >
          <span className="flex items-center">
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.name}
          </span>
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )} />
        </button>
        {isOpen && (
          <div className="mt-1 space-y-1">
            {item.children.map((c) => renderGroupChild(c, 1))}
          </div>
        )}
      </div>
    )
  }

  /* ── Body ─────────────────────────────────────────────────────────── */

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className={cn(
          'flex items-center mb-8 px-4',
          compact ? 'justify-center' : 'justify-between'
        )}>
          {!compact && (
            <div className="flex items-center gap-2.5">
              <img src={vousFinLogo} alt="VousFin" className="h-8 w-8 object-contain drop-shadow-[0_0_6px_rgba(6,182,212,0.35)]" />
              <span className="text-2xl font-black tracking-tight text-text-primary">
                vous<span className="text-gradient">Fin</span>
              </span>
            </div>
          )}
          {compact && (
            <img src={vousFinLogo} alt="VousFin" className="h-8 w-8 object-contain drop-shadow-[0_0_6px_rgba(6,182,212,0.35)]" />
          )}
        </div>

        <nav className="space-y-1.5 px-2">
          {NAV.map((item) =>
            item.kind === 'link' ? renderLink(item) : renderGroup(item)
          )}
        </nav>
      </div>

      <div className="px-2 pb-4 space-y-2">
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-glass-hover transition-premium',
              isCollapsed ? 'justify-center' : ''
            )}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : (
              <>
                <ChevronLeft className="mr-3 h-5 w-5" /> Collapse
              </>
            )}
          </button>
        )}
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-premium',
            compact && 'justify-center'
          )}
          title={compact ? 'Log out' : undefined}
        >
          <LogOut className={cn('flex-shrink-0', compact ? 'h-5 w-5' : 'mr-3 h-5 w-5')} />
          {!compact && 'Log out'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {!isMobile && (
        <aside
          className={cn(
            'hidden lg:flex flex-col border-r border-glass bg-charcoal transition-all duration-300',
            isCollapsed ? 'w-20' : 'w-64'
          )}
        >
          <div className="flex-1 py-6 overflow-y-auto scrollbar-thin">{SidebarContent}</div>
        </aside>
      )}
      {isMobile && (
        <div className="flex-1 py-6 overflow-y-auto scrollbar-thin">{SidebarContent}</div>
      )}
    </>
  )
}
