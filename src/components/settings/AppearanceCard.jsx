import { Check } from 'lucide-react'
import { THEMES } from '@/theme/themes'
import { useThemeStore } from '@/stores/useThemeStore'
import { cn } from '@/utils/cn'

/*
 * AppearanceCard — the theme switcher in Settings.
 * A radiogroup of live-preview tiles; clicking applies instantly and persists
 * (localStorage via useThemeStore). Each tile previews the theme's own colors.
 */
export default function AppearanceCard() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="premium-card p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold text-text-primary">Appearance</h3>
      <p className="mt-1 text-[13px] text-text-secondary">
        Pick a theme. It applies instantly and is saved on this device.
      </p>

      <div
        role="radiogroup"
        aria-label="Theme"
        className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {THEMES.map((t) => {
          const active = t.key === theme
          return (
            <button
              key={t.key}
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(t.key)}
              title={t.name}
              className={cn(
                'group relative rounded-xl border p-2.5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                active ? 'border-glass-2 ring-2 ring-accent/60' : 'border-glass hover:border-glass-2',
              )}
              style={{ background: t.sw.bg }}
            >
              <div className="rounded-lg border p-2.5" style={{ background: t.sw.c, borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium num" style={{ color: t.sw.a }}>Rs 3.28M</span>
                  {active && <Check className="h-3.5 w-3.5" style={{ color: t.sw.a }} />}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-5 flex-1 rounded-md" style={{ background: t.sw.a }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.sw.p }} aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.sw.n }} aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.sw.h }} aria-hidden="true" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                <span className="text-[11px] font-medium truncate" style={{ color: t.group === 'light' ? '#2A2620' : '#E9EFEA' }}>
                  {t.name}
                </span>
                <span className="text-[9px] uppercase tracking-wider flex-shrink-0" style={{ color: t.group === 'light' ? '#6B6457' : '#8A8F83' }}>
                  {t.group}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
