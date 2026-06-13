/**
 * InventoryPage — Professional Inventory & Item Management
 *
 * Phase 5.5 Step 4 — Inventory + Item Engine:
 *   - Item catalog with SKU, barcode, category, cost/sale price
 *   - Current stock, reorder alerts, valuation
 *   - Add Stock inline form
 *   - Create / Edit item modal
 *   - Inventory valuation summary
 */
import { useMemo, useState, useEffect } from 'react'
import {
  PackageOpen, Plus, AlertTriangle, Search, X,
  History, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'

import {
  useInventoryItems, useInventoryValuation, useLowStockAlerts,
  useCreateInventoryItem, useUpdateInventoryItem, useAddStock,
  useToggleInventoryActive, useStockLedger,
} from '@/hooks/useInventory'
import { useAccounts } from '@/hooks/useAccounts'
import { useVendors } from '@/hooks/useParties'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/tables/DataTable'
import Modal from '@/components/modals/Modal'
import { cn } from '@/utils/cn'

/* ── Section label — matches TransactionFormModal style ─────────────── */
function SectionLabel({ label, note }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      {note && <span className="text-[10px] text-text-muted/60">{note}</span>}
      <div className="flex-1 h-px bg-glass" />
    </div>
  )
}

/* ── Item Form (create / edit) ──────────────────────────────────────── */
const EMPTY = {
  name: '', sku: '', barcode: '', category: '', description: '',
  unitCostPrice: '', unitSalePrice: '', unit: 'units',
  reorderLevel: 0, reorderQty: 0, taxRate: '', valuationMethod: 'weighted_average',
  preferredVendorId: '',
}

