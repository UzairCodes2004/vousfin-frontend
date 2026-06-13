/**
 * Approvals (#6)
 *
 * When you turn on approvals, any transaction above your limit waits here
 * instead of posting straight to the books. Approve it and VousFin posts the
 * real journal entry; reject it and nothing is recorded. Nothing touches your
 * ledger until you approve — so your books stay clean and every decision is logged.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, X, Loader2, ShieldCheck, Clock } from 'lucide-react'
import approvalService from '@/services/approval.service'
import { useAccounts } from '@/hooks/useAccounts'
import { getErrorMessage } from '@/utils/errorHandler'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')
const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

function Queue() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [busyId, setBusyId] = useState(null)
  const accountsQuery = useAccounts()
  const accName = (id) => accountsQuery.data?.find((a) => a._id === id)?.accountName || '—'

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', status],
    queryFn: () => approvalService.list({ status }).then((r) => r.data.data),
    staleTime: 10_000,
  })
  const items = data?.data || []

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['approvals'] })
    qc.invalidateQueries({ queryKey: ['approvals-count'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  const decide = async (id, action) => {
    let reason
    if (action === 'reject') {
      // Optional: record WHY it was rejected (kept in the audit trail).
      reason = window.prompt('Reason for rejecting (optional):', '')
      if (reason === null) return // user hit Cancel — don't reject
    }
    setBusyId(id)
    try {
      if (action === 'approve') { await approvalService.approve(id); toast.success('Approved & posted to your ledger') }
      else { await approvalService.reject(id, reason || undefined); toast('Rejected', { icon: '🚫' }) }
      refresh()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setBusyId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {STATUS_FILTERS.map((s) => (
          <button key={s.key} onClick={() => setStatus(s.key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${status === s.key ? 'bg-cyan text-navy' : 'bg-glass-panel text-text-secondary hover:bg-glass-hover'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-glass-panel animate-pulse rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nothing {status} right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p._id} className="bg-navy-2 rounded-xl border border-glass p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary text-sm truncate">{p.description}</p>
                  <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {fmtDate(p.transactionDate)} · by {p.submittedBy?.fullName || 'You'}
                    {p.source === 'recurring' && <span className="ml-1 px-1.5 py-0.5 rounded bg-accent-2/10 text-accent-2">recurring</span>}
                  </p>
                </div>
                <p className="font-bold text-text-primary shrink-0">{Number(p.amount).toLocaleString()}</p>
              </div>

              <div className="bg-glass-panel rounded-lg p-2.5 text-xs mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between"><span className="text-text-muted">Debit</span><span className="font-medium text-text-primary truncate ml-2">{accName(p.debitAccountId?._id || p.debitAccountId)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Credit</span><span className="font-medium text-text-primary truncate ml-2">{accName(p.creditAccountId?._id || p.creditAccountId)}</span></div>
              </div>

              {p.status === 'pending' ? (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => decide(p._id, 'approve')} disabled={busyId === p._id}
                    className="flex-1 flex items-center justify-center gap-1.5 btn-gradient text-xs font-medium py-1.5 rounded-lg disabled:opacity-50">
                    {busyId === p._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve &amp; post
                  </button>
                  <button onClick={() => decide(p._id, 'reject')} disabled={busyId === p._id}
                    className="px-3 border border-glass-2 hover:bg-negative/15 hover:border-negative/40 text-negative text-xs font-medium py-1.5 rounded-lg flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              ) : (
                <p className={`text-xs mt-3 font-medium ${p.status === 'approved' ? 'text-positive' : 'text-negative'}`}>
                  {p.status === 'approved' ? '✓ Approved & posted' : '✕ Rejected'}
                  {p.reviewedBy?.fullName ? ` by ${p.reviewedBy.fullName}` : ''}{p.decisionNote ? ` — ${p.decisionNote}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Settings() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['approval-settings'],
    queryFn: () => approvalService.getSettings().then((r) => r.data.data),
    staleTime: 30_000,
  })
  // Seed local form once loaded
  if (data && form === null) {
    setForm({ enabled: !!data.enabled, threshold: data.threshold ?? 0, allowSelfApproval: data.allowSelfApproval !== false })
  }

  if (isLoading || form === null) return <div className="h-40 bg-glass-panel animate-pulse rounded-xl" />

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const inp = 'w-full text-sm border border-glass-2 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-cyan'

  const save = async () => {
    setSaving(true)
    try {
      await approvalService.updateSettings({
        enabled: form.enabled, threshold: Number(form.threshold) || 0, allowSelfApproval: form.allowSelfApproval,
      })
      toast.success('Approval settings saved')
      qc.invalidateQueries({ queryKey: ['approval-settings'] })
      qc.invalidateQueries({ queryKey: ['approvals-count'] })
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg bg-navy-2 rounded-xl border border-glass p-5 shadow-sm space-y-5">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span>
          <span className="block text-sm font-semibold text-text-primary">Require approval for big transactions</span>
          <span className="block text-xs text-text-muted mt-0.5">When on, transactions above the limit wait for approval before posting.</span>
        </span>
        <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="h-5 w-5 rounded" />
      </label>

      <div className={form.enabled ? '' : 'opacity-50 pointer-events-none'}>
        <label className="text-xs font-medium text-text-secondary">Approval limit</label>
        <input type="number" min="0" step="1" className={inp} value={form.threshold} onChange={(e) => set('threshold', e.target.value)} placeholder="100000" />
        <p className="text-xs text-text-muted mt-1">Transactions for more than this amount need approval. Smaller ones post right away.</p>
      </div>

      <label className={`flex items-center justify-between gap-3 cursor-pointer ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <span>
          <span className="block text-sm font-semibold text-text-primary">Let the submitter approve their own</span>
          <span className="block text-xs text-text-muted mt-0.5">Turn off for stricter separation (someone else must approve).</span>
        </span>
        <input type="checkbox" checked={form.allowSelfApproval} onChange={(e) => set('allowSelfApproval', e.target.checked)} className="h-5 w-5 rounded" />
      </label>

      <button onClick={save} disabled={saving} className="btn-gradient text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save settings
      </button>
    </div>
  )
}

const TABS = [{ key: 'queue', label: 'Queue' }, { key: 'settings', label: 'Settings' }]

export default function ApprovalsQueuePage() {
  const [tab, setTab] = useState('queue')
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Approvals</h1>
        <p className="text-sm text-text-muted mt-1">Review big transactions before they hit your books.</p>
      </div>

      <div className="flex gap-1 border-b border-glass">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === t.key ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' ? <Queue /> : <Settings />}
    </div>
  )
}
