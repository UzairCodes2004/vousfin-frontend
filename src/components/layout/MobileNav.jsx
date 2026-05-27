/**
 * MobileNav — Phase 5.6 Step 3
 * Enhanced bottom navigation with active indicator and touch-friendly sizing.
 */
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, BrainCircuit, FileText, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'

const links = [
  { to: '/dashboard',                          icon: LayoutDashboard, label: 'Home'    },
  { to: '/transactions',                       icon: Receipt,         label: 'Txns'    },
  { to: '/ai-analyst/forecast',                icon: BrainCircuit,    label: 'AI'      },
  { to: '/financial-reports/income-statement', icon: FileText,        label: 'Reports' },
  { to: '/business/settings',                  icon: Settings,        label: 'More'    },
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-glass bg-charcoal/96 backdrop-blur-md lg:hidden">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors min-h-[56px] justify-center',
              isActive ? 'text-cyan' : 'text-text-muted hover:text-text-secondary',
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Active indicator bar at top */}
              <span
                className={cn(
                  'absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-b-full transition-all duration-200',
                  isActive ? 'w-8 bg-cyan' : 'w-0 bg-transparent',
                )}
              />
              {/* Icon with active background chip */}
              <span className={cn(
                'p-1.5 rounded-lg transition-colors duration-150',
                isActive ? 'bg-cyan/15' : '',
              )}>
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
