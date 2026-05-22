import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MessageSquare, LayoutList, Upload, CheckCircle, AlertTriangle, Loader2, X, ChevronUp, ChevronDown } from 'lucide-react'
import Modal from '@/components/modals/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { useAccounts } from '@/hooks/useAccounts'
import { useCustomers, useVendors } from '@/hooks/useParties'
import {
  useCreateTransaction,
  useCreateInstallmentTransaction,
  useNLPreview,
  useNLConfirm,
  useExcelPreview,
  useExcelConfirm,
} from '@/hooks/useTransactions'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { formatCurrency } from '@/utils/formatters'

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const formSchema = z.object({
  transactionDate: z.string().min(1, 'Date is required'),
  description: z.string().min(2, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  debitAccountId: z.string().min(1, 'Debit account is required'),
  creditAccountId: z.string().min(1, 'Credit account is required'),
  transactionType: z.string().optional(),
  customerName: z.string().optional(),
  vendorName: z.string().optional(),
  isInstallment: z.boolean().optional(),
  downPayment: z.number().min(0).optional(),
  installmentCount: z.number().min(1).optional(),
  installmentFrequency: z.string().optional(),
}).refine((d) => d.debitAccountId !== d.creditAccountId, {
  message: 'Debit and Credit accounts must be different',
  path: ['creditAccountId'],
})

// ─── Creatable Party Combobox ───────────────────────────────────────────────────
function PartyInput({ label, suggestions, value, onChange, placeholder }) {
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

  const handleSelect = (name) => { onChange(name); setOpen(false) }

  const showNew = value?.trim() && !suggestions.some(s => s.toLowerCase() === value.trim().toLowerCase())

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <input
        type="text"
        autoComplete="off"
        className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none transition-colors"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && (filtered.length > 0 || showNew) && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border border-glass bg-navy shadow-xl overflow-hidden">
          {filtered.map(name => (
            <div
              key={name}
              onMouseDown={() => handleSelect(name)}
              className="px-3 py-2 text-sm text-text-primary hover:bg-glass-hover cursor-pointer"
            >
              {name}
            </div>
          ))}
          {showNew && (
            <div
              onMouseDown={() => handleSelect(value.trim())}
              className="px-3 py-2 text-sm text-cyan hover:bg-cyan/10 cursor-pointer border-t border-glass"
            >
              + Add "{value.trim()}" as new
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'nl',    label: 'Natural Language', icon: MessageSquare },
  { id: 'form',  label: 'Structured Form',  icon: LayoutList },
  { id: 'excel', label: 'Excel / CSV',      icon: Upload },
]

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TransactionFormModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('form')
  const currency = useBusinessStore((s) => s.currency)

  // Reset to default tab when modal opens
  useEffect(() => {
    if (isOpen) setActiveTab('form')
  }, [isOpen])

  const handleClose = () => {
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record Transaction" className="sm:max-w-2xl">
      {/* Tab Bar */}
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

      {/* Tab Panels */}
      {activeTab === 'nl'    && <NLTab currency={currency} onSuccess={handleClose} />}
      {activeTab === 'form'  && <StructuredFormTab currency={currency} onSuccess={handleClose} onCancel={handleClose} />}
      {activeTab === 'excel' && <ExcelTab onSuccess={handleClose} onCancel={handleClose} />}
    </Modal>
  )
}

// ─── Tab 1: Natural Language ───────────────────────────────────────────────────
function NLTab({ currency, onSuccess }) {
  const [step, setStep] = useState('input') // 'input' | 'preview'
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)

  const nlPreview = useNLPreview()
  const nlConfirm = useNLConfirm()
  const { data: rawAccounts } = useAccounts()
  const accounts = useMemo(() => {
    const d = rawAccounts
    return Array.isArray(d?.docs) ? d.docs : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
  }, [rawAccounts])

  const accountOptions = useMemo(() =>
    accounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.accountType})` }))
  , [accounts])

  const handleParse = async () => {
    if (text.trim().length < 5) return
    const result = await nlPreview.mutateAsync(text)
    if (result) {
      setPreview({
        transactionDate: result.transactionDate || new Date().toISOString().split('T')[0],
        description: result.description || text,
        amount: result.amount || 0,
        transactionType: result.transactionType || '',
        debitAccountId: result.debitAccountId || '',
        creditAccountId: result.creditAccountId || '',
        debitAccount: result.debitAccount || '',
        creditAccount: result.creditAccount || '',
      })
      setStep('preview')
    }
  }

  const handleConfirm = async () => {
    await nlConfirm.mutateAsync({
      transactionDate: preview.transactionDate,
      description: preview.description,
      amount: preview.amount,
      transactionType: preview.transactionType || undefined,
      debitAccountId: preview.debitAccountId,
      creditAccountId: preview.creditAccountId,
    })
    onSuccess()
  }

  const handleReset = () => {
    setStep('input')
    setPreview(null)
  }

  if (step === 'preview' && preview) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan/5 border border-cyan/20">
          <CheckCircle className="h-5 w-5 text-cyan flex-shrink-0" />
          <p className="text-sm text-text-secondary">Review the parsed transaction below and correct any field before confirming.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none"
              value={preview.transactionDate}
              onChange={e => setPreview(p => ({ ...p, transactionDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none"
              value={preview.amount}
              onChange={e => setPreview(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg bg-glass-panel border border-glass text-text-primary text-sm focus:border-cyan focus:outline-none"
            value={preview.description}
            onChange={e => setPreview(p => ({ ...p, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Select
              label="Debit Account (DR)"
              options={accountOptions}
              value={preview.debitAccountId || ''}
              onChange={(v) => setPreview(p => ({ ...p, debitAccountId: v }))}
              placeholder={preview.debitAccount ? `AI suggested: ${preview.debitAccount}` : 'Select account'}
            />
            {!preview.debitAccountId && preview.debitAccount && (
              <p className="mt-1 text-xs text-amber-400">AI suggested "{preview.debitAccount}" — please select the closest match above</p>
            )}
          </div>
          <div>
            <Select
              label="Credit Account (CR)"
              options={accountOptions}
              value={preview.creditAccountId || ''}
              onChange={(v) => setPreview(p => ({ ...p, creditAccountId: v }))}
              placeholder={preview.creditAccount ? `AI suggested: ${preview.creditAccount}` : 'Select account'}
            />
            {!preview.creditAccountId && preview.creditAccount && (
              <p className="mt-1 text-xs text-amber-400">AI suggested "{preview.creditAccount}" — please select the closest match above</p>
            )}
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t border-glass">
          <Button variant="ghost" onClick={handleReset} disabled={nlConfirm.isPending}>
            ← Try Again
          </Button>
          <Button
            onClick={handleConfirm}
            loading={nlConfirm.isPending}
            disabled={!preview.debitAccountId || !preview.creditAccountId || preview.amount <= 0}
          >
            Confirm & Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Describe your transaction in plain English. VousFin will parse it into a double-entry journal entry.
      </p>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-text-secondary">Transaction Description</label>
        <textarea
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-glass-panel border border-glass text-text-primary text-sm placeholder:text-text-muted focus:border-cyan focus:outline-none resize-none transition-colors"
          placeholder={'Examples:\n• "Paid PKR 5000 for office supplies from bank"\n• "Received PKR 25000 from customer Ali for consulting"\n• "Bought laptop worth PKR 120000 on credit"'}
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-glass">
        <Button
          onClick={handleParse}
          loading={nlPreview.isPending}
          disabled={text.trim().length < 5}
        >
          Parse Transaction →
        </Button>
      </div>
    </div>
  )
}

// ─── Tab 2: Structured Form ───────────────────────────────────────────────────
function StructuredFormTab({ currency, onSuccess, onCancel }) {
  const createTx = useCreateTransaction()
  const createInstallmentTx = useCreateInstallmentTransaction()

  const { data: rawAccounts } = useAccounts()
  const { data: rawCustomers } = useCustomers()
  const { data: rawVendors } = useVendors()

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
      transactionDate: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      debitAccountId: '',
      creditAccountId: '',
      transactionType: '',
      isInstallment: false,
      downPayment: 0,
      installmentCount: 3,
      installmentFrequency: 'monthly',
    },
  })

  useEffect(() => {
    reset()
    setValue('transactionDate', new Date().toISOString().split('T')[0])
  }, [reset, setValue])

  const accountOptions = useMemo(() =>
    accounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.accountType})` }))
  , [accounts])

  const customerSuggestions = useMemo(() =>
    customers.map(c => c.fullName || c.name || c.businessName).filter(Boolean)
  , [customers])

  const vendorSuggestions = useMemo(() =>
    vendors.map(v => v.vendorName || v.name).filter(Boolean)
  , [vendors])

  const txTypeOptions = [
    { value: '', label: 'Auto-detect from accounts' },
    { value: 'Income', label: 'Income' },
    { value: 'Expense', label: 'Expense' },
    { value: 'Transfer', label: 'Transfer' },
    { value: 'Credit Sale', label: 'Credit Sale (A/R)' },
    { value: 'Credit Purchase', label: 'Credit Purchase (A/P)' },
    { value: 'Payment Received', label: 'Payment Received' },
    { value: 'Payment Made', label: 'Payment Made' },
    { value: 'Owner Investment', label: 'Owner Investment' },
    { value: 'Owner Withdrawal', label: 'Owner Withdrawal' },
    { value: 'Asset Purchase', label: 'Asset Purchase' },
  ]

  const debitAccountId = watch('debitAccountId')
  const creditAccountId = watch('creditAccountId')
  const isInstallment = watch('isInstallment')
  const amount = watch('amount')

  const requiresCustomer = useMemo(() => {
    const d = accounts.find(a => a._id === debitAccountId)
    const c = accounts.find(a => a._id === creditAccountId)
    return d?.accountName === 'Accounts Receivable' || c?.accountName === 'Accounts Receivable'
  }, [debitAccountId, creditAccountId, accounts])

  const requiresVendor = useMemo(() => {
    const d = accounts.find(a => a._id === debitAccountId)
    const c = accounts.find(a => a._id === creditAccountId)
    return d?.accountName === 'Accounts Payable' || c?.accountName === 'Accounts Payable'
  }, [debitAccountId, creditAccountId, accounts])

  const onSubmit = async (data) => {
    try {
      const { isInstallment, downPayment, installmentCount, installmentFrequency, transactionType, customerName, vendorName, ...base } = data

      if (isInstallment) {
        const payload = { ...base, downPayment, installmentCount, installmentFrequency }
        if (transactionType) payload.transactionType = transactionType
        if (customerName?.trim()) payload.customerName = customerName.trim()
        if (vendorName?.trim()) payload.vendorName = vendorName.trim()
        await createInstallmentTx.mutateAsync(payload)
      } else {
        const payload = { ...base }
        if (transactionType) payload.transactionType = transactionType
        if (customerName?.trim()) payload.customerName = customerName.trim()
        if (vendorName?.trim()) payload.vendorName = vendorName.trim()
        await createTx.mutateAsync(payload)
      }
      onSuccess()
    } catch {
      // toast handled in hooks
    }
  }

  const isPending = isSubmitting || createTx.isPending || createInstallmentTx.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
      {/* Row 1: Date + Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          error={errors.transactionDate?.message}
          {...register('transactionDate')}
        />
        <Input
          label={`Amount (${currency})`}
          type="number"
          step="0.01"
          min="0"
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />
      </div>

      {/* Description */}
      <Input
        label="Description"
        placeholder="e.g., Office Supplies Purchase"
        error={errors.description?.message}
        {...register('description')}
      />

      {/* Transaction Type (optional, auto-detected) */}
      <Select
        label="Transaction Type (optional)"
        options={txTypeOptions}
        value={watch('transactionType') || ''}
        onChange={(v) => setValue('transactionType', v)}
      />

      {/* Double Entry Accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-glass rounded-xl bg-glass-panel">
        <Select
          label="Debit Account (DR)"
          options={accountOptions}
          value={debitAccountId}
          onChange={(val) => setValue('debitAccountId', val)}
          error={errors.debitAccountId?.message}
          placeholder="Select Account"
        />
        <Select
          label="Credit Account (CR)"
          options={accountOptions}
          value={creditAccountId}
          onChange={(val) => setValue('creditAccountId', val)}
          error={errors.creditAccountId?.message}
          placeholder="Select Account"
        />
      </div>

      {/* Conditional Customer / Vendor — always optional, auto-creates on new name */}
      {(requiresCustomer || requiresVendor) && (
        <div className="animate-fade-in p-4 rounded-xl bg-cyan/5 border border-cyan/20 space-y-4">
          {requiresCustomer && (
            <PartyInput
              label="Customer (optional)"
              suggestions={customerSuggestions}
              value={watch('customerName') || ''}
              onChange={(val) => setValue('customerName', val)}
              placeholder="Type or select a customer name…"
            />
          )}
          {requiresVendor && (
            <PartyInput
              label="Vendor (optional)"
              suggestions={vendorSuggestions}
              value={watch('vendorName') || ''}
              onChange={(val) => setValue('vendorName', val)}
              placeholder="Type or select a vendor name…"
            />
          )}
        </div>
      )}

      {/* Installment Toggle */}
      <div className="pt-3 border-t border-glass">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input type="checkbox" className="peer sr-only" {...register('isInstallment')} />
            <div className="h-6 w-11 rounded-full bg-charcoal border border-glass peer-checked:bg-cyan peer-checked:border-cyan transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
          </div>
          <span className="text-sm font-medium text-text-primary group-hover:text-cyan transition-colors">
            Set up as Installment Plan
          </span>
        </label>

        {isInstallment && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in p-4 border border-glass rounded-xl bg-glass-hover">
            <Input
              label="Down Payment"
              type="number"
              step="0.01"
              min="0"
              error={errors.downPayment?.message}
              {...register('downPayment', { valueAsNumber: true })}
            />
            <Input
              label="Installments"
              type="number"
              min="1"
              error={errors.installmentCount?.message}
              {...register('installmentCount', { valueAsNumber: true })}
            />
            <Select
              label="Frequency"
              options={[
                { value: 'daily',    label: 'Daily' },
                { value: 'weekly',   label: 'Weekly' },
                { value: 'monthly',  label: 'Monthly' },
              ]}
              value={watch('installmentFrequency')}
              onChange={(val) => setValue('installmentFrequency', val)}
            />
            <div className="sm:col-span-3 text-xs text-text-muted text-right">
              Remaining: {formatCurrency(Math.max(0, (amount || 0) - (watch('downPayment') || 0)), currency)}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-glass">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          Record Transaction
        </Button>
      </div>
    </form>
  )
}

