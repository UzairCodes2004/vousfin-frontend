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
import { useMemo, useState } from 'react'
import {
  PackageOpen, Plus, AlertTriangle, Search, RefreshCw,
  TrendingUp, X, ChevronDown, ChevronUp, Package,
} from 'lucide-react'

import {
  useInventoryItems, useInventoryValuation, useLowStockAlerts,
  useCreateInventoryItem, useUpdateInventoryItem, useAddStock,
  useToggleInventoryActive,
} from '@/hooks/useInventory'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/tables/DataTable'
import { cn } from '@/utils/cn'

/* ── Item Form (create / edit) ──────────────────────────────────────── */
const EMPTY = {
  name: '', sku: '', barcode: '', category: '', description: '',
  unitCostPrice: '', unitSalePrice: '', unit: 'units',
  reorderLevel: 0, reorderQty: 0, taxRate: '', valuationMethod: 'weighted_average',
}

function ItemForm({ initial, onClose, currency }) {
  const createItem = useCreateInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const isEdit = !!initial?._id

  const [form, setForm] = useState(initial ? {
    name:            initial.name            || '',
    sku:             initial.sku             || '',
    barcode:         initial.barcode         || '',
    category:        initial.category        || '',
    description:     initial.description     || '',
    unitCostPrice:   initial.unitCostPrice   ?? '',
    unitSalePrice:   initial.unitSalePrice   ?? '',
    unit:            initial.unit            || 'units',
    reorderLevel:    initial.reorderLevel    ?? 0,
    reorderQty:      initial.reorderQty      ?? 0,
    taxRate:         initial.taxRate         ?? '',
    valuationMethod: initial.valuationMethod || 'weighted_average',
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
    }
    if (isEdit) {
      await updateItem.mutateAsync({ id: initial._id, ...payload })
    } else {
      await createItem.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg2 border border-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-glass">
          <h2 className="text-lg font-bold text-text-primary">
            {isEdit ? `Edit Item: ${initial.name}` : 'New Inventory Item'}
          </h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Input label="Item Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., A4 Paper Ream" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g., PAPER-A4" />
            <Input label="Barcode" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="e.g., 6009876543210" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Category" value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g., Stationery" />
            <Input label="Unit" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g., pcs, kg, box" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={`Cost Price (${currency})`} type="number" step="0.01" min="0" value={form.unitCostPrice}
              onChange={e => set('unitCostPrice', e.target.value)} placeholder="0.00" />
            <Input label={`Sale Price (${currency})`} type="number" step="0.01" min="0" value={form.unitSalePrice}
              onChange={e => set('unitSalePrice', e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Reorder Level" type="number" min="0" value={form.reorderLevel}
              onChange={e => set('reorderLevel', e.target.value)} />
            <Input label="Reorder Qty" type="number" min="0" value={form.reorderQty}
              onChange={e => set('reorderQty', e.target.value)} />
            <Input label="Tax Rate (%)" type="number" step="0.1" min="0" max="100" value={form.taxRate}
              onChange={e => set('taxRate', e.target.value)} placeholder="e.g., 17" />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Valuation Method</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none"
              value={form.valuationMethod}
              onChange={e => set('valuationMethod', e.target.value)}
            >
              <option value="weighted_average">Weighted Average Cost</option>
              <option value="fifo">FIFO (First In First Out)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description (optional)</label>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none resize-none"
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Internal notes about this item…" />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-glass">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} loading={isPending} disabled={!form.name || !form.unitCostPrice}>
            {isEdit ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Add Stock inline form ───────────────────────────────────────────── */
function AddStockForm({ item, onClose, currency }) {
  const addStock = useAddStock()
  const [qty,  setQty]  = useState('1')
  const [cost, setCost] = useState(String(item.unitCostPrice))
  const valid = parseFloat(qty) > 0

  return (
    <div className="bg-navy/80 border border-emerald-500/20 rounded-xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Stock — {item.name}
        </p>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label={`Quantity (${item.unit})`} type="number" step="1" min="1"
          value={qty} onChange={e => setQty(e.target.value)} />
        <Input label={`Cost per ${item.unit} (${currency})`} type="number" step="0.01" min="0"
          value={cost} onChange={e => setCost(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={addStock.isPending}>Cancel</Button>
        <Button size="sm" onClick={() => addStock.mutateAsync({ id: item._id, qty: parseFloat(qty), costPerUnit: parseFloat(cost) || item.unitCostPrice }).then(onClose)}
          loading={addStock.isPending} disabled={!valid}>
          Add {qty} {item.unit}
        </Button>
      </div>
    </div>
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
            <span className={cn('font-bold text-sm', isLow ? 'text-red-400' : 'text-text-primary')}>
              {r.currentStock} {r.unit}
            </span>
            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" title="Below reorder level" />}
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
          {r.unitSalePrice && <div className="font-mono text-emerald-400">{formatCurrency(r.unitSalePrice, currency)}</div>}
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
        ? <span className="text-xs text-amber-400 font-mono">{r.taxRate}%</span>
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
            className="text-[11px] text-emerald-400 hover:underline font-semibold">
            + Stock
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
            <PackageOpen className="h-6 w-6 text-emerald-400" />
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
          <div className="premium-card p-5 flex flex-col gap-1 border-emerald-500/30 bg-emerald-500/5">
            <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Total Stock Value</span>
            <span className="text-2xl font-black text-text-primary">{formatCurrency(valuation.totalValue, currency)}</span>
            <span className="text-xs text-text-muted">{valuation.itemCount} active items</span>
          </div>
          <div className="premium-card p-5 flex flex-col gap-1">
            <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Low Stock Alerts</span>
            <span className={cn('text-2xl font-black', valuation.lowStockCount > 0 ? 'text-red-400' : 'text-text-primary')}>
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
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-300">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below reorder level
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.slice(0, 6).map(item => (
              <span key={item._id} className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-0.5 border border-red-500/20">
                {item.name} ({item.currentStock} left)
              </span>
            ))}
            {lowStockItems.length > 6 && (
              <span className="text-xs text-red-400">+{lowStockItems.length - 6} more</span>
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
    </div>
  )
}
