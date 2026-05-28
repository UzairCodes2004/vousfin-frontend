/**
 * BillEditor — Phase 2 — Bill (AP) editor mirroring InvoiceEditor.
 *
 * Differences from InvoiceEditor:
 *   - Vendor selector instead of Customer
 *   - vendorReferenceNumber field (vendor's own bill #)
 *   - whtAmount (withholding tax)
 *   - No PDF download (bills aren't sent — they're received)
 *   - "Submit for Approval" instead of "Send to Customer"
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Plus, Send, Save, ChevronDown, ChevronUp, Lock, CalendarCheck,
  FileText, CreditCard, StickyNote, Truck,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LineItemRow, { computeLineValues } from './LineItemRow'
import TotalsPanel from './TotalsPanel'
import InvoiceStatusBadge from './InvoiceStatusBadge'

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

export default function BillEditor({
  bill = null,
  vendors = [],
  saving = false,
  onSaveDraft,
  onSubmit,
  onApprove,            // (id) => void  — pending approval
  onSchedule,           // (id, payDate) => void — approved bills
  onCancel,             // (id, reason) => void
  onAddVendor,          // () => void — opens PartyFormModal
  className,
}) {
  const isEdit = !!bill
  const isReadOnly = isEdit && bill?.state !== 'draft'

  const [billNumber, setBillNumber] = useState(bill?.billNumber || '')
  const [vendorReferenceNumber, setVendorReferenceNumber] = useState(bill?.vendorReferenceNumber || '')
  const [vendorId, setVendorId] = useState(bill?.vendorId || '')
  const [issueDate, setIssueDate] = useState(
    bill?.issueDate ? new Date(bill.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState(
    bill?.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : ''
  )
  const [currencyCode, setCurrencyCode] = useState(bill?.currencyCode || 'PKR')
  const [exchangeRate, setExchangeRate] = useState(bill?.exchangeRate || 1)
  const [whtAmount, setWhtAmount] = useState(bill?.whtAmount || 0)
  const [description, setDescription] = useState(bill?.description || '')
  const [notes, setNotes] = useState(bill?.notes || '')

  const [invoiceDiscountType, setInvoiceDiscountType] = useState(bill?.invoiceDiscountType || null)
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(bill?.invoiceDiscountValue || 0)
  const [shippingCharges, setShippingCharges] = useState(bill?.shippingCharges || 0)
  const [roundingAdjustment, setRoundingAdjustment] = useState(bill?.roundingAdjustment || 0)

  const [lineItems, setLineItems] = useState(() => {
    if (bill?.lineItems?.length) return bill.lineItems.map(li => ({ ...li, _tempId: li._id || `li-${Math.random().toString(36).slice(2)}` }))
    return [emptyLine()]
  })

  const totals = useMemo(
    () => computeTotals(lineItems, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment),
    [lineItems, invoiceDiscountType, invoiceDiscountValue, shippingCharges, roundingAdjustment]
  )

  const handleLineChange = useCallback((index, updated) => {
    setLineItems(prev => prev.map((li, i) => i === index ? { ...updated, _tempId: li._tempId } : li))
  }, [])
  const addLine = useCallback(() => setLineItems(prev => [...prev, emptyLine()]), [])
  const removeLine = useCallback((index) => {
    setLineItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
  }, [])

  const buildFormData = () => ({
    billNumber,
    vendorReferenceNumber: vendorReferenceNumber || undefined,
    vendorId: vendorId || undefined,
    issueDate,
    dueDate: dueDate || undefined,
    currencyCode,
    exchangeRate: exchangeRate !== 1 ? exchangeRate : undefined,
    whtAmount: whtAmount || undefined,
    description: description || undefined,
    notes: notes || undefined,
    invoiceDiscountType,
    invoiceDiscountValue,
    shippingCharges,
    roundingAdjustment,
    lineItems: lineItems
      .filter(li => li.name && li.quantity > 0)
      .map(({ _tempId, ...rest }, i) => ({ ...rest, sortOrder: i })),
  })

  return (
    <div className={cn('space-y-4', className)}>
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>
            This bill is <strong className="font-semibold">{bill?.state?.replace('_', ' ')}</strong> and cannot be edited.
            Use the action buttons on the right to change its status.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-cyan" />
              <h2 className="text-lg font-bold text-text-primary">
                {isReadOnly ? 'View Bill' : isEdit ? 'Edit Bill' : 'New Bill'}
              </h2>
              {bill?.state && <InvoiceStatusBadge state={bill.state} kind="bill" />}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Bill #"
              value={billNumber}
              onChange={e => setBillNumber(e.target.value)}
              placeholder="BILL-001"
              required
            />
            <Input
              label="Vendor's Bill Ref"
              value={vendorReferenceNumber}
              onChange={e => setVendorReferenceNumber(e.target.value)}
              placeholder="Vendor's invoice #"
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 mt-4 gap-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-text-secondary">Vendor</label>
                {onAddVendor && !isReadOnly && (
                  <button
                    type="button"
                    onClick={onAddVendor}
                    className="text-xs text-cyan font-semibold hover:underline"
                  >
                    + New Vendor
                  </button>
                )}
              </div>
              <select
                disabled={isReadOnly}
                className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-3 text-sm text-text-primary focus:border-cyan focus:outline-none disabled:opacity-60"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
              >
                <option value="">
                  {vendors.length === 0 ? 'No vendors yet — click + New Vendor above' : 'Select vendor...'}
                </option>
                {vendors.map(v => (
                  <option key={v._id} value={v._id}>
                    {v.businessName || v.fullName} {v.email ? `(${v.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Currency</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg border border-glass bg-glass-panel px-3 py-3 text-sm text-text-primary focus:border-cyan focus:outline-none"
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
          <div className="overflow-x-auto px-3 pb-4">
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
        </Card>

        <Card>
          <CollapsibleSection title="Discount, Shipping, WHT & Adjustments" icon={Truck}
            defaultOpen={!!(invoiceDiscountValue || shippingCharges || roundingAdjustment || whtAmount)}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Bill Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 rounded-lg border border-glass bg-glass-panel px-3 py-2.5 text-sm text-text-primary text-right"
                    value={invoiceDiscountValue || ''}
                    onChange={e => setInvoiceDiscountValue(parseFloat(e.target.value) || 0)}
                    min="0"
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
              <Input label="Shipping" type="number" value={shippingCharges || ''}
                onChange={e => setShippingCharges(parseFloat(e.target.value) || 0)} min="0" />
              <Input label="Rounding" type="number" value={roundingAdjustment || ''}
                onChange={e => setRoundingAdjustment(parseFloat(e.target.value) || 0)} step="any" />
              <Input label="Withholding Tax" type="number" value={whtAmount || ''}
                onChange={e => setWhtAmount(parseFloat(e.target.value) || 0)} min="0" />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Notes & Description" icon={StickyNote} defaultOpen={!!(notes || description)}>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
                <textarea
                  className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-3 text-sm text-text-primary"
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Internal Notes</label>
                <textarea
                  className="w-full rounded-lg border border-glass bg-glass-panel px-4 py-3 text-sm text-text-primary"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </CollapsibleSection>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky-summary space-y-6">
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
              paidAmount={bill?.paidAmount || 0}
              currency={currencyCode}
            />
            {whtAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-glass/40 flex justify-between text-xs text-amber-400">
                <span>WHT Deducted</span>
                <span className="font-mono">- {whtAmount.toFixed(2)}</span>
              </div>
            )}
          </Card>

          <Card>
            <div className="space-y-3">
              {isReadOnly ? (
                <>
                  {bill?.state === 'awaiting_approval' && onApprove && (
                    <button
                      type="button"
                      onClick={() => onApprove(bill._id)}
                      disabled={saving}
                      className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-40"
                    >
                      Approve Bill
                    </button>
                  )}
                  {bill?.state === 'approved' && onSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0]
                        const payDate = window.prompt('Schedule payment for date (YYYY-MM-DD):', today)
                        if (payDate) onSchedule(bill._id, payDate)
                      }}
                      disabled={saving}
                      className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-40"
                    >
                      <CalendarCheck className="h-4 w-4" />
                      Schedule Payment
                    </button>
                  )}
                  {onCancel && ['awaiting_approval', 'approved', 'scheduled'].includes(bill?.state) && (
                    <button
                      type="button"
                      onClick={() => {
                        const reason = window.prompt('Cancellation reason (optional):')
                        if (reason !== null) onCancel(bill._id, reason)
                      }}
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      Cancel Bill
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSaveDraft?.(buildFormData())}
                    disabled={saving || !billNumber}
                    className="btn-outline flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : isEdit ? 'Update Draft' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSubmit?.(buildFormData())}
                    disabled={saving || !billNumber || totals.totalAmount <= 0}
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
