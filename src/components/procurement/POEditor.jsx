/**
 * POEditor — Phase 3.1 — Purchase Order editor component.
 *
 * Mirrors BillEditor / InvoiceEditor patterns with PO-specific fields:
 *   - quantityOrdered (not quantity)
 *   - expectedDeliveryDate
 *   - paymentTerms
 *   - Approval workflow with state machine guard
 *   - NextStepsCard showing current procurement lifecycle position
 */
import { useState, useMemo, useCallback } from 'react'
import {
  Plus, ChevronDown, ChevronUp, ShoppingBag, StickyNote,
  CheckCircle, XCircle, Send, Save, Truck,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// ── Helpers ───────────────────────────────────────────────────────────────────

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100

function emptyLine() {
  return {
    _tempId: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    itemType: 'custom',
    name: '',
    description: '',
    quantityOrdered: 1,
    unit: 'pcs',
    unitPrice: 0,
    discountType: null,
    discountValue: 0,
    taxRate: 0,
    sortOrder: 0,
  }
}

function computeLineTotal(li) {
  const gross = r2((li.quantityOrdered || 0) * (li.unitPrice || 0))
  let disc = 0
  if (li.discountType === 'percentage' && li.discountValue > 0) disc = r2(gross * li.discountValue / 100)
  else if (li.discountType === 'fixed'  && li.discountValue > 0) disc = r2(Math.min(li.discountValue, gross))
  const afterDiscount = gross - disc
  const tax = li.taxRate > 0 ? r2(afterDiscount * li.taxRate / 100) : 0
  return { gross, disc, tax, lineTotal: r2(afterDiscount + tax) }
}

function computeTotals(lines, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment) {
  let subtotal = 0, totalDisc = 0, totalTax = 0
  for (const li of lines) {
    const { gross, disc, tax } = computeLineTotal(li)
    subtotal += gross
    totalDisc += disc
    totalTax  += tax
  }
  subtotal   = r2(subtotal)
  totalDisc  = r2(totalDisc)
  totalTax   = r2(totalTax)
  const afterLineDisc = r2(subtotal - totalDisc)
  let invDisc = 0
  if (invoiceDiscountType === 'percentage' && invoiceDiscountValue > 0) {
    invDisc = r2(afterLineDisc * invoiceDiscountValue / 100)
  } else if (invoiceDiscountType === 'fixed' && invoiceDiscountValue > 0) {
    invDisc = r2(Math.min(invoiceDiscountValue, afterLineDisc))
  }
  const net = r2(afterLineDisc - invDisc)
  const totalAmount = r2(net + totalTax + (shippingCharges || 0) + (roundingAdjustment || 0))
  return { subtotal, totalDisc, totalTax, invDisc, net, totalAmount }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-glass/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-1 py-3 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-text-muted" />}
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

function POStateBadge({ state }) {
  const MAP = {
    draft:              { label: 'Draft',              color: 'text-text-muted border-text-muted/30' },
    pending_approval:   { label: 'Pending Approval',   color: 'text-amber  border-amber/30'  },
    approved:           { label: 'Approved',           color: 'text-cyan    border-cyan/30'    },
    partially_received: { label: 'Partially Received', color: 'text-accent-2 border-accent-2/30' },
    fully_received:     { label: 'Fully Received',     color: 'text-cyan       border-cyan/30'       },
    billed:             { label: 'Billed',             color: 'text-positive border-positive/30' },
    closed:             { label: 'Closed',             color: 'text-positive border-positive/30' },
    cancelled:          { label: 'Cancelled',          color: 'text-negative    border-negative/30'    },
  }
  const { label, color } = MAP[state] || { label: state, color: 'text-text-muted border-glass' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  )
}

/**
 * NextStepsCard — tells the user what to do next in plain English.
 * Mirrors the InvoiceEditor/BillEditor guidance card pattern.
 */
const PO_STEPS = [
  {
    key: 'draft',
    label: 'Draft',
    desc: 'Fill in vendor and line items, then click "Submit for Approval" to start the approval flow.',
  },
  {
    key: 'pending_approval',
    label: 'Pending Approval',
    desc: 'Awaiting manager approval. Approver can click "Approve" or "Reject" above.',
  },
  {
    key: 'approved',
    label: 'Approved',
    desc: 'PO is approved and sent to the vendor. When goods arrive, create a Goods Receipt (GRN).',
  },
  {
    key: 'partially_received',
    label: 'Partially Received',
    desc: 'Some goods have arrived. Create another GRN when remaining items are received.',
  },
  {
    key: 'fully_received',
    label: 'Fully Received',
    desc: 'All goods received. Create or link a Bill to complete the 3-way match.',
  },
  {
    key: 'billed',
    label: 'Billed',
    desc: 'Bill raised and linked. AP will schedule payment — click "Close" when done.',
  },
  {
    key: 'closed',
    label: 'Closed',
    desc: 'This purchase order is fully closed. No further action needed.',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    desc: 'This purchase order has been cancelled.',
  },
]

function NextStepsCard({ state }) {
  const current = PO_STEPS.find(s => s.key === state)
  const currentIndex = PO_STEPS.findIndex(s => s.key === state)
  const activeSteps = PO_STEPS.filter(s => !['cancelled'].includes(s.key))

  return (
    <div className="rounded-xl border border-glass bg-glass-panel p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">What's Next</p>
      {current && (
        <p className="text-sm text-text-secondary leading-relaxed">{current.desc}</p>
      )}

      {/* Progress strip — skip cancelled */}
      {state !== 'cancelled' && (
        <div className="flex items-center gap-0.5 overflow-x-auto py-1">
          {activeSteps.map((s, i) => {
            const done    = i < currentIndex
            const active  = s.key === state
            const pending = i > currentIndex
            return (
              <div key={s.key} className="flex items-center">
                <div className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === 0 ? 'w-3' : 'w-5',
                  done   ? 'bg-cyan'           :
                  active ? 'bg-cyan/80 w-7'    :
                           'bg-glass/50',
                )} />
                {i < activeSteps.length - 1 && (
                  <div className={cn(
                    'w-1 h-1 rounded-full mx-0.5',
                    done ? 'bg-cyan/40' : 'bg-glass/30'
                  )} />
                )}
              </div>
            )
          })}
        </div>
      )}
      {state === 'cancelled' && (
        <p className="text-xs text-negative">This PO is cancelled and cannot be re-opened.</p>
      )}
    </div>
  )
}

