/**
 * Recurring & Templates (#5)
 *
 * A template is a saved transaction you reuse with one click ("Use now"). Turn
 * on "Repeat automatically" and VousFin posts it for you on a schedule. Every
 * posting flows through the normal transaction engine, so it appears in your
 * ledger, balances and reports — and obeys the approval limit if you set one.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Repeat, Play, Pencil, Trash2, X, Loader2, Clock } from 'lucide-react'
import templateService from '@/services/transactionTemplate.service'
import { useAccounts } from '@/hooks/useAccounts'
import { getErrorMessage } from '@/utils/errorHandler'

const PATTERNS = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'annual', label: 'Every year' },
]
const patternLabel = (p) => PATTERNS.find((x) => x.value === p)?.label || p
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')

const EMPTY = {
  name: '', description: '', amount: '',
  debitAccountId: '', creditAccountId: '',
  partyType: '', partyName: '',
  isRecurring: false, recurrencePattern: 'monthly', startDate: '', endDate: '',
}

function TemplateModal({ open, onClose, onSaved, editing }) {
  const { data: accounts = [] } = useAccounts()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  // Sync form when opening for create/edit
  const [lastId, setLastId] = useState(null)
  const editId = editing?._id || null
  if (open && editId !== lastId) {
    setLastId(editId)
    setForm(editing ? {
      name: editing.name || '', description: editing.description || '',
      amount: editing.amount ?? '', debitAccountId: editing.debitAccountId || '',
      creditAccountId: editing.creditAccountId || '',
      partyType: editing.partyType || '', partyName: editing.partyName || '',
      isRecurring: !!editing.isRecurring, recurrencePattern: editing.recurrencePattern || 'monthly',
      startDate: editing.startDate ? editing.startDate.slice(0, 10) : '',
      endDate: editing.endDate ? editing.endDate.slice(0, 10) : '',
    } : EMPTY)
  }
  if (open && !editId && lastId !== 'new') { setLastId('new'); setForm(EMPTY) }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  if (!open) return null

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Give the template a name')
    if (!form.description.trim()) return toast.error('Add a description')
    if (!(Number(form.amount) > 0)) return toast.error('Amount must be more than zero')
    if (!form.debitAccountId || !form.creditAccountId) return toast.error('Pick both accounts')
    if (form.debitAccountId === form.creditAccountId) return toast.error('Debit and credit must differ')
    if (form.isRecurring && !form.recurrencePattern) return toast.error('Choose how often it repeats')

    const payload = {
      name: form.name.trim(), description: form.description.trim(),
      amount: Number(form.amount),
      debitAccountId: form.debitAccountId, creditAccountId: form.creditAccountId,
      partyType: form.partyType || null, partyName: form.partyName.trim() || null,
      isRecurring: form.isRecurring,
      ...(form.isRecurring ? {
        recurrencePattern: form.recurrencePattern,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      } : {}),
    }
    setSaving(true)
    try {
      if (editId) await templateService.update(editId, payload)
      else await templateService.create(payload)
      toast.success(editId ? 'Template updated' : 'Template saved')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally { setSaving(false) }
  }

  const inp = 'w-full text-sm border border-glass-2 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-cyan'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-navy-2 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-text-primary">{editId ? 'Edit template' : 'New template'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary">Template name</label>
            <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Monthly office rent" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Description (shown on each transaction)</label>
            <input className={inp} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Office rent" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Amount</label>
            <input type="number" min="0" step="0.01" className={inp} value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="25000" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Debit account</label>
              <select className={inp} value={form.debitAccountId} onChange={(e) => set('debitAccountId', e.target.value)}>
                <option value="">Select…</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.accountName} ({a.accountType})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Credit account</label>
              <select className={inp} value={form.creditAccountId} onChange={(e) => set('creditAccountId', e.target.value)}>
                <option value="">Select…</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.accountName} ({a.accountType})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Party (optional)</label>
              <select className={inp} value={form.partyType} onChange={(e) => set('partyType', e.target.value)}>
                <option value="">None</option>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Party name</label>
              <input className={inp} value={form.partyName} onChange={(e) => set('partyName', e.target.value)} disabled={!form.partyType} placeholder={form.partyType ? 'Name' : '—'} />
            </div>
          </div>

          {/* Recurring */}
          <div className="rounded-lg border border-glass p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
              <input type="checkbox" checked={form.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)} className="rounded" />
              <Repeat className="w-4 h-4 text-cyan" /> Repeat automatically
            </label>
            {form.isRecurring && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-muted">How often</label>
                  <select className={inp} value={form.recurrencePattern} onChange={(e) => set('recurrencePattern', e.target.value)}>
                    {PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Start</label>
                  <input type="date" className={inp} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-text-muted">End (optional)</label>
                  <input type="date" className={inp} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-text-secondary hover:bg-glass-hover">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm btn-gradient rounded-lg disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Save changes' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['transaction-templates'],
    queryFn: () => templateService.list().then((r) => r.data.data),
    staleTime: 30_000,
  })
  const accountsQuery = useAccounts()
  const accName = (id) => accountsQuery.data?.find((a) => a._id === id)?.accountName || '—'

  const refresh = () => qc.invalidateQueries({ queryKey: ['transaction-templates'] })

  const applyNow = async (t) => {
    setBusyId(t._id)
    try {
      const res = await templateService.apply(t._id, {})
      const d = res.data.data
      if (d?.status === 'pending') toast(res.data.message || 'Sent for approval', { icon: '🕓' })
      else toast.success('Posted to your ledger')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setBusyId(null) }
  }

  const del = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return
    try { await templateService.remove(t._id); toast.success('Deleted'); refresh() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (t) => { setEditing(t); setModalOpen(true) }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Recurring &amp; Templates</h1>
          <p className="text-sm text-text-muted mt-1">
            Save transactions you record often. Use them with one click, or let them repeat automatically.
          </p>
        </div>
        <button onClick={openNew} className="shrink-0 flex items-center gap-1.5 btn-gradient text-sm font-medium px-3.5 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> New template
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-glass-panel animate-pulse rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <Repeat className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No templates yet.</p>
          <p className="text-xs mt-1">Create one to reuse a common transaction or schedule it to repeat.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t._id} className="bg-navy-2 rounded-xl border border-glass p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary text-sm truncate">{t.name}</p>
                  <p className="text-xs text-text-muted truncate">{t.description}</p>
                </div>
                <p className="font-bold text-text-primary text-sm shrink-0">{Number(t.amount).toLocaleString()}</p>
              </div>

              <div className="bg-glass-panel rounded-lg p-2.5 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-text-muted">Debit</span><span className="font-medium text-text-primary truncate ml-2">{accName(t.debitAccountId)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Credit</span><span className="font-medium text-text-primary truncate ml-2">{accName(t.creditAccountId)}</span></div>
                {t.partyName && <div className="flex justify-between"><span className="text-text-muted">{t.partyType === 'vendor' ? 'Vendor' : 'Customer'}</span><span className="font-medium text-cyan truncate ml-2">{t.partyName}</span></div>}
              </div>

              {t.isRecurring && (
                <div className="flex items-center gap-1.5 text-xs text-cyan bg-cyan/10 rounded-lg px-2.5 py-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {patternLabel(t.recurrencePattern)} · next {fmtDate(t.nextRunDate)}
                  {t.runCount > 0 && <span className="text-cyan">· run {t.runCount}×</span>}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => applyNow(t)} disabled={busyId === t._id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-2 hover:bg-emerald text-white text-xs font-medium py-1.5 rounded-lg disabled:opacity-50">
                  {busyId === t._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Use now
                </button>
                <button onClick={() => openEdit(t)} className="px-3 border border-glass-2 hover:bg-glass-hover text-text-secondary rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(t)} className="px-3 border border-glass-2 hover:bg-negative/15 hover:border-negative/40 text-negative rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </div>
  )
}
