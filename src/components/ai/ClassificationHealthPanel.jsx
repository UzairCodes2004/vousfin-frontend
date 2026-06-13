/**
 * ClassificationHealthPanel — Step 2.7 (VF-IMPL-FR01-001)
 *
 * Shows this week's auto-post rate, 7-day accuracy, correction rate,
 * and model version.  Maps directly to FR-01.2 acceptance criteria.
 */
import { useQuery } from '@tanstack/react-query'
import classifierApi from '@/services/ai/classifierService'

function StatCard({ label, value, sub, color = 'text-text-primary' }) {
  return (
    <div className="bg-navy-2 rounded-xl border border-glass p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

function IntegrityBanner() {
  const { data } = useQuery({
    queryKey:  ['ledger-integrity'],
    queryFn:   () => classifierApi.integrity().then(r => r.data),
    staleTime: 120_000,
  })
  if (!data) return null
  const healthy = data.healthy
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs px-3 py-2 rounded-lg ${
      healthy ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
      <span className="font-semibold">{healthy ? '✓ Ledger integrity OK' : '⚠ Ledger integrity issue'}</span>
      <span>{data.entries} entries</span>
      <span>Σ debits {Number(data.total_debits).toLocaleString()}</span>
      <span>Σ credits {Number(data.total_credits).toLocaleString()}</span>
      <span>diff {data.difference}</span>
      {data.orphaned_entries > 0 && <span>· {data.orphaned_entries} orphaned</span>}
    </div>
  )
}

export default function ClassificationHealthPanel() {
  const { data, isLoading } = useQuery({
    queryKey:  ['classifier-health'],
    queryFn:   () => classifierApi.getAccuracy().then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-glass-panel rounded-xl h-24 animate-pulse" />
      ))}
    </div>
  )

  if (!data) return null

  const accuracy      = data.accuracy_7d    ?? 0
  const corrRate      = data.correction_rate ?? 0
  const autoPosted    = data.auto_posted     ?? 0
  const totalProc     = data.total_processed ?? 0
  const autoPostRate  = totalProc > 0 ? (autoPosted / totalProc) : 0
  const modelVersion  = data.model_run_id ? data.model_run_id.slice(0, 8) : 'none'

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-secondary">AI Classification Health (Last 7 Days)</h3>

      <IntegrityBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Auto-Post Rate"
          value={`${Math.round(autoPostRate * 100)}%`}
          sub={`${autoPosted} of ${totalProc} transactions`}
          color={autoPostRate >= 0.70 ? 'text-positive' : 'text-amber'}
        />
        <StatCard
          label="7-Day Accuracy"
          value={`${Math.round(accuracy * 100)}%`}
          sub={accuracy >= 0.94 ? '✓ Meets FR-01.2 target' : 'Below 94% target'}
          color={accuracy >= 0.94 ? 'text-positive' : 'text-negative'}
        />
        <StatCard
          label="Correction Rate"
          value={`${Math.round(corrRate * 100)}%`}
          sub="Lower is better"
          color={corrRate <= 0.06 ? 'text-positive' : 'text-amber'}
        />
        <StatCard
          label="Model Version"
          value={modelVersion}
          sub="MLflow run ID prefix"
          color="text-text-secondary"
        />
      </div>

      {/* FR-01.2 acceptance criterion indicator */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
        accuracy >= 0.94 ? 'bg-positive/10 text-positive' : 'bg-amber/10 text-amber'
      }`}>
        <span>{accuracy >= 0.94 ? '✓' : '⚠'}</span>
        <span>
          FR-01.2 AC: Auto-post accuracy ≥ 94% after 90 days —{' '}
          <strong>{accuracy >= 0.94 ? 'PASSING' : `${Math.round(accuracy * 100)}% (target 94%)`}</strong>
        </span>
      </div>
    </div>
  )
}