// ── Line item row ─────────────────────────────────────────────────────────────

function POLineRow({ item, readOnly, onChange, onRemove }) {
  const { lineTotal } = computeLineTotal(item)

  const update = (field, value) => onChange({ ...item, [field]: value })

  return (
    <tr className="border-b border-glass/20">
      <td className="px-3 py-2 text-left">
        {readOnly ? (
          <span className="text-sm text-text-primary">{item.name || '—'}</span>
        ) : (
          <input
            type="text"
            value={item.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Item name"
            className="w-full bg-transparent border border-glass/30 rounded px-2 py-1 text-sm text-text-primary focus:border-cyan outline-none"
          />
        )}
      </td>
      <td className="px-2 py-2 text-center w-20">
        {readOnly ? (
          <span className="text-sm">{item.quantityOrdered}</span>
        ) : (
          <input
            type="number"
            min="0"
            step="any"
            value={item.quantityOrdered}
            onChange={e => update('quantityOrdered', parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent border border-glass/30 rounded px-2 py-1 text-sm text-center focus:border-cyan outline-none"
          />
        )}
      </td>
      <td className="px-2 py-2 text-center w-20">
        {readOnly ? (
          <span className="text-sm">{item.quantityReceived || 0}</span>
        ) : (
          <span className="text-sm text-text-muted">{item.quantityReceived || 0}</span>
        )}
      </td>
      <td className="px-2 py-2 w-28">
        {readOnly ? (
          <span className="text-sm font-mono">{item.unitPrice}</span>
        ) : (
          <input
            type="number"
            min="0"
            step="any"
            value={item.unitPrice}
            onChange={e => update('unitPrice', parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent border border-glass/30 rounded px-2 py-1 text-sm font-mono text-right focus:border-cyan outline-none"
          />
        )}
      </td>
      <td className="px-2 py-2 w-20">
        {readOnly ? (
          <span className="text-sm">{item.taxRate}%</span>
        ) : (
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={item.taxRate}
            onChange={e => update('taxRate', parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent border border-glass/30 rounded px-2 py-1 text-sm text-center focus:border-cyan outline-none"
          />
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono font-semibold text-sm text-text-primary w-28">
        {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      {!readOnly && (
        <td className="px-2 py-2 text-center w-10">
          <button
            type="button"
            onClick={onRemove}
            className="text-text-muted hover:text-negative transition-colors text-xs"
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function POEditor({
  po,
  vendors = [],
  defaultVendorId,
  saving,
  onSaveDraft,
  onSubmit,
  onApprove,
  onReject,
  onCancel,
  onClose,
  onAddVendor,
}) {
  const state = po?.state || 'draft'
  const isReadOnly = !['draft'].includes(state)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [vendorId, setVendorId] = useState(
    defaultVendorId || po?.vendorId?._id || po?.vendorId || ''
  )
  const [issueDate, setIssueDate] = useState(
    po?.issueDate ? new Date(po.issueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    po?.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().slice(0, 10) : ''
  )
  const [paymentTerms, setPaymentTerms] = useState(po?.paymentTerms || '')
  const [notes, setNotes] = useState(po?.notes || '')
  const [invoiceDiscountType,  setInvoiceDiscountType]  = useState(po?.invoiceDiscountType  || null)
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(po?.invoiceDiscountValue || 0)
  const [shippingCharges,      setShippingCharges]      = useState(po?.shippingCharges      || 0)
  const [roundingAdjustment,   setRoundingAdjustment]   = useState(po?.roundingAdjustment   || 0)

  const [lineItems, setLineItems] = useState(() => {
    if (po?.lineItems?.length) {
      return po.lineItems.map(li => ({ ...li, _tempId: li._id || `li-${Math.random().toString(36).slice(2)}` }))
    }
    return [emptyLine()]
  })

  // ── Totals (computed client-side, mirrored by backend pre-save) ─────────────
  const totals = useMemo(
    () => computeTotals(lineItems, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment),
    [lineItems, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment]
  )

  // ── Helpers ────────────────────────────────────────────────────────────────
  const currencyCode = po?.currencyCode || 'PKR'
  const fmt = (n) => `${currencyCode} ${r2(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const buildPayload = useCallback(() => ({
    vendorId:             vendorId || null,
    issueDate,
    expectedDeliveryDate: expectedDeliveryDate || null,
    paymentTerms:         paymentTerms || null,
    notes:                notes || null,
    invoiceDiscountType:  invoiceDiscountType  || null,
    invoiceDiscountValue: Number(invoiceDiscountValue),
    shippingCharges:      Number(shippingCharges),
    roundingAdjustment:   Number(roundingAdjustment),
    lineItems: lineItems.map(({ _tempId, ...li }, i) => ({
      ...li,
      sortOrder: i,
      quantityOrdered: Number(li.quantityOrdered) || 0,
      unitPrice:       Number(li.unitPrice) || 0,
      taxRate:         Number(li.taxRate) || 0,
    })),
  }), [vendorId, issueDate, expectedDeliveryDate, paymentTerms, notes,
       invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment, lineItems])

  const handleAddLine = () => setLineItems(prev => [...prev, emptyLine()])
  const handleRemoveLine = (tempId) => setLineItems(prev => prev.filter(l => l._tempId !== tempId))
  const handleUpdateLine = (tempId, updated) => setLineItems(prev => prev.map(l => l._tempId === tempId ? updated : l))

  // ── Render ─────────────────────────────────────────────────────────────────
  const canSaveDraft  = state === 'draft'
  const canSubmit     = state === 'draft'
  const canApprove    = state === 'pending_approval'
  const canReject     = state === 'pending_approval'
  const canCancel     = !['closed', 'cancelled', 'fully_received', 'billed'].includes(state)
  const canClose      = ['fully_received', 'billed'].includes(state)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
      {/* ── Left column — main editor ───────────────────────────────────────── */}
      <div className="space-y-4">
        <Card>
          {/* Card header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-cyan" />
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  {po ? `Purchase Order — ${po.poNumber}` : 'New Purchase Order'}
                </h2>
                {po && (
                  <div className="mt-1">
                    <POStateBadge state={state} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action bar (visible for all actionable states) */}
          {(canSaveDraft || canSubmit || canApprove || canReject || canCancel || canClose) && (
            <div className="flex flex-wrap gap-2 mb-5 pb-4 border-b border-glass/30">
              {canSaveDraft && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Save}
                  disabled={saving}
                  onClick={() => onSaveDraft(buildPayload())}
                >
                  Save Draft
                </Button>
              )}
              {canSubmit && (
                <Button
                  size="sm"
                  icon={Send}
                  disabled={saving}
                  onClick={() => onSubmit(buildPayload())}
                >
                  Submit for Approval
                </Button>
              )}
              {canApprove && (
                <Button
                  size="sm"
                  icon={CheckCircle}
                  disabled={saving}
                  className="bg-positive/20 text-positive hover:bg-positive/30 border-positive/30"
                  onClick={() => onApprove(po._id)}
                >
                  Approve
                </Button>
              )}
              {canReject && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    const note = window.prompt('Reason for rejection:')
                    if (note !== null) onReject(po._id, note)
                  }}
                >
                  Reject
                </Button>
              )}
              {canClose && (
                <Button
                  size="sm"
                  icon={CheckCircle}
                  disabled={saving}
                  className="bg-cyan/20 text-cyan hover:bg-cyan/30 border-cyan/30"
                  onClick={() => onClose(po._id)}
                >
                  Close PO
                </Button>
              )}
              {canCancel && po && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={XCircle}
                  disabled={saving}
                  className="text-negative hover:text-negative"
                  onClick={() => {
                    const reason = window.prompt('Reason for cancellation (optional):')
                    if (reason !== null) onCancel(po._id, reason)
                  }}
                >
                  Cancel PO
                </Button>
              )}
            </div>
          )}

          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Vendor */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
                Vendor
              </label>
              {isReadOnly ? (
                <p className="text-sm text-text-primary">
                  {po?.vendorSnapshot?.vendorName || po?.vendorId?.vendorName || '—'}
                </p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={vendorId}
                    onChange={e => setVendorId(e.target.value)}
                    className="flex-1 rounded-lg border border-glass bg-glass-panel px-3 py-2 text-sm text-text-primary focus:border-cyan focus:ring-1 focus:ring-cyan outline-none"
                  >
                    <option value="">Select vendor…</option>
                    {vendors.map(v => (
                      <option key={v._id} value={v._id}>{v.vendorName}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onAddVendor}
                    className="px-2.5 rounded-lg border border-glass text-text-muted hover:text-cyan hover:border-cyan transition-colors text-xs"
                    title="Add new vendor"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
                Issue Date
              </label>
              {isReadOnly ? (
                <p className="text-sm text-text-primary">{issueDate}</p>
              ) : (
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              )}
            </div>

            {/* Expected Delivery */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
                Expected Delivery
              </label>
              {isReadOnly ? (
                <p className="text-sm text-text-primary">{expectedDeliveryDate || '—'}</p>
              ) : (
                <Input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} />
              )}
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
                Payment Terms
              </label>
              {isReadOnly ? (
                <p className="text-sm text-text-primary">{paymentTerms || '—'}</p>
              ) : (
                <Input
                  placeholder="e.g. Net 30, COD…"
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              Line Items
            </p>
            <div className="overflow-x-auto rounded-lg border border-glass/30">
              <table className="w-full text-sm">
                <thead className="bg-glass/20 text-xs text-text-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-2 py-2 text-center w-20">Ordered</th>
                    <th className="px-2 py-2 text-center w-20">Received</th>
                    <th className="px-2 py-2 text-right w-28">Unit Price</th>
                    <th className="px-2 py-2 text-center w-20">Tax %</th>
                    <th className="px-3 py-2 text-right w-28">Total</th>
                    {!isReadOnly && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(li => (
                    <POLineRow
                      key={li._tempId}
                      item={li}
                      readOnly={isReadOnly}
                      onChange={(updated) => handleUpdateLine(li._tempId, updated)}
                      onRemove={() => handleRemoveLine(li._tempId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddLine}
                className="mt-2 flex items-center gap-1.5 text-xs text-cyan hover:text-cyan/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add line
              </button>
            )}
          </div>

          {/* Totals summary */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono">{fmt(totals.subtotal)}</span>
              </div>
              {totals.totalDisc > 0 && (
                <div className="flex justify-between text-amber">
                  <span>Discounts</span>
                  <span className="font-mono">−{fmt(totals.totalDisc)}</span>
                </div>
              )}
              {totals.totalTax > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Tax</span>
                  <span className="font-mono">{fmt(totals.totalTax)}</span>
                </div>
              )}
              {(shippingCharges > 0) && (
                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  <span className="font-mono">{fmt(Number(shippingCharges))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-text-primary border-t border-glass/40 pt-1">
                <span>Total</span>
                <span className="font-mono text-cyan">{fmt(totals.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Optional sections */}
          <div className="mt-2 space-y-0">
            <CollapsibleSection title="Discount & Shipping" icon={Truck} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Invoice Discount Type</label>
                  {isReadOnly ? (
                    <span className="text-sm text-text-primary">{invoiceDiscountType || 'None'}</span>
                  ) : (
                    <select
                      value={invoiceDiscountType || ''}
                      onChange={e => setInvoiceDiscountType(e.target.value || null)}
                      className="w-full rounded border border-glass bg-glass-panel px-2 py-1.5 text-sm text-text-primary"
                    >
                      <option value="">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Discount Value</label>
                  <Input
                    type="number" min="0" step="any"
                    value={invoiceDiscountValue}
                    onChange={e => setInvoiceDiscountValue(e.target.value)}
                    disabled={isReadOnly || !invoiceDiscountType}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Shipping Charges</label>
                  <Input
                    type="number" min="0" step="any"
                    value={shippingCharges}
                    onChange={e => setShippingCharges(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Rounding Adjustment</label>
                  <Input
                    type="number" step="any"
                    value={roundingAdjustment}
                    onChange={e => setRoundingAdjustment(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Notes" icon={StickyNote} defaultOpen={!!notes}>
              {isReadOnly ? (
                <p className="text-sm text-text-secondary">{notes || '—'}</p>
              ) : (
                <textarea
                  rows={3}
                  placeholder="Internal notes for this PO…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-glass bg-glass-panel px-3 py-2 text-sm text-text-primary resize-none focus:border-cyan outline-none"
                />
              )}
            </CollapsibleSection>
          </div>
        </Card>

        {/* GRN summary strip (only for received/billed POs) */}
        {po?.linkedGrnIds?.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
              Linked Goods Receipts
            </p>
            <div className="space-y-1">
              {po.linkedGrnIds.map((grn) => (
                <div key={grn._id || grn} className="flex justify-between text-sm text-text-secondary">
                  <span className="font-mono text-xs text-cyan">{grn.grnNumber || String(grn).slice(-6)}</span>
                  <span>{grn.state || '—'}</span>
                  {grn.totalReceivedValue != null && (
                    <span className="font-mono">{fmt(grn.totalReceivedValue)}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Right column — guidance + metadata ──────────────────────────────── */}
      <div className="space-y-4">
        {/* Lifecycle guidance */}
        <NextStepsCard state={state} />

        {/* Metadata panel */}
        {po && (
          <div className="rounded-xl border border-glass bg-glass-panel p-4 space-y-2 text-xs text-text-muted">
            <p className="font-semibold uppercase tracking-wider mb-2">Details</p>
            <div className="flex justify-between">
              <span>PO Number</span>
              <span className="font-mono text-text-secondary">{po.poNumber}</span>
            </div>
            {po.approvalStatus && po.approvalStatus !== 'not_required' && (
              <div className="flex justify-between">
                <span>Approval</span>
                <span className="capitalize text-text-secondary">{po.approvalStatus.replace('_', ' ')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Line Items</span>
              <span className="text-text-secondary">{po.lineItems?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>GRNs</span>
              <span className="text-text-secondary">{po.linkedGrnIds?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Bills</span>
              <span className="text-text-secondary">{po.linkedBillIds?.length || 0}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
