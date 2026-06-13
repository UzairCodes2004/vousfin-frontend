/**
 * ExpenseAllocationForm — Phase 3.3
 *
 * Form to split a bill's total cost across departments/branches/projects.
 * Supports equal | percentage | amount methods with real-time balance check.
 *
 * Props:
 *   bill           — Bill document (needs _id, totalAmount, currencyCode)
 *   existing       — existing BillAllocation (for pre-fill)
 *   onSave(data)   — called with { method, lines, notes }
 *   onCancel()
 *   isSaving
 */
import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'

const METHODS = [
  { value: 'equal',      label: 'Equal split' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'amount',     label: 'Fixed amount' },
]

const CENTER_TYPES = ['department', 'branch', 'project', 'cost_center']

const r2 = (v) => Math.round((v || 0) * 100) / 100

function newLine() {
  return { costCenterType: 'department', costCenterId: '', costCenterName: '', percentage: '', amount: '', note: '' }
}

export default function ExpenseAllocationForm({ bill, existing, onSave, onCancel, isSaving }) {
  const total = bill?.totalAmount || 0
  const [method, setMethod] = useState('percentage')
  const [lines, setLines]   = useState([newLine(), newLine()])
  const [notes, setNotes]   = useState('')

  // Pre-fill from existing allocation
  useEffect(() => {
    if (existing) {
      setMethod(existing.method || 'percentage')
      setNotes(existing.notes || '')
      setLines(
        (existing.lines || []).map(l => ({
          costCenterType: l.costCenterType || 'department',
          costCenterId:   l.costCenterId || '',
          costCenterName: l.costCenterName || '',
          percentage:     l.percentage != null ? String(l.percentage) : '',
          amount:         l.amount != null ? String(l.amount) : '',
          note:           l.note || '',
        }))
      )
    }
  }, [existing])

  const updateLine = (i, key, val) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l))
  }

  const addLine    = () => setLines(prev => [...prev, newLine()])
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i))

  // Compute balance check
  let balance = 0
  let balanced = false
  if (method === 'equal') {
    balance  = 0
    balanced = true
  } else if (method === 'percentage') {
    const sum = lines.reduce((s, l) => s + (parseFloat(l.percentage) || 0), 0)
    balance  = r2(100 - sum)
    balanced = Math.abs(balance) < 0.01
  } else {
    const sum = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
    balance  = r2(total - sum)
    balanced = Math.abs(balance) < 0.05
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const parsedLines = lines.map(l => ({
      costCenterType: l.costCenterType,
      costCenterId:   l.costCenterId,
      costCenterName: l.costCenterName,
      percentage:     method === 'percentage' ? parseFloat(l.percentage) || 0 : undefined,
      amount:         method === 'amount'     ? parseFloat(l.amount)     || 0 : undefined,
      note:           l.note || null,
    }))
    onSave({ method, lines: parsedLines, notes })
  }

  const inputCls = 'w-full bg-navy border border-glass rounded px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-cyan'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Method selector */}
      <div className="flex gap-2">
        {METHODS.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMethod(m.value)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${method === m.value
                ? 'bg-cyan text-navy'
                : 'bg-glass text-text-secondary hover:text-text-primary'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Lines */}
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start">
            {/* Type */}
            <select
              value={line.costCenterType}
              onChange={e => updateLine(i, 'costCenterType', e.target.value)}
              className={`col-span-2 ${inputCls} capitalize`}
            >
              {CENTER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>

            {/* ID */}
            <input
              type="text"
              placeholder="Code / ID"
              value={line.costCenterId}
              onChange={e => updateLine(i, 'costCenterId', e.target.value)}
              className={`col-span-2 ${inputCls}`}
              required
            />

            {/* Name */}
            <input
              type="text"
              placeholder="Name"
              value={line.costCenterName}
              onChange={e => updateLine(i, 'costCenterName', e.target.value)}
              className={`col-span-3 ${inputCls}`}
              required
            />

            {/* % or Amount */}
            {method !== 'equal' && (
              <input
                type="number"
                placeholder={method === 'percentage' ? '%' : 'Amount'}
                value={method === 'percentage' ? line.percentage : line.amount}
                onChange={e => updateLine(i, method === 'percentage' ? 'percentage' : 'amount', e.target.value)}
                step="0.01"
                min="0"
                className={`col-span-2 ${inputCls}`}
                required
              />
            )}

            {/* Note */}
            <input
              type="text"
              placeholder="Note"
              value={line.note}
              onChange={e => updateLine(i, 'note', e.target.value)}
              className={`${method !== 'equal' ? 'col-span-2' : 'col-span-4'} ${inputCls}`}
            />

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeLine(i)}
              disabled={lines.length <= 1}
              className="col-span-1 flex items-center justify-center text-text-muted hover:text-negative disabled:opacity-30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Balance indicator */}
      {method !== 'equal' && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded ${
          balanced ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
        }`}>
          {balanced
            ? <><CheckCircle2 className="h-3.5 w-3.5" /> Allocation is balanced</>
            : <><AlertCircle  className="h-3.5 w-3.5" />
                {method === 'percentage'
                  ? `${Math.abs(balance).toFixed(2)}% remaining`
                  : `${Math.abs(balance).toFixed(2)} unallocated`}
              </>
          }
        </div>
      )}

      {/* Add line + notes */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={addLine}
          className="flex items-center gap-1 text-xs text-cyan hover:text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add line
        </button>
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isSaving || (!balanced && method !== 'equal')}
          className="px-4 py-1.5 bg-cyan text-navy rounded text-sm font-medium
                     hover:bg-cyan/80 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Allocation'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-glass text-text-secondary rounded text-sm
                     hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
