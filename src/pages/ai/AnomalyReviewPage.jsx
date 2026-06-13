import { useEffect, useCallback, useState } from 'react'
import {
  ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2,
  Flag, Activity, Database,
} from 'lucide-react'
import toast from 'react-hot-toast'
import AnomalyAlerts from '@/components/ai/AnomalyAlerts'
import Button from '@/components/ui/Button'
import { useAIStore } from '@/stores/useAIStore'
import { getErrorMessage } from '@/utils/errorHandler'
import { cn } from '@/utils/cn'

// ─── Stats card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, colorClass }) {
  return (
    <div className="premium-card p-5 flex items-center gap-4">
      <div className={cn('p-3 rounded-xl', colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-text-primary">{value ?? '—'}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Filter tabs ───────────────────────────────────────────────────────────────
//   scan    – fresh scan result (in-memory, includes confidence + breakdown)
//   pending – stored alerts still awaiting review (includes 'rescanned')
//   legit   – previously marked legitimate (suppressed in future scans)
//   fraud   – confirmed fraud (kept tracked)
//   ignored – dismissed by user (suppressed)
//   history – everything for this business
const TABS = [
  { key: 'scan',     label: 'Latest Scan',  status: null              },
  { key: 'pending',  label: 'Pending',      status: 'pending'         },
  { key: 'legit',    label: 'Legit',        status: 'marked_legit'    },
  { key: 'fraud',    label: 'Fraud',        status: 'confirmed_fraud' },
  { key: 'ignored',  label: 'Ignored',      status: 'ignored'         },
  { key: 'history',  label: 'All',          status: null              },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnomalyReviewPage() {
  const {
    anomalies,
    anomalyStats,
    lastScanResult,
    fetchAnomalies,
    fetchStoredAlerts,
    fetchAnomalyStats,
    reviewAnomaly,
    loading,
  } = useAIStore()

  const [activeTab, setActiveTab] = useState('scan')

  // Load stats once on mount
  useEffect(() => { fetchAnomalyStats() }, [fetchAnomalyStats])

  // Run a fresh scan on mount
  useEffect(() => {
    runScan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runScan = useCallback(async (opts = {}) => {
    try {
      const result = await fetchAnomalies(opts)
      setActiveTab('scan')
      const msg = opts.force ? 'Force re-scan complete' : 'Ensemble scan complete'
      if (result?.suppressed > 0) {
        toast.success(`${msg} (${result.suppressed} previously cleared)`)
      } else {
        toast.success(msg)
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [fetchAnomalies])

  const handleTabChange = useCallback(async (tabKey) => {
    setActiveTab(tabKey)
    if (tabKey === 'scan') return
    const tab = TABS.find(t => t.key === tabKey)
    try {
      await fetchStoredAlerts(tab?.status || null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [fetchStoredAlerts])

  const handleClassify = useCallback(async (anomaly, action) => {
    const alertId = anomaly.alertId || anomaly.id
    if (!alertId) {
      // Scan result before persistence — just feedback to user
      if (action === 'fraud')      toast.error('Flagged as potential fraud')
      else if (action === 'ignore') toast.success('Anomaly ignored')
      else                          toast.success('Marked as legitimate')
      return
    }
    try {
      await reviewAnomaly(String(alertId), action)
      if      (action === 'fraud')  toast.error('Transaction flagged as potential fraud')
      else if (action === 'ignore') toast.success('Anomaly ignored — will be suppressed in future scans')
      else                          toast.success('Transaction marked as legitimate')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [reviewAnomaly])

  // Stats merge new + legacy field names from the backend
  const pending  = (anomalyStats?.pending ?? 0) + (anomalyStats?.pending_review ?? 0)
                  + (anomalyStats?.rescanned ?? 0)
  const confirmed = (anomalyStats?.confirmed_fraud ?? 0) + (anomalyStats?.confirmed_issue ?? 0)
  const legit     = (anomalyStats?.marked_legit ?? 0) + (anomalyStats?.valid ?? 0)
  const ignored   = anomalyStats?.ignored ?? 0
  const totalAlerts = anomalyStats
    ? pending + confirmed + legit + ignored
    : null

  const scanTotal = lastScanResult?.totalScanned ?? null
  const scanFound = lastScanResult?.anomaliesFound ?? null

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <ShieldAlert className="h-6 w-6 text-cyan" />
            Anomaly Detection
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Isolation Forest ML model analyses your last 90 days of transactions for fraud and irregularities.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => runScan()} loading={loading} icon={RefreshCw}>
            Run Scan
          </Button>
          <Button
            variant="outline"
            onClick={() => runScan({ force: true })}
            loading={loading}
            title="Re-score every transaction, including ones you previously cleared"
            className="text-xs"
          >
            Force re-scan
          </Button>
        </div>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Transactions Scanned"
          value={scanTotal}
          colorClass="bg-cyan/10 text-cyan"
        />
        <StatCard
          icon={AlertTriangle}
          label="Flagged in Last Scan"
          value={scanFound}
          colorClass="bg-amber/10 text-amber"
        />
        <StatCard
          icon={Activity}
          label="Pending Review"
          value={pending}
          colorClass="bg-amber/10 text-amber"
        />
        <StatCard
          icon={Flag}
          label="Confirmed Fraud"
          value={confirmed}
          colorClass="bg-negative/10 text-negative"
        />
      </div>

      {/* ── Active anomaly alert banner ───────────────────────────────────── */}
      {!loading && Array.isArray(anomalies) && anomalies.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-negative/30 bg-negative/10 text-negative">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <p className="font-bold text-sm">
            {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} detected — review and classify below
          </p>
        </div>
      )}

      {/* ── All-clear banner ─────────────────────────────────────────────── */}
      {!loading && Array.isArray(anomalies) && anomalies.length === 0 && activeTab === 'scan' && lastScanResult && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-positive/30 bg-positive/10 text-positive">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="font-bold text-sm">
            {lastScanResult.message || 'No anomalies detected. All transactions look normal.'}
          </p>
        </div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-glass-panel border border-glass w-fit">
        {TABS.map((tab) => {
          const tabCount =
            tab.key === 'pending'  ? pending   :
            tab.key === 'legit'    ? legit     :
            tab.key === 'fraud'    ? confirmed :
            tab.key === 'ignored'  ? ignored   :
            tab.key === 'history'  ? totalAlerts :
                                     null
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'bg-cyan text-navy font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {tab.label}
              {tabCount != null && tabCount > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  activeTab === tab.key
                    ? 'bg-navy/20 text-navy'
                    : tab.key === 'pending' ? 'bg-amber/20 text-amber'
                    : tab.key === 'fraud'   ? 'bg-negative/20 text-negative'
                    : tab.key === 'legit'   ? 'bg-positive/20 text-positive'
                    :                          'bg-glass-panel text-text-muted'
                )}>
                  {tabCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Anomaly list ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="premium-card p-12 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
            <p className="text-text-secondary text-sm">
              Running Isolation Forest analysis…
            </p>
          </div>
        </div>
      ) : (
        <AnomalyAlerts anomalies={anomalies} onClassify={handleClassify} />
      )}

    </div>
  )
}
