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
import { useState, useMemo, useCallback } from 'react'
import {
  Plus, ChevronDown, ChevronUp, FileText, StickyNote, Truck,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LineItemRow, { computeLineValues } from './LineItemRow'
import TotalsPanel from './TotalsPanel'
import InvoiceStatusBadge from './InvoiceStatusBadge'
import EditorActionBar from './EditorActionBar'

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
  defaultVendorId = null,
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
  const [vendorId, setVendorId] = useState(bill?.vendorId || defaultVendorId || '')
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

  // Line items
  //   1. Phase 2 bill   → use stored lineItems[]
  //   2. Phase 1 legacy → synthesize a single line from `amount` so the editor
  //                       shows the real bill value, not a blank row
  //   3. New bill       → start with one empty editable row
  const [lineItems, setLineItems] = useState(() => {
    if (bill?.lineItems?.length) {
      return bill.lineItems.map(li => ({
        ...li,
        _tempId: li._id || `li-${Math.random().toString(36).slice(2)}`,
      }))
    }
    if (bill && bill.amount > 0) {
      const legacyAmount = Number(bill.amount)    || 0
      const legacyTax    = Number(bill.taxAmount) || 0
      const taxRate      = legacyAmount > 0 ? Math.round((legacyTax / legacyAmount) * 10000) / 100 : 0
      return [{
        _tempId: 'legacy-1',
        itemType:     'custom',
        name:         bill.description || bill.billNumber || 'Bill item',
        description:  bill.description || '',
        quantity:     1,
        unitPrice:    legacyAmount,
        discountType: null,
        discountValue: 0,
        taxRate,
        taxInclusive: false,
        sortOrder:    0,
      }]
    }
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
      {/* Always-visible top action bar */}
      <EditorActionBar
        kind="bill"
        doc={bill}
        isReadOnly={isReadOnly}
        canSave={!!billNumber}
        canSubmit={!!billNumber && totals.totalAmount > 0}
        saving={saving}
        onSaveDraft={() => onSaveDraft?.(buildFormData())}
        onSubmit={() => onSubmit?.(buildFormData())}
        onApprove={onApprove}
        onSchedule={onSchedule}
        onCancel={onCancel}
      />

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
                    {v.vendorName || v.contactPerson || '(unnamed vendor)'} {v.email ? `· ${v.email}` : ''}
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

          {/* What happens next — explains the current state and the next step */}
          <NextStepsCard state={bill?.state} />
        </div>
      </div>
      </div>
    </div>
  )
}

/**
 * NextStepsCard — small inline guidance card explaining the bill lifecycle
 * to non-accountant users. The action buttons themselves live exclusively
 * in the top action bar (single source of truth).
 */
function NextStepsCard({ state }) {
  const flow = [
    { key: 'draft',             label: 'Draft',             desc: 'Fill in line items, then click Submit for Approval above.' },
    { key: 'awaiting_approval', label: 'Awaiting Approval', desc: 'Approver: click Approve above. Or Cancel to discard.' },
    { key: 'approved',          label: 'Approved',          desc: 'Ready to pay. Click Schedule Payment above to set a pay date.' },
    { key: 'scheduled',         label: 'Scheduled',         desc: 'The bill will post automatically on the scheduled pay date.' },
    { key: 'paid',              label: 'Paid',              desc: 'Bill is fully paid. No further action needed.' },
    { key: 'cancelled',         label: 'Cancelled',         desc: 'This bill has been voided.' },
  ]
  const currentIdx = Math.max(0, flow.findIndex(s => s.key === (state || 'draft')))
  const current = flow[currentIdx] || flow[0]

  return (
    <Card>
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
        What happens next?
      </h3>
      <div className="space-y-2">
        <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-cyan font-bold mb-1">
            Current — {current.label}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {current.desc}
          </p>
        </div>
        <div className="flex items-center gap-1 pt-1">
          {flow.filter(s => s.key !== 'cancelled').map((s, i) => {
            const reached = i <= currentIdx
            return (
              <div
                key={s.key}
                title={s.label}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  reached ? 'bg-cyan' : 'bg-glass'
                )}
              />
            )
          })}
        </div>
      </div>
    </Card>
  )
}
