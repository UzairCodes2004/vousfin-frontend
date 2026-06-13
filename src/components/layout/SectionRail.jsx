import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/utils/cn'
import { LogOut } from 'lucide-react'
import vousFinLogo from '@/assets/vousfin-logo.png'
import { useAuthStore } from '@/stores/useAuthStore'
import approvalService from '@/services/approval.service'
import { RAIL_ITEMS, activeSectionKey } from './nav.config'

/*
 * SectionRail — the "Vault" desktop navigation.
 *
 * A slim, always-visible rail of jeweled section launchers (Home + 6 hub
 * sections). Each button leads to that section's hub page (/hub/<key>); Home
 * goes straight to the dashboard. The rail never lists individual modules —
 * those live on the hub pages. Active section glows in its Nocturne accent.
 */

function RailButton({ item, active, badge, isMobile, onNavigate }) {
  const accent = item.accent
  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center',
        isMobile ? 'w-full gap-3 rounded-xl px-3 py-2.5' : 'h-11 w-11 justify-center rounded-xl',
        'transition-premium',
      )}
      aria-label={item.name}
    >
      {/* Active accent bar (desktop only) — luminous, section-tinted */}
      {!isMobile && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all duration-300"
          style={{
            height: active ? 18 : 0,
            background: `rgb(${accent})`,
            boxShadow: active ? `0 0 10px rgb(${accent})` : 'none',
          }}
        />
      )}

      {/* Icon tile */}
      <span
        className={cn(
          'relative flex items-center justify-center rounded-xl transition-all duration-200',
          isMobile ? 'h-9 w-9 flex-shrink-0' : 'h-11 w-11',
        )}
        style={
          active
            ? { background: `rgb(${accent} / 0.12)`, boxShadow: `inset 0 0 0 1px rgb(${accent} / 0.35)` }
            : undefined
        }
      >
        <item.icon
          className={cn(
            'h-[19px] w-[19px] transition-colors duration-200',
            !active && 'text-text-muted group-hover:text-text-secondary',
          )}
          style={active ? { color: `rgb(${accent})` } : undefined}
        />
        {badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-amber text-[9px] font-bold text-navy flex items-center justify-center"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>

      {/* Label: inline on mobile, floating tooltip on desktop */}
      {isMobile ? (
        <span className={cn('text-[13px] font-medium', active ? 'text-text-primary' : 'text-text-secondary')}>
          {item.name}
        </span>
      ) : (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-[52px] z-50 whitespace-nowrap rounded-lg border border-glass-2 bg-charcoal/95 px-2.5 py-1 text-[12px] font-medium text-text-primary opacity-0 -translate-x-1 shadow-elevated backdrop-blur-md transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
        >
          {item.name}
        </span>
      )}
    </NavLink>
  )
}

export default function SectionRail({ isMobile = false, closeMobile }) {
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const activeKey = activeSectionKey(location.pathname)

  const { data: approvalsPending = 0 } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: () => approvalService.count().then((r) => r.data.data?.pending ?? 0),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  })
  const badgeFor = (key) => (key === 'ledger' ? approvalsPending : 0)

  const top = RAIL_ITEMS.filter((i) => !i.pinBottom)
  const bottom = RAIL_ITEMS.filter((i) => i.pinBottom)

  const content = (
    <div className={cn('flex h-full flex-col', isMobile ? 'gap-1' : 'items-center')}>
      {/* Wordmark / logo — links home */}
      <NavLink
        to="/dashboard"
        onClick={isMobile ? closeMobile : undefined}
        className={cn('flex items-center', isMobile ? 'gap-2.5 px-3 mb-3' : 'justify-center mb-4')}
        aria-label="VousFin home"
      >
        <img src={vousFinLogo} alt="VousFin" className="h-7 w-7 object-contain drop-shadow-[0_0_8px_rgba(61,220,151,0.35)]" />
        {isMobile && (
          <span className="font-display text-lg font-semibold tracking-tight text-text-primary">
            vous<span className="text-gradient">Fin</span>
          </span>
        )}
      </NavLink>

      <nav className={cn('flex flex-col', isMobile ? 'gap-1' : 'items-center gap-1.5')}>
        {top.map((item) => (
          <RailButton
            key={item.key}
            item={item}
            active={activeKey === item.key}
            badge={badgeFor(item.key)}
            isMobile={isMobile}
            onNavigate={isMobile ? closeMobile : undefined}
          />
        ))}
      </nav>

      <div className={cn('mt-auto flex flex-col', isMobile ? 'gap-1 pt-2' : 'items-center gap-1.5 pt-2')}>
        {/* Hairline divider above the foot cluster */}
        <span className={cn('bg-glass', isMobile ? 'h-px w-full my-1' : 'h-px w-7 my-1')} aria-hidden="true" />
        {bottom.map((item) => (
          <RailButton
            key={item.key}
            item={item}
            active={activeKey === item.key}
            badge={0}
            isMobile={isMobile}
            onNavigate={isMobile ? closeMobile : undefined}
          />
        ))}
        <button
          onClick={logout}
          aria-label="Log out"
          className={cn(
            'group relative flex items-center text-text-muted transition-premium',
            isMobile ? 'w-full gap-3 rounded-xl px-3 py-2.5 hover:text-negative' : 'h-11 w-11 justify-center rounded-xl hover:text-negative',
          )}
        >
          <span className={cn('flex items-center justify-center rounded-xl', isMobile ? 'h-9 w-9' : 'h-11 w-11')}>
            <LogOut className="h-[18px] w-[18px]" />
          </span>
          {isMobile ? (
            <span className="text-[13px] font-medium">Log out</span>
          ) : (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-[52px] z-50 whitespace-nowrap rounded-lg border border-glass-2 bg-charcoal/95 px-2.5 py-1 text-[12px] font-medium text-text-primary opacity-0 -translate-x-1 shadow-elevated backdrop-blur-md transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
            >
              Log out
            </span>
          )}
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-5">{content}</div>
  }

  return (
    <aside className="hidden lg:flex flex-col border-r border-glass bg-charcoal w-[68px] py-5 px-2.5 overflow-y-auto scrollbar-none">
      {content}
    </aside>
  )
}
