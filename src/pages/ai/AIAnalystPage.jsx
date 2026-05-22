/**
 * AIAnalystPage — Unified AI intelligence hub
 *
 * Consolidates AI Forecast, Anomaly Detection, and AI Insights into one
 * tabbed module. URL-driven active tab.
 *
 * "Mount-once / hide" strategy:
 *   Each sub-page mounts the FIRST time its tab is visited and then stays
 *   mounted (hidden with `display:none`) on subsequent tab switches.
 *   This prevents the anomaly auto-scan and the forecast auto-run from
 *   re-firing every time the user switches tabs — which would flood the
 *   API and look broken.
 *
 * URL structure:
 *   /ai-analyst              → redirect to /ai-analyst/forecast
 *   /ai-analyst/forecast     → LSTM Forecast
 *   /ai-analyst/anomalies    → Anomaly Detection
 *   /ai-analyst/insights     → AI Assistant / Insights
 */
import { lazy, Suspense, useState, useCallback } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { TrendingUp, ShieldAlert, Lightbulb } from 'lucide-react'
import { cn } from '@/utils/cn'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

const AIForecastPage    = lazy(() => import('./AIForecastPage'))
const AnomalyReviewPage = lazy(() => import('./AnomalyReviewPage'))
const AIAssistantPage   = lazy(() => import('./AIAssistantPage'))

const TABS = [
  { key: 'forecast',  label: 'AI Forecast',      icon: TrendingUp,  Component: AIForecastPage    },
  { key: 'anomalies', label: 'Anomaly Detection', icon: ShieldAlert, Component: AnomalyReviewPage },
  { key: 'insights',  label: 'AI Insights',       icon: Lightbulb,   Component: AIAssistantPage   },
]

const TabFallback = () => (
  <div className="w-full space-y-4 pt-2">
    <SkeletonLoader count={6} />
  </div>
)

export default function AIAnalystPage() {
  const { tab }    = useParams()
  const navigate   = useNavigate()

  /* Track which tabs have ever been visited so we only mount them once */
  const validTab   = TABS.find(t => t.key === tab)
  const initialTab = validTab ? tab : 'forecast'
  const [mountedTabs, setMountedTabs] = useState(() => ({ [initialTab]: true }))

  /* All hooks must be called before any early return */
  const handleTabChange = useCallback((key) => {
    setMountedTabs(prev => prev[key] ? prev : { ...prev, [key]: true })
    navigate(`/ai-analyst/${key}`, { replace: true })
  }, [navigate])

  /* Redirect to default if tab param is invalid or missing */
  if (!validTab) return <Navigate to="/ai-analyst/forecast" replace />

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-glass-panel border border-glass w-fit">
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
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab panels ──────────────────────────────────────────────── */}
      {/*
        Render each panel as soon as its tab is first visited (mountedTabs[key]).
        Hide non-active panels with `hidden` instead of unmounting them — this
        preserves component state and prevents repeated useEffect auto-runs.
      */}
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