function ItemForm({ initial, onClose, currency }) {
  const createItem = useCreateInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const { data: vendorsData } = useVendors({ limit: 200 })
  const vendors = useMemo(() => {
    const arr = Array.isArray(vendorsData?.docs) ? vendorsData.docs
              : Array.isArray(vendorsData?.data) ? vendorsData.data
              : Array.isArray(vendorsData)       ? vendorsData : []
    return arr
  }, [vendorsData])
  const isEdit = !!initial?._id

  const [form, setForm] = useState(initial ? {
    name:              initial.name              || '',
    sku:               initial.sku               || '',
    barcode:           initial.barcode           || '',
    category:          initial.category          || '',
    description:       initial.description       || '',
    unitCostPrice:     initial.unitCostPrice     ?? '',
    unitSalePrice:     initial.unitSalePrice     ?? '',
    unit:              initial.unit              || 'units',
    reorderLevel:      initial.reorderLevel      ?? 0,
    reorderQty:        initial.reorderQty        ?? 0,
    taxRate:           initial.taxRate           ?? '',
    valuationMethod:   initial.valuationMethod   || 'weighted_average',
    preferredVendorId: initial.preferredVendorId || '',
  } : { ...EMPTY })

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const isPending = createItem.isPending || updateItem.isPending

  const handleSave = async () => {
    const payload = {
      ...form,
      unitCostPrice: parseFloat(form.unitCostPrice) || 0,
      unitSalePrice: form.unitSalePrice !== '' ? parseFloat(form.unitSalePrice) : null,
      taxRate:       form.taxRate !== '' ? parseFloat(form.taxRate) : null,
      reorderLevel:  parseInt(form.reorderLevel, 10) || 0,
      reorderQty:    parseInt(form.reorderQty, 10)   || 0,
      preferredVendorId: form.preferredVendorId || null,
    }
    if (isEdit) {
      await updateItem.mutateAsync({ id: initial._id, ...payload })
    } else {
      await createItem.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? `Edit — ${initial.name}` : 'Add Inventory Item'}
      className="sm:max-w-lg"
    >
      <div className="space-y-5 pb-1">
        {/* Subtitle */}
        <p className="text-[11px] text-text-muted -mt-4">
          {isEdit
            ? 'Update item details, pricing or valuation method'
            : 'Define SKU, pricing, reorder levels and valuation'}
        </p>

        {/* ── Item Details ──────────────────────────────────────────── */}
        <SectionLabel label="Item Details" />

        <Input
          label="Item Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g., A4 Paper Ream"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="SKU (Stock Code)"
            value={form.sku}
            onChange={e => set('sku', e.target.value)}
            placeholder="e.g., PAPER-A4"
          />
          <Input
            label="Barcode"
            value={form.barcode}
            onChange={e => set('barcode', e.target.value)}
            placeholder="e.g., 6009876543210"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Category"
            value={form.category}
            onChange={e => set('category', e.target.value)}
            placeholder="e.g., Stationery"
          />
          <Input
            label="Unit of Measure"
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="pcs / kg / box"
          />
        </div>

        {/* ── Pricing ───────────────────────────────────────────────── */}
        <SectionLabel label="Pricing" note={`amounts in ${currency}`} />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Cost Price (${currency}) *`}
            type="number" step="0.01" min="0"
            value={form.unitCostPrice}
            onChange={e => set('unitCostPrice', e.target.value)}
            placeholder="0.00"
          />
          <Input
            label={`Sale Price (${currency})`}
            type="number" step="0.01" min="0"
            value={form.unitSalePrice}
            onChange={e => set('unitSalePrice', e.target.value)}
            placeholder="Optional"
          />
        </div>

        <Input
          label="Tax Rate (%) — e.g. 17 for GST / sales tax"
          type="number" step="0.1" min="0" max="100"
          value={form.taxRate}
          onChange={e => set('taxRate', e.target.value)}
          placeholder="Leave blank if tax-exempt"
        />

        {/* ── Stock Control ─────────────────────────────────────────── */}
        <SectionLabel label="Stock Control" note="reorder alerts" />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Reorder Level (alert threshold)"
            type="number" min="0"
            value={form.reorderLevel}
            onChange={e => set('reorderLevel', e.target.value)}
          />
          <Input
            label="Reorder Qty (how much to order)"
            type="number" min="0"
            value={form.reorderQty}
            onChange={e => set('reorderQty', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Valuation Method
            <span className="ml-1 text-text-muted font-normal">(how stock cost is calculated)</span>
          </label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none transition-colors"
            value={form.valuationMethod}
            onChange={e => set('valuationMethod', e.target.value)}
          >
            <option value="weighted_average">Weighted Average — average price of all stock batches</option>
            <option value="fifo">FIFO — First In First Out (oldest stock sold first)</option>
          </select>
        </div>

        {/* ── Preferred Vendor (drives reorder emails) ─────────────── */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Preferred Vendor
            <span className="ml-1 text-text-muted font-normal">— auto-emailed when stock hits reorder level</span>
          </label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none transition-colors"
            value={form.preferredVendorId}
            onChange={e => set('preferredVendorId', e.target.value)}
          >
            <option value="">
              {vendors.length === 0 ? 'No vendors yet — create one from the Vendors page' : 'None — manual reorder'}
            </option>
            {vendors.map(v => (
              <option key={v._id} value={v._id}>
                {v.vendorName || v.contactPerson || '(unnamed vendor)'} {v.email ? `· ${v.email}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── Notes ─────────────────────────────────────────────────── */}
        <SectionLabel label="Notes" note="optional" />

        <textarea
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none resize-none transition-colors"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Supplier details, storage notes, variant info…"
        />

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-3 border-t border-glass">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={isPending}
            disabled={!form.name || !form.unitCostPrice}
          >
            {isEdit ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Add Stock inline form ───────────────────────────────────────────── */
function AddStockForm({ item, onClose, currency }) {
  const addStock = useAddStock()
  const { data: accountsData } = useAccounts()
  const { data: vendorsData } = useVendors({ limit: 200 })

  const [qty,  setQty]  = useState('1')
  const [cost, setCost] = useState(String(item.unitCostPrice))
  // Inventory is normally paid from operating funds (cash/bank) or bought on
  // credit from a vendor (AP). Loan-financed inventory is unusual for SMBs
  // and was removed to keep the form intuitive — if you ever need it,
  // record it manually as a Transaction.
  const [paymentMode, setPaymentMode] = useState('cash')   // cash | bank | credit
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [vendorId, setVendorId] = useState(item.preferredVendorId || '')
  const [notes, setNotes] = useState('')

  const accounts = useMemo(() => {
    const arr = Array.isArray(accountsData?.data) ? accountsData.data
              : Array.isArray(accountsData)       ? accountsData : []
    return arr
  }, [accountsData])

  const vendors = useMemo(() => {
    const arr = Array.isArray(vendorsData?.docs) ? vendorsData.docs
              : Array.isArray(vendorsData?.data) ? vendorsData.data
              : Array.isArray(vendorsData)       ? vendorsData : []
    return arr
  }, [vendorsData])

  // Filter accounts by payment mode
  const fundingAccounts = useMemo(() => {
    if (paymentMode === 'cash') {
      return accounts.filter(a => /cash/i.test(a.accountName) && a.accountType === 'Asset')
    }
    if (paymentMode === 'bank') {
      return accounts.filter(a => /bank/i.test(a.accountName) && a.accountType === 'Asset')
    }
    return []
  }, [accounts, paymentMode])

  // Auto-select first funding account when mode changes
  useEffect(() => {
    if (paymentMode === 'credit') return
    if (fundingAccounts.length > 0 && !fundingAccounts.some(a => a._id === sourceAccountId)) {
      setSourceAccountId(fundingAccounts[0]._id)
    }
  }, [paymentMode, fundingAccounts, sourceAccountId])

  const isCredit = paymentMode === 'credit'
  const valid = parseFloat(qty) > 0 && parseFloat(cost) >= 0 && (
    isCredit ? !!vendorId : !!sourceAccountId
  )
  const totalCost = (parseFloat(qty) || 0) * (parseFloat(cost) || 0)

  const handleSubmit = async () => {
    await addStock.mutateAsync({
      id:           item._id,
      qty:          parseFloat(qty),
      costPerUnit:  parseFloat(cost) || item.unitCostPrice,
      paymentMode,
      sourceAccountId: isCredit ? undefined : sourceAccountId,
      vendorId:        isCredit ? vendorId  : undefined,
      notes:           notes || undefined,
    })
    onClose()
  }

  const PAYMENT_OPTIONS = [
    { value: 'cash',   label: 'Cash',      desc: 'Paid from cash on hand' },
    { value: 'bank',   label: 'Bank',      desc: 'Paid via bank transfer' },
    { value: 'credit', label: 'On Credit', desc: 'Pay vendor later (AP)' },
  ]

  return (
    <div className="bg-navy/80 border border-positive/20 rounded-xl p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-positive flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Stock — {item.name}
        </p>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Qty + Cost */}
      <div className="grid grid-cols-2 gap-3">
        <Input label={`Quantity (${item.unit})`} type="number" step="1" min="1"
          value={qty} onChange={e => setQty(e.target.value)} />
        <Input label={`Cost per ${item.unit} (${currency})`} type="number" step="0.01" min="0"
          value={cost} onChange={e => setCost(e.target.value)} />
      </div>

      {/* Payment mode segmented control */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          How was this paid?
          <span className="ml-1 text-text-muted font-normal">— posts the matching journal entry</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaymentMode(opt.value)}
              title={opt.desc}
              className={cn(
                'rounded-lg border px-2 py-2 text-xs font-semibold transition-all',
                paymentMode === opt.value
                  ? 'border-positive bg-positive/10 text-positive'
                  : 'border-glass text-text-muted hover:border-positive/30 hover:text-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source account OR vendor selector */}
      {isCredit ? (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Vendor <span className="text-negative">*</span>
          </label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-positive focus:outline-none"
            value={vendorId}
            onChange={e => setVendorId(e.target.value)}
          >
            <option value="">Select vendor...</option>
            {vendors.map(v => (
              <option key={v._id} value={v._id}>
                {v.vendorName || v.contactPerson || '(unnamed vendor)'} {v.email ? `· ${v.email}` : ''}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-text-muted mt-1">
            Posts: DR Inventory · CR Accounts Payable (vendor balance increases)
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {paymentMode === 'bank' ? 'Bank Account' : 'Cash Account'}
            <span className="text-negative"> *</span>
          </label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-positive focus:outline-none"
            value={sourceAccountId}
            onChange={e => setSourceAccountId(e.target.value)}
          >
            <option value="">Select account...</option>
            {fundingAccounts.map(a => (
              <option key={a._id} value={a._id}>
                {a.accountCode ? `${a.accountCode} · ` : ''}{a.accountName}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-text-muted mt-1">
            Posts: DR Inventory · CR {paymentMode === 'bank' ? 'Bank' : 'Cash'}
          </p>
        </div>
      )}

      {/* Notes */}
      <Input
        label="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="e.g. invoice #1234 from vendor"
      />

      {/* Total preview + actions */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-glass">
        <div className="text-xs text-text-muted">
          Total: <span className="text-text-primary font-bold tabular-nums">{formatCurrency(totalCost, currency)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={addStock.isPending}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={addStock.isPending} disabled={!valid}>
            Add {qty} {item.unit}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Stock Ledger / Movement History modal ──────────────────────────────
 * Surfaces the backend getStockLedger() — every purchase/sale that touched
 * this item, with a running balance. ERP refactor Step 3: completes the
 * "movement history" requirement by exposing the audited stock trail.
 */
function MovementBadge({ type }) {
  const isIn = /purchase/i.test(type)
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-semibold',
      isIn ? 'bg-positive/10 text-positive' : 'bg-amber/10 text-amber'
    )}>
      {isIn ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
      {type}
    </span>
  )
}

function StockLedgerModal({ item, onClose, currency }) {
  const { data, isLoading, isError } = useStockLedger(item._id)
  const lines   = Array.isArray(data?.lines) ? data.lines : []
  const summary = data?.summary || { totalIn: 0, totalOut: 0, currentStock: item.currentStock }
  const stockValue = (summary.currentStock ?? item.currentStock) * (data?.item?.unitCostPrice ?? item.unitCostPrice)

  return (
    <Modal isOpen={true} onClose={onClose} title={`Stock Ledger — ${item.name}`} className="sm:max-w-3xl">
      <div className="space-y-4 pb-1">
        <p className="text-[11px] text-text-muted -mt-4">
          Every purchase and sale that moved this item, oldest first, with a running balance.
        </p>

        {/* Summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-positive/20 bg-positive/5 p-3">
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">Total In</span>
            <span className="text-lg font-black text-positive tabular-nums">+{summary.totalIn}</span>
          </div>
          <div className="rounded-lg border border-amber/20 bg-amber/5 p-3">
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">Total Out</span>
            <span className="text-lg font-black text-amber tabular-nums">−{summary.totalOut}</span>
          </div>
          <div className="rounded-lg border border-glass bg-glass-panel p-3">
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">Current Stock</span>
            <span className="text-lg font-black text-text-primary tabular-nums">{summary.currentStock} {item.unit}</span>
          </div>
          <div className="rounded-lg border border-glass bg-glass-panel p-3">
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">Stock Value</span>
            <span className="text-lg font-black text-text-primary tabular-nums">{formatCurrency(stockValue, currency)}</span>
          </div>
        </div>

        {/* Movement table */}
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-glass">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-navy/95 backdrop-blur">
              <tr className="text-text-muted uppercase tracking-wider text-[10px]">
                <th className="text-left  font-semibold px-3 py-2">Date</th>
                <th className="text-left  font-semibold px-3 py-2">Description</th>
                <th className="text-left  font-semibold px-3 py-2">Type</th>
                <th className="text-right font-semibold px-3 py-2">In</th>
                <th className="text-right font-semibold px-3 py-2">Out</th>
                <th className="text-right font-semibold px-3 py-2">Balance</th>
                <th className="text-right font-semibold px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-text-muted">Loading movement history…</td></tr>
              )}
              {isError && !isLoading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-negative">Could not load the stock ledger.</td></tr>
              )}
              {!isLoading && !isError && lines.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  No stock movements yet. Purchases and sales of this item will appear here.
                </td></tr>
              )}
              {lines.map((l) => (
                <tr key={l._id} className="border-t border-glass/60 hover:bg-glass-hover/40 transition-colors">
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                    {l.date ? new Date(l.date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-text-primary max-w-[16rem] truncate" title={l.description}>{l.description || '—'}</td>
                  <td className="px-3 py-2"><MovementBadge type={l.type} /></td>
                  <td className="px-3 py-2 text-right tabular-nums text-positive">{l.qtyIn  ? `+${l.qtyIn}`  : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber">{l.qtyOut ? `−${l.qtyOut}` : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-text-primary">{l.balance}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{formatCurrency(l.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function InventoryPage() {
  const currency = useBusinessStore(s => s.currency)
  const { data: rawItems,    isLoading } = useInventoryItems({ limit: 200 })
  const { data: valuation              } = useInventoryValuation()
  const { data: lowStockItems          } = useLowStockAlerts()
  const toggleActive = useToggleInventoryActive()

  const [query,      setQuery]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [addStockId, setAddStockId] = useState(null)
  const [ledgerId,   setLedgerId]   = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const items = useMemo(() => {
    const arr = Array.isArray(rawItems?.docs) ? rawItems.docs
              : Array.isArray(rawItems?.data) ? rawItems.data
              : Array.isArray(rawItems)       ? rawItems : []
    return arr
  }, [rawItems])

  const filtered = useMemo(() => {
    let list = showInactive ? items : items.filter(i => i.isActive !== false)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.sku  || '').toLowerCase().includes(q) ||
      (i.barcode || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    )
  }, [items, query, showInactive])

  const addStockItem = addStockId ? items.find(i => i._id === addStockId) : null
  const ledgerItem   = ledgerId   ? items.find(i => i._id === ledgerId)   : null

  const columns = [
    {
      key: 'name',
      header: 'Item',
      render: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-text-primary text-sm truncate">{r.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {r.sku     && <span className="text-[10px] font-mono text-text-muted bg-glass-panel rounded px-1.5 py-px">{r.sku}</span>}
            {r.barcode && <span className="text-[10px] font-mono text-text-muted bg-glass-panel rounded px-1.5 py-px">📦 {r.barcode}</span>}
            {r.category && <span className="text-[10px] text-cyan bg-cyan/10 rounded px-1.5 py-px">{r.category}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (r) => {
        const isLow = r.currentStock <= r.reorderLevel
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn('font-bold text-sm', isLow ? 'text-negative' : 'text-text-primary')}>
              {r.currentStock} {r.unit}
            </span>
            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-negative flex-shrink-0" title="Below reorder level" />}
          </div>
        )
      },
    },
    {
      key: 'cost',
      header: `Cost / ${' '}`,
      render: (r) => (
        <div className="text-xs space-y-0.5">
          <div className="font-mono text-text-primary">{formatCurrency(r.unitCostPrice, currency)}</div>
          {r.unitSalePrice && <div className="font-mono text-positive">{formatCurrency(r.unitSalePrice, currency)}</div>}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Stock Value',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <span className="font-mono font-semibold text-sm text-text-primary">
          {formatCurrency(r.currentStock * r.unitCostPrice, currency)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Valuation',
      render: (r) => (
        <span className="text-[10px] text-text-muted uppercase tracking-wide">
          {r.valuationMethod === 'fifo' ? 'FIFO' : 'W.Avg'}
        </span>
      ),
    },
    {
      key: 'tax',
      header: 'Tax %',
      render: (r) => r.taxRate != null
        ? <span className="text-xs text-amber font-mono">{r.taxRate}%</span>
        : <span className="text-text-muted text-xs">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => r.isActive !== false
        ? <Badge variant="success">Active</Badge>
        : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={e => { e.stopPropagation(); setAddStockId(r._id === addStockId ? null : r._id) }}
            className="text-[11px] text-positive hover:underline font-semibold">
            + Stock
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); setLedgerId(r._id) }}
            className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary hover:underline font-semibold">
            <History className="h-3 w-3" /> Ledger
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); setEditItem(r) }}
            className="text-[11px] text-cyan hover:underline font-semibold">
            Edit
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); toggleActive.mutate(r._id) }}
            className="text-[11px] text-text-muted hover:text-text-primary hover:underline">
            {r.isActive !== false ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-text-primary tracking-tight">
            <PackageOpen className="h-6 w-6 text-positive" />
            Inventory
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Item catalog with stock levels, valuation, and reorder alerts.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowForm(true)}>
          New Item
        </Button>
      </div>

      {/* ── Valuation KPIs ────────────────────────────────────────── */}
      {valuation && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="premium-card p-5 flex flex-col gap-1 border-positive/30 bg-positive/5">
            <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Total Stock Value</span>
            <span className="text-2xl font-black text-text-primary">{formatCurrency(valuation.totalValue, currency)}</span>
            <span className="text-xs text-text-muted">{valuation.itemCount} active items</span>
          </div>
          <div className="premium-card p-5 flex flex-col gap-1">
            <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Low Stock Alerts</span>
            <span className={cn('text-2xl font-black', valuation.lowStockCount > 0 ? 'text-negative' : 'text-text-primary')}>
              {valuation.lowStockCount}
            </span>
            <span className="text-xs text-text-muted">Items below reorder level</span>
          </div>
          <div className="premium-card p-5 flex flex-col gap-1">
            <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Total Items</span>
            <span className="text-2xl font-black text-text-primary">{filtered.length}</span>
            <span className="text-xs text-text-muted">{items.filter(i => i.isActive !== false).length} active</span>
          </div>
        </div>
      )}

      {/* ── Low Stock Banner ──────────────────────────────────────── */}
      {lowStockItems?.length > 0 && (
        <div className="rounded-xl border border-negative/30 bg-negative/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-negative flex-shrink-0" />
            <p className="text-sm font-semibold text-negative">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below reorder level
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.slice(0, 6).map(item => (
              <span key={item._id} className="text-xs text-negative bg-negative/10 rounded px-2 py-0.5 border border-negative/20">
                {item.name} ({item.currentStock} left)
              </span>
            ))}
            {lowStockItems.length > 6 && (
              <span className="text-xs text-negative">+{lowStockItems.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* ── Search + filters ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Search by name, SKU, barcode, or category…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <input type="checkbox" className="rounded" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {/* ── Inline Add Stock form ──────────────────────────────────── */}
      {addStockItem && (
        <AddStockForm
          item={addStockItem}
          currency={currency}
          onClose={() => setAddStockId(null)}
        />
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="premium-card overflow-x-auto">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={query ? 'No items match your search.' : 'No inventory items yet. Click "New Item" to add one.'}
        />
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────── */}
      {(showForm || editItem) && (
        <ItemForm
          initial={editItem}
          currency={currency}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}

      {/* ── Stock Ledger / Movement History Modal ─────────────────── */}
      {ledgerItem && (
        <StockLedgerModal
          item={ledgerItem}
          currency={currency}
          onClose={() => setLedgerId(null)}
        />
      )}
    </div>
  )
}
