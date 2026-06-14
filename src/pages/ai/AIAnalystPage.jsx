/**
 * AIAnalystPage — renders the AI sub-page for the active /ai-analyst/:tab.
 *
 * The in-page tab bar was removed: navigation between Forecast, Anomalies,
 * Scenarios and AI Insights now lives in the Intelligence section (the rail
 * hub), so showing the same buttons here was redundant.
 *
 * URL structure:
 *   /ai-analyst              → redirect to /ai-analyst/forecast
 *   /ai-analyst/forecast     → LSTM Forecast
 *   /ai-analyst/anomalies    → Anomaly Detection
 *   /ai-analyst/scenarios    → Scenario planner
 *   /ai-analyst/insights     → AI Assistant / Insights
 */
import { lazy, Suspense } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

const AIForecastPage    = lazy(() => import('./AIForecastPage'))
const AnomalyReviewPage = lazy(() => import('./AnomalyReviewPage'))
const AIAssistantPage   = lazy(() => import('./AIAssistantPage'))
const ScenariosPage     = lazy(() => import('./ScenariosPage'))

const VIEWS = {
  forecast:  AIForecastPage,
  anomalies: AnomalyReviewPage,
  scenarios: ScenariosPage,
  insights:  AIAssistantPage,
}

export default function AIAnalystPage() {
  const { tab } = useParams()
  const Component = VIEWS[tab]

  if (!Component) return <Navigate to="/ai-analyst/forecast" replace />

  return (
    <div className="animate-fade-in">
      <Suspense fallback={<div className="w-full space-y-4 pt-2"><SkeletonLoader count={6} /></div>}>
        <Component />
      </Suspense>
    </div>
  )
}
