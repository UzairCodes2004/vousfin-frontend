/**
 * nav.config.js — single source of truth for app navigation.
 *
 * Consumed by SectionRail (slim launcher rail), SectionHub (landing pages),
 * the mobile drawer Sidebar, and the Header (page title). Routes here are
 * PRESENTATION only — they must match routes.jsx but never define new ones.
 *
 * Section model:
 *   { label, key, icon, accent, blurb, items: [{ name, href, icon, desc, exact?, activePrefix?, badgeKey? }] }
 * label:null renders the pinned top section (Home) with no header.
 *
 * The "Vault" IA: the rail shows one jeweled button per section; clicking it
 * opens that section's hub page (/hub/<key>) whose cards link to the modules
 * below. accent is a Nocturne hex used for the rail glow + card hairlines.
 */
import {
  LayoutDashboard, Activity,
  Receipt, BookOpen, Repeat, ClipboardCheck, CalendarDays,
  Users, FileText, Wallet,
  Briefcase, CreditCard, ShoppingBag, Truck,
  Landmark, BrainCircuit, ShieldAlert,
  Boxes, Bot, Library, Sparkles, Scale, Inbox,
  ArrowDownCircle, ArrowUpCircle,
  FileBarChart2, TrendingUp, Lightbulb,
  Settings, DollarSign, Percent, Palette,
} from 'lucide-react'

/* Section accents — theme variables (recolor per theme), meaning not decoration */
const JADE = 'var(--sec-money-in)'      // money in
const CORAL = 'var(--sec-money-out)'    // money out
const GOLD = 'var(--sec-ledger)'        // the record / the book
const MINT = 'var(--sec-autopilot)'     // automation / AI
const CHAMP = 'var(--sec-intelligence)' // insight
const MUTE = 'var(--sec-settings)'      // neutral / config

export const NAV_SECTIONS = [
  {
    label: null, key: 'home',
    items: [
      { name: 'Home',     href: '/dashboard', icon: LayoutDashboard, desc: 'Your business at a glance' },
    ],
  },
  {
    label: 'Money In', key: 'money-in', icon: ArrowDownCircle, accent: JADE,
    blurb: 'Everything that brings money toward you — who buys from you, what you bill, and what you are still owed.',
    items: [
      { name: 'Customers',   href: '/customers',         icon: Users,    desc: 'Who buys from you and their balances' },
      { name: 'Invoices',    href: '/sales/invoices',    icon: FileText, desc: 'Bills you send to customers' },
      { name: 'Receivables', href: '/sales/receivables', icon: Wallet,   desc: 'Money customers still owe you', statKey: 'receivable' },
    ],
  },
  {
    label: 'Money Out', key: 'money-out', icon: ArrowUpCircle, accent: CORAL,
    blurb: 'Everything that sends money away — your suppliers, what they charge, and the orders behind it.',
    items: [
      { name: 'Vendors',         href: '/vendors',                     icon: Briefcase,  desc: 'Who you buy from' },
      { name: 'Bills',           href: '/purchases/bills',             icon: FileText,   desc: 'What suppliers charge you' },
      { name: 'Payables',        href: '/purchases/payables',          icon: CreditCard, desc: 'Money you still owe suppliers', statKey: 'payable' },
      { name: 'Purchase Orders', href: '/procurement/purchase-orders', icon: ShoppingBag, desc: 'Orders you place with suppliers' },
      { name: 'Goods Receipts',  href: '/procurement/goods-receipts',  icon: Truck,      desc: 'Confirm what actually arrived' },
    ],
  },
  {
    label: 'Ledger', key: 'ledger', icon: Library, accent: GOLD,
    blurb: 'The books themselves — every entry, the accounts behind them, and the controls that keep them honest.',
    items: [
      { name: 'Transactions',      href: '/transactions',            icon: Receipt, exact: true, desc: 'Every entry in your books' },
      { name: 'Chart of Accounts', href: '/accounts',                icon: BookOpen,       desc: 'The account structure of your business' },
      { name: 'Recurring',         href: '/transactions/templates',  icon: Repeat,         desc: 'Saved templates and repeating entries' },
      { name: 'Approvals',         href: '/approvals',               icon: ClipboardCheck, desc: 'Items waiting for sign-off', badgeKey: 'approvals', statKey: 'approvals' },
      { name: 'Inventory',         href: '/inventory',               icon: Boxes,          desc: 'Stock you hold and its value' },
      { name: 'Fiscal Years',      href: '/accounting/fiscal-years', icon: CalendarDays,   desc: 'Open and close accounting periods' },
      { name: 'Activity',          href: '/activity',                icon: Activity,       desc: 'Full audit trail of every change' },
    ],
  },
  {
    label: 'Autopilot', key: 'autopilot', icon: Bot, accent: MINT,
    blurb: 'Let VousFin do the heavy lifting — AI-drafted entries, bank matching and live tax, with you in the approval seat.',
    items: [
      { name: 'Command Center',      href: '/command-center',            icon: Inbox,        desc: 'Your one inbox — what needs you, and what VousFin is doing' },
      { name: 'Tax Autopilot',       href: '/tax',                       icon: Scale,        desc: 'Live tax position, deadlines and trends' },
      { name: 'AI Review Queue',     href: '/ai/review-queue',           icon: BrainCircuit, desc: 'AI-suggested entries to confirm' },
      { name: 'Bank Reconciliation', href: '/reconciliation/bank',       icon: Landmark,     desc: 'Match your books against the bank' },
      { name: 'Exceptions',          href: '/reconciliation/exceptions', icon: ShieldAlert,  desc: 'Mismatches that need a closer look' },
    ],
  },
  {
    label: 'Intelligence', key: 'intelligence', icon: Sparkles, accent: CHAMP,
    blurb: 'Make sense of the numbers — statements, forecasts, what-if scenarios, and an assistant that explains it all.',
    items: [
      { name: 'Financial Reports', href: '/financial-reports/income-statement', activePrefix: '/financial-reports', icon: FileBarChart2, desc: 'Income statement, balance sheet, cash flow' },
      { name: 'Forecast',          href: '/ai-analyst/forecast',  icon: TrendingUp, desc: 'Where your numbers are heading' },
      { name: 'Scenarios',         href: '/ai-analyst/scenarios', icon: Lightbulb,  desc: "Test 'what if' situations safely" },
      { name: 'Anomalies',         href: '/ai-analyst/anomalies', icon: ShieldAlert, desc: 'Unusual activity we flagged for you' },
      { name: 'AI Assistant',      href: '/ai/assistant',         icon: Sparkles,   desc: 'Ask questions about your finances' },
    ],
  },
  {
    label: 'Settings', key: 'settings', icon: Settings, accent: MUTE, pinBottom: true,
    blurb: 'Tune VousFin to your business — company profile, tax rules, and currency rates.',
    items: [
      { name: 'Business',       href: '/business/settings',       icon: Settings,   desc: 'Company profile and preferences' },
      { name: 'Appearance',     href: '/settings/appearance',     icon: Palette,    activePrefix: '/settings/appearance', desc: 'Theme and look of the app' },
      { name: 'Tax Engine',     href: '/settings/tax',            icon: Percent,    activePrefix: '/settings/tax', desc: 'Tax rates and how tax is applied' },
      { name: 'Exchange Rates', href: '/settings/exchange-rates', icon: DollarSign, activePrefix: '/settings/exchange-rates', desc: 'Currency conversion rates' },
    ],
  },
]

