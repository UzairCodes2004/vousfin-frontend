import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MessageSquare, LayoutList, Upload, CheckCircle, AlertTriangle,
  Loader2, X, ChevronUp, ChevronDown, Sparkles,
} from 'lucide-react'
import Modal from '@/components/modals/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import TaxPreviewPanel from '@/components/ui/TaxPreviewPanel'
import { useAccounts } from '@/hooks/useAccounts'
import { useCustomers, useVendors } from '@/hooks/useParties'
import { useInventoryItems } from '@/hooks/useInventory'
import {
  useCreateTransaction,
  useCreateInstallmentTransaction,
  useUpdateTransaction,
  useNLPreview,
  useExcelPreview,
  useExcelConfirm,
  usePreSaveCheck,
} from '@/hooks/useTransactions'
import { useCurrentPeriod } from '@/hooks/useFiscalYear'
import { useLatestRates, useConversionPreview } from '@/hooks/useFxRates'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'
import { buildGroupedAccountOptions } from '@/utils/accountOptions'
import { matchesFilter } from '@/utils/transactionPresets'
import { getTxTypeFilter } from '@/utils/accountFilterRules'
import { resolveDebitCreditPair } from '@/utils/accountResolver'
import { cn } from '@/utils/cn'

/* ──────────────────────────────────────────────────────────────────────────────
 * PHASE 3 STEP 5 — NLP AUTOFILLS STRUCTURED FORM (no separate preview UI)
 * The NL tab is now input-only. Parsing immediately hands the result to the
 * structured form via `onParsed`. The structured form is the SINGLE editing
 * surface — same validation, same dropdowns, same save path as a manual entry.
 * Confidence + review reasons + multi-line journal lines are surfaced INSIDE
 * the structured form as banners / inline warnings.
 * ────────────────────────────────────────────────────────────────────────────── */

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const formSchema = z.object({
  transactionDate:     z.string().min(1, 'Date is required'),
  description:         z.string().min(2, 'Description is required'),
  amount:              z.number().positive('Amount must be greater than 0'),
  debitAccountId:      z.string().min(1, 'Debit account is required'),
  creditAccountId:     z.string().min(1, 'Credit account is required'),
  transactionType:     z.string().optional(),
  referenceNumber:     z.string().optional(),
  invoiceNumber:       z.string().optional(),
  notes:               z.string().optional(),
  dueDate:             z.string().optional(),
  paymentMethod:       z.string().optional(),
  txnCurrency:         z.string().optional(),
  exchangeRate:        z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v)) ? undefined : v,
    z.number().min(0).optional()
  ),
  taxAmount:           z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v)) ? undefined : v,
    z.number().min(0).optional()
  ),
  taxRate:             z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v)) ? undefined : v,
    z.number().min(0).max(100).optional()
  ),
  customerName:        z.string().optional(),
  vendorName:          z.string().optional(),
  isInstallment:       z.boolean().optional(),
  // valueAsNumber returns NaN for empty inputs → preprocess to safe defaults
  downPayment:         z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v)) ? 0 : v,
    z.number().min(0).optional()
  ),
  installmentCount:    z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v)) ? undefined : v,
    z.number().min(1).optional()
  ),
  installmentFrequency:z.string().optional(),
  interestRate:        z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v)) ? 0 : v,
    z.number().min(0).max(100).optional()
  ),
  firstPaymentDate:    z.string().optional(),
  interestMethod:      z.enum(['reducing_balance', 'flat']).optional(),
}).refine((d) => d.debitAccountId !== d.creditAccountId, {
  message: 'Debit and Credit accounts must be different',
  path: ['creditAccountId'],
})

// ─── Confidence pill (used in AI banner) ──────────────────────────────────────
function NLConfBadge({ score }) {
  if (score == null) return null
  const pct = Math.round(score * 100)
  const cls =
    pct >= 75 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
    pct >= 50 ? 'bg-amber-500/15  text-amber-400  border-amber-500/25' :
                'bg-red-500/15    text-red-400    border-red-500/25'
  const label = pct >= 75 ? 'High' : pct >= 50 ? 'Medium' : 'Low'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label} · {pct}% confidence
    </span>
  )
}

