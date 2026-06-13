/**
 * ThreeWayMatchPanel — Phase 3.2
 *
 * Displays the 3-way match result for a Bill (PO ↔ GRN ↔ Bill reconciliation).
 * Shows overall status badge, duplicate invoice warning, variance details, and
 * an "Run Match" button for re-checking at any time.
 *
 * Props:
 *   bill         — Bill document (with matchResult, threeWayMatchStatus, purchaseOrderId)
 *   onRunMatch   — () => void  — called when the user clicks "Run Match"
 *   isRunning    — boolean     — true while match mutation is in-flight
 */
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, Info } from 'lucide-react'
import Button from '@/components/ui/Button'

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  matched:        { color: 'text-positive',  bg: 'bg-positive/10 border-positive/30', icon: CheckCircle2, label: 'Matched' },
  partial_match:  { color: 'text-cyan',      bg: 'bg-cyan/10 border-cyan/30',         icon: Info,         label: 'Partial Match' },
  over_billed:    { color: 'text-amber',    bg: 'bg-amber/10 border-amber/30',     icon: AlertTriangle,label: 'Over-Billed' },
  under_received: { color: 'text-amber',    bg: 'bg-amber/10 border-amber/30',     icon: AlertTriangle,label: 'Under-Received' },
  mismatch:       { color: 'text-amber',   bg: 'bg-amber/10 border-amber/30',   icon: AlertTriangle,label: 'Mismatch' },
  discrepancy:    { color: 'text-amber',   bg: 'bg-amber/10 border-amber/30',   icon: AlertTriangle,label: 'Discrepancy' },
  blocked:        { color: 'text-negative',      bg: 'bg-negative/10 border-negative/30',         icon: XCircle,      label: 'Blocked' },
  pending:        { color: 'text-text-muted',   bg: 'bg-glass-panel border-glass',             icon: RefreshCw,    label: 'Pending' },
  none:           { color: 'text-text-muted',   bg: 'bg-glass-panel border-glass',             icon: Info,         label: 'Not Applicable' },
}

const fmt = (n) => (typeof n === 'number' ? n.toFixed(2) : '—')
const pct = (n) => (typeof n === 'number' ? `${n.toFixed(1)}%` : '—')

// ── Sub-components ────────────────────────────────────────────────────────────

function VarianceRow({ label, value, level }) {
  const color = level === 'block' ? 'text-negative'
              : level === 'warn'  ? 'text-amber'
              : 'text-text-secondary'
  return (
    <div className="flex items-center justify-between py-1 text-xs border-b border-glass last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ThreeWayMatchPanel({ bill, onRunMatch, isRunning = false }) {
  if (!bill) return null

  const status     = bill.threeWayMatchStatus || 'none'
  const matchResult = bill.matchResult
  const hasPO      = !!bill.purchaseOrderId

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.none
  const Icon = cfg.icon

  return (
    <div className="premium-card p-4 space-y-3">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">3-Way Match</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRunMatch}
          loading={isRunning}
          disabled={!hasPO || isRunning}
          title={hasPO ? 'Re-run 3-way match' : 'Link a Purchase Order to run match'}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRunning ? 'animate-spin' : ''}`} />
          Run Match
        </Button>
      </div>

      {/* ── Status badge ── */}
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${cfg.bg}`}>
        <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        {matchResult?.summary && (
          <span className="text-xs text-text-muted ml-1 truncate">{matchResult.summary}</span>
        )}
      </div>

      {!hasPO && (
        <p className="text-xs text-text-muted">
          Link a Purchase Order to this bill to enable 3-way matching.
        </p>
      )}

      {/* ── Duplicate warning ── */}
      {matchResult?.duplicateCheck?.isDuplicate && (
        <div className="rounded-lg bg-negative/10 border border-negative/30 px-3 py-2 text-xs text-negative">
          <span className="font-semibold">Potential duplicate</span> — conflicts with bill{' '}
          <span className="font-mono font-semibold">
            {matchResult.duplicateCheck.conflictingBillNumber || 'unknown'}
          </span>.
          Review before approving payment.
        </div>
      )}

      {/* ── GRN match detail ── */}
      {matchResult?.grnMatch && (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-text-secondary mb-1">Amount vs GRN</p>
          <VarianceRow
            label="Bill total"
            value={fmt(matchResult.grnMatch.totalBilled)}
            level="ok"
          />
          <VarianceRow
            label="GRN received value"
            value={fmt(matchResult.grnMatch.totalReceived)}
            level="ok"
          />
          <VarianceRow
            label="Variance"
            value={`${fmt(matchResult.grnMatch.variance)} (${pct(matchResult.grnMatch.variancePct)})`}
            level={matchResult.grnMatch.level || 'ok'}
          />
        </div>
      )}

      {/* ── PO line variances ── */}
      {matchResult?.poMatch?.lineVariances?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-secondary mb-1">Line-item Variances</p>
          <div className="space-y-1">
            {matchResult.poMatch.lineVariances.map((lv, i) => (
              <div key={i} className={`rounded-md px-2 py-1.5 text-xs border ${
                lv.lineLevel === 'block' ? 'bg-negative/5 border-negative/20 text-negative'
                : lv.lineLevel === 'warn' ? 'bg-amber/5 border-amber/20 text-amber'
                : 'bg-glass-panel border-glass text-text-secondary'
              }`}>
                <span className="font-medium">{lv.billLineName || lv.poLineName || 'Line'}</span>
                {lv.matched === false && (
                  <span className="ml-2 text-negative">No matching PO line</span>
                )}
                {lv.matched && lv.lineLevel !== 'ok' && (
                  <span className="ml-2 opacity-80">{lv.detail}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ran at ── */}
      {matchResult?.ranAt && (
        <p className="text-[10px] text-text-muted text-right">
          Last checked {new Date(matchResult.ranAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
