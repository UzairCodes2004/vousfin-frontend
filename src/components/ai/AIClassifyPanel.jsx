/**
 * AIClassifyPanel — the "Let AI classify" mode inside the Record Transaction modal.
 *
 * Routes input through the Autonomous Transaction Engine (FR-01):
 *   dedup → AI classifier → auto-post (if confident) or AI Review Queue (if unsure).
 *
 * Two inputs:
 *   • Drag-and-drop CSV / Excel bank statement  (bulk)
 *   • Quick single transaction                  (one row)
 *
 * Styled for the modal's dark "glass" theme.
 */
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, Loader2, ArrowRight, Sparkles,
  MessageSquare,
} from 'lucide-react'
import ingestionApi from '@/services/ai/ingestionService'
import classifierApi from '@/services/ai/classifierService'
import transactionService from '@/services/transaction.service'
import { getErrorMessage } from '@/utils/errorHandler'

const TODAY = new Date().toISOString().slice(0, 10)

function Pill({ label, value, tone = 'muted' }) {
  const tones = {
    ok:    'text-positive border-positive/30 bg-positive/10',
    warn:  'text-amber border-amber/30 bg-amber/10',
    bad:   'text-negative border-negative/30 bg-negative/10',
    muted: 'text-text-secondary border-glass bg-glass-panel',
  }
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${tones[tone]}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[11px] mt-1">{label}</p>
    </div>
  )
}