// ─── Excel ConfBadge (legacy small badge) ─────────────────────────────────────
function ConfBadge({ label, score }) {
  const cls =
    label === 'High'   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    label === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                         'bg-red-500/10 text-red-400 border-red-500/20'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cls}`}>
      {score}%
    </span>
  )
}

// ─── Live Journal Preview (Step 6 — real-time DR/CR feedback) ────────────────
/**
 * Shows a compact double-entry preview card whenever both accounts and an amount
 * are selected. Zero-logic component — purely cosmetic, zero API calls.
 * A balanced entry is always guaranteed here (same amount DR = CR).
 */
function LiveJournalPreview({ debitAccount, creditAccount, amount, currency }) {
  if (!debitAccount || !creditAccount || !(amount > 0)) return null
  return (
    <div className="rounded-lg border border-glass bg-white/[0.05] px-4 py-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan inline-block" />
          Journal Entry Preview
        </span>
        <span className="text-[10px] font-semibold text-emerald-400">✓ Balanced</span>
      </div>
      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="text-cyan font-bold w-6 flex-shrink-0">DR</span>
          <span className="flex-1 text-text-primary truncate font-sans">{debitAccount}</span>
          <span className="text-cyan font-semibold flex-shrink-0">{formatCurrency(amount, currency)}</span>
        </div>
        <div className="flex items-center gap-3 border-t border-glass/50 pt-1.5">
          <span className="text-text-muted font-bold w-6 flex-shrink-0">CR</span>
          <span className="flex-1 text-text-secondary truncate font-sans">{creditAccount}</span>
          <span className="text-text-secondary font-semibold flex-shrink-0">{formatCurrency(amount, currency)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Installment GAAP Journal Preview (shared) ────────────────────────────────
function buildClientAmortization({ principal, count, frequency, annualRatePct, method = 'reducing_balance' }) {
  if (!principal || principal <= 0 || !count || count < 1) {
    return { schedule: [], emi: 0, totalInterest: 0 }
  }
  const round2 = (n) => Math.round((isFinite(n) ? n : 0) * 100) / 100
  const periodsPerYear =
    frequency === 'weekly'    ? 52 :
    frequency === 'biweekly'  ? 26 :
    frequency === 'quarterly' ?  4 : 12
  const rate = (annualRatePct || 0) / 100 / periodsPerYear

  let emi, totalInterest
  if ((annualRatePct || 0) > 0 && method === 'reducing_balance' && rate > 0) {
    const pow = Math.pow(1 + rate, count)
    emi = principal * rate * pow / (pow - 1)
    totalInterest = (emi * count) - principal
  } else if ((annualRatePct || 0) > 0 && method === 'flat') {
    const years = count / periodsPerYear
    totalInterest = principal * (annualRatePct / 100) * years
    emi = (principal + totalInterest) / count
  } else {
    emi = principal / count
    totalInterest = 0
  }
  emi = round2(emi)
  totalInterest = round2(totalInterest)

  const schedule = []
  let opening = principal
  let pSum = 0, iSum = 0
  for (let i = 1; i <= count; i++) {
    let principalDue, interestDue
    if (method === 'reducing_balance' && (annualRatePct || 0) > 0) {
      interestDue  = round2(opening * rate)
      principalDue = round2(emi - interestDue)
    } else if (method === 'flat' && (annualRatePct || 0) > 0) {
      principalDue = round2(principal / count)
      interestDue  = round2(totalInterest / count)
    } else {
      principalDue = round2(principal / count)
      interestDue  = 0
    }
    if (i === count) {
      principalDue = round2(principal - pSum)
      interestDue  = round2(totalInterest - iSum)
    }
    const closing = round2(Math.max(0, opening - principalDue))
    schedule.push({ i, principalDue, interestDue, opening: round2(opening), closing })
    pSum += principalDue
    iSum += interestDue
    opening = closing
  }
  return { schedule, emi, totalInterest }
}

function InstallmentJournalPreview({
  total, downPayment, installmentCount, installmentFrequency,
  interestRate, interestMethod, firstPaymentDate, assetName, currency,
}) {
  const amt       = total       || 0
  const down      = downPayment || 0
  const financed  = Math.max(0, amt - down)
  const n         = Math.max(1, installmentCount || 1)
  const annualRate = interestRate || 0
  const method    = interestMethod || 'reducing_balance'
  const freqLabel =
    installmentFrequency === 'weekly'    ? 'weekly'    :
    installmentFrequency === 'biweekly'  ? 'bi-weekly' :
    installmentFrequency === 'quarterly' ? 'quarterly' : 'monthly'

  const { schedule, emi, totalInterest } = buildClientAmortization({
    principal: financed, count: n, frequency: installmentFrequency, annualRatePct: annualRate, method,
  })
  const totalPayable = financed + totalInterest
  const balanced = Math.abs(amt - down - financed) < 0.01

  const showRows = schedule.length <= 4
    ? schedule
    : [...schedule.slice(0, 3), schedule[schedule.length - 1]]

  return (
    <div className="rounded-lg border border-cyan/20 bg-navy/40 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan/15 bg-cyan/5">
        <div>
          <span className="text-[10px] font-bold text-cyan uppercase tracking-wider">GAAP / IFRS — Compound Journal Entry</span>
          <span className="ml-1.5 text-[9px] text-cyan/50 normal-case tracking-normal">(accounting standards)</span>
        </div>
        <span className="ml-auto text-[10px] text-text-muted">at purchase date</span>
      </div>

      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-bold text-cyan w-5 flex-shrink-0">DR</span>
          <span className="flex-1 text-text-primary font-medium truncate">{assetName || 'Asset Account'}</span>
          <span className="font-mono text-cyan font-semibold flex-shrink-0">{formatCurrency(amt, currency)}</span>
        </div>
        {down > 0 && (
          <div className="flex items-center gap-2 text-xs pl-4">
            <span className="font-mono font-bold text-text-muted w-5 flex-shrink-0">CR</span>
            <span className="flex-1 text-text-secondary truncate">Cash / Bank</span>
            <span className="font-mono text-text-secondary flex-shrink-0">{formatCurrency(down, currency)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs pl-4">
          <span className="font-mono font-bold text-amber-400 w-5 flex-shrink-0">CR</span>
          <span className="flex-1 text-amber-400 truncate font-medium">Loan Payable <span className="text-[9px] text-amber-400/70">(liability created)</span></span>
          <span className="font-mono text-amber-400 font-semibold flex-shrink-0">{formatCurrency(financed, currency)}</span>
        </div>
        <div className="border-t border-glass mt-1 pt-1 flex justify-between text-[10px] text-text-muted">
          <span>Balance check</span>
          <span className={`font-medium ${balanced ? 'text-emerald-400' : 'text-red-400'}`}>
            {balanced ? '✓ Balanced' : '✗ Unbalanced'}
          </span>
        </div>
      </div>

      {financed > 0 && (
        <div className="border-t border-cyan/15 bg-amber-500/5 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <div>
            <span className="text-amber-400/80 block">Liability Created</span>
            <span className="font-semibold text-amber-400">{formatCurrency(financed, currency)}</span>
          </div>
          <div>
            <span className="text-text-muted block">EMI</span>
            <span className="font-semibold text-text-primary">{formatCurrency(emi, currency)}</span>
            <span className="text-text-muted ml-0.5">/{freqLabel}</span>
          </div>
          {annualRate > 0 && (
            <>
              <div>
                <span className="text-text-muted block">Total Interest</span>
                <span className="font-semibold text-amber-400">{formatCurrency(totalInterest, currency)}</span>
              </div>
              <div>
                <span className="text-text-muted block">Total Payable</span>
                <span className="font-semibold text-text-primary">{formatCurrency(totalPayable, currency)}</span>
              </div>
            </>
          )}
          {annualRate === 0 && (
            <div>
              <span className="text-text-muted block">Interest</span>
              <span className="text-emerald-400 font-medium">Interest-free</span>
            </div>
          )}
          {firstPaymentDate && (
            <div>
              <span className="text-text-muted block">First Payment</span>
              <span className="font-semibold text-text-primary">{firstPaymentDate}</span>
            </div>
          )}
        </div>
      )}

      {schedule.length > 0 && financed > 0 && (
        <div className="border-t border-cyan/15">
          <div className="px-3 py-1.5 bg-white/[0.05] text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            Amortization {schedule.length > 4 ? `(first 3 + last of ${schedule.length})` : `(${schedule.length} payments)`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-white/[0.04] text-text-muted">
                <tr>
                  <th className="px-2 py-1 text-left font-medium">#</th>
                  <th className="px-2 py-1 text-right font-medium">Principal</th>
                  <th className="px-2 py-1 text-right font-medium">Interest</th>
                  <th className="px-2 py-1 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {showRows.map((row, idx) => {
                  const showEllipsis = schedule.length > 4 && idx === 3
                  return (
                    <>
                      {showEllipsis && (
                        <tr key={`ellipsis-${idx}`} className="text-text-muted">
                          <td colSpan="4" className="px-2 py-0.5 text-center text-[10px]">⋯</td>
                        </tr>
                      )}
                      <tr key={row.i} className="text-text-secondary">
                        <td className="px-2 py-1 font-mono text-text-muted">{row.i}</td>
                        <td className="px-2 py-1 font-mono text-right text-cyan">{formatCurrency(row.principalDue, currency)}</td>
                        <td className="px-2 py-1 font-mono text-right text-amber-400">{formatCurrency(row.interestDue, currency)}</td>
                        <td className="px-2 py-1 font-mono text-right">{formatCurrency(row.closing, currency)}</td>
                      </tr>
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Creatable Party Combobox (Phase 3.5 Step 2) ─────────────────────────────
function PartyInput({ label, suggestions, value, onChange, placeholder, parties = [], onSelectId, aiSuggested, selectedBalance }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const filtered = useMemo(() =>
    suggestions.filter(s => s.toLowerCase().includes((value || '').toLowerCase())).slice(0, 8)
  , [suggestions, value])
  const close = useCallback(() => setOpen(false), [])
  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) close() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [close])

  const handleSelect = (name) => {
    onChange(name)
    setOpen(false)
    const match = parties.find(p => p.name.toLowerCase() === name.toLowerCase())
    if (onSelectId) onSelectId(match ? match.id : null)
  }

  const showNew = value?.trim() && !suggestions.some(s => s.toLowerCase() === value.trim().toLowerCase())

  const getBalance = (name) => {
    const p = parties.find(p => p.name.toLowerCase() === name.toLowerCase())
    return p?.balance
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-text-secondary">{label}</label>
        {aiSuggested && value && (
          <span className="text-[10px] text-cyan font-medium flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> AI suggested
          </span>
        )}
      </div>
      <input
        type="text"
        autoComplete="off"
        className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none transition-colors"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); if (onSelectId) onSelectId(null) }}
        onFocus={() => setOpen(true)}
      />
      {/* Outstanding balance badge when known party selected */}
      {value && selectedBalance != null && selectedBalance > 0 && (
        <p className="mt-1 text-[11px] text-amber-400 font-medium">
          Outstanding balance: {selectedBalance.toLocaleString()}
        </p>
      )}
      {value && selectedBalance === 0 && (
        <p className="mt-1 text-[11px] text-emerald-400">No outstanding balance</p>
      )}
      {open && (filtered.length > 0 || showNew) && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border border-glass bg-navy shadow-xl overflow-hidden">
          {filtered.map(name => {
            const bal = getBalance(name)
            return (
              <div key={name} onMouseDown={() => handleSelect(name)}
                className="px-3 py-2 text-sm text-text-primary hover:bg-glass-hover cursor-pointer flex items-center justify-between gap-2">
                <span>{name}</span>
                {bal != null && bal > 0 && (
                  <span className="text-[10px] text-amber-400 font-medium flex-shrink-0">
                    Due: {bal.toLocaleString()}
                  </span>
                )}
                {bal === 0 && (
                  <span className="text-[10px] text-emerald-400 flex-shrink-0">Paid</span>
                )}
              </div>
            )
          })}
          {showNew && (
            <div onMouseDown={() => handleSelect(value.trim())}
              className="px-3 py-2 text-sm text-cyan hover:bg-cyan/10 cursor-pointer border-t border-glass">
              + Add &quot;{value.trim()}&quot; as new
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section label divider ────────────────────────────────────────────────────
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

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'nl',    label: 'Natural Language', icon: MessageSquare },
  { id: 'form',  label: 'Structured Form',  icon: LayoutList },
  { id: 'excel', label: 'Excel / CSV',      icon: Upload },
]

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * Robustly extracts a string ObjectId from a value that may be:
 *  - already a plain string  ("64abc...")
 *  - a Mongoose ObjectId     (ObjectId("64abc..."))
 *  - a populated sub-doc     ({ _id: ObjectId("64abc..."), accountName: "..." })
 *  - null / undefined
 */
function extractId(val) {
  if (!val) return ''
  if (typeof val === 'string') return val
  // Mongoose ObjectId or populated sub-doc
  const raw = val._id ?? val.id ?? val
  return raw ? String(raw) : ''
}

/**
 * Maps a stored transaction document to the shape StructuredFormTab expects
 * as initialValues.  Only the fields the update endpoint accepts are included.
 */
function txToInitialValues(tx, currency) {
  return {
    transactionDate:     tx.transactionDate ? new Date(tx.transactionDate).toISOString().slice(0, 10) : '',
    description:         tx.description     || '',
    amount:              typeof tx.amount === 'number' ? tx.amount : 0,
    debitAccountId:      extractId(tx.debitAccountId),
    creditAccountId:     extractId(tx.creditAccountId),
    transactionType:     tx.transactionType  || '',
    invoiceNumber:       tx.invoiceNumber    || '',
    notes:               tx.notes            || '',
    dueDate:             tx.dueDate ? new Date(tx.dueDate).toISOString().slice(0, 10) : '',
    paymentMethod:       tx.paymentMethod    || '',
    txnCurrency:         tx.currencyCode     || currency,
    exchangeRate:        tx.exchangeRate     || 1,
    taxAmount:           tx.taxAmount        || 0,
    taxRate:             tx.taxRate          || 0,
    customerName:        tx.customerName     || tx.customerId?.fullName || tx.customerId?.businessName || '',
    vendorName:          tx.vendorName       || tx.vendorId?.vendorName || '',
    referenceNumber:     tx.transactionReference || '',
    // never pre-fill installment fields in edit mode
    isInstallment:       false,
  }
}

export default function TransactionFormModal({ isOpen, onClose, onSuccess, transaction = null }) {
  const isEditMode = Boolean(transaction)

  const [activeTab,  setActiveTab]  = useState('form')
  const [wasOpen,    setWasOpen]    = useState(isOpen)
  const [nlPrefill,  setNlPrefill]  = useState(null)
  const currency = useBusinessStore((s) => s.currency)

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setActiveTab('form')
      setNlPrefill(null)
    }
  }

  const handleClose = () => { onClose() }
  // Called only on a successful save: let the parent refresh, then close.
  const handleSuccess = () => { onSuccess?.(); onClose() }

  /**
   * STEP 5 — Called by NLTab right after Gemini parses the text.
   * Maps the NL preview shape to the structured form's initialValues shape
   * and switches to the form tab. The NL parser AUTOFILLS the same form —
   * there is no separate NL confirmation flow.
   */
  const handleNlParsed = useCallback((preview) => {
    setNlPrefill({
      transactionDate:      preview.transactionDate || new Date().toISOString().split('T')[0],
      description:          preview.description     || '',
      amount:               typeof preview.amount === 'number' ? preview.amount : 0,
      transactionType:      preview.transactionType || '',
      debitAccountId:       preview.debitAccountId  || '',
      creditAccountId:      preview.creditAccountId || '',
      isInstallment:        !!preview.isInstallment,
      downPayment:          preview.downPayment              || 0,
      installmentCount:     preview.installmentCount || preview.installmentPeriodMonths || null,
      installmentFrequency: preview.installmentFrequency     || 'monthly',
      interestRate:         preview.interestRate             || 0,
      firstPaymentDate:     preview.firstPaymentDate         || '',
      interestMethod:       preview.interestMethod           || 'reducing_balance',
      notes:                preview.notes                    || '',
      vendorName:           preview.vendorName               || '',
      customerName:         preview.customerName             || '',
      taxAmount:            preview.taxAmount                || 0,
      taxRate:              preview.taxRate                  || 0,
      txnCurrency:          preview.currency                 || currency,
      paymentMethod:        preview.paymentMethod            || '',
      invoiceNumber:        preview.invoiceNumber            || '',
      // AI metadata
      _aiParsed:            true,
      _confidence:          preview.confidence,
      _requiresReview:      preview.requiresReview,
      _reviewReasons:       preview.reviewReasons || [],
      _rawText:             preview._rawText || '',
      _journalLines:        Array.isArray(preview.resolvedJournalLines) ? preview.resolvedJournalLines : [],
      _aiDebitAccount:      preview.debitAccount  || null,
      _aiCreditAccount:     preview.creditAccount || null,
    })
    setActiveTab('form')
  }, [currency])

  // In edit mode derive pre-fill values directly from the transaction prop
  const editInitialValues = isEditMode ? txToInitialValues(transaction, currency) : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? `Edit Transaction` : 'Record Transaction'}
      className="sm:max-w-2xl"
    >
      {/* Tabs — hidden in edit mode (always structured form) */}
      {!isEditMode && (
        <div className="flex gap-1 p-1 rounded-xl bg-glass-panel border border-glass mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-cyan text-navy shadow-glow-cyan'
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass-hover'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Edit mode: always structured form, no NL/Excel tabs */}
      {isEditMode && (
        <StructuredFormTab
          currency={currency}
          onSuccess={handleSuccess}
          onCancel={handleClose}
          initialValues={editInitialValues}
          editTransactionId={transaction._id}
        />
      )}

      {/* Create mode: full tab routing */}
      {!isEditMode && activeTab === 'nl'    && <NLTab    currency={currency} onParsed={handleNlParsed} />}
      {!isEditMode && activeTab === 'form'  && <StructuredFormTab currency={currency} onSuccess={handleSuccess} onCancel={handleClose} initialValues={nlPrefill} />}
      {!isEditMode && activeTab === 'excel' && <ExcelTab onSuccess={handleSuccess} onCancel={handleClose} />}
    </Modal>
  )
}

// ─── Tab 1: Natural Language (Step 5: input-only, autofills form) ─────────────
function NLTab({ onParsed }) {
  const [text, setText] = useState('')
  const nlPreview = useNLPreview()

  const handleParse = async () => {
    if (text.trim().length < 5) return
    const result = await nlPreview.mutateAsync(text)
    if (!result) return
    onParsed({
      transactionDate:         result.transactionDate || new Date().toISOString().split('T')[0],
      description:             result.description || text,
      amount:                  result.amount || 0,
      transactionType:         result.transactionType || '',
      debitAccountId:          result.debitAccountId  || '',
      creditAccountId:         result.creditAccountId || '',
      debitAccount:            result.debitAccount    || '',
      creditAccount:           result.creditAccount   || '',
      confidence:              result.confidence      ?? null,
      requiresReview:          result.requiresReview  ?? false,
      reviewReasons:           result.reviewReasons   ?? [],
      isInstallment:           result.isInstallment   || false,
      installmentPeriodMonths: result.installmentPeriodMonths || null,
      totalInstallmentAmount:  result.totalInstallmentAmount  || null,
      downPayment:             result.downPayment            || 0,
      installmentFrequency:    result.installmentFrequency   || 'monthly',
      installmentCount:        result.installmentCount       || result.installmentPeriodMonths || null,
      interestRate:            result.interestRate           || 0,
      firstPaymentDate:        result.firstPaymentDate       || '',
      interestMethod:          result.interestMethod         || 'reducing_balance',
      taxAmount:               result.taxAmount              || 0,
      taxRate:                 result.taxRate                || 0,
      currency:                result.currency               || null,
      vendorName:              result.vendorName             || result.counterpartyName || '',
      customerName:            result.customerName           || result.counterpartyName || '',
      invoiceNumber:           result.invoiceNumber          || '',
      paymentMethod:           result.paymentMethod          || '',
      notes:                   result.notes                  || '',
      resolvedJournalLines:    result.resolvedJournalLines   || [],
      _rawText:                text,
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Describe your transaction in plain English. VousFin will parse it and
        autofill the structured form for review and editing.
      </p>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-text-secondary">Transaction Description</label>
        <textarea
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none resize-none transition-colors"
          placeholder={'Examples:\n• "Paid PKR 5000 for office supplies from bank"\n• "Received PKR 25000 from Ali for consulting"\n• "Bought office furniture on installments from ABC Furnitures"\n• "Sold goods for 11700 cash including 17% GST"'}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <p className="text-[11px] text-text-muted">
          AI detects amount, accounts, taxes, installments, and parties — then opens the structured form for confirmation.
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-glass">
        <Button onClick={handleParse} loading={nlPreview.isPending} disabled={text.trim().length < 5}>
          <Sparkles className="h-4 w-4 mr-1" />
          Parse &amp; Autofill Form →
        </Button>
      </div>
    </div>
  )
}

// ─── GAAP term → plain English map (shown in pre-save warning panel) ─────────
const GAAP_PLAIN_ENGLISH = {
  'MATCHING_PRINCIPLE': 'Revenue & costs must land in the same period',
  'ACCRUAL_BASIS':      'Record when earned/owed, not when cash changes hands',
  'IAS 21':             'foreign currency accounting rule',
  'IFRS 9':             'financial asset impairment / write-off rule',
  'GAAP':               'Generally Accepted Accounting Principles',
  'IFRS':               'International Financial Reporting Standards',
}

function applyGAAPGloss(text) {
  let t = text
  Object.entries(GAAP_PLAIN_ENGLISH).forEach(([term, plain]) => {
    // Only replace the FIRST occurrence so the brackets don't repeat mid-sentence
    t = t.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), `${term} (${plain})`)
  })
  return t
}

// ─── Invoice / Bill number auto-generator ─────────────────────────────────────
const SALE_TYPES_FOR_INV  = ['Cash Sale','Credit Sale','Inventory Sale','Payment Received','Advance from Customer','GST Collection']
const BILL_TYPES_FOR_BILL = ['Cash Purchase','Credit Purchase','Inventory Purchase','Payment Made','Prepaid Expense']

function generateDocNumber(txType) {
  const d = new Date()
  const yyyymm = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0')
  const rand   = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')
  if (SALE_TYPES_FOR_INV.includes(txType))  return `INV-${yyyymm}-${rand}`
  if (BILL_TYPES_FOR_BILL.includes(txType)) return `BILL-${yyyymm}-${rand}`
  return null
}

// ─── Transaction Type options ─────────────────────────────────────────────────
const TX_TYPE_OPTIONS = [
  { value: '', label: '— Auto-detect from accounts —' },
  // ── Sales & Revenue ──────────────────────────────────────────────────────────
  { value: 'Cash Sale',             label: 'Cash Sale',                         group: 'Sales & Revenue' },
  { value: 'Credit Sale',           label: 'Credit Sale (A/R Invoice)',         group: 'Sales & Revenue' },
  { value: 'Inventory Sale',        label: 'Inventory Sale',                    group: 'Sales & Revenue' },
  { value: 'Payment Received',      label: 'Payment Received from Customer',    group: 'Sales & Revenue' },
  { value: 'GST Collection',        label: 'GST / VAT Collected on Sale',       group: 'Sales & Revenue' },
  { value: 'Advance from Customer', label: 'Advance from Customer (Deposit)',   group: 'Sales & Revenue' },
  { value: 'Refund',                label: 'Customer Refund',                   group: 'Sales & Revenue' },
  { value: 'Income',                label: 'Other Income / Revenue',            group: 'Sales & Revenue' },
  // ── Purchases & Expenses ─────────────────────────────────────────────────────
  { value: 'Cash Purchase',         label: 'Cash Purchase / Expense',           group: 'Purchases & Expenses' },
  { value: 'Credit Purchase',       label: 'Credit Purchase (A/P Bill)',        group: 'Purchases & Expenses' },
  { value: 'Inventory Purchase',    label: 'Inventory / Stock Purchase',        group: 'Purchases & Expenses' },
  { value: 'Payment Made',          label: 'Payment Made to Vendor',            group: 'Purchases & Expenses' },
  { value: 'Prepaid Expense',       label: 'Prepaid Expense (paid in advance)', group: 'Purchases & Expenses' },
  { value: 'Interest Payment',      label: 'Interest / Finance Charge',         group: 'Purchases & Expenses' },
  { value: 'Expense',               label: 'General Expense',                   group: 'Purchases & Expenses' },
  // ── Payroll & Taxes ──────────────────────────────────────────────────────────
  { value: 'Salary',                label: 'Salary / Payroll Payment',          group: 'Payroll & Taxes' },
  { value: 'GST Payment',           label: 'GST / VAT Remitted to Authority',   group: 'Payroll & Taxes' },
  { value: 'WHT Payment',           label: 'Withholding Tax (WHT) Payment',     group: 'Payroll & Taxes' },
  // ── Assets & Depreciation ────────────────────────────────────────────────────
  { value: 'Asset Purchase',        label: 'Asset Purchase (fixed/tangible)',   group: 'Assets & Capital' },
  { value: 'Depreciation',          label: 'Depreciation Entry (non-cash)',     group: 'Assets & Capital' },
  { value: 'Owner Investment',      label: 'Owner Investment / Capital Intro',  group: 'Assets & Capital' },
  { value: 'Owner Withdrawal',      label: 'Owner Withdrawal / Drawing',        group: 'Assets & Capital' },
  // ── Financing ────────────────────────────────────────────────────────────────
  { value: 'Loan Disbursement',     label: 'Loan Received',                     group: 'Financing' },
  { value: 'Loan Repayment',        label: 'Loan Repayment (principal)',        group: 'Financing' },
  { value: 'Installment Payment',   label: 'Installment / EMI Payment',        group: 'Financing' },
  // ── Adjustments & Transfers ──────────────────────────────────────────────────
  { value: 'Bank Transfer',         label: 'Bank / Cash Transfer',              group: 'Adjustments & Transfers' },
  { value: 'Transfer',              label: 'Internal Transfer',                 group: 'Adjustments & Transfers' },
  { value: 'Journal Entry',         label: 'Manual Journal Entry (advanced)',   group: 'Adjustments & Transfers' },
  { value: 'Adjusting Entry',       label: 'Adjusting Entry (accrual/deferral)',group: 'Adjustments & Transfers' },
  { value: 'Opening Balance',       label: 'Opening Balance Entry',             group: 'Adjustments & Transfers' },
]

// ─── Tab 2: Structured Form ───────────────────────────────────────────────────
function StructuredFormTab({ currency, onSuccess, onCancel, initialValues, editTransactionId }) {
  const isEditMode          = Boolean(editTransactionId)
  const createTx            = useCreateTransaction()
  const createInstallmentTx = useCreateInstallmentTransaction()
  const updateTx            = useUpdateTransaction()
  const preSaveCheck        = usePreSaveCheck()
  const { data: currentPeriod } = useCurrentPeriod()

  const { data: rawAccounts }   = useAccounts()
  const { data: rawCustomers }  = useCustomers()
  const { data: rawVendors }    = useVendors()
  const { data: rawInventory }  = useInventoryItems()

  const accounts = useMemo(() => {
    const d = rawAccounts
    return Array.isArray(d?.docs) ? d.docs : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
  }, [rawAccounts])
  const customers = useMemo(() => {
    const d = rawCustomers
    return Array.isArray(d?.docs) ? d.docs : Array.isArray(d?.customers) ? d.customers : Array.isArray(d) ? d : []
  }, [rawCustomers])
  const vendors = useMemo(() => {
    const d = rawVendors
    return Array.isArray(d?.docs) ? d.docs : Array.isArray(d?.vendors) ? d.vendors : Array.isArray(d) ? d : []
  }, [rawVendors])

  const inventoryItems = useMemo(() => {
    const d = rawInventory
    const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
    return arr.filter(i => i.isActive !== false)
  }, [rawInventory])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionDate:      new Date().toISOString().split('T')[0],
      description:          '',
      amount:               0,
      debitAccountId:       '',
      creditAccountId:      '',
      transactionType:      '',
      referenceNumber:      '',
      invoiceNumber:        '',
      notes:                '',
      dueDate:              '',
      paymentMethod:        '',
      txnCurrency:          currency,
      exchangeRate:         1,
      taxAmount:            0,
      taxRate:              0,
      isInstallment:        false,
      firstPaymentDate:     '',
      interestMethod:       'reducing_balance',
      downPayment:          0,
      installmentCount:     3,
      installmentFrequency: 'monthly',
      interestRate:         0,
    },
  })

  const [nlAiBanner, setNlAiBanner]     = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  // Track auto-resolution outcome so UI can show "AI auto-selected" badges
  const [autoResolved, setAutoResolved] = useState({ debit: null, credit: null })

  // Phase 3.5 Step 2 — party ID tracking (set when user picks existing party)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedVendorId,   setSelectedVendorId]   = useState(null)
  const [nlPartyFilled,      setNlPartyFilled]      = useState(false)

  // Phase 3.5 Step 5 — Pre-save warning state
  const [preSaveWarnings,  setPreSaveWarnings]  = useState([])
  // preSaveAcknowledged = true means warnings were already shown once → bypass check on next submit
  const [preSaveAcknowledged, setPreSaveAcknowledged] = useState(false)

  // Auto-generated invoice/bill number tracking
  const [invoiceAutoGenerated, setInvoiceAutoGenerated] = useState(false)

  // Phase 3.5 Step 3 — Inventory state
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState(null)
  const [inventoryQty, setInventoryQty] = useState(1)

  // Phase 5.3 — FX: load latest rates to populate currency options + auto-fill rate
  const { data: latestFxRates } = useLatestRates()

  // Build dynamic currency options from stored rates + hardcoded fallbacks
  const currencyOptions = useMemo(() => {
    const base = [
      { value: currency,  label: `${currency} — Base currency` },
      { value: 'USD', label: 'USD — US Dollar' },
      { value: 'EUR', label: 'EUR — Euro' },
      { value: 'GBP', label: 'GBP — British Pound' },
      { value: 'AED', label: 'AED — UAE Dirham' },
      { value: 'SAR', label: 'SAR — Saudi Riyal' },
    ]
    if (!latestFxRates?.length) return base
    // Merge in currencies from stored rates that aren't already listed
    const seen = new Set(base.map(o => o.value))
    latestFxRates.forEach(r => {
      if (!seen.has(r.fromCurrency)) {
        base.push({ value: r.fromCurrency, label: r.fromCurrency })
        seen.add(r.fromCurrency)
      }
    })
    return base
  }, [latestFxRates, currency])

  // Auto-fill exchange rate when currency changes
  const watchedTxnCurrency = watch('txnCurrency')
  const watchedAmount      = watch('amount')
  const watchedDate        = watch('transactionDate')

  useEffect(() => {
    if (!watchedTxnCurrency || watchedTxnCurrency === currency) return
    const match = latestFxRates?.find(
      r => r.fromCurrency === watchedTxnCurrency && r.toCurrency === currency
    ) ?? latestFxRates?.find(r => r.fromCurrency === watchedTxnCurrency)
    if (match?.rate) setValue('exchangeRate', match.rate)
  }, [watchedTxnCurrency, latestFxRates, currency, setValue])

  // Live conversion preview
  const { data: convPreview } = useConversionPreview({
    from:   watchedTxnCurrency !== currency ? watchedTxnCurrency : null,
    to:     currency,
    amount: watchedAmount,
    date:   watchedDate,
  })

  // Party objects with balance data for the combobox
  const customerParties = useMemo(() =>
    customers.map(c => ({
      id:      c._id,
      name:    c.fullName || c.businessName || '',
      balance: c.currentReceivableBalance ?? null,
    })).filter(p => p.name)
  , [customers])

  const vendorParties = useMemo(() =>
    vendors.map(v => ({
      id:      v._id,
      name:    v.vendorName || v.name || '',
      balance: v.currentPayableBalance ?? null,
    })).filter(p => p.name)
  , [vendors])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    if (initialValues) {
      // ── Phase 3.5 Step 1 — Auto-resolve AI account-name suggestions ──
      // If backend's fuzzy-matcher couldn't pin debit/credit account IDs but
      // returned name suggestions, run the frontend resolver against the
      // live accounts list. The resolver respects accountType filters from
      // transaction-type rules so we never silently flip DR-side / CR-side.
      let resolvedDebitId  = initialValues.debitAccountId  || ''
      let resolvedCreditId = initialValues.creditAccountId || ''
      const resolution = { debit: null, credit: null }
      if (accounts.length > 0 && (initialValues._aiDebitAccount || initialValues._aiCreditAccount)) {
        const txFilter = getTxTypeFilter(initialValues.transactionType)
        const debitType  = txFilter.debitFilter?.types?.[0]
        const creditType = txFilter.creditFilter?.types?.[0]
        const pair = resolveDebitCreditPair(
          initialValues._aiDebitAccount,
          initialValues._aiCreditAccount,
          accounts,
          { debitType, creditType }
        )
        if (!resolvedDebitId  && pair.debit.account)  { resolvedDebitId  = pair.debit.account._id;  resolution.debit  = { name: pair.debit.account.accountName, score: pair.debit.score } }
        if (!resolvedCreditId && pair.credit.account) { resolvedCreditId = pair.credit.account._id; resolution.credit = { name: pair.credit.account.accountName, score: pair.credit.score } }
      }
      setAutoResolved(resolution)

      reset({
        transactionDate:      initialValues.transactionDate      || today,
        description:          initialValues.description          || '',
        amount:               typeof initialValues.amount === 'number' ? initialValues.amount : 0,
        debitAccountId:       resolvedDebitId,
        creditAccountId:      resolvedCreditId,
        transactionType:      initialValues.transactionType      || '',
        referenceNumber:      initialValues.referenceNumber      || '',
        invoiceNumber:        initialValues.invoiceNumber        || '',
        notes:                initialValues.notes                || '',
        dueDate:              initialValues.dueDate              || '',
        paymentMethod:        initialValues.paymentMethod        || '',
        txnCurrency:          initialValues.txnCurrency          || currency,
        exchangeRate:         initialValues.exchangeRate         || 1,
        taxAmount:            initialValues.taxAmount            || 0,
        taxRate:              initialValues.taxRate              || 0,
        customerName:         initialValues.customerName         || '',
        vendorName:           initialValues.vendorName           || '',
        isInstallment:        !!initialValues.isInstallment,
        downPayment:          initialValues.downPayment          || 0,
        installmentCount:     initialValues.installmentCount     || 3,
        installmentFrequency: initialValues.installmentFrequency || 'monthly',
        interestRate:         initialValues.interestRate         || 0,
        firstPaymentDate:     initialValues.firstPaymentDate     || '',
        interestMethod:       initialValues.interestMethod       || 'reducing_balance',
      })
      setNlAiBanner(true)

      // Auto-match NLP-supplied party names to existing party IDs
      const nlCustomer = initialValues.customerName?.trim()
      const nlVendor   = initialValues.vendorName?.trim()
      if (nlCustomer) {
        const match = customerParties.find(p => p.name.toLowerCase() === nlCustomer.toLowerCase())
        setSelectedCustomerId(match ? match.id : null)
        setNlPartyFilled(true)
      } else {
        setSelectedCustomerId(null)
      }
      if (nlVendor) {
        const match = vendorParties.find(p => p.name.toLowerCase() === nlVendor.toLowerCase())
        setSelectedVendorId(match ? match.id : null)
        if (nlVendor) setNlPartyFilled(true)
      } else {
        setSelectedVendorId(null)
      }

      // Auto-open optional details if NL detected tax/currency/payment-method info
      if (initialValues.taxAmount || initialValues.taxRate ||
          (initialValues.txnCurrency && initialValues.txnCurrency !== currency) ||
          initialValues.paymentMethod) {
        setShowOptional(true)
      }
    } else {
      reset({ transactionDate: today })
      setNlAiBanner(false)
      setAutoResolved({ debit: null, credit: null })
      setSelectedCustomerId(null)
      setSelectedVendorId(null)
      setNlPartyFilled(false)
      setSelectedInventoryItemId(null)
      setInventoryQty(1)
      setPreSaveWarnings([])
      setPreSaveAcknowledged(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues, accounts.length, customerParties.length, vendorParties.length])

  const allAccountOptions = useMemo(() => buildGroupedAccountOptions(accounts), [accounts])

  function buildSuggestedOptions(allOptions, filter) {
    if (!filter) return allOptions
    const suggested = allOptions.filter(o => matchesFilter(o, filter))
    const rest      = allOptions.filter(o => !matchesFilter(o, filter))
    if (suggested.length === 0) return allOptions
    const suggestedWithHeader = suggested.map(o => ({ ...o, group: '★ Suggested' }))
    return [...suggestedWithHeader, ...rest]
  }

  const txTypeWatch = watch('transactionType')
  const effectiveFilters = useMemo(() => {
    const f = getTxTypeFilter(txTypeWatch)
    return { debit: f.debitFilter, credit: f.creditFilter }
  }, [txTypeWatch])

  const debitOptions  = useMemo(
    () => buildSuggestedOptions(allAccountOptions, effectiveFilters.debit),
    [allAccountOptions, effectiveFilters.debit]
  )
  const creditOptions = useMemo(
    () => buildSuggestedOptions(allAccountOptions, effectiveFilters.credit),
    [allAccountOptions, effectiveFilters.credit]
  )

  const customerSuggestions = useMemo(() => customerParties.map(p => p.name), [customerParties])
  const vendorSuggestions   = useMemo(() => vendorParties.map(p => p.name),   [vendorParties])

  const debitAccountId  = watch('debitAccountId')
  const creditAccountId = watch('creditAccountId')
  const isInstallment   = watch('isInstallment')
  const amount          = watch('amount')
  const transactionType = watch('transactionType')   // must be declared BEFORE any useEffect that reads it

  // ── Auto-generate invoice/bill number when transaction type implies one ───────
  const watchedInvoiceNumber = watch('invoiceNumber')
  useEffect(() => {
    if (!transactionType) return
    // Don't overwrite a user-typed or AI-provided number
    if (watchedInvoiceNumber?.trim() && !invoiceAutoGenerated) return
    const generated = generateDocNumber(transactionType)
    if (generated) {
      setValue('invoiceNumber', generated)
      setInvoiceAutoGenerated(true)
    } else if (invoiceAutoGenerated) {
      setValue('invoiceNumber', '')
      setInvoiceAutoGenerated(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType])

  const requiresCustomer = useMemo(() => {
    const d = accounts.find(a => a._id === debitAccountId)
    const c = accounts.find(a => a._id === creditAccountId)
    const customerTypes = [
      'Credit Sale', 'Cash Sale', 'Inventory Sale', 'Payment Received',
      'GST Collection', 'Advance from Customer', 'Refund', 'Income',
    ]
    const isARSubtype = (acct) =>
      acct?.accountSubtype === 'Accounts Receivable' ||
      acct?.accountSubtype === 'Current Assets' ||
      acct?.accountName?.toLowerCase().includes('receivable') ||
      acct?.accountName?.toLowerCase().includes('debtor')
    return (
      isARSubtype(d) || isARSubtype(c) ||
      c?.accountType === 'Revenue' ||
      customerTypes.includes(transactionType)
    )
  }, [debitAccountId, creditAccountId, accounts, transactionType])

  const requiresVendor = useMemo(() => {
    const d = accounts.find(a => a._id === debitAccountId)
    const c = accounts.find(a => a._id === creditAccountId)
    const vendorTypes = [
      'Credit Purchase', 'Cash Purchase', 'Inventory Purchase', 'Payment Made',
      'Salary', 'WHT Payment', 'GST Payment', 'Interest Payment',
      'Prepaid Expense', 'Expense',
    ]
    const isAPSubtype = (acct) =>
      acct?.accountSubtype === 'Accounts Payable' ||
      acct?.accountSubtype === 'Current Liabilities' ||
      acct?.accountName?.toLowerCase().includes('payable') ||
      acct?.accountName?.toLowerCase().includes('creditor')
    return (
      isAPSubtype(d) || isAPSubtype(c) ||
      d?.accountType === 'Expense' ||
      vendorTypes.includes(transactionType)
    )
  }, [debitAccountId, creditAccountId, accounts, transactionType])

  const onSubmit = async (data) => {
    try {
      const {
        isInstallment, downPayment, installmentCount, installmentFrequency, interestRate,
        firstPaymentDate, interestMethod,
        transactionType, customerName, vendorName,
        referenceNumber, invoiceNumber, notes, dueDate, paymentMethod,
        txnCurrency, exchangeRate, taxAmount, taxRate,
        ...base
      } = data

      // ── EDIT MODE ────────────────────────────────────────────────────────────
      if (isEditMode) {
        // Strip account IDs from base; only include them if they are valid
        // 24-char hex ObjectIds. Empty strings from unpopulated dropdowns would
        // fail backend Joi validation and produce "Validation failed" errors.
        const { debitAccountId, creditAccountId, ...rest } = base
        const payload = { ...rest }
        const OID_RE = /^[0-9a-fA-F]{24}$/
        if (OID_RE.test(debitAccountId))  payload.debitAccountId  = debitAccountId
        if (OID_RE.test(creditAccountId)) payload.creditAccountId = creditAccountId
        if (transactionType)         payload.transactionType      = transactionType
        if (customerName?.trim())    payload.customerName         = customerName.trim()
        if (vendorName?.trim())      payload.vendorName           = vendorName.trim()
        if (selectedCustomerId)      payload.customerId           = selectedCustomerId
        if (selectedVendorId)        payload.vendorId             = selectedVendorId
        if (referenceNumber?.trim()) payload.transactionReference = referenceNumber.trim()
        if (invoiceNumber?.trim())   payload.invoiceNumber        = invoiceNumber.trim()
        payload.notes = notes?.trim() || ''
        if (dueDate)                 payload.dueDate              = dueDate
        if (paymentMethod)           payload.paymentMethod        = paymentMethod
        if (typeof taxAmount === 'number' && taxAmount > 0) payload.taxAmount = taxAmount
        if (typeof taxRate   === 'number' && taxRate   > 0) payload.taxRate   = taxRate
        await updateTx.mutateAsync({ id: editTransactionId, ...payload })
        onSuccess()
        return
      }

      // ── CREATE MODE ──────────────────────────────────────────────────────────

      // Phase 3.5 Step 5 — pre-save check (advisory only, non-blocking)
      if (!preSaveAcknowledged) {
        try {
          const checkResult = await preSaveCheck.mutateAsync({
            transactionDate:  data.transactionDate,
            amount:           data.amount,
            debitAccountId:   data.debitAccountId,
            creditAccountId:  data.creditAccountId,
            transactionType,
            taxAmount,
            taxRate,
            invoiceNumber,
            customerName,
            vendorName,
          })
          const allWarnings = checkResult?.warnings || []
          if (allWarnings.length > 0) {
            setPreSaveWarnings(allWarnings)
            setPreSaveAcknowledged(true) // next submit bypasses the check
            return // stop here — user must click submit again to confirm
          }
        } catch {
          // pre-save check network error — proceed silently
        }
      }

      const extras = {}
      if (transactionType)         extras.transactionType      = transactionType
      if (customerName?.trim())    extras.customerName         = customerName.trim()
      if (vendorName?.trim())      extras.vendorName           = vendorName.trim()
      if (selectedCustomerId)      extras.customerId           = selectedCustomerId
      if (selectedVendorId)        extras.vendorId             = selectedVendorId
      if (selectedInventoryItemId) extras.inventoryItemId      = selectedInventoryItemId
      if (selectedInventoryItemId && inventoryQty > 0) extras.inventoryQty = inventoryQty
      if (referenceNumber?.trim()) extras.transactionReference = referenceNumber.trim()
      if (invoiceNumber?.trim())   extras.invoiceNumber        = invoiceNumber.trim()
      if (notes?.trim())           extras.notes                = notes.trim()
      if (dueDate)                 extras.dueDate              = dueDate
      if (paymentMethod)           extras.paymentMethod        = paymentMethod
      if (txnCurrency && txnCurrency !== currency) {
        extras.currencyCode = txnCurrency        // IAS 21: foreign currency code
        extras.exchangeRate = exchangeRate || 1  // units of base per 1 foreign
      }
      if (typeof taxAmount === 'number' && taxAmount > 0) extras.taxAmount = taxAmount
      if (typeof taxRate   === 'number' && taxRate   > 0) extras.taxRate   = taxRate

      if (isInstallment) {
        await createInstallmentTx.mutateAsync({
          ...base, ...extras,
          downPayment, installmentCount, installmentFrequency, interestRate,
          interestMethod: interestMethod || 'reducing_balance',
          ...(firstPaymentDate ? { firstPaymentDate } : {}),
        })
      } else {
        await createTx.mutateAsync({ ...base, ...extras })
      }
      onSuccess()
    } catch {
      // toast handled in hooks
    }
  }

  const isPending = isSubmitting || createTx.isPending || createInstallmentTx.isPending || updateTx.isPending

  const fDown  = watch('downPayment')          || 0
  const fCount = watch('installmentCount')     || 1
  const fRate  = watch('interestRate')         || 0
  const fFreq  = watch('installmentFrequency') || 'monthly'
  const debitAcct = accounts.find(a => a._id === debitAccountId)

  // Multi-line journal preview (>2 lines = compound entry like GST sale, payroll w/ deductions)
  const aiJournalLines = Array.isArray(initialValues?._journalLines) ? initialValues._journalLines : []
  const hasCompoundJournal = aiJournalLines.length > 2
  const aiReviewReasons = Array.isArray(initialValues?._reviewReasons) ? initialValues._reviewReasons : []

  // Compute period status for the currently selected date — must come before isPeriodLocked
  const selectedDate = watch('transactionDate')
  const periodStatus = currentPeriod && selectedDate
    ? (new Date(selectedDate) >= new Date(currentPeriod.startDate) &&
       new Date(selectedDate) <= new Date(currentPeriod.endDate)
         ? currentPeriod.status
         : null)
    : currentPeriod?.status ?? null
  const isPeriodLocked = periodStatus === 'locked'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">

      {/* Phase 5.1 — Accounting Period Status Banner */}
      {periodStatus === 'locked' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Period Locked</p>
            <p className="text-xs text-text-muted mt-0.5">
              The accounting period for this date is permanently locked. Transactions cannot be saved.
            </p>
          </div>
        </div>
      )}
      {periodStatus === 'closed' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">Period Closed — {currentPeriod?.name}</p>
            <p className="text-xs text-text-muted mt-0.5">
              This period is closed. Contact your administrator to reopen it before posting transactions.
            </p>
          </div>
        </div>
      )}

      {/* AI Prefill Banner — shown when NL parser populated the form */}
      {nlAiBanner && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan/5 border border-cyan/20 animate-fade-in">
          <Sparkles className="h-4 w-4 text-cyan flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-text-primary">AI pre-filled from natural language</p>
              <NLConfBadge score={initialValues?._confidence} />
            </div>
            <p className="text-xs text-text-muted">Review all fields. Make changes before saving.</p>
            {initialValues?._rawText && (
              <p className="text-[11px] text-text-muted italic truncate" title={initialValues._rawText}>
                Original: &quot;{initialValues._rawText}&quot;
              </p>
            )}
          </div>
          <button type="button" onClick={() => setNlAiBanner(false)} className="text-text-muted hover:text-text-primary flex-shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Inline review-reasons warning */}
      {nlAiBanner && aiReviewReasons.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">AI flagged this for review</p>
            <ul className="mt-1 text-xs text-amber-400/90 list-disc list-inside space-y-0.5">
              {aiReviewReasons.slice(0, 4).map((r, i) => (
                <li key={i} className="truncate" title={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Low-confidence warning */}
      {nlAiBanner && initialValues?._confidence != null && initialValues._confidence < 0.7 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Low confidence — verify accounts</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Account names were fuzzy-matched (confidence {Math.round((initialValues._confidence ?? 0) * 100)}%).
              Please verify the Debit and Credit accounts before saving.
            </p>
          </div>
        </div>
      )}

      {/* AI auto-resolution status — Phase 3.5 Step 1 ───────────────── */}
      {nlAiBanner && autoResolved.debit && debitAccountId && (
        <p className="text-xs text-emerald-400 px-1 -mt-2">
          ✓ AI auto-selected debit account &quot;{autoResolved.debit.name}&quot; (confidence {Math.round(autoResolved.debit.score * 100)}%) — change below if wrong.
        </p>
      )}
      {nlAiBanner && autoResolved.credit && creditAccountId && (
        <p className="text-xs text-emerald-400 px-1 -mt-2">
          ✓ AI auto-selected credit account &quot;{autoResolved.credit.name}&quot; (confidence {Math.round(autoResolved.credit.score * 100)}%) — change below if wrong.
        </p>
      )}
      {/* Manual-pick prompts — only shown when resolver could NOT pick automatically */}
      {nlAiBanner && initialValues?._aiDebitAccount && !debitAccountId && !autoResolved.debit && (
        <p className="text-xs text-amber-400 px-1 -mt-2">
          AI suggested debit account &quot;{initialValues._aiDebitAccount}&quot; but match was ambiguous — pick the closest below.
        </p>
      )}
      {nlAiBanner && initialValues?._aiCreditAccount && !creditAccountId && !autoResolved.credit && (
        <p className="text-xs text-amber-400 px-1 -mt-2">
          AI suggested credit account &quot;{initialValues._aiCreditAccount}&quot; but match was ambiguous — pick the closest below.
        </p>
      )}

      {/* ── Section: Core Details ──────────────────────────────────────── */}
      <SectionLabel label="Transaction Details" />

      {/* Date + Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Date" type="date" error={errors.transactionDate?.message} {...register('transactionDate')} />
        <Input label={`Amount (${currency})`} type="number" step="0.01" min="0"
          error={errors.amount?.message} {...register('amount', { valueAsNumber: true })} />
      </div>

      <Input label="Description" placeholder="e.g., Office Supplies Purchase — paid by bank"
        error={errors.description?.message} {...register('description')} />

      <Select
        label="Transaction Type"
        options={TX_TYPE_OPTIONS}
        value={watch('transactionType') || ''}
        onChange={(v) => setValue('transactionType', v)} />
      {!txTypeWatch && (
        <p className="text-[11px] text-text-muted px-1 -mt-3">
          💡 Select a type for smart account suggestions, or leave blank for auto-detection.
        </p>
      )}

      {/* ── Section: Double-Entry Accounts ─────────────────────────────── */}
      <SectionLabel
        label="Accounts"
        note="Debit increases assets/expenses · Credit increases liabilities/revenue"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-glass rounded-xl bg-glass-panel">
        <Select label="Debit Account (DR)" options={debitOptions}
          value={debitAccountId} onChange={(val) => setValue('debitAccountId', val)}
          error={errors.debitAccountId?.message} placeholder="Select Account" searchable />
        <Select label="Credit Account (CR)" options={creditOptions}
          value={creditAccountId} onChange={(val) => setValue('creditAccountId', val)}
          error={errors.creditAccountId?.message} placeholder="Select Account" searchable />
      </div>

      {/* Live Journal Preview — zero API calls, pure client-side feedback */}
      {debitAccountId && creditAccountId && amount > 0 && !hasCompoundJournal && (
        <LiveJournalPreview
          debitAccount={accounts.find(a => a._id === debitAccountId)?.accountName}
          creditAccount={accounts.find(a => a._id === creditAccountId)?.accountName}
          amount={amount}
          currency={currency}
        />
      )}
      {/* Compound (multi-line) journal preview — for GST sale, payroll w/ deductions, etc. */}
      {hasCompoundJournal && (
        <div className="rounded-lg border border-cyan/25 bg-cyan/5 p-3 space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-cyan uppercase tracking-wide">
              Compound Journal — {aiJournalLines.length} lines
            </p>
            <span className="text-[10px] text-text-muted">AI-suggested · backend will validate</span>
          </div>
          <div className="divide-y divide-glass">
            {aiJournalLines.map((line, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-xs">
                <span className={`font-mono font-semibold w-10 ${line.type === 'debit' || line.entryType === 'debit' ? 'text-cyan' : 'text-text-muted'}`}>
                  {(line.type || line.entryType) === 'debit' ? 'DR' : 'CR'}
                </span>
                <span className={`flex-1 truncate ${line.resolved !== false ? 'text-text-primary' : 'text-amber-400'}`}>
                  {line.accountName || line.account}
                  {line.resolved === false && <span className="ml-1 text-[10px]">(unresolved)</span>}
                </span>
                <span className="text-text-secondary font-mono ml-2">
                  {formatCurrency(line.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live tax breakdown — self-hides when the business has tax disabled or
          the type isn't taxable. Fires /tax/preview as the amount changes. */}
      <TaxPreviewPanel
        amount={Number(amount) || 0}
        transactionType={transactionType}
        mode="inclusive"
        className="mt-1"
      />

      {/* Customer / Vendor + Invoice — shown when transaction type/accounts indicate AR or AP */}
      {(requiresCustomer || requiresVendor) && (
        <div className="animate-fade-in p-4 rounded-xl bg-cyan/5 border border-cyan/20 space-y-3 mt-1">
          <p className="text-[10px] font-semibold text-cyan uppercase tracking-wider">
            {requiresCustomer ? 'Customer Details' : 'Vendor Details'}
          </p>
          {requiresCustomer && (
            <PartyInput
              label="Customer (optional)"
              suggestions={customerSuggestions}
              parties={customerParties}
              value={watch('customerName') || ''}
              onChange={(val) => setValue('customerName', val)}
              onSelectId={(id) => setSelectedCustomerId(id)}
              selectedBalance={customerParties.find(p => p.name.toLowerCase() === (watch('customerName') || '').toLowerCase())?.balance}
              aiSuggested={nlPartyFilled && !!initialValues?.customerName}
              placeholder="Type or select a customer name…"
            />
          )}
          {requiresVendor && (
            <PartyInput
              label="Vendor / Supplier (optional)"
              suggestions={vendorSuggestions}
              parties={vendorParties}
              value={watch('vendorName') || ''}
              onChange={(val) => setValue('vendorName', val)}
              onSelectId={(id) => setSelectedVendorId(id)}
              selectedBalance={vendorParties.find(p => p.name.toLowerCase() === (watch('vendorName') || '').toLowerCase())?.balance}
              aiSuggested={nlPartyFilled && !!initialValues?.vendorName}
              placeholder="Type or select a vendor name…"
            />
          )}
          {/* Invoice / Bill number with auto-generate indicator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-text-secondary">
                {requiresCustomer ? 'Invoice Number' : 'Bill / PO Number'}
              </label>
              {invoiceAutoGenerated && watchedInvoiceNumber?.trim() && (
                <span className="text-[10px] text-cyan/70 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  Auto-generated — type to override
                </span>
              )}
            </div>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none transition-colors"
              placeholder={requiresCustomer ? 'e.g., INV-202601-00042' : 'e.g., BILL-202601-00042'}
              {...register('invoiceNumber')}
              onChange={(e) => {
                register('invoiceNumber').onChange(e)
                setInvoiceAutoGenerated(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Inventory Item Selector — shown for Inventory Sale / Inventory Purchase */}
      {/* Inventory selector — shown for any sale or purchase type so stock stays in sync */}
      {(['Inventory Sale', 'Inventory Purchase', 'Cash Sale', 'Credit Sale', 'Cash Purchase', 'Credit Purchase', 'Income'].includes(transactionType)) && inventoryItems.length > 0 && (
        <div className="animate-fade-in p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
            Inventory Item
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Select
                label="Select Item"
                options={[
                  { value: '', label: '— Select inventory item —' },
                  ...inventoryItems.map(i => ({
                    value: i._id,
                    label: `${i.name}${i.sku ? ` (${i.sku})` : ''} — Stock: ${i.currentStock} ${i.unit || 'units'}`,
                    subtitle: `Cost: ${i.unitCostPrice.toLocaleString()} per unit${i.currentStock <= i.reorderLevel ? ' · LOW STOCK' : ''}`,
                  }))
                ]}
                value={selectedInventoryItemId || ''}
                onChange={(val) => setSelectedInventoryItemId(val || null)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Quantity</label>
              <input
                type="number" min="1" step="1"
                value={inventoryQty}
                onChange={e => setInventoryQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none transition-colors"
              />
            </div>
          </div>
          {selectedInventoryItemId && (() => {
            const item = inventoryItems.find(i => i._id === selectedInventoryItemId)
            if (!item) return null
            const qty   = Math.max(0, Number(inventoryQty) || 0)
            const unit  = item.unit || 'units'
            const isPurchase = ['Inventory Purchase', 'Cash Purchase', 'Credit Purchase'].includes(transactionType)
            const valuationBefore = Math.round(item.currentStock * item.unitCostPrice * 100) / 100

            // ── Purchase: project new stock + weighted-avg cost (mirrors backend 7a) ──
            if (isPurchase) {
              // Backend infers cost/unit = amount / qty when no explicit unit cost is sent.
              const costPerUnit = qty > 0 && amount > 0
                ? Math.round((amount / qty) * 100) / 100
                : item.unitCostPrice
              const newStock   = item.currentStock + qty
              const newAvgCost = newStock > 0
                ? Math.round(((item.currentStock * item.unitCostPrice + qty * costPerUnit) / newStock) * 100) / 100
                : item.unitCostPrice
              const valuationAfter = Math.round(newStock * newAvgCost * 100) / 100
              return (
                <div className="pt-2 border-t border-emerald-500/15 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="block text-text-muted">Stock</span>
                      <span className="text-text-primary font-semibold tabular-nums">
                        {item.currentStock} → <span className="text-emerald-400">{newStock}</span> {unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-text-muted">Avg cost / {unit}</span>
                      <span className="text-text-primary font-semibold tabular-nums">
                        {formatCurrency(item.unitCostPrice, currency)}
                        {newAvgCost !== item.unitCostPrice && (
                          <> → <span className="text-cyan">{formatCurrency(newAvgCost, currency)}</span></>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="block text-text-muted">Stock value</span>
                      <span className="text-text-primary font-semibold tabular-nums">
                        {formatCurrency(valuationAfter, currency)}
                      </span>
                      <span className="ml-1 text-emerald-400 text-[10px]">
                        +{formatCurrency(Math.round((valuationAfter - valuationBefore) * 100) / 100, currency)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Stock will be <span className="text-emerald-400 font-medium">incremented</span> at a
                    weighted-average cost (DR Inventory). No separate journal — this transaction funds it.
                  </p>
                </div>
              )
            }

            // ── Sale: project remaining stock, COGS, and stock-out / low-stock warnings ──
            const cogsEst        = Math.round(qty * item.unitCostPrice * 100) / 100
            const newStock       = item.currentStock - qty
            const insufficient   = qty > item.currentStock
            const valuationAfter = Math.round(Math.max(0, newStock) * item.unitCostPrice * 100) / 100
            const crossesReorder = newStock >= 0 && newStock <= item.reorderLevel && item.currentStock > item.reorderLevel
            return (
              <div className="pt-2 border-t border-emerald-500/15 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="block text-text-muted">Stock</span>
                    <span className="text-text-primary font-semibold tabular-nums">
                      {item.currentStock} → <span className={cn(insufficient ? 'text-red-400' : 'text-amber-400')}>{newStock}</span> {unit}
                    </span>
                  </div>
                  <div>
                    <span className="block text-text-muted">Est. COGS</span>
                    <span className="text-amber-400 font-semibold tabular-nums">{formatCurrency(cogsEst, currency)}</span>
                  </div>
                  <div>
                    <span className="block text-text-muted">Stock value</span>
                    <span className="text-text-primary font-semibold tabular-nums">{formatCurrency(valuationAfter, currency)}</span>
                  </div>
                </div>
                {insufficient ? (
                  <p className="text-[11px] text-red-400 font-semibold">
                    ⚠ Insufficient stock — only {item.currentStock} {unit} available. This sale will be rejected.
                  </p>
                ) : crossesReorder ? (
                  <p className="text-[11px] text-red-400 font-medium">
                    ⚠ This sale drops stock to the reorder level ({item.reorderLevel} {unit}) — a reorder alert will fire.
                  </p>
                ) : item.currentStock <= item.reorderLevel ? (
                  <p className="text-[11px] text-red-400">⚠ Already below reorder level — {item.currentStock} {unit} remaining.</p>
                ) : null}
                <p className="text-[11px] text-text-muted">
                  Stock will be <span className="text-amber-400 font-medium">decremented</span> and COGS auto-posted
                  (DR Cost of Goods Sold · CR Inventory).
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {/* Additional Details (collapsible) */}
      <div className="border border-glass rounded-xl overflow-hidden">
        <button type="button" onClick={() => setShowOptional(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-glass-hover transition-colors">
          <span className="flex items-center gap-2">
            <span>More Options</span>
            <span className="text-text-muted text-xs font-normal">— due date · payment method · tax · currency · notes</span>
          </span>
          {showOptional ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
        </button>
        {showOptional && (
          <div className="px-4 pb-4 pt-1 space-y-4 border-t border-glass animate-fade-in">
            {/* Invoice number inside More Options (only for non-AR/AP types) */}
            {!requiresCustomer && !requiresVendor && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-text-secondary">Invoice / Bill Reference</label>
                  {invoiceAutoGenerated && watchedInvoiceNumber?.trim() && (
                    <span className="text-[10px] text-cyan/70 flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      Auto-generated — type to override
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none transition-colors"
                  placeholder="e.g., INV-202601-00042 or BILL-202601-00042"
                  {...register('invoiceNumber')}
                  onChange={(e) => {
                    register('invoiceNumber').onChange(e)
                    setInvoiceAutoGenerated(false)
                  }}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Reference Number" placeholder="e.g., REF-2024-001" {...register('referenceNumber')} />
              <Input label="Payment Due Date" type="date" {...register('dueDate')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Payment Method" options={[
                { value: '',              label: '— Select —' },
                { value: 'cash',          label: 'Cash' },
                { value: 'bank',          label: 'Bank Transfer' },
                { value: 'credit_card',   label: 'Credit Card' },
                { value: 'debit_card',    label: 'Debit Card' },
                { value: 'cheque',        label: 'Cheque' },
                { value: 'mobile_wallet', label: 'Mobile Wallet (JazzCash/EasyPaisa)' },
                { value: 'online',        label: 'Online (PayPal/Stripe)' },
              ]} value={watch('paymentMethod') || ''} onChange={(v) => setValue('paymentMethod', v)} />
              <Select
                label="Currency"
                options={currencyOptions}
                value={watch('txnCurrency') || currency}
                onChange={(v) => setValue('txnCurrency', v)}
              />
            </div>
            {watch('txnCurrency') && watch('txnCurrency') !== currency && (
              <div className="space-y-2">
                <Input
                  label={`Exchange Rate (1 ${watch('txnCurrency')} = ? ${currency})`}
                  type="number" step="0.0001" min="0" placeholder="e.g., 280.50"
                  {...register('exchangeRate', { valueAsNumber: true })}
                />
                {/* Live conversion preview */}
                {convPreview && (
                  <div className="flex items-center gap-2 rounded-lg border border-cyan/20 bg-cyan/5 px-3 py-2 text-xs">
                    <span className="text-text-muted">Preview:</span>
                    <span className="font-mono font-semibold text-text-primary">
                      {watchedAmount?.toLocaleString()} {watch('txnCurrency')}
                    </span>
                    <span className="text-text-muted">→</span>
                    <span className="font-mono font-bold text-cyan">
                      {convPreview.converted?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                    </span>
                    <span className="ml-auto text-text-muted">@ {convPreview.rate}</span>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={`Tax Amount (${currency}) — optional`} type="number" step="0.01" min="0"
                placeholder="GST / WHT amount" {...register('taxAmount', { valueAsNumber: true })} />
              <Input label="Tax Rate (%) — optional" type="number" step="0.1" min="0" max="100"
                placeholder="e.g., 17 for 17% GST" {...register('taxRate', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Notes (internal)</label>
              <textarea rows={2} placeholder="Optional internal notes about this transaction…"
                className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none resize-none transition-colors"
                {...register('notes')} />
            </div>
          </div>
        )}
      </div>

      {/* ── Section: Installment / EMI (optional) — hidden in edit mode ── */}
      {/* Installment Toggle */}
      {!isEditMode && <div className="pt-3 border-t border-glass">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input type="checkbox" className="peer sr-only" {...register('isInstallment')} />
            <div className="h-6 w-11 rounded-full bg-charcoal border border-glass peer-checked:bg-cyan peer-checked:border-cyan transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
          </div>
          <span className="text-sm font-medium text-text-primary group-hover:text-cyan transition-colors">
            Set up as Installment / EMI Plan
          </span>
        </label>

        {isInstallment && (
          <div className="mt-4 space-y-4 animate-fade-in p-4 border border-glass rounded-xl bg-glass-hover">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label={`Down Payment (${currency})`} type="number" step="0.01" min="0"
                error={errors.downPayment?.message} {...register('downPayment', { valueAsNumber: true })} />
              <Input label="No. of Instalments" type="number" min="1"
                error={errors.installmentCount?.message} {...register('installmentCount', { valueAsNumber: true })} />
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Frequency</label>
                <Select options={[
                  { value: 'weekly',    label: 'Weekly' },
                  { value: 'biweekly',  label: 'Bi-weekly' },
                  { value: 'monthly',   label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                ]} value={fFreq} onChange={(val) => setValue('installmentFrequency', val)} />
              </div>
              <Input label="Interest Rate (% p.a.)" type="number" step="0.1" min="0" max="100"
                placeholder="0 = interest-free" error={errors.interestRate?.message}
                {...register('interestRate', { valueAsNumber: true })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="First Payment Date (optional)" type="date"
                placeholder="defaults to one period after purchase" {...register('firstPaymentDate')} />
              {(watch('interestRate') || 0) > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Interest Method</label>
                  <Select options={[
                    { value: 'reducing_balance', label: 'Reducing Balance (standard EMI)' },
                    { value: 'flat',             label: 'Flat Interest (simple)' },
                  ]} value={watch('interestMethod') || 'reducing_balance'}
                    onChange={(val) => setValue('interestMethod', val)} />
                </div>
              )}
            </div>

            <InstallmentJournalPreview
              total={amount} downPayment={fDown}
              installmentCount={fCount} installmentFrequency={fFreq}
              interestRate={fRate} interestMethod={watch('interestMethod') || 'reducing_balance'}
              firstPaymentDate={watch('firstPaymentDate') || ''}
              assetName={debitAcct?.accountName} currency={currency} />
          </div>
        )}
      </div>}

      {/* Pre-save warnings — advisory only, shown in create mode after first submit attempt */}
      {!isEditMode && preSaveWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-300">Advisory warnings — review before saving</p>
            </div>
            <button type="button" onClick={() => { setPreSaveWarnings([]); setPreSaveAcknowledged(false) }} className="text-text-muted hover:text-text-primary flex-shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="text-xs text-amber-400/90 list-disc list-inside space-y-1">
            {preSaveWarnings.map((w, i) => <li key={i}>{applyGAAPGloss(w)}</li>)}
          </ul>
          {/* FIX: was !preSaveAcknowledged — inverted. Now shows the hint exactly when warnings are present */}
          {preSaveAcknowledged && (
            <p className="text-xs text-amber-400/70 font-medium">
              ⚠ These are advisory only — your transaction is valid. Click{' '}
              <span className="font-bold text-amber-300">
                {watch('isInstallment') ? 'Create Instalment Plan' : 'Record Transaction'}
              </span>{' '}
              again to save anyway.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-glass">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" loading={isPending || preSaveCheck.isPending} disabled={isPeriodLocked}>
          {isEditMode
            ? 'Save Changes'
            : isInstallment ? 'Create Instalment Plan' : 'Record Transaction'}
        </Button>
      </div>
    </form>
  )
}

// ─── Tab 3: Excel / CSV Import ────────────────────────────────────────────────
function ExcelTab({ onSuccess, onCancel }) {
  const [step, setStep]         = useState('upload')
  const [preview, setPreview]   = useState(null)
  const [rows, setRows]         = useState([])
  const [editingIdx, setEditingIdx] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const fileInputRef            = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const excelPreview = useExcelPreview()
  const excelConfirm = useExcelConfirm()

  const handleFile = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) return
    const result = await excelPreview.mutateAsync(file)
    if (result) {
      setPreview(result)
      setRows(result.validRows ? [...result.validRows] : [])
      setStep('preview')
      setEditingIdx(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleConfirm = async () => {
    if (!rows.length) return
    await excelConfirm.mutateAsync(rows)
    onSuccess()
  }

  const updateRow = (idx, field, value) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))

  const fmtDate = (raw) => {
    if (!raw) return '—'
    const s = typeof raw === 'string' ? raw : new Date(raw).toISOString()
    return s.split('T')[0]
  }
  const fmtAmt = (n) => Number(n || 0).toLocaleString('en-PK')

  if (step === 'preview' && preview) {
    const stats = preview.confidenceStats || {}
    const fi    = preview.fileInfo        || {}
    const dupes = preview.duplicatesFound || 0

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass bg-glass-panel px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-text-primary">
              {rows.length} rows ready to import
              {preview.invalidCount > 0 && (
                <span className="ml-2 text-xs text-amber-400">({preview.invalidCount} skipped)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {fi.format && <span className="text-text-muted font-mono uppercase">{fi.format}</span>}
              {stats.high   > 0 && <span className="text-emerald-400">● {stats.high} High</span>}
              {stats.medium > 0 && <span className="text-amber-400">● {stats.medium} Medium</span>}
              {stats.low    > 0 && <span className="text-red-400">● {stats.low} Low confidence</span>}
              {dupes        > 0 && <span className="text-amber-400">⚠ {dupes} duplicate{dupes > 1 ? 's' : ''}</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setPreview(null); setRows([]) }}
            disabled={excelConfirm.isPending}>
            <X className="h-3.5 w-3.5 mr-1" /> Change file
          </Button>
        </div>

        {preview.errors?.length > 0 && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5">
            <button type="button" onClick={() => setShowErrors(v => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-red-400">
              <span><AlertTriangle className="inline h-3 w-3 mr-1" />{preview.errors.length} row{preview.errors.length > 1 ? 's' : ''} with errors — click to {showErrors ? 'hide' : 'view'}</span>
              {showErrors ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showErrors && (
              <ul className="max-h-36 overflow-auto border-t border-red-500/20 divide-y divide-red-500/10">
                {preview.errors.map((e, i) => (
                  <li key={i} className="px-3 py-1.5 text-xs text-red-400">
                    <span className="font-semibold">Row {e.row}</span>
                    {e.field && e.field !== 'general' && <span className="ml-1 rounded bg-red-500/10 px-1 font-mono text-[10px]">{e.field}</span>}
                    {' '}{e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="overflow-x-auto scrollbar-thin rounded-lg border border-glass max-h-72">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg3 border-b border-glass">
              <tr>
                {['#', 'Date', 'Description', 'Amount', 'Debit → Credit', 'Conf.'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-medium text-text-secondary uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass">
              {rows.map((row, idx) => {
                const isEditing   = editingIdx === idx
                const hasDupe     = row.isDuplicate
                const hasInferred = row.inferredFields?.length > 0
                const hasWarning  = row.warnings?.length > 0
                const isLowConf   = (row.confidenceScore ?? 100) < 70

                return (
                  <tr key={idx}
                    className={`transition-colors ${hasDupe ? 'bg-amber-500/5' : ''} ${isLowConf && !hasDupe ? 'bg-red-500/5' : ''} ${isEditing ? 'bg-cyan/5' : 'hover:bg-glass-hover'}`}>
                    <td className="px-2 py-1.5 text-text-muted w-8 text-center">{row.originalRow ?? idx + 2}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-text-secondary">
                      {isEditing ? (
                        <input type="date"
                          className="w-28 rounded bg-glass-panel border border-cyan/40 px-1.5 py-0.5 text-text-primary focus:outline-none"
                          value={fmtDate(row.transactionDate)}
                          onChange={e => updateRow(idx, 'transactionDate', e.target.value)} />
                      ) : fmtDate(row.transactionDate)}
                    </td>
                    <td className="px-2 py-1.5 max-w-[180px]">
                      {isEditing ? (
                        <input autoFocus
                          className="w-full rounded bg-glass-panel border border-cyan/40 px-1.5 py-0.5 text-text-primary focus:outline-none"
                          value={row.description || ''}
                          onChange={e => updateRow(idx, 'description', e.target.value)}
                          onBlur={() => setEditingIdx(null)}
                          onKeyDown={e => e.key === 'Enter' && setEditingIdx(null)} />
                      ) : (
                        <span className="block truncate text-text-primary cursor-text hover:text-cyan"
                          title={`${row.description}${hasWarning ? '\n⚠ ' + row.warnings.join('\n⚠ ') : ''}`}
                          onClick={() => setEditingIdx(idx)}>
                          {row.description}
                          {hasInferred && <span title={`AI inferred: ${row.inferredFields.join(', ')}`} className="ml-1 text-cyan">✦</span>}
                          {hasDupe     && <span title="Possible duplicate" className="ml-1 text-amber-400">⚠</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-medium text-text-primary whitespace-nowrap text-right">
                      {isEditing ? (
                        <input type="number"
                          className="w-24 rounded bg-glass-panel border border-cyan/40 px-1.5 py-0.5 text-text-primary text-right focus:outline-none"
                          value={row.amount}
                          onChange={e => updateRow(idx, 'amount', parseFloat(e.target.value) || 0)} />
                      ) : fmtAmt(row.amount)}
                    </td>
                    <td className="px-2 py-1.5 text-text-secondary max-w-[160px]">
                      <span className="truncate block" title={`${row.debitAccountName} → ${row.creditAccountName}`}>
                        {(row.debitAccountName || '—').split(' ').slice(0,2).join(' ')}
                        <span className="text-text-muted mx-0.5">→</span>
                        {(row.creditAccountName || '—').split(' ').slice(0,2).join(' ')}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <ConfBadge label={row.confidenceLabel || 'High'} score={row.confidenceScore ?? 100} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <p className="text-center text-[10px] text-text-muted">
            Click any description to edit inline · ✦ = AI-inferred · ⚠ = possible duplicate · <span className="text-red-400">red row = fuzzy account match</span>
          </p>
        )}

        <div className="flex justify-between gap-3 pt-3 border-t border-glass">
          <Button variant="ghost" onClick={onCancel} disabled={excelConfirm.isPending}>Cancel</Button>
          <Button onClick={handleConfirm} loading={excelConfirm.isPending} disabled={!rows.length}>
            Import {rows.length} Transaction{rows.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Upload a spreadsheet and VousFin will parse, validate, and let you review before saving.
      </p>
      <div
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer ${
          dragOver ? 'border-cyan bg-cyan/5' : 'border-glass hover:border-cyan/40 hover:bg-glass-hover'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {excelPreview.isPending
          ? <Loader2 className="h-10 w-10 text-cyan animate-spin" />
          : <Upload  className="h-10 w-10 text-text-muted" />
        }
        <div className="text-center">
          <p className="font-medium text-text-primary">Drop file here or click to browse</p>
          <p className="text-xs text-text-muted mt-1">.xlsx · .xls · .csv — max 10 MB</p>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
      <div className="rounded-lg border border-glass bg-glass-panel p-3 text-xs">
        <p className="font-medium text-text-secondary mb-1">Required columns (in any order, fuzzy-matched):</p>
        <p className="font-mono text-text-muted">date · description · amount · debit account · credit account</p>
        <p className="font-mono text-text-muted mt-0.5 text-[10px]">Optional: type · mode · customer · vendor · reference · notes · tax · currency</p>
      </div>
      <div className="flex justify-end pt-2 border-t border-glass">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// Suppress unused-import lint (CheckCircle is kept available for future banner states)
// eslint-disable-next-line no-unused-vars
const _keepImports = { CheckCircle }
