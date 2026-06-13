import { useEffect } from 'react'
import { BrainCircuit, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react'
import AIAssistantChat from '@/components/ai/AIAssistantChat'
import { useAIStore } from '@/stores/useAIStore'

function RecommendationItem({ item }) {
  const iconMap = {
    warning: <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />,
    positive: <TrendingUp className="h-4 w-4 text-positive flex-shrink-0 mt-0.5" />,
    info: <Lightbulb className="h-4 w-4 text-cyan flex-shrink-0 mt-0.5" />,
  }
  const icon = iconMap[item.type] || iconMap.info

  return (
    <div className="flex gap-3 p-3 rounded-xl hover:bg-glass-hover border border-transparent hover:border-glass transition-colors">
      {icon}
      <p className="text-sm text-text-secondary leading-relaxed">{item.text || item.message || item}</p>
    </div>
  )
}

export default function AIAssistantPage() {
  const { recommendations, fetchRecommendations } = useAIStore()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRecommendations().catch(() => {}) }, [])

  const recs = Array.isArray(recommendations) ? recommendations : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
          <BrainCircuit className="h-6 w-6 text-cyan" />
          AI Financial Assistant
        </h1>
        <p className="text-text-secondary mt-1">
          Gemini Flash AI with live access to your income statement, balance sheet, cash flow, and more.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat — takes 2/3 */}
        <div className="lg:col-span-2">
          <AIAssistantChat />
        </div>

        {/* Recommendations Panel — takes 1/3 */}
        <div className="space-y-4">
          <div className="premium-card p-5 border-cyan/20 bg-cyan/5">
            <h2 className="flex items-center gap-2 text-base font-bold text-text-primary mb-4 border-b border-glass pb-3">
              <Lightbulb className="h-4 w-4 text-cyan" />
              AI Recommendations
            </h2>

            {recs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-text-muted">
                  No recommendations yet. Start chatting or check back after recording transactions.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recs.map((item, idx) => (
                  <RecommendationItem key={idx} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Quick Tips</h3>
            <div className="space-y-2 text-xs text-text-muted">
              <p>• Ask about specific accounts, periods, or transactions</p>
              <p>• Request ratio analysis or profitability insights</p>
              <p>• Ask for AR/AP aging summaries</p>
              <p>• Request variance analysis between periods</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
