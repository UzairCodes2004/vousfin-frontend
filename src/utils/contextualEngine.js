/**
 * contextualEngine.js — ERP Integration Refactor, Step 8 (Smart Contextual UI).
 *
 * A small, pure decision engine that turns a Bill / Invoice document into
 * context-aware UI intelligence — the same way SAP/NetSuite surface a
 * "what should I do next + what should I worry about" panel beside a record.
 *
 * It reads ONLY the entity (no network), and returns three buckets:
 *   • recommended — the single best next step for the current state (+ why)
 *   • alerts      — contextual warnings/info (overdue, 3-way mismatch, duplicate,
 *                   partial payment, stock/COGS impact, unposted ledger…)
 *   • links       — cross-module navigation made possible by Steps 3–7
 *                   (PO, GRNs, vendor/customer profile)
 *
 * Pure + framework-agnostic so it is trivially testable and reusable. The UI
 * component (SmartContextPanel) maps recommended.actionId → the editor's existing
 * mutation handler, so this engine never duplicates the action wiring. (Rule 8/9)
 */

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** Whole days until `date` (negative = that many days overdue). null if no date. */
export function daysUntil(date) {
  if (!date) return null
  const ms = new Date(date).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

const num = (v) => Number(v) || 0
const idOf = (ref) => (ref && typeof ref === 'object' ? (ref._id || ref.id) : ref) || null

/* Lifecycle buckets shared by bills & invoices. */
const BILL_RECOGNIZED    = new Set(['approved', 'scheduled', 'partially_paid', 'overdue'])
const INVOICE_RECOGNIZED = new Set(['approved', 'sent', 'partially_paid', 'overdue'])

/* ── Bill (Accounts Payable) ──────────────────────────────────────────────── */

export function deriveBillContext(bill) {
  const ctx = { recommended: null, alerts: [], links: [] }
  if (!bill) return ctx

  const state       = bill.state || 'draft'
  const total       = num(bill.totalAmount)
  const outstanding = bill.remainingBalance != null ? num(bill.remainingBalance) : total
  const dDue        = daysUntil(bill.dueDate)

  // ── Recommended next step ──────────────────────────────────────────────
  if (state === 'draft') {
    ctx.recommended = { actionId: 'submit', label: 'Submit for approval',
      reason: 'Move this draft into the approval workflow.' }
  } else if (state === 'awaiting_approval') {
    ctx.recommended = { actionId: 'approve', label: 'Approve bill',
      reason: 'Approval posts the AP liability journal and increases the vendor’s payable.' }
  } else if (BILL_RECOGNIZED.has(state) && outstanding > 0) {
    ctx.recommended = { actionId: 'pay', label: 'Record payment',
      reason: 'The liability is recognized — settle it to clear the vendor balance.' }
  }

  // ── Alerts ─────────────────────────────────────────────────────────────
  if (state !== 'paid' && state !== 'cancelled' && dDue != null) {
    if (dDue < 0)        ctx.alerts.push({ level: 'danger',  message: `Overdue by ${Math.abs(dDue)} day${Math.abs(dDue) === 1 ? '' : 's'}.` })
    else if (dDue <= 7)  ctx.alerts.push({ level: 'warning', message: `Due in ${dDue} day${dDue === 1 ? '' : 's'}.` })
  }
  const mr = bill.matchResult || {}
  if (mr.duplicateCheck?.isDuplicate) {
    ctx.alerts.push({ level: 'danger', message: `Possible duplicate of ${mr.duplicateCheck.conflictingBillNumber || 'another bill'} — verify before approving.` })
  }
  const m = bill.threeWayMatchStatus
  if (m && !['none', 'pending', 'matched'].includes(m)) {
    ctx.alerts.push({ level: 'warning', message: `3-way match: ${m.replace(/_/g, ' ')}${mr.summary ? ` — ${mr.summary}` : ''}.` })
  }
  if (BILL_RECOGNIZED.has(state) && !bill.apLiabilityJournalId && !bill.linkedJournalEntryId) {
    ctx.alerts.push({ level: 'info', message: 'Approved but no AP journal is linked yet — the liability may not be posted.' })
  }
  if (state === 'partially_paid' && total > 0) {
    ctx.alerts.push({ level: 'info', message: `Partially paid — ${outstanding} of ${total} still outstanding.` })
  }

  // ── Cross-module links ─────────────────────────────────────────────────
  const poId = idOf(bill.purchaseOrderId)
  if (poId) ctx.links.push({ label: 'View Purchase Order', to: `/procurement/purchase-orders/${poId}/edit` })
  if (Array.isArray(bill.linkedGrnIds) && bill.linkedGrnIds.length > 0) {
    ctx.links.push({ label: `Goods Receipts (${bill.linkedGrnIds.length})`, to: '/procurement/goods-receipts' })
  }
  const vId = idOf(bill.vendorId)
  if (vId) ctx.links.push({ label: 'Vendor profile & statement', to: `/vendors/${vId}` })

  return ctx
}

/* ── Invoice (Accounts Receivable) ────────────────────────────────────────── */

export function deriveInvoiceContext(invoice) {
  const ctx = { recommended: null, alerts: [], links: [] }
  if (!invoice) return ctx

  const state       = invoice.state || 'draft'
  const total       = num(invoice.totalAmount)
  const outstanding = invoice.remainingBalance != null ? num(invoice.remainingBalance) : total
  const dDue        = daysUntil(invoice.dueDate)
  const productLines = (invoice.lineItems || []).filter((li) => li.inventoryItemId && num(li.quantity) > 0)

  // ── Recommended next step ──────────────────────────────────────────────
  if (state === 'draft') {
    ctx.recommended = { actionId: 'submit', label: 'Submit for approval',
      reason: 'Move this draft into the approval workflow.' }
  } else if (state === 'pending_approval') {
    ctx.recommended = { actionId: 'approve', label: 'Approve invoice',
      reason: productLines.length
        ? `Approval posts the AR journal, recognizes revenue, and books COGS for ${productLines.length} product line${productLines.length === 1 ? '' : 's'}.`
        : 'Approval posts the AR journal and recognizes the receivable.' }
  } else if (state === 'approved') {
    ctx.recommended = { actionId: 'send', label: 'Send to customer',
      reason: 'Revenue is recognized — deliver the invoice to get paid.' }
  } else if (INVOICE_RECOGNIZED.has(state) && outstanding > 0) {
    ctx.recommended = { actionId: 'pay', label: 'Record payment',
      reason: 'Settle the receivable to clear the customer balance.' }
  }

  // ── Alerts ─────────────────────────────────────────────────────────────
  if (!['paid', 'cancelled', 'written_off'].includes(state) && dDue != null) {
    if (dDue < 0)       ctx.alerts.push({ level: 'danger',  message: `Overdue by ${Math.abs(dDue)} day${Math.abs(dDue) === 1 ? '' : 's'} — consider a reminder.` })
    else if (dDue <= 7) ctx.alerts.push({ level: 'warning', message: `Due in ${dDue} day${dDue === 1 ? '' : 's'}.` })
  }
  if (['draft', 'pending_approval'].includes(state) && productLines.length > 0) {
    ctx.alerts.push({ level: 'info', message: `Approving will reduce stock for ${productLines.length} inventory item${productLines.length === 1 ? '' : 's'} and post COGS.` })
  }
  if (state === 'partially_paid' && total > 0) {
    ctx.alerts.push({ level: 'info', message: `Partially paid — ${outstanding} of ${total} still outstanding.` })
  }
  if (state === 'disputed') {
    ctx.alerts.push({ level: 'warning', message: 'Disputed — resolve with the customer before chasing payment.' })
  }

  // ── Cross-module links ─────────────────────────────────────────────────
  const cId = idOf(invoice.customerId)
  if (cId) ctx.links.push({ label: 'Customer profile & statement', to: `/customers/${cId}` })

  return ctx
}

/** Dispatcher used by SmartContextPanel. */
export function deriveEntityContext(kind, entity) {
  return kind === 'bill' ? deriveBillContext(entity) : deriveInvoiceContext(entity)
}