// ─── Confidence badge ─────────────────────────────────────────────────────────
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

// ─── Tab 3: Excel / CSV Import ─────────────────────────────────────────────────
function ExcelTab({ onSuccess, onCancel }) {
  const [step, setStep]         = useState('upload') // 'upload' | 'preview'
  const [preview, setPreview]   = useState(null)
  const [rows, setRows]         = useState([])       // editable copy of validRows
  const [editingIdx, setEditingIdx] = useState(null) // index of row being inline-edited
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

  // Inline-edit helpers
  const updateRow = (idx, field, value) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))

  const fmtDate = (raw) => {
    if (!raw) return '—'
    const s = typeof raw === 'string' ? raw : new Date(raw).toISOString()
    return s.split('T')[0]
  }
  const fmtAmt = (n) => Number(n || 0).toLocaleString('en-PK')

  // ── Preview step ─────────────────────────────────────────────────────────────
  if (step === 'preview' && preview) {
    const stats = preview.confidenceStats || {}
    const fi    = preview.fileInfo        || {}
    const dupes = preview.duplicatesFound || 0

    return (
      <div className="space-y-4 animate-fade-in">

        {/* ── Summary bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass bg-glass-panel px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-text-primary">
              {rows.length} rows ready to import
              {preview.invalidCount > 0 && (
                <span className="ml-2 text-xs text-amber-400">({preview.invalidCount} skipped)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {fi.format && (
                <span className="text-text-muted font-mono uppercase">{fi.format}</span>
              )}
              {stats.high   > 0 && <span className="text-emerald-400">● {stats.high} High</span>}
              {stats.medium > 0 && <span className="text-amber-400">● {stats.medium} Medium</span>}
              {stats.low    > 0 && <span className="text-red-400">● {stats.low} Low confidence</span>}
              {dupes        > 0 && <span className="text-amber-400">⚠ {dupes} duplicate{dupes > 1 ? 's' : ''}</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setPreview(null); setRows([]); }}
            disabled={excelConfirm.isPending}>
            <X className="h-3.5 w-3.5 mr-1" /> Change file
          </Button>
        </div>

        {/* ── Error list (collapsible) ── */}
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

        {/* ── Preview table with confidence + inline edit ── */}
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
                const isEditing  = editingIdx === idx
                const hasDupe    = row.isDuplicate
                const hasInferred = row.inferredFields?.length > 0
                const hasWarning = row.warnings?.length > 0

                return (
                  <tr key={idx}
                    className={`transition-colors ${hasDupe ? 'bg-amber-500/5' : ''} ${isEditing ? 'bg-cyan/5' : 'hover:bg-glass-hover'}`}>

                    {/* Row # */}
                    <td className="px-2 py-1.5 text-text-muted w-8 text-center">
                      {row.originalRow ?? idx + 2}
                    </td>

                    {/* Date */}
                    <td className="px-2 py-1.5 whitespace-nowrap text-text-secondary">
                      {isEditing ? (
                        <input
                          type="date"
                          className="w-28 rounded bg-glass-panel border border-cyan/40 px-1.5 py-0.5 text-text-primary focus:outline-none"
                          value={fmtDate(row.transactionDate)}
                          onChange={e => updateRow(idx, 'transactionDate', e.target.value)}
                        />
                      ) : fmtDate(row.transactionDate)}
                    </td>

                    {/* Description — click to inline-edit */}
                    <td className="px-2 py-1.5 max-w-[180px]">
                      {isEditing ? (
                        <input
                          autoFocus
                          className="w-full rounded bg-glass-panel border border-cyan/40 px-1.5 py-0.5 text-text-primary focus:outline-none"
                          value={row.description || ''}
                          onChange={e => updateRow(idx, 'description', e.target.value)}
                          onBlur={() => setEditingIdx(null)}
                          onKeyDown={e => e.key === 'Enter' && setEditingIdx(null)}
                        />
                      ) : (
                        <span
                          className="block truncate text-text-primary cursor-text hover:text-cyan"
                          title={`${row.description}${hasWarning ? '\n⚠ ' + row.warnings.join('\n⚠ ') : ''}`}
                          onClick={() => setEditingIdx(idx)}
                        >
                          {row.description}
                          {hasInferred && <span title={`AI inferred: ${row.inferredFields.join(', ')}`} className="ml-1 text-cyan">✦</span>}
                          {hasDupe     && <span title="Possible duplicate" className="ml-1 text-amber-400">⚠</span>}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-2 py-1.5 font-medium text-text-primary whitespace-nowrap text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-24 rounded bg-glass-panel border border-cyan/40 px-1.5 py-0.5 text-text-primary text-right focus:outline-none"
                          value={row.amount}
                          onChange={e => updateRow(idx, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      ) : fmtAmt(row.amount)}
                    </td>

                    {/* Debit → Credit */}
                    <td className="px-2 py-1.5 text-text-secondary max-w-[160px]">
                      <span className="truncate block" title={`${row.debitAccountName} → ${row.creditAccountName}`}>
                        {(row.debitAccountName || '—').split(' ').slice(0,2).join(' ')}
                        <span className="text-text-muted mx-0.5">→</span>
                        {(row.creditAccountName || '—').split(' ').slice(0,2).join(' ')}
                      </span>
                    </td>

                    {/* Confidence badge */}
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
            Click any description to edit inline · ✦ = AI-inferred field · ⚠ = possible duplicate
          </p>
        )}

        <div className="flex justify-between gap-3 pt-3 border-t border-glass">
          <Button variant="ghost" onClick={onCancel} disabled={excelConfirm.isPending}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            loading={excelConfirm.isPending}
            disabled={!rows.length}
          >
            Import {rows.length} Transaction{rows.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    )
  }

  // ── Upload step ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Upload a spreadsheet and VousFin will parse, validate, and let you review before saving.
      </p>

      {/* Drop Zone */}
      <div
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer ${
          dragOver ? 'border-cyan bg-cyan/5' : 'border-glass hover:border-cyan/40 hover:bg-glass-hover'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {excelPreview.isPending ? (
          <Loader2 className="h-10 w-10 text-cyan animate-spin" />
        ) : (
          <Upload className="h-10 w-10 text-text-muted" />
        )}
        <div className="text-center">
          <p className="font-medium text-text-primary">Drop file here or click to browse</p>
          <p className="text-xs text-text-muted mt-1">.xlsx · .xls · .csv — max 10 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* Column guide */}
      <div className="rounded-lg border border-glass bg-glass-panel p-3 text-xs">
        <p className="font-medium text-text-secondary mb-1">Required columns (in any order, fuzzy-matched):</p>
        <p className="font-mono text-text-muted">date · description · amount · debit account · credit account</p>
        <p className="font-mono text-text-muted mt-0.5 text-[10px]">Optional: type · mode · customer · vendor · reference · notes</p>
      </div>

      <div className="flex justify-end pt-2 border-t border-glass">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
