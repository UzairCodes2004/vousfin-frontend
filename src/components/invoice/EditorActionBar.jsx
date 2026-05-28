/**
 * EditorActionBar — Phase 2.2 — Always-visible top action bar for
 * Invoice/Bill editors. Replaces the buried right-sidebar buttons with
 * something the user sees immediately on page load.
 *
 * Shows:
 *   - Document name + number + state badge
 *   - State-appropriate action buttons inline
 *   - "Submit / Save Draft" for draft state
 *   - "Approve / Cancel / Send / Schedule / PDF" for non-draft states
 */
import {
  Save, Send, FileDown, CheckCircle2, XCircle, CalendarCheck, MoreVertical,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import InvoiceStatusBadge from './InvoiceStatusBadge'

/**
 * @param {Object} props
 * @param {'invoice'|'bill'} props.kind
 * @param {Object} props.doc — invoice or bill object
 * @param {boolean} props.isReadOnly
 * @param {boolean} props.canSave — true when form is valid for draft save
 * @param {boolean} props.canSubmit — true when form valid for submit
 * @param {boolean} props.saving
 * @param {Function} props.onSaveDraft
 * @param {Function} props.onSubmit
 * @param {Function} props.onApprove
 * @param {Function} props.onSend           — invoice only
 * @param {Function} props.onSchedule       — bill only
 * @param {Function} props.onCancel
 * @param {Function} props.onDownloadPdf    — invoice only
 */
export default function EditorActionBar({
  kind = 'invoice',
  doc,
  isReadOnly,
  canSave,
  canSubmit,
  saving,
  onSaveDraft,
  onSubmit,
  onApprove,
  onSend,
  onSchedule,
  onCancel,
  onDownloadPdf,
}) {
  const isBill = kind === 'bill'
  const docNumber = doc?.[isBill ? 'billNumber' : 'invoiceNumber']
  const state = doc?.state || (doc ? 'draft' : null)
  const id = doc?._id

  const isPendingApproval = state === 'pending_approval' || state === 'awaiting_approval'
  const isApproved = state === 'approved'
  const isCancellable = ['pending_approval', 'awaiting_approval', 'approved', 'sent', 'scheduled'].includes(state)

  return (
    <div className="rounded-xl border border-glass bg-glass-panel/60 backdrop-blur p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ── Left: Title + state ───────────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                {isBill ? 'Bill' : 'Invoice'}
              </span>
              {docNumber && (
                <span className="font-mono text-sm font-bold text-text-primary">{docNumber}</span>
              )}
              {state && <InvoiceStatusBadge state={state} kind={kind} />}
            </div>
            {isReadOnly && (
              <p className="text-[11px] text-text-muted mt-0.5">
                Read-only — use the buttons here to change status.
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Action buttons ──────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving || !canSave}
                className="btn-outline flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving || !canSubmit}
                className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                Submit for Approval
              </button>
            </>
          )}

          {isReadOnly && (
            <>
              {!isBill && id && onDownloadPdf && (
                <button
                  type="button"
                  onClick={() => onDownloadPdf(id)}
                  className="btn-outline flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </button>
              )}
              {isPendingApproval && onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(id)}
                  disabled={saving}
                  className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
              )}
              {isApproved && !isBill && onSend && (
                <button
                  type="button"
                  onClick={() => onSend(id)}
                  disabled={saving}
                  className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send to Customer
                </button>
              )}
              {isApproved && isBill && onSchedule && (
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    const payDate = window.prompt('Schedule payment for date (YYYY-MM-DD):', today)
                    if (payDate) onSchedule(id, payDate)
                  }}
                  disabled={saving}
                  className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Schedule Payment
                </button>
              )}
              {isCancellable && onCancel && (
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt(`Cancellation reason (optional):`)
                    if (reason !== null) onCancel(id, reason)
                  }}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