export default function AIClassifyPanel({ onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile]   = useState(null)
  const [phase, setPhase] = useState('idle')   // idle | uploading | processing | done
  const [result, setResult] = useState(null)

  // quick-add
  const [form, setForm] = useState({ payee_raw: '', amount: '', tx_date: TODAY, tx_type: 'DEBIT', narration_raw: '' })
  const [busy, setBusy] = useState(false)
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // natural language (local parser, no Gemini)
  const [nlText, setNlText]   = useState('')
  const [nlBusy, setNlBusy]   = useState(false)
  const [nlResult, setNlResult] = useState(null)

  const goQueue = () => { onClose?.(); navigate('/ai/review-queue') }

  const handleNlParse = async () => {
    if (nlText.trim().length < 4) { toast.error('Type a bit more detail'); return }
    setNlBusy(true)
    try {
      const { data } = await classifierApi.nlParse(nlText)
      if (!data.amount) { toast.error("Couldn't find an amount — try e.g. 'paid 5000 to PSO for fuel'"); setNlResult(null) }
      else setNlResult(data)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Parse failed')
    } finally { setNlBusy(false) }
  }

  const handleNlPost = async () => {
    if (!nlResult?.debit_account_id || !nlResult?.credit_account_id) { toast.error('Accounts not resolved'); return }
    setNlBusy(true)
    try {
      await transactionService.create({
        transactionDate: nlResult.tx_date,
        description:     (nlResult.narration || nlResult.payee || 'AI transaction').slice(0, 200),
        amount:         Number(nlResult.amount),
        debitAccountId:  nlResult.debit_account_id,
        creditAccountId: nlResult.credit_account_id,
      })
      toast.success('Posted to your ledger')
      setNlText(''); setNlResult(null)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to post')
    } finally { setNlBusy(false) }
  }

  // ── CSV ─────────────────────────────────────────────────────────────────────
  const pick = (f) => {
    if (!f) return
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) { toast.error('Choose a .csv, .xlsx or .xls file'); return }
    setFile(f); setResult(null); setPhase('idle')
  }

  const pollStatus = async (jobId) => {
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1500))
      try {
        const { data } = await ingestionApi.importStatus(jobId)
        if (data.status === 'completed') return data
      } catch { /* keep polling */ }
    }
    return null
  }

  const upload = async () => {
    if (!file) return
    setPhase('uploading')
    try {
      const { data } = await ingestionApi.importCsv(file)
      setResult({ ...data, queued: 0, skipped: 0, failed: 0 })
      setPhase('processing')
      const final = await pollStatus(data.import_job_id)
      if (final) setResult(prev => ({ ...prev, ...final }))
      setPhase('done')
      toast.success('AI classified your transactions')
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Upload failed'
      toast.error(typeof msg === 'string' ? msg : 'Upload failed')
      setPhase('idle')
    }
  }

  // ── Quick add ─────────────────────────────────────────────────────────────────
  const submitOne = async (e) => {
    e.preventDefault()
    if (!form.payee_raw || !form.amount) { toast.error('Enter a payee and amount'); return }
    setBusy(true)
    try {
      await ingestionApi.ingestManual({
        payee_raw:     form.payee_raw,
        narration_raw: form.narration_raw || form.payee_raw,
        amount:        String(form.amount),
        tx_date:       form.tx_date,
        tx_type:       form.tx_type,
      })
      toast.success('Sent to the AI — check the Review Queue')
      setForm({ payee_raw: '', amount: '', tx_date: TODAY, tx_type: 'DEBIT', narration_raw: '' })
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Failed'
      toast.error(typeof msg === 'string' ? msg : 'Failed to send')
    } finally { setBusy(false) }
  }

  const field = 'w-full mt-1 bg-glass-panel border border-glass rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan outline-none'

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        The AI picks the account for you and posts a proper double-entry to your ledger.
        Type a sentence, upload a statement, or add one quickly — all run on your local model.
      </p>

      {/* ── Natural language (local, no Gemini) ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-cyan" />
          <h4 className="text-sm font-semibold text-text-primary">Type in plain English</h4>
          <span className="text-[10px] text-text-muted">· runs locally, no API cost</span>
        </div>
        <div className="flex gap-2">
          <input
            value={nlText}
            onChange={(e) => { setNlText(e.target.value); setNlResult(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleNlParse()}
            placeholder="e.g. paid 8500 to K-Electric for the bill"
            className="flex-1 bg-glass-panel border border-glass rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan outline-none"
          />
          <button onClick={handleNlParse} disabled={nlBusy}
            className="px-4 bg-cyan text-navy disabled:opacity-40 text-sm font-semibold rounded-lg shadow-glow-cyan">
            {nlBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Read'}
          </button>
        </div>

        {nlResult && (
          <div className="mt-3 bg-glass-panel border border-glass rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">{nlResult.payee}</span>
              <span className={`font-bold ${nlResult.tx_type === 'DEBIT' ? 'text-negative' : 'text-positive'}`}>
                {nlResult.tx_type === 'DEBIT' ? '-' : '+'}PKR {Number(nlResult.amount).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
              <span>📅 {nlResult.tx_date}</span>
              <span>Dr <strong className="text-text-primary">{nlResult.debit_account_name || '—'}</strong></span>
              <span>Cr <strong className="text-text-primary">{nlResult.credit_account_name || '—'}</strong></span>
            </div>
            <button onClick={handleNlPost} disabled={nlBusy || !nlResult.debit_account_id}
              className="w-full bg-cyan text-navy disabled:opacity-40 text-sm font-semibold py-2 rounded-lg shadow-glow-cyan flex items-center justify-center gap-2">
              {nlBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Post to ledger
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-glass" /><span className="text-[11px] text-text-muted">or import a file</span><div className="flex-1 h-px bg-glass" />
      </div>

      {/* ── CSV upload ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="w-4 h-4 text-cyan" />
          <h4 className="text-sm font-semibold text-text-primary">Upload a bank statement (CSV / Excel)</h4>
        </div>

        {phase === 'idle' && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]) }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors
                ${dragOver ? 'border-cyan bg-cyan/5' : 'border-glass hover:border-cyan/60 hover:bg-glass-hover'}`}
            >
              <UploadCloud className={`w-9 h-9 mx-auto mb-2 ${dragOver ? 'text-cyan' : 'text-text-muted'}`} />
              {file
                ? <p className="text-sm font-medium text-text-primary">{file.name}</p>
                : <>
                    <p className="text-sm font-medium text-text-secondary">Drag &amp; drop here</p>
                    <p className="text-xs text-text-muted mt-1">or click to browse · any column names work</p>
                  </>}
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={(e) => pick(e.target.files?.[0])} />
            </div>
            <button onClick={upload} disabled={!file}
              className="mt-3 w-full bg-cyan text-navy disabled:opacity-40 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-cyan">
              <Sparkles className="w-4 h-4" /> Classify with AI
            </button>
          </>
        )}

        {(phase === 'uploading' || phase === 'processing') && (
          <div className="py-8 text-center">
            <Loader2 className="w-9 h-9 mx-auto mb-2 text-cyan animate-spin" />
            <p className="text-sm text-text-secondary">
              {phase === 'uploading' ? 'Uploading & mapping columns…' : 'AI is classifying…'}
            </p>
            {result?.column_mapping && (
              <div className="mt-3 flex flex-wrap gap-1 justify-center">
                {Object.entries(result.column_mapping).filter(([, v]) => v).map(([c, f]) => (
                  <span key={c} className="text-[11px] bg-glass-panel border border-glass text-text-secondary px-2 py-0.5 rounded">{c} → {f}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'done' && result && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-positive">
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-sm font-medium">{result.total_rows} rows processed</p>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <Pill label="Rows"        value={result.total_rows ?? 0} tone="muted" />
              <Pill label="Sent to AI"  value={result.queued ?? result.valid_rows ?? 0} tone="ok" />
              <Pill label="Duplicates"  value={result.skipped ?? 0} tone="warn" />
              <Pill label="Skipped"     value={(result.invalid_rows ?? 0) + (result.failed ?? 0)} tone="bad" />
            </div>
            <div className="flex gap-2">
              <button onClick={goQueue}
                className="flex-1 bg-cyan text-navy text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-cyan">
                View AI Review Queue <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => { setFile(null); setResult(null); setPhase('idle') }}
                className="px-4 border border-glass text-text-secondary hover:bg-glass-hover text-sm py-2.5 rounded-xl">
                Import another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-glass" />
        <span className="text-[11px] text-text-muted">or add one transaction</span>
        <div className="flex-1 h-px bg-glass" />
      </div>

      {/* ── Quick add ── */}
      <form onSubmit={submitOne} className="space-y-3">
        <div>
          <label className="text-xs text-text-secondary">Payee / Vendor</label>
          <input value={form.payee_raw} onChange={setF('payee_raw')} placeholder="e.g. PSO Petrol Station" className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary">Amount (PKR)</label>
            <input value={form.amount} onChange={setF('amount')} type="number" min="0" placeholder="5000" className={field} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Date</label>
            <input value={form.tx_date} onChange={setF('tx_date')} type="date" className={field} />
          </div>
        </div>
        <div>
          <label className="text-xs text-text-secondary">Direction</label>
          <div className="mt-1 flex gap-2">
            {[['DEBIT', 'Money out'], ['CREDIT', 'Money in']].map(([v, l]) => (
              <button type="button" key={v} onClick={() => setForm(f => ({ ...f, tx_type: v }))}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                  form.tx_type === v ? 'border-cyan bg-cyan/10 text-cyan' : 'border-glass text-text-secondary hover:bg-glass-hover'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={busy}
          className="w-full bg-cyan text-navy disabled:opacity-40 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-cyan">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Send to AI
        </button>
      </form>
    </div>
  )
}
