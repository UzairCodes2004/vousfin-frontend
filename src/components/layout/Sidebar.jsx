import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import vousFinLogo from '@/assets/vousfin-logo.png'
import { LogOut, ChevronLeft, ChevronRight, ChevronDown, Briefcase } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBusinessStore } from '@/stores/useBusinessStore'
import approvalService from '@/services/approval.service'
import { NAV_SECTIONS, isItemActive, activeSectionKey } from './nav.config'

/*
 * Sidebar — sectioned navigation ("professional accounting OS" IA).
 *
 * Sections come from nav.config.js (single source of truth shared with the
 * Header). Labeled sections collapse/expand; the section containing the
 * active route is always opened by default. All hrefs are unchanged from the
 * flat-nav era — this is a presentation-only regroup.
 */

export default function Sidebar({ isCollapsed, toggleCollapse, isMobile = false, closeMobile }) {
  const logout = useAuthStore((s) => s.logout)
  const activeBusiness = useBusinessStore((s) => s.activeBusiness)
  const location = useLocation()

  // Live pending-approvals count for the nav badge. Polls gently; failures are
  // silent (the badge just won't show) so the sidebar never breaks.
  const { data: approvalsPending = 0 } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: () => approvalService.count().then((r) => r.data.data?.pending ?? 0),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  })
  const badgeFor = (key) => (key === 'approvals' ? approvalsPending : 0)

  /*
   * Sections are open by default (discoverability first); the user may
   * collapse them. Overrides live in component state, and the section that
   * contains the active route can never be collapsed away accidentally —
   * navigating into it re-opens it via the derived default.
   */
  const activeKey = activeSectionKey(location.pathname)
  const [overrides, setOverrides] = useState({})

  const compact = isCollapsed && !isMobile // icon-only mode

  const isSectionOpen = (key) =>
    key === activeKey ||
    (Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : true)

  const toggleSection = (key) =>
    setOverrides((m) => ({ ...m, [key]: !isSectionOpen(key) }))

  /* ── Renderers ────────────────────────────────────────────────────── */

  const renderLink = (item) => {
    const badge = item.badgeKey ? badgeFor(item.badgeKey) : 0
    const active = isItemActive(item, location.pathname)
    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.exact || undefined}
        onClick={isMobile ? closeMobile : undefined}
        className={cn(
          'group relative flex items-center rounded-md px-3 py-2 text-[13px] font-medium transition-premium',
          active
            ? 'bg-accent-soft text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary',
          compact && 'justify-center px-0 py-2.5',
        )}
        title={compact ? item.name : undefined}
      >
        {/* Active accent bar — jade, softly luminous */}
        <span
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full transition-all duration-200',
            active ? 'bg-accent shadow-[0_0_10px_rgb(var(--c-accent)/0.9)]' : 'bg-transparent',
          )}
        />
        <span className="relative flex-shrink-0">
          <item.icon className={cn(
            'h-[17px] w-[17px] flex-shrink-0',
            active ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary',
            !compact && 'mr-3',
          )} />
          {badge > 0 && compact && (
            <span className="absolute -top-1.5 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber text-[12px] font-bold text-navy flex items-center justify-center">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
        {!compact && <span className="flex-1 truncate">{item.name}</span>}
        {!compact && badge > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full bg-amber text-[12.5px] font-bold text-navy flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </NavLink>
    )
  }

  const renderSection = (section) => {
    /* Pinned (unlabeled) section: always visible */
    if (!section.label) {
      return (
        <div key={section.key} className="space-y-0.5">
          {section.items.map(renderLink)}
        </div>
      )
    }

    /* Compact mode: hairline divider instead of a label, links always shown */
    if (compact) {
      return (
        <div key={section.key} className="space-y-0.5 pt-2 mt-2 border-t border-glass">
          {section.items.map(renderLink)}
        </div>
      )
    }

    const open = isSectionOpen(section.key)
    return (
      <div key={section.key} className="pt-4">
        <button
          type="button"
          onClick={() => toggleSection(section.key)}
          className="group flex w-full items-center justify-between px-3 pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-text-muted hover:text-text-secondary transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="h-px w-2.5 bg-gold/50" aria-hidden="true" />
            {section.label}
          </span>
          <ChevronDown
            className={cn(
              'h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-200',
              !open && '-rotate-90 opacity-100',
            )}
          />
        </button>
        {open && (
          <div className="space-y-0.5">
            {section.items.map(renderLink)}
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
          'flex items-center mb-6 px-4',
          compact ? 'justify-center' : 'justify-between',
        )}>
          {!compact ? (
            <div className="flex items-center gap-2.5">
              <img src={vousFinLogo} alt="VousFin" className="h-7 w-7 object-contain" />
              <span className="font-display text-xl font-semibold tracking-tight text-text-primary">
                vous<span className="text-gradient">Fin</span>
              </span>
            </div>
          ) : (
            <img src={vousFinLogo} alt="VousFin" className="h-7 w-7 object-contain" />
          )}
        </div>

        {/* Active business chip */}
        {!compact && activeBusiness && (
          <div className="mx-2 mb-2 flex items-center gap-2.5 rounded-md border border-glass bg-glass-panel px-3 py-2">
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded bg-navy flex items-center justify-center">
              {activeBusiness.logoUrl
                ? <img src={activeBusiness.logoUrl} alt="" className="h-full w-full object-cover" />
                : <Briefcase className="h-3 w-3 text-text-muted" />}
            </div>
            <span className="truncate text-[13px] font-semibold text-text-primary" title={activeBusiness.businessName}>
              {activeBusiness.businessName}
            </span>
          </div>
        )}
        {compact && activeBusiness?.logoUrl && (
          <div className="mb-2 flex justify-center">
            <img src={activeBusiness.logoUrl} alt="" className="h-7 w-7 rounded object-cover border border-glass" />
          </div>
        )}

        <nav className="px-2">
          {NAV_SECTIONS.map(renderSection)}
        </nav>
      </div>

      <div className="px-2 pb-4 pt-4 space-y-1">
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-[13px] font-medium text-text-muted hover:bg-glass-hover hover:text-text-secondary transition-premium',
              isCollapsed && 'justify-center',
            )}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : (
              <>
                <ChevronLeft className="mr-3 h-4 w-4" /> Collapse
              </>
            )}
          </button>
        )}
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center rounded-md px-3 py-2 text-[13px] font-medium text-negative/80 hover:bg-negative-muted hover:text-negative transition-premium',
            compact && 'justify-center',
          )}
          title={compact ? 'Log out' : undefined}
        >
          <LogOut className={cn('h-4 w-4 flex-shrink-0', !compact && 'mr-3')} />
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
            isCollapsed ? 'w-[68px]' : 'w-60',
          )}
        >
          <div className="flex-1 py-5 overflow-y-auto scrollbar-thin">{SidebarContent}</div>
        </aside>
      )}
      {isMobile && (
        <div className="flex-1 py-5 overflow-y-auto scrollbar-thin">{SidebarContent}</div>
      )}
    </>
  )
}
