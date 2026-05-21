import { useState, useEffect, useMemo } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import useCustomerStore from '@/stores/useCustomerStore'
import useVendorStore from '@/stores/useVendorStore'
import transactionService from '@/services/transaction.service'
import Input from '@/components/common/Input'
import Select from '@/components/common/Select'
import Button from '@/components/common/Button'
import { showError, showSuccess } from '@/components/common/Toast'
import { getErrorMessage } from '@/utils/errorHandler'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

// Transaction type config: auto-mapping names, allowed account types per slot, required fields
const TX_CONFIG = {
  'Income': {
    label: 'Income (Cash / Bank)',
    autoDebitNames: null,
    autoCreditNames: null,
    debitTypes: ['Asset'],
    creditTypes: ['Revenue'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Expense': {
    label: 'Expense (Cash / Bank)',
    autoDebitNames: null,
    autoCreditNames: null,
    debitTypes: ['Expense'],
    creditTypes: ['Asset'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Credit Sale': {
    label: 'Credit Sale (A/R)',
    autoDebitNames: ['Accounts Receivable'],
    autoCreditNames: null,
    debitTypes: ['Asset'],
    creditTypes: ['Revenue'],
    requiresCustomer: true,
    requiresVendor: false,
    requiresDueDate: true,
  },
  'Credit Purchase': {
    label: 'Credit Purchase (A/P)',
    autoDebitNames: null,
    autoCreditNames: ['Accounts Payable'],
    debitTypes: ['Expense', 'Asset'],
    creditTypes: ['Liability'],
    requiresCustomer: false,
    requiresVendor: true,
    requiresDueDate: true,
  },
  'Payment Received': {
    label: 'Payment Received (Settle A/R)',
    autoDebitNames: null,
    autoCreditNames: ['Accounts Receivable'],
    debitTypes: ['Asset'],
    creditTypes: ['Asset'],
    requiresCustomer: true,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Payment Made': {
    label: 'Payment Made (Settle A/P)',
    autoDebitNames: ['Accounts Payable'],
    autoCreditNames: null,
    debitTypes: ['Liability'],
    creditTypes: ['Asset'],
    requiresCustomer: false,
    requiresVendor: true,
    requiresDueDate: false,
  },
  'Owner Investment': {
    label: "Owner Investment (Capital)",
    autoDebitNames: null,
    autoCreditNames: ["Owner's Equity", 'Owner Capital'],
    debitTypes: ['Asset'],
    creditTypes: ['Equity'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Owner Withdrawal': {
    label: 'Owner Withdrawal (Drawings)',
    autoDebitNames: ['Owner Drawings'],
    autoCreditNames: null,
    debitTypes: ['Equity'],
    creditTypes: ['Asset'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Loan Disbursement': {
    label: 'Loan Received',
    autoDebitNames: null,
    autoCreditNames: ['Loan Payable'],
    debitTypes: ['Asset'],
    creditTypes: ['Liability'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Loan Repayment': {
    label: 'Loan Repayment',
    autoDebitNames: ['Loan Payable'],
    autoCreditNames: null,
    debitTypes: ['Liability'],
    creditTypes: ['Asset'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Asset Purchase': {
    label: 'Asset Purchase',
    autoDebitNames: ['Fixed Assets'],
    autoCreditNames: null,
    debitTypes: ['Asset'],
    creditTypes: ['Asset', 'Liability'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
  'Transfer': {
    label: 'Bank Transfer / Journal Entry',
    autoDebitNames: null,
    autoCreditNames: null,
    debitTypes: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
    creditTypes: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
    requiresCustomer: false,
    requiresVendor: false,
    requiresDueDate: false,
  },
}

const TX_TYPE_OPTIONS = Object.entries(TX_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

// Try to match an account by name (exact → partial)
function findAccountId(accounts, names) {
  if (!names?.length || !accounts?.length) return ''
  for (const name of names) {
    const lower = name.toLowerCase()
    const exact = accounts.find(a => a.accountName.toLowerCase() === lower)
    if (exact) return exact._id
    const partial = accounts.find(
      a => a.accountName.toLowerCase().includes(lower) || lower.includes(a.accountName.toLowerCase())
    )
    if (partial) return partial._id
  }
  return ''
}

const BLANK_FORM = () => ({
  transactionDate: new Date().toISOString().split('T')[0],
  description: '',
  transactionType: 'Expense',
  amount: '',
  debitAccountId: '',
  creditAccountId: '',
  customerId: '',
  vendorId: '',
  dueDate: '',
  paymentTerms: '',
  notes: '',
  transactionReference: '',
})

export default function TransactionForm({ onSuccess }) {
  const { data: accountList = [], isLoading: accountsLoading } = useAccounts()
  const { customers, fetchCustomers, loading: customersLoading } = useCustomerStore()
  const { vendors, fetchVendors, loading: vendorsLoading } = useVendorStore()

  const [form, setForm] = useState(BLANK_FORM())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const cfg = TX_CONFIG[form.transactionType] || TX_CONFIG['Transfer']

  useEffect(() => {
    fetchCustomers({ limit: 100 })
    fetchVendors({ limit: 100 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-map accounts when transaction type changes or account list loads
  useEffect(() => {
    if (!accountList.length) return
    const newDebit  = cfg.autoDebitNames  ? findAccountId(accountList, cfg.autoDebitNames)  : ''
    const newCredit = cfg.autoCreditNames ? findAccountId(accountList, cfg.autoCreditNames) : ''
    setForm(f => ({
      ...f,
      debitAccountId:  newDebit  || f.debitAccountId,
      creditAccountId: newCredit || f.creditAccountId,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.transactionType, accountList])

  // Filter account dropdowns to types allowed for each slot
  const debitAccounts = useMemo(
    () => accountList.filter(a => cfg.debitTypes.includes(a.accountType)),
    [accountList, cfg.debitTypes]
  )
  const creditAccounts = useMemo(
    () => accountList.filter(a => cfg.creditTypes.includes(a.accountType)),
    [accountList, cfg.creditTypes]
  )

  const debitAcc  = accountList.find(a => a._id === form.debitAccountId)
  const creditAcc = accountList.find(a => a._id === form.creditAccountId)

  const customerList = Array.isArray(customers) ? customers : []
  const vendorList   = Array.isArray(vendors)   ? vendors   : []

  const handleTypeChange = (type) => {
    setForm(f => ({
      ...f,
      transactionType:  type,
      debitAccountId:   '',
      creditAccountId:  '',
      customerId:       '',
      vendorId:         '',
      dueDate:          '',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.debitAccountId || !form.creditAccountId) {
      return showError('Please select both debit and credit accounts')
    }
    if (form.debitAccountId === form.creditAccountId) {
      return showError('Debit and credit accounts must be different')
    }
    if (cfg.requiresCustomer && !form.customerId) {
      return showError('Please select a customer for this transaction type')
    }
    if (cfg.requiresVendor && !form.vendorId) {
      return showError('Please select a vendor for this transaction type')
    }
    if (cfg.requiresDueDate && !form.dueDate) {
      return showError('Due date is required for this transaction type')
    }

    setSubmitting(true)
    try {
      const payload = {
        transactionDate: form.transactionDate,
        description:     form.description,
        transactionType: form.transactionType,
        amount:          parseFloat(form.amount),
        debitAccountId:  form.debitAccountId,
        creditAccountId: form.creditAccountId,
      }
      if (cfg.requiresCustomer && form.customerId) payload.customerId = form.customerId
      if (cfg.requiresVendor   && form.vendorId)   payload.vendorId   = form.vendorId
      if (form.dueDate)              payload.dueDate             = form.dueDate
      if (form.paymentTerms)         payload.paymentTerms        = form.paymentTerms
      if (form.notes)                payload.notes               = form.notes
      if (form.transactionReference) payload.transactionReference = form.transactionReference

      await transactionService.create(payload)
      showSuccess('Transaction recorded successfully')
      if (onSuccess) onSuccess()
      setForm(BLANK_FORM())
      setShowAdvanced(false)
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl shadow-sm border border-gray-100">

      {/* Row 1: Type + Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Transaction Type"
          value={form.transactionType}
          onChange={handleTypeChange}
          options={TX_TYPE_OPTIONS}
          required
        />
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
          placeholder="0.00"
          required
        />
      </div>

      {/* Row 2: Date + Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={form.transactionDate}
          onChange={(e) => setForm(f => ({ ...f, transactionDate: e.target.value }))}
          required
        />
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What was this for?"
          required
        />
      </div>

      {/* Row 3: Filtered account selects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label={`Debit Account (${cfg.debitTypes.join(' / ')})`}
          value={form.debitAccountId}
          onChange={(v) => setForm(f => ({ ...f, debitAccountId: v }))}
          options={debitAccounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.accountType})` }))}
          loading={accountsLoading}
          searchable
          required
        />
        <Select
          label={`Credit Account (${cfg.creditTypes.join(' / ')})`}
          value={form.creditAccountId}
          onChange={(v) => setForm(f => ({ ...f, creditAccountId: v }))}
          options={creditAccounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.accountType})` }))}
          loading={accountsLoading}
          searchable
          required
        />
      </div>

      {/* Journal entry preview */}
      {(debitAcc || creditAcc) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 rounded-lg border border-indigo-100 text-sm">
          <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="text-indigo-800 font-semibold">Journal:</span>
          <span className="text-indigo-700">
            DR&nbsp;<span className="font-semibold">{debitAcc?.accountName ?? '—'}</span>
            &nbsp;&rarr;&nbsp;
            CR&nbsp;<span className="font-semibold">{creditAcc?.accountName ?? '—'}</span>
          </span>
        </div>
      )}

      {/* Conditional party section */}
      {(cfg.requiresCustomer || cfg.requiresVendor || cfg.requiresDueDate) && (
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-4">
          <h4 className="font-semibold text-indigo-900 text-sm">
            {cfg.requiresCustomer ? 'Customer Details' : 'Vendor Details'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cfg.requiresCustomer && (
              <Select
                label="Customer"
                value={form.customerId}
                onChange={(v) => setForm(f => ({ ...f, customerId: v }))}
                options={customerList.map(c => ({ value: c._id, label: c.fullName }))}
                loading={customersLoading}
                searchable
                required
              />
            )}
            {cfg.requiresVendor && (
              <Select
                label="Vendor"
                value={form.vendorId}
                onChange={(v) => setForm(f => ({ ...f, vendorId: v }))}
                options={vendorList.map(v => ({ value: v._id, label: v.vendorName }))}
                loading={vendorsLoading}
                searchable
                required
              />
            )}
            {cfg.requiresDueDate && (
              <Input
                label="Due Date"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
                required
              />
            )}
          </div>
        </div>
      )}

      {/* Advanced options toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors focus:outline-none"
        >
          {showAdvanced
            ? <ChevronUp className="w-4 h-4 mr-1" />
            : <ChevronDown className="w-4 h-4 mr-1" />}
          Advanced Options
        </button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
          <Input
            label="Reference #"
            value={form.transactionReference}
            onChange={(e) => setForm(f => ({ ...f, transactionReference: e.target.value }))}
            placeholder="Invoice or receipt number"
          />
          <Input
            label="Payment Terms"
            value={form.paymentTerms}
            onChange={(e) => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
            placeholder="e.g. Net 30"
          />
          <div className="md:col-span-2">
            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Internal notes..."
            />
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" fullWidth loading={submitting} className="py-3 text-lg font-medium">
          Record Transaction
        </Button>
      </div>
    </form>
  )
}
