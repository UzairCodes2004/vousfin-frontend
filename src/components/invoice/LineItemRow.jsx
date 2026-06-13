/**
 * LineItemRow — Phase 2 — Single editable row in the invoice/bill line items table.
 * Handles product/service/custom item input with qty, unit price, discount, tax.
 * Computes lineTotal in real-time for the live preview.
 *
 * Props:
 *   inventoryItems — array of { _id, name, sku, currentStock, unit, unitCostPrice, description }
 *   mode           — 'invoice' (shows stock remaining + warns on overstock)
 *                  | 'bill'    (shows item list, no stock limit — it's a purchase)
 */
import { Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/utils/cn'

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100

function computeLineValues(li) {
  const gross = r2(li.quantity * li.unitPrice)
  let disc = 0
  if (li.discountType === 'percentage' && li.discountValue > 0) {
    disc = r2(gross * li.discountValue / 100)
  } else if (li.discountType === 'fixed' && li.discountValue > 0) {
    disc = r2(Math.min(li.discountValue, gross))
  }
  const afterDiscount = gross - disc
  let tax = 0
  if (li.taxRate > 0) {
    tax = li.taxInclusive
      ? r2(afterDiscount - afterDiscount / (1 + li.taxRate / 100))
      : r2(afterDiscount * li.taxRate / 100)
  }
  const lineTotal = li.taxInclusive ? r2(afterDiscount) : r2(afterDiscount + tax)
  return { discountAmount: disc, taxAmount: tax, lineTotal }
}

// eslint-disable-next-line react-refresh/only-export-components
export { computeLineValues }

export default function LineItemRow({
  item,
  index,
  onChange,
  onRemove,
  canRemove = true,
  inventoryItems = [],
  mode = 'invoice',
}) {
  const { lineTotal } = computeLineValues(item)

  const update = (field, value) => {
    onChange(index, { ...item, [field]: value })
  }

  const handleInventorySelect = (invId) => {
    if (!invId) {
      onChange(index, { ...item, inventoryItemId: null })
      return
    }
    const inv = inventoryItems.find(i => i._id === invId)
    if (!inv) return
    onChange(index, {
      ...item,
      inventoryItemId: inv._id,
      name: inv.name,
      description: inv.description || (inv.sku ? `SKU: ${inv.sku}` : ''),
      unitPrice: inv.unitCostPrice || 0,
    })
  }

  const selectedInv = item.inventoryItemId
    ? inventoryItems.find(i => i._id === item.inventoryItemId)
    : null
  const overStock = mode === 'invoice' && selectedInv && item.quantity > selectedInv.currentStock

  const inputCls = 'w-full rounded border border-glass bg-glass-panel px-2 py-1.5 text-sm text-text-primary transition-premium focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan/20'
  const numCls = cn(inputCls, 'text-right tabular-nums')

  return (
    <tr className="group border-b border-glass/40 hover:bg-glass-hover/30 transition-colors">
      {/* Drag handle */}
      <td className="w-8 px-1 py-2 text-center">
        <GripVertical className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-50 cursor-grab" />
      </td>

      {/* # */}
      <td className="w-8 px-1 py-2 text-center text-xs text-text-muted tabular-nums">
        {index + 1}
      </td>

      {/* Item */}
      <td className="min-w-[200px] px-1 py-2">
        {inventoryItems.length > 0 && (
          <select
            className="w-full rounded border border-glass bg-glass-panel px-2 py-1 text-xs text-text-secondary mb-1.5 focus:border-cyan focus:outline-none"
            value={item.inventoryItemId || ''}
            onChange={e => handleInventorySelect(e.target.value)}
          >
            <option value="">— pick from inventory —</option>
            {inventoryItems.map(inv => (
              <option key={inv._id} value={inv._id}>
                {mode === 'invoice'
                  ? `${inv.name} (${inv.currentStock} ${inv.unit || 'units'} left)`
                  : `${inv.name}${inv.sku ? ` [${inv.sku}]` : ''}`}
              </option>
            ))}
          </select>
        )}
        <input
          className={inputCls}
          value={item.name || ''}
          onChange={e => update('name', e.target.value)}
          placeholder="Item name"
        />
        <input
          className={cn(inputCls, 'mt-1 text-xs text-text-muted')}
          value={item.description || ''}
          onChange={e => update('description', e.target.value)}
          placeholder="Description (optional)"
        />
        {selectedInv && mode === 'invoice' && (
          <p className={cn('text-[11px] mt-0.5', overStock ? 'text-negative' : 'text-text-muted')}>
            {overStock
              ? `⚠ Only ${selectedInv.currentStock} ${selectedInv.unit || 'units'} in stock`
              : `${selectedInv.currentStock} ${selectedInv.unit || 'units'} in stock`}
          </p>
        )}
      </td>

      {/* Qty */}
      <td className="w-20 px-1 py-2">
        <input
          type="number"
          className={cn(numCls, overStock ? 'border-negative/60' : '')}
          value={item.quantity || ''}
          onChange={e => update('quantity', parseFloat(e.target.value) || 0)}
          min="0"
          step="any"
        />
      </td>

      {/* Unit Price */}
      <td className="w-24 px-1 py-2">
        <input
          type="number"
          className={numCls}
          value={item.unitPrice || ''}
          onChange={e => update('unitPrice', parseFloat(e.target.value) || 0)}
          min="0"
          step="any"
        />
      </td>

      {/* Discount */}
      <td className="w-28 px-1 py-2">
        <div className="flex gap-1">
          <input
            type="number"
            className={cn(numCls, 'flex-1')}
            value={item.discountValue || ''}
            onChange={e => update('discountValue', parseFloat(e.target.value) || 0)}
            min="0"
            step="any"
            placeholder="0"
          />
          <select
            className="rounded border border-glass bg-glass-panel px-1 py-1 text-xs text-text-secondary"
            value={item.discountType || ''}
            onChange={e => update('discountType', e.target.value || null)}
          >
            <option value="">—</option>
            <option value="percentage">%</option>
            <option value="fixed">$</option>
          </select>
        </div>
      </td>

      {/* Tax % */}
      <td className="w-20 px-1 py-2">
        <input
          type="number"
          className={numCls}
          value={item.taxRate || ''}
          onChange={e => update('taxRate', parseFloat(e.target.value) || 0)}
          min="0"
          max="100"
          step="any"
          placeholder="0"
        />
      </td>

      {/* Line Total (read-only) */}
      <td className="w-24 px-1 py-2 text-right text-sm font-semibold tabular-nums text-text-primary">
        {lineTotal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>

      {/* Delete */}
      <td className="w-8 px-1 py-2 text-center">
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded p-1 text-text-muted hover:text-negative hover:bg-negative/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}
