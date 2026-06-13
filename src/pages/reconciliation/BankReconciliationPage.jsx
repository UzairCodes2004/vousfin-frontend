/**
 * Bank Reconciliation (#7)
 *
 * Import your bank statement for an account, then tick off each line against
 * your books. VousFin auto-matches the obvious ones and suggests the rest;
 * confirm a match, mark a line cleared, or post a brand-new entry straight from
 * a statement line. Your books are never touched until you act — and a posted
 * entry goes through the normal transaction engine.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Upload, FileSpreadsheet, Loader2, Check, X, Plus, Trash2, ArrowLeft,
  CheckCircle2, AlertTriangle, Banknote, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'
import reconApi from '@/services/bankReconciliation.service'
import { useAccounts } from '@/hooks/useAccounts'
import { getErrorMessage } from '@/utils/errorHandler'

const money = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')

/* ─────────────────────────── New reconciliation wizard ─────────────────────── */
function StartReconciliation({ onStarted }) {
  const { data: accounts = [] } = useAccounts()
  const assetAccounts = accounts.filter((a) => a.accountType === 'Asset')
  const [bankAccountId, setBankAccountId] = useState('')
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [opening, setOpening] = useState('')
  const [closing, setClosing] = useState('')
  const [busy, setBusy] = useState(false)

  const onFile = async (f) => {
    if (!f) return
    setFile(f); setParsed(null); setBusy(true)
    try {
      const res = await reconApi.parse(f)
      setParsed(res.data.data)
      toast.success(`${res.data.data.count} lines read`)
    } catch (e) { toast.error(getErrorMessage(e)); setFile(null) }
    finally { setBusy(false) }
  }

  const startImport = async () => {
    if (!bankAccountId) return toast.error('Choose the bank account this statement belongs to')
    if (!parsed?.lines?.length) return toast.error('Upload a statement file first')
    setBusy(true)
    try {
      const res = await reconApi.import({
        bankAccountId, lines: parsed.lines, fileName: parsed.fileName,
        openingBalance: opening !== '' ? Number(opening) : undefined,
        closingBalance: closing !== '' ? Number(closing) : undefined,
      })
      toast.success('Statement imported & matched')
      onStarted(res.data.data._id)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setBusy(false) }
  }

  const inp = 'w-full text-sm border border-glass-2 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-cyan'

  return (
    <div className="bg-navy-2 rounded-xl border border-glass p-5 shadow-sm space-y-4 max-w-xl">
      <h2 className="font-semibold text-text-primary flex items-center gap-2"><Banknote className="w-5 h-5 text-cyan" /> Start a new reconciliation</h2>

      <div>
        <label className="text-xs font-medium text-text-secondary">Bank / cash account</label>
        <select className={inp} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
          <option value="">Select account…</option>
          {assetAccounts.map((a) => <option key={a._id} value={a._id}>{a.accountName}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text-secondary">Statement file (.csv, .xlsx, .xls)</label>
        <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-glass-2 rounded-lg py-6 cursor-pointer hover:border-cyan hover:bg-cyan/10 text-sm text-text-muted">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {file ? file.name : 'Click to choose a file'}
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <p className="text-xs text-text-muted mt-1">Needs a Date column and an Amount (or Debit/Credit) column.</p>
      </div>

      {parsed && (
        <div className="bg-glass-panel rounded-lg p-3 text-xs">
          <p className="font-medium text-text-secondary mb-1.5 flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> {parsed.count} transactions found</p>
          <div className="space-y-0.5 max-h-28 overflow-y-auto">
            {parsed.lines.slice(0, 5).map((l, i) => (
              <div key={i} className="flex justify-between text-text-secondary">
                <span className="truncate mr-2">{fmtDate(l.date)} · {l.description || '—'}</span>
                <span className={l.direction === 'in' ? 'text-positive' : 'text-negative'}>
                  {l.direction === 'in' ? '+' : '−'}{money(l.amount)}
                </span>
              </div>
            ))}
            {parsed.lines.length > 5 && <p className="text-text-muted">…and {parsed.lines.length - 5} more</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-text-secondary">Opening balance (optional)</label>
          <input type="number" className={inp} value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="e.g. 100000" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Closing balance (optional)</label>
          <input type="number" className={inp} value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="e.g. 250000" />
        </div>
      </div>

      <button onClick={startImport} disabled={busy || !parsed} className="w-full btn-gradient text-sm font-medium py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Import &amp; auto-match
      </button>
    </div>
  )
}

/* ─────────────────────────── Session list ──────────────────────────────────── */
function SessionList({ onOpen }) {
  const qc = useQueryClient()
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['recon-sessions'],
    queryFn: () => reconApi.list().then((r) => r.data.data),
    staleTime: 20_000,
  })
  const del = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this reconciliation session? Your ledger entries are not affected.')) return
    try { await reconApi.remove(id); toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['recon-sessions'] }) }
    catch (err) { toast.error(getErrorMessage(err)) }
  }
  if (isLoading) return <div className="h-24 bg-glass-panel animate-pulse rounded-xl" />
  if (sessions.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text-secondary">Past reconciliations</h3>
      {sessions.map((s) => (
        <div key={s._id} onClick={() => onOpen(s._id)}
          className="flex items-center justify-between bg-navy-2 border border-glass rounded-lg px-4 py-3 cursor-pointer hover:bg-glass-hover">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
            <p className="text-xs text-text-muted">{s.bankAccountName} · {fmtDate(s.periodEnd)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-positive/10 text-positive' : 'bg-amber/10 text-amber'}`}>{s.status === 'completed' ? 'Done' : 'In progress'}</span>
            <button onClick={(e) => del(s._id, e)} className="text-text-muted hover:text-negative"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── Summary bar ───────────────────────────────────── */
function Stat({ label, value, tone }) {
  return (
    <div className="text-center px-3">
      <p className={`text-lg font-bold ${tone || 'text-text-primary'}`}>{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}

function SummaryBar({ s }) {
  return (
    <div className="bg-navy-2 border border-glass rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-around gap-y-3 divide-x divide-glass">
        <Stat label="Matched" value={`${s.matched + s.cleared}/${s.totalLines}`} tone="text-cyan" />
        <Stat label="Needs review" value={s.unmatched} tone={s.unmatched ? 'text-amber' : 'text-positive'} />
        <Stat label="Money in" value={money(s.inflow)} tone="text-positive" />
        <Stat label="Money out" value={money(s.outflow)} tone="text-negative" />
        <Stat label="In books only" value={s.unmatchedBookCount} />
      </div>
      {s.closing != null && s.expectedClosing != null && (
        <div className={`mt-3 text-xs text-center rounded-lg py-1.5 ${s.closingMatches ? 'bg-positive/10 text-positive' : 'bg-amber/10 text-amber'}`}>
          {s.closingMatches
            ? <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Opening + statement activity matches the closing balance</>
            : <><AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Expected closing {money(s.expectedClosing)} ≠ statement closing {money(s.closing)}</>}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── A single bank line ────────────────────────────── */
function LineRow({ stmtId, line, accounts, onChange }) {
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [catId, setCatId] = useState('')
  const inLine = line.direction === 'in'

  const act = async (fn, okMsg) => {
    setBusy(true)
    try { const res = await fn(); if (okMsg) toast.success(okMsg); onChange(res.data.data) }
    catch (e) { toast.error(getErrorMessage(e)) }
    finally { setBusy(false) }
  }

  const matched = line.status === 'matched' || line.status === 'created'
  const cleared = line.status === 'cleared'

  return (
    <div className={`border rounded-xl p-3.5 ${matched ? 'border-positive/30 bg-positive/10' : cleared ? 'border-glass bg-glass-panel' : 'border-amber/30 bg-navy-2'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {inLine ? <ArrowDownLeft className="w-4 h-4 text-positive mt-0.5 shrink-0" /> : <ArrowUpRight className="w-4 h-4 text-negative mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{line.description || '—'}</p>
            <p className="text-xs text-text-muted">{fmtDate(line.date)}{line.reference ? ` · ${line.reference}` : ''}</p>
          </div>
        </div>
        <p className={`text-sm font-bold shrink-0 ${inLine ? 'text-positive' : 'text-negative'}`}>{inLine ? '+' : '−'}{money(line.amount)}</p>
      </div>

      {/* Matched / cleared state */}
      {matched && (
        <div className="mt-2 flex items-center justify-between text-xs bg-navy-2 border border-positive/30 rounded-lg px-2.5 py-1.5">
          <span className="text-positive truncate">
            <Check className="w-3.5 h-3.5 inline mr-1" />
            {line.status === 'created' ? 'New entry posted' : 'Matched'}{line.matchedEntry ? `: ${line.matchedEntry.description}` : ''}
            {line.autoMatched ? ' (auto)' : ''}
          </span>
          <button disabled={busy} onClick={() => act(() => reconApi.unmatch(stmtId, line.lineRef), 'Unmatched')} className="text-text-muted hover:text-negative shrink-0 ml-2">Undo</button>
        </div>
      )}
      {cleared && (
        <div className="mt-2 flex items-center justify-between text-xs bg-navy-2 border border-glass rounded-lg px-2.5 py-1.5">
          <span className="text-text-muted">Marked cleared{line.note ? `: ${line.note}` : ''}</span>
          <button disabled={busy} onClick={() => act(() => reconApi.unmatch(stmtId, line.lineRef), 'Reopened')} className="text-text-muted hover:text-cyan">Undo</button>
        </div>
      )}

      {/* Unmatched: candidates + actions */}
      {!matched && !cleared && (
        <div className="mt-3 space-y-2">
          {line.candidates?.length > 0 ? (
            line.candidates.map((c) => (
              <div key={c.journalEntryId} className="flex items-center justify-between gap-2 bg-glass-panel rounded-lg px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{c.description || '—'}</p>
                  <p className="text-xs text-text-muted">{fmtDate(c.date)} · {money(c.amount)} · {c.score}% match</p>
                </div>
                <button disabled={busy} onClick={() => act(() => reconApi.match(stmtId, line.lineRef, c.journalEntryId), 'Matched')}
                  className="shrink-0 text-xs btn-gradient px-2.5 py-1 rounded-lg">Confirm</button>
              </div>
            ))
          ) : (
            <p className="text-xs text-text-muted">No matching entry in your books for this line.</p>
          )}

          {/* Create entry inline */}
          {creating ? (
            <div className="flex items-center gap-2 pt-1">
              <select value={catId} onChange={(e) => setCatId(e.target.value)} className="flex-1 text-xs border border-glass-2 rounded-lg px-2 py-1.5">
                <option value="">{inLine ? 'Income/source account…' : 'Expense/category account…'}</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.accountName} ({a.accountType})</option>)}
              </select>
              <button disabled={busy || !catId} onClick={() => act(() => reconApi.create(stmtId, line.lineRef, { categoryAccountId: catId }), 'Entry posted')}
                className="shrink-0 text-xs btn-gradient px-2.5 py-1.5 rounded-lg disabled:opacity-50">Post</button>
              <button onClick={() => setCreating(false)} className="text-text-muted"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2 pt-0.5">
              <button onClick={() => setCreating(true)} className="text-xs text-cyan hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Create entry</button>
              <button disabled={busy} onClick={() => act(() => reconApi.clear(stmtId, line.lineRef), 'Cleared')} className="text-xs text-text-muted hover:underline">Mark cleared</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Workspace ─────────────────────────────────────── */
function Workspace({ id, onBack }) {
  const qc = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: stmt, isLoading } = useQuery({
    queryKey: ['recon-statement', id],
    queryFn: () => reconApi.get(id).then((r) => r.data.data),
    staleTime: 5_000,
  })
  const [tab, setTab] = useState('review')

  const applyUpdate = (updated) => qc.setQueryData(['recon-statement', id], updated)

  const finish = async () => {
    try {
      const res = await reconApi.finish(id)
      applyUpdate(res.data.data)
      qc.invalidateQueries({ queryKey: ['recon-sessions'] })
      toast.success('Reconciliation completed')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  if (isLoading) return <div className="h-64 bg-glass-panel animate-pulse rounded-xl" />
  if (!stmt) return null

  const unmatched = stmt.lines.filter((l) => l.status === 'unmatched')
  const done = stmt.lines.filter((l) => l.status !== 'unmatched')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> All reconciliations</button>
        <button onClick={finish} disabled={stmt.status === 'completed'}
          className="text-sm btn-gradient disabled:opacity-50 font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> {stmt.status === 'completed' ? 'Completed' : 'Finish reconciliation'}
        </button>
      </div>

      <div>
        <h1 className="text-lg font-bold text-text-primary">{stmt.name}</h1>
        <p className="text-sm text-text-muted">{stmt.bankAccountName} · {fmtDate(stmt.periodStart)} – {fmtDate(stmt.periodEnd)}</p>
      </div>

      <SummaryBar s={stmt.summary} />

      <div className="flex gap-1 border-b border-glass">
        {[
          { key: 'review', label: `Needs review (${unmatched.length})` },
          { key: 'done', label: `Reconciled (${done.length})` },
          { key: 'books', label: `In books only (${stmt.unmatchedBookEntries?.length || 0})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-sm px-3 py-2 font-medium border-b-2 ${tab === t.key ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'review' && (
        <div className="space-y-2.5">
          {unmatched.length === 0
            ? <div className="text-center py-12 text-text-muted"><CheckCircle2 className="w-9 h-9 mx-auto mb-2 opacity-40" /><p className="text-sm">Every statement line is reconciled.</p></div>
            : unmatched.map((l) => <LineRow key={l.lineRef} stmtId={id} line={l} accounts={accounts} onChange={applyUpdate} />)}
        </div>
      )}
      {tab === 'done' && (
        <div className="space-y-2.5">
          {done.length === 0 ? <p className="text-sm text-text-muted text-center py-12">Nothing reconciled yet.</p>
            : done.map((l) => <LineRow key={l.lineRef} stmtId={id} line={l} accounts={accounts} onChange={applyUpdate} />)}
        </div>
      )}
      {tab === 'books' && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">These ledger entries touch this account but weren’t on the statement (timing differences, or not yet cleared by the bank).</p>
          {(stmt.unmatchedBookEntries || []).length === 0
            ? <p className="text-sm text-text-muted text-center py-12">Everything in your books is on the statement.</p>
            : stmt.unmatchedBookEntries.map((e) => (
              <div key={e._id} className="flex items-center justify-between bg-navy-2 border border-glass rounded-lg px-3 py-2 text-sm">
                <div className="min-w-0"><p className="font-medium text-text-primary truncate">{e.description}</p><p className="text-xs text-text-muted">{fmtDate(e.date)}</p></div>
                <p className={`font-semibold shrink-0 ${e.direction === 'in' ? 'text-positive' : 'text-negative'}`}>{e.direction === 'in' ? '+' : '−'}{money(e.amount)}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Page shell ────────────────────────────────────── */
export default function BankReconciliationPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const open = (sid) => setParams(sid ? { id: sid } : {})

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {!id && (
        <div>
          <h1 className="text-xl font-bold text-text-primary">Bank Reconciliation</h1>
          <p className="text-sm text-text-muted mt-1">Match your bank statement against your books — VousFin does the obvious ones for you.</p>
        </div>
      )}
      {id
        ? <Workspace id={id} onBack={() => open(null)} />
        : <><StartReconciliation onStarted={open} /><SessionList onOpen={open} /></>}
    </div>
  )
}
