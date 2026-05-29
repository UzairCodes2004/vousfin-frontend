/**
 * AccountingImpactPanel — ERP Integration Refactor, Step 4 (UI/UX).
 *
 * Makes the double-entry that a Bill / Invoice posts VISIBLE to the user —
 * SAP / Odoo "Journal Items" style transparency. Before Step 4, approving an
 * invoice posted nothing and never moved the customer balance; approving a bill
 * silently failed to find the AP account. Now both recognize AR/AP in the ledger
 * AND move the party balance, so the user deserves to see exactly what happens.
 *
 * Pure presentational: derives everything from the already-loaded entity. No
 * extra network calls. Renders contextually by lifecycle stage:
 *   • pre-recognition (draft / awaiting approval) → "On approval we will post…"
 *   • recognized & unpaid (approved / sent / scheduled / overdue) → "On payment…"
 *   • paid → settled confirmation
 *   • cancelled → muted note
 */
import { BookOpen, ArrowRight, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'

/* Lifecycle buckets shared by bills and invoices. */
const PRE_RECOGNITION = new Set(['draft', 'awaiting_approval', 'pending_approval'])
const SETTLED         = new Set(['paid'])
const CLOSED          = new Set(['cancelled', 'written_off'])

/* One DR/CR ledger line. */
function LedgerLine({ side, account, code, amount, currency }) {
  const isDebit = side === 'DR'
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1">
      <span className="flex items-center gap-2 min-w-0">
        <span className={cn(
          'inline-flex h-5 w-7 flex-shrink-0 items-center justify-center rounded text-[10px] font-black',
          isDebit ? 'bg-cyan/15 text-cyan' : 'bg-amber-400/15 text-amber-400'
        )}>
          {side}
        </span>
        <span className="truncate text-text-primary">{account}</span>
        {code && <span className="text-[10px] text-text-muted font-mono">{code}</span>}
      </span>
      <span className="font-mono font-semibold text-text-primary whitespace-nowrap">
        {formatCurrency(amount, currency)}
      </span>
    </div>
  )
}

export default function AccountingImpactPanel({ kind, entity, currency }) {
  if (!entity) return null

  const isBill   = kind === 'bill'
  const state    = entity.state || 'draft'
  const net      = Number(entity.amount || 0)
  const tax      = Number(entity.taxAmount || 0)
  const total    = Number(entity.totalAmount || (net + tax)) || 0
  const outstanding = entity.remainingBalance != null ? Number(entity.remainingBalance) : total
  const partyName = isBill
    ? (entity.vendorSnapshot?.vendorName || 'the vendor')
    : (entity.customerSnapshot?.fullName || entity.customerSnapshot?.businessName || 'the customer')

  // Account labels differ by AP vs AR.
  const controlAccount = isBill
    ? { account: 'Accounts Payable', code: '2110' }
    : { account: 'Accounts Receivable', code: '1110' }
  const incomeOrExpense = isBill
    ? { account: 'Purchases / Inventory / Expense', code: '' }
    : { account: 'Sales / Revenue', code: '4110' }
  const taxAccount = isBill
    ? { account: 'Input Tax Receivable', code: '1170' }
    : { account: 'Output Tax Payable', code: '2120' }

  const stage = PRE_RECOGNITION.has(state) ? 'pre'
              : SETTLED.has(state)         ? 'paid'
              : CLOSED.has(state)          ? 'closed'
              : 'recognized'

  return (
    <div className="premium-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-bold text-text-primary">Accounting Impact</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-emerald-400/90 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Ledger-synced
        </span>
      </div>

      {stage === 'closed' && (
        <p className="text-sm text-text-muted">
          This {isBill ? 'bill' : 'invoice'} is {state.replace(/_/g, ' ')} — no further ledger impact.
          Any recognized {isBill ? 'payable' : 'receivable'} has been reversed.
        </p>
      )}

      {stage === 'pre' && (
        <>
          <p className="text-xs text-text-muted">
            On <span className="font-semibold text-text-primary">approval</span>, this {isBill ? 'bill' : 'invoice'} posts a balanced journal:
          </p>
          <div className="rounded-lg border border-glass bg-glass-panel/50 px-3 py-2 divide-y divide-glass/40">
            {isBill ? (
              <>
                <LedgerLine side="DR" {...incomeOrExpense} amount={net} currency={currency} />
                {tax > 0 && <LedgerLine side="DR" {...taxAccount} amount={tax} currency={currency} />}
                <LedgerLine side="CR" {...controlAccount} amount={total} currency={currency} />
              </>
            ) : (
              <>
                <LedgerLine side="DR" {...controlAccount} amount={total} currency={currency} />
                <LedgerLine side="CR" {...incomeOrExpense} amount={net} currency={currency} />
                {tax > 0 && <LedgerLine side="CR" {...taxAccount} amount={tax} currency={currency} />}
              </>
            )}
          </div>
          <div className={cn(
            'flex items-center gap-2 text-xs rounded-lg px-3 py-2',
            isBill ? 'bg-amber-400/5 text-amber-300' : 'bg-cyan/5 text-cyan'
          )}>
            {isBill ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            Increases <span className="font-semibold">{partyName}</span>’s
            {isBill ? ' payable' : ' receivable'} balance by
            <span className="font-mono font-bold">{formatCurrency(total, currency)}</span>.
          </div>
        </>
      )}

      {stage === 'recognized' && (
        <>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Recognized in the general ledger.
            <span className="font-semibold text-text-primary">{partyName}</span> currently
            {isBill ? ' is owed' : ' owes'}
            <span className="font-mono font-bold text-text-primary">{formatCurrency(outstanding, currency)}</span>.
          </div>
          <p className="text-xs text-text-muted pt-1">
            On <span className="font-semibold text-text-primary">payment</span>, it posts:
          </p>
          <div className="rounded-lg border border-glass bg-glass-panel/50 px-3 py-2 divide-y divide-glass/40">
            {isBill ? (
              <>
                <LedgerLine side="DR" {...controlAccount} amount={outstanding} currency={currency} />
                <LedgerLine side="CR" account="Cash / Bank" code="1010" amount={outstanding} currency={currency} />
              </>
            ) : (
              <>
                <LedgerLine side="DR" account="Cash / Bank" code="1010" amount={outstanding} currency={currency} />
                <LedgerLine side="CR" {...controlAccount} amount={outstanding} currency={currency} />
              </>
            )}
          </div>
        </>
      )}

      {stage === 'paid' && (
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Settled — payment posted{' '}
          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
            ({isBill ? 'DR Accounts Payable' : 'DR Cash / Bank'}
            <ArrowRight className="h-3 w-3" />
            {isBill ? 'CR Cash / Bank' : 'CR Accounts Receivable'})
          </span>
          . {partyName}’s balance cleared
          <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />.
        </div>
      )}
    </div>
  )
}
