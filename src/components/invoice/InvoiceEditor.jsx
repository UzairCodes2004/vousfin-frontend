/**
 * InvoiceEditor — Phase 2 — Full-featured invoice creation/editing form.
 *
 * Features:
 *   - Line item rows with qty, unit price, discount, tax
 *   - Live dynamic totals panel (subtotal → discounts → tax → shipping → total)
 *   - Customer selector
 *   - Multi-currency picker with exchange rate
 *   - Invoice-level discount (% or fixed)
 *   - Shipping charges & rounding adjustment
 *   - Collapsible sections (bank details, notes, payment terms)
 *   - Responsive: table on desktop, cards on mobile
 *   - PDF download button
 *   - Save draft / Submit for approval actions
 */
import { useState, useMemo, useCallback } from 'react'
import {
  Plus, FileDown, Send, Save, ChevronDown, ChevronUp, Eye, Lock,
  Receipt, Building2, CreditCard, StickyNote, Truck,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LineItemRow, { computeLineValues } from './LineItemRow'
import TotalsPanel from './TotalsPanel'
import InvoiceStatusBadge from './InvoiceStatusBadge'

// ── Default empty line item ──────────────────────────────────────────────────
const emptyLine = () => ({
  _tempId: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  itemType: 'custom',
  name: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  discountType: null,
  discountValue: 0,
  taxRate: 0,
  taxInclusive: false,
  sortOrder: 0,
})

// ── Compute totals from line items (mirrors backend pre-save) ────────────────
function computeTotals(lineItems, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment) {
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100
  let subtotal = 0, totalLineDiscount = 0, totalTax = 0

  for (const li of lineItems) {
    const gross = r2(li.quantity * li.unitPrice)
    const { discountAmount, taxAmount } = computeLineValues(li)
    totalLineDiscount += discountAmount
    totalTax += taxAmount
    subtotal += gross
  }

  subtotal = r2(subtotal)
  totalLineDiscount = r2(totalLineDiscount)
  totalTax = r2(totalTax)

  const afterLineDiscounts = r2(subtotal - totalLineDiscount)
  let invoiceDiscountAmount = 0
  if (invoiceDiscountType === 'percentage' && invoiceDiscountValue > 0) {
    invoiceDiscountAmount = r2(afterLineDiscounts * invoiceDiscountValue / 100)
  } else if (invoiceDiscountType === 'fixed' && invoiceDiscountValue > 0) {
    invoiceDiscountAmount = r2(Math.min(invoiceDiscountValue, afterLineDiscounts))
  }

  const amount = r2(afterLineDiscounts - invoiceDiscountAmount)
  const totalAmount = r2(amount + totalTax + (shippingCharges || 0) + (roundingAdjustment || 0))

  return { subtotal, totalLineDiscount, invoiceDiscountAmount, totalTax, amount, totalAmount }
}

// ── Section toggle helper ────────────────────────────────────────────────────
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
      {open && <div className="pb-4 animate-collapse-down">{children}</div>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════

export default function InvoiceEditor({
  invoice = null,         // existing invoice to edit (null = new)
  onSaveDraft,            // (formData) => void
  onSubmit,               // (formData) => void
  onDownloadPdf,          // (invoiceId) => void
  onSend,                 // (id) => void  — for approved invoices
  onApprove,              // (id, note) => void — pending approvals
  onCancel,               // (id, reason) => void
  onAddCustomer,          // () => void — opens PartyFormModal
  saving = false,
  customers = [],         // [{_id, fullName, businessName, email}]
  className,
}) {
  const isEdit = !!invoice
  // Phase 2.1 — only drafts are editable; non-draft invoices render in view mode
  const isReadOnly = isEdit && invoice?.state !== 'draft'

  // ── Form state ─────────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || '')
  const [customerId, setCustomerId] = useState(invoice?.customerId || '')
  const [issueDate, setIssueDate] = useState(
    invoice?.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ''
  )
  const [currencyCode, setCurrencyCode] = useState(invoice?.currencyCode || 'PKR')
  const [exchangeRate, setExchangeRate] = useState(invoice?.exchangeRate || 1)
  const [description, setDescription] = useState(invoice?.description || '')
  const [notes, setNotes] = useState(invoice?.notes || '')
  const [paymentTermsText, setPaymentTermsText] = useState(invoice?.paymentTermsText || '')
  const [templateId, setTemplateId] = useState(invoice?.templateId || 'modern')

  // Invoice-level discount
  const [invoiceDiscountType, setInvoiceDiscountType] = useState(invoice?.invoiceDiscountType || null)
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(invoice?.invoiceDiscountValue || 0)
  const [shippingCharges, setShippingCharges] = useState(invoice?.shippingCharges || 0)
  const [roundingAdjustment, setRoundingAdjustment] = useState(invoice?.roundingAdjustment || 0)

  // Bank details
  const [bankDetails, setBankDetails] = useState(invoice?.bankDetails || {})

  // Line items
  const [lineItems, setLineItems] = useState(() => {
    if (invoice?.lineItems?.length) return invoice.lineItems.map(li => ({ ...li, _tempId: li._id || `li-${Math.random().toString(36).slice(2)}` }))
    return [emptyLine()]
  })

  // ── Computed totals (live preview) ─────────────────────────────────
  const totals = useMemo(
    () => computeTotals(lineItems, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment),
    [lineItems, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment]
  )

  // ── Line item handlers ─────────────────────────────────────────────
  const handleLineChange = useCallback((index, updated) => {
    setLineItems(prev => prev.map((li, i) => i === index ? { ...updated, _tempId: li._tempId } : li))
  }, [])

  const addLine = useCallback(() => {
    setLineItems(prev => [...prev, emptyLine()])
  }, [])

  const removeLine = useCallback((index) => {
    setLineItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
  }, [])

  // ── Build form data ────────────────────────────────────────────────
  const buildFormData = () => ({
    invoiceNumber,
    customerId: customerId || undefined,
    issueDate,
    dueDate: dueDate || undefined,
    currencyCode,
    exchangeRate: exchangeRate !== 1 ? exchangeRate : undefined,
    description: description || undefined,
    notes: notes || undefined,
    paymentTermsText: paymentTermsText || undefined,
    templateId,
    invoiceDiscountType,
    invoiceDiscountValue,
    shippingCharges,
    roundingAdjustment,
    bankDetails: Object.keys(bankDetails).length ? bankDetails : undefined,
    lineItems: lineItems
      .filter(li => li.name && li.quantity > 0) // strip empty rows
      .map(({ _tempId, ...rest }, i) => ({ ...rest, sortOrder: i })),
  })

  const handleSave = () => onSaveDraft?.(buildFormData())
  const handleSubmit = () => onSubmit?.(buildFormData())

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-4', className)}>
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>
            This invoice is <strong className="font-semibold">{invoice?.state?.replace('_', ' ')}</strong> and cannot be edited.
            Use the action buttons on the right to change its status, or download a PDF.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ═══ LEFT: Main form (spans 2 cols on desktop) ═══ */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-cyan" />
              <h2 className="text-lg font-bold text-text-primary">
                {isEdit ? 'Edit Invoice' : 'New Invoice'}
              </h2>
              {invoice?.state && <InvoiceStatusBadge state={invoice.state} />}
            </div>
            {isEdit && invoice?._id && onDownloadPdf && (
              <button
                type="button"
                onClick={() => onDownloadPdf(invoice._id)}
                className="btn-outline flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </button>
            )}
          </div>

          {/* Invoice meta fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Invoice #"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="INV-001"
              required
            />
            <Input
              label="Issue Date"
              type="date"
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Currency</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg border border-glass bg-glass-panel px-3 py-3 text-sm text-text-primary transition-premium focus:border-cyan focus:outline-none"
                  value={currencyCode}
                  onChange={e => setCurrencyCode(e.target.value)}
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AED">AED</option>
                  <option value="SAR">SAR</option>
                  <option value="INR">INR</option>
                </select>
                {currencyCode !== 'PKR' && (
                  <Input
                    type="number"
                    value={exchangeRate}
                    onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)}
                    placeholder="Rate"
                    containerClassName="w-24"
                    min="0"
                    step="any"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Customer selector */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">Customer</label>
              {onAddCustomer && !isReadOnly && (
                <button
                  type="button"
                  onClick={onAddCustomer}
                  className="text-xs text-cyan font-semibold hover:underline"
                >
                  + New Customer
                </button>
              )}
            </div>
            <select
              disabled={isReadOnly}
              className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-3 text-sm text-text-primary transition-premium focus:border-cyan focus:outline-none disabled:opacity-60"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            >
              <option value="">
                {customers.length === 0 ? 'No customers yet — click + New Customer above' : 'Select customer...'}
              </option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>
                  {c.businessName || c.fullName} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Line Items */}
        <Card noPadding>
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Line Items</h3>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 rounded-lg bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto px-3 pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="w-8" />
                  <th className="w-8 px-1 py-2 text-center">#</th>
                  <th className="min-w-[180px] px-1 py-2 text-left">Item</th>
                  <th className="w-20 px-1 py-2 text-right">Qty</th>
                  <th className="w-24 px-1 py-2 text-right">Price</th>
                  <th className="w-28 px-1 py-2 text-right">Discount</th>
                  <th className="w-20 px-1 py-2 text-right">Tax %</th>
                  <th className="w-24 px-1 py-2 text-right">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <LineItemRow
                    key={item._tempId || item._id || i}
                    item={item}
                    index={i}
                    onChange={handleLineChange}
                    onRemove={removeLine}
                    canRemove={lineItems.length > 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 px-4 pb-4">
            {lineItems.map((item, i) => {
              const { lineTotal } = computeLineValues(item)
              return (
                <div key={item._tempId || i} className="rounded-lg border border-glass p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">#{i + 1}</span>
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-text-muted hover:text-red-400 text-xs">
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    className="w-full rounded border border-glass bg-glass-panel px-2 py-1.5 text-sm text-text-primary"
                    value={item.name || ''}
                    onChange={e => handleLineChange(i, { ...item, name: e.target.value })}
                    placeholder="Item name"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-text-muted">Qty</label>
                      <input type="number" className="w-full rounded border border-glass bg-glass-panel px-2 py-1 text-sm text-right" value={item.quantity || ''} onChange={e => handleLineChange(i, { ...item, quantity: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted">Price</label>
                      <input type="number" className="w-full rounded border border-glass bg-glass-panel px-2 py-1 text-sm text-right" value={item.unitPrice || ''} onChange={e => handleLineChange(i, { ...item, unitPrice: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted">Tax %</label>
                      <input type="number" className="w-full rounded border border-glass bg-glass-panel px-2 py-1 text-sm text-right" value={item.taxRate || ''} onChange={e => handleLineChange(i, { ...item, taxRate: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold text-text-primary tabular-nums">
                    Total: {lineTotal.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Collapsible sections */}
        <Card>
          {/* Invoice Discount & Shipping */}
          <CollapsibleSection title="Discount, Shipping & Adjustments" icon={Truck} defaultOpen={
            !!(invoiceDiscountValue || shippingCharges || roundingAdjustment)
          }>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Invoice Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 rounded-lg border border-glass bg-glass-panel px-3 py-2.5 text-sm text-text-primary text-right"
                    value={invoiceDiscountValue || ''}
                    onChange={e => setInvoiceDiscountValue(parseFloat(e.target.value) || 0)}
                    min="0"
                    placeholder="0"
                  />
                  <select
                    className="rounded-lg border border-glass bg-glass-panel px-2 py-2 text-sm text-text-secondary"
                    value={invoiceDiscountType || ''}
                    onChange={e => setInvoiceDiscountType(e.target.value || null)}
                  >
                    <option value="">None</option>
                    <option value="percentage">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
              </div>
              <Input
                label="Shipping Charges"
                type="number"
                value={shippingCharges || ''}
                onChange={e => setShippingCharges(parseFloat(e.target.value) || 0)}
                min="0"
                placeholder="0"
              />
              <Input
                label="Rounding Adjustment"
                type="number"
                value={roundingAdjustment || ''}
                onChange={e => setRoundingAdjustment(parseFloat(e.target.value) || 0)}
                step="any"
                placeholder="0"
              />
            </div>
          </CollapsibleSection>

          {/* Bank Details */}
          <CollapsibleSection title="Bank / Payment Details" icon={CreditCard}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Bank Name" value={bankDetails.bankName || ''} onChange={e => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))} placeholder="e.g. HBL" />
              <Input label="Account Title" value={bankDetails.accountTitle || ''} onChange={e => setBankDetails(prev => ({ ...prev, accountTitle: e.target.value }))} />
              <Input label="Account Number" value={bankDetails.accountNumber || ''} onChange={e => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))} />
              <Input label="IBAN" value={bankDetails.iban || ''} onChange={e => setBankDetails(prev => ({ ...prev, iban: e.target.value }))} placeholder="PK..." />
              <Input label="SWIFT Code" value={bankDetails.swiftCode || ''} onChange={e => setBankDetails(prev => ({ ...prev, swiftCode: e.target.value }))} />
              <Input label="Branch Code" value={bankDetails.branchCode || ''} onChange={e => setBankDetails(prev => ({ ...prev, branchCode: e.target.value }))} />
            </div>
          </CollapsibleSection>

          {/* Notes & Terms */}
          <CollapsibleSection title="Notes & Payment Terms" icon={StickyNote} defaultOpen={!!(notes || paymentTermsText)}>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Payment Terms</label>
                <textarea
                  className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-premium focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                  rows={2}
                  value={paymentTermsText}
                  onChange={e => setPaymentTermsText(e.target.value)}
                  placeholder="e.g. Net 30 — payment due within 30 days of invoice date"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Internal Notes</label>
                <textarea
                  className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-premium focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes (not shown on invoice)"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
                <textarea
                  className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-premium focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Invoice description"
                />
              </div>
            </div>
          </CollapsibleSection>
        </Card>
      </div>

      {/* ═══ RIGHT: Totals & Actions sidebar ═══ */}
      <div className="lg:col-span-1">
        <div className="sticky-summary space-y-6">
          {/* Totals */}
          <Card>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Summary</h3>
            <TotalsPanel
              subtotal={totals.subtotal}
              totalLineDiscount={totals.totalLineDiscount}
              invoiceDiscountType={invoiceDiscountType}
              invoiceDiscountValue={invoiceDiscountValue}
              invoiceDiscountAmount={totals.invoiceDiscountAmount}
              totalTax={totals.totalTax}
              shippingCharges={shippingCharges}
              roundingAdjustment={roundingAdjustment}
              totalAmount={totals.totalAmount}
              paidAmount={invoice?.paidAmount || 0}
              totalCredited={invoice?.totalCredited || 0}
              currency={currencyCode}
            />
          </Card>

          {/* Template selector */}
          <Card>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">Template</h3>
            <div className="grid grid-cols-2 gap-2">
              {['modern', 'minimal', 'corporate', 'classic'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemplateId(t)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-all',
                    templateId === t
                      ? 'border-cyan bg-cyan/10 text-cyan'
                      : 'border-glass text-text-muted hover:border-cyan/30 hover:text-text-secondary'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Card>

          {/* Action buttons */}
          <Card>
            <div className="space-y-3">
              {isReadOnly ? (
                <>
                  {/* Read-only actions depend on the invoice state */}
                  {invoice?._id && onDownloadPdf && (
                    <button
                      type="button"
                      onClick={() => onDownloadPdf(invoice._id)}
                      className="btn-outline flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold"
                    >
                      <FileDown className="h-4 w-4" />
                      Download PDF
                    </button>
                  )}
                  {invoice?.state === 'pending_approval' && onApprove && (
                    <button
                      type="button"
                      onClick={() => onApprove(invoice._id)}
                      disabled={saving}
                      className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-40"
                    >
                      Approve
                    </button>
                  )}
                  {invoice?.state === 'approved' && onSend && (
                    <button
                      type="button"
                      onClick={() => onSend(invoice._id)}
                      disabled={saving}
                      className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                      Send to Customer
                    </button>
                  )}
                  {onCancel && ['approved', 'sent', 'pending_approval'].includes(invoice?.state) && (
                    <button
                      type="button"
                      onClick={() => {
                        const reason = window.prompt('Cancellation reason (optional):')
                        if (reason !== null) onCancel(invoice._id, reason)
                      }}
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      Cancel Invoice
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !invoiceNumber}
                    className="btn-outline flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : isEdit ? 'Update Draft' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving || !invoiceNumber || totals.totalAmount <= 0}
                    className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                    Submit for Approval
                  </button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