/* The labeled sections that get a rail button + hub page (Home is direct). */
export const HUB_SECTIONS = NAV_SECTIONS.filter((s) => s.label)

/** Look up a hub section by its key (for the SectionHub page). */
export function hubByKey(key) {
  return HUB_SECTIONS.find((s) => s.key === key) || null
}

/**
 * Rail model: Home (direct to dashboard) + one launcher per hub section.
 * Settings is flagged pinBottom so the rail can float it to the foot.
 */
export const RAIL_ITEMS = [
  { key: 'home', name: 'Home', icon: LayoutDashboard, href: '/dashboard', accent: JADE },
  ...HUB_SECTIONS.map((s) => ({
    key: s.key, name: s.label, icon: s.icon, href: `/hub/${s.key}`, accent: s.accent, pinBottom: s.pinBottom,
  })),
]

/* Detail/editor routes that need a nicer title than their list page */
const TITLE_OVERRIDES = [
  [/^\/customers\/[^/]+/,                 'Customer Detail'],
  [/^\/vendors\/[^/]+\/portal/,           'Vendor Portal'],
  [/^\/vendors\/[^/]+/,                   'Vendor Detail'],
  [/^\/sales\/invoices\/new/,             'New Invoice'],
  [/^\/sales\/invoices\/[^/]+\/edit/,     'Edit Invoice'],
  [/^\/purchases\/bills\/new/,            'New Bill'],
  [/^\/purchases\/bills\/[^/]+\/edit/,    'Edit Bill'],
  [/^\/procurement\/purchase-orders\/new/,       'New Purchase Order'],
  [/^\/procurement\/purchase-orders\/[^/]+\/edit/, 'Edit Purchase Order'],
  [/^\/purchases\/ap-workflow/,           'AP Workflow'],
  [/^\/purchases\/procurement-dashboard/, 'Procurement Dashboard'],
]

const FLAT_ITEMS = NAV_SECTIONS.flatMap((s) => s.items)

/** Resolve the page title for a pathname — longest matching nav href wins. */
export function pageTitleFor(pathname) {
  if (pathname.startsWith('/hub/')) {
    const key = pathname.slice('/hub/'.length).split('/')[0]
    return hubByKey(key)?.label || 'vousFin'
  }
  for (const [re, title] of TITLE_OVERRIDES) {
    if (re.test(pathname)) return title
  }
  let best = null
  for (const item of FLAT_ITEMS) {
    const prefix = item.activePrefix || item.href
    if (pathname === item.href || pathname.startsWith(prefix)) {
      if (!best || prefix.length > (best.activePrefix || best.href).length) best = item
    }
  }
  return best?.name || 'vousFin'
}

/** True when `item` should render as active for the given pathname. */
export function isItemActive(item, pathname) {
  if (item.exact) return pathname === item.href
  if (item.activePrefix) return pathname.startsWith(item.activePrefix)
  return pathname.startsWith(item.href)
}

/** Section key containing the active route (for rail highlight + hub defaults). */
export function activeSectionKey(pathname) {
  if (pathname.startsWith('/hub/')) return pathname.slice('/hub/'.length).split('/')[0]
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'home'
  if (pathname.startsWith('/procurement')) return 'money-out'
  for (const section of NAV_SECTIONS) {
    if (section.items.some((i) => isItemActive(i, pathname))) return section.key
  }
  return null
}
