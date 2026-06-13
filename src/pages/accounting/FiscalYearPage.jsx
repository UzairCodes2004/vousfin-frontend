/**
 * FiscalYearPage.jsx — Phase 5.1 Accounting Period Engine
 *
 * Lets users:
 *  1. Create a fiscal year (auto-generates 12 monthly periods)
 *  2. View all fiscal years and their status
 *  3. Drill into a fiscal year → see its 12 monthly periods
 *  4. Close / lock / reopen individual periods
 *  5. Run year-end closing entries (transfers Revenue+Expense → Retained Earnings)
 *  6. Post adjusting entries (accruals, deferrals, year-end, depreciation)
 */

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Lock,
  LockOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  RotateCcw,
  ArrowRightLeft,
  BookOpen,
  RefreshCw,
} from 'lucide-react'

import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

import {
  useFiscalYears,
  useCreateFiscalYear,
  useCloseFiscalYear,
  useLockFiscalYear,
  useAccountingPeriods,
  useClosePeriod,
  useLockPeriod,
  useReopenPeriod,
  usePostAdjustingEntry,
} from '@/hooks/useFiscalYear'

import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency } from '@/utils/formatters'
import { useBusinessStore } from '@/stores/useBusinessStore'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const PERIOD_BADGE = {
  open:   { variant: 'success', icon: Clock,        label: 'Open'   },
  closed: { variant: 'warning', icon: CheckCircle2, label: 'Closed' },
  locked: { variant: 'danger',  icon: Lock,         label: 'Locked' },
}

const FY_BADGE = {
  open:   { variant: 'success', label: 'Open'   },
  closed: { variant: 'warning', label: 'Closed' },
  locked: { variant: 'danger',  label: 'Locked' },
}

const ADJUSTING_TYPES = [
  { value: 'accrual',      label: 'Accrual'      },
  { value: 'deferral',     label: 'Deferral'     },
  { value: 'year_end',     label: 'Year End'     },
  { value: 'depreciation', label: 'Depreciation' },
]

function fmt(date) {
  return new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fyDefaultDates() {
  const y = new Date().getFullYear()
  return {
    startDate: `${y}-01-01`,
    endDate:   `${y}-12-31`,
  }
}

/* ── Create Fiscal Year Modal ────────────────────────────────────────────── */

function CreateFiscalYearModal({ onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: `FY ${new Date().getFullYear()}`, ...fyDefaultDates() },
  })
  const create = useCreateFiscalYear()

  const onSubmit = async (values) => {
    await create.mutateAsync(values)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-cyan" />
          <h2 className="text-lg font-bold text-text-primary">Create Fiscal Year</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. FY 2025-26"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              {...register('startDate', { required: 'Required' })}
            />
            <Input
              label="End Date"
              type="date"
              error={errors.endDate?.message}
              {...register('endDate', { required: 'Required' })}
            />
          </div>

          <p className="text-xs text-text-muted">
            Creating a fiscal year automatically generates 12 monthly accounting periods.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={create.isPending} icon={Plus}>
              Create Fiscal Year
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

/* ── Adjusting Entry Modal ───────────────────────────────────────────────── */

function AdjustingEntryModal({ fiscalYearId, periods, onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { adjustingType: 'accrual', amount: '' },
  })
  const post     = usePostAdjustingEntry()
  const { data: accounts = [] } = useAccounts()
  const currency = useBusinessStore((s) => s.currency)

  const accountOptions = useMemo(() =>
    accounts.map((a) => ({ value: a._id, label: `${a.accountCode} — ${a.accountName}` })),
  [accounts])

  const openPeriods = useMemo(() =>
    (periods || []).filter((p) => p.status !== 'locked').map((p) => ({ value: p._id, label: p.name })),
  [periods])

  const onSubmit = async (values) => {
    await post.mutateAsync({
      ...values,
      amount: parseFloat(values.amount),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="h-5 w-5 text-cyan" />
          <h2 className="text-lg font-bold text-text-primary">Post Adjusting Entry</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Adjusting Type"
              error={errors.adjustingType?.message}
              {...register('adjustingType', { required: 'Required' })}
            >
              {ADJUSTING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>

            <Select
              label="Period"
              error={errors.periodId?.message}
              {...register('periodId', { required: 'Required' })}
            >
              <option value="">Select period…</option>
              {openPeriods.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Description"
            placeholder="e.g. Accrued salaries Dec 2025"
            error={errors.description?.message}
            {...register('description', { required: 'Description required' })}
          />

          <Input
            label={`Amount (${currency})`}
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
          />

          <Select
            label="Debit Account"
            error={errors.debitAccountId?.message}
            {...register('debitAccountId', { required: 'Required' })}
          >
            <option value="">Select debit account…</option>
            {accountOptions.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </Select>

          <Select
            label="Credit Account"
            error={errors.creditAccountId?.message}
            {...register('creditAccountId', { required: 'Required' })}
          >
            <option value="">Select credit account…</option>
            {accountOptions.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </Select>

          <Input
            label="Memo (optional)"
            placeholder="Internal notes"
            {...register('memo')}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={post.isPending} icon={ArrowRightLeft}>
              Post Entry
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

/* ── Periods Table ───────────────────────────────────────────────────────── */

function PeriodsTable({ fiscalYearId, fyStatus }) {
  const { data: periods, isLoading } = useAccountingPeriods(fiscalYearId)
  const closePeriod  = useClosePeriod()
  const lockPeriod   = useLockPeriod()
  const reopenPeriod = useReopenPeriod()

  const [showAdjust, setShowAdjust] = useState(false)

  if (isLoading) return <div className="py-4"><SkeletonLoader count={3} /></div>
  if (!periods?.length) return <p className="py-4 text-sm text-text-muted">No periods found.</p>

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-glass">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-glass text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Period</th>
              <th className="px-4 py-2.5 text-left">Date Range</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-right">Transactions</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass">
            {periods.map((p) => {
              const cfg = PERIOD_BADGE[p.status] ?? PERIOD_BADGE.open
              const Icon = cfg.icon
              const isLocked = p.status === 'locked'
              const isClosed = p.status === 'closed'
              const isOpen   = p.status === 'open'

              return (
                <tr key={p._id} className="hover:bg-glass-hover/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {fmt(p.startDate)} — {fmt(p.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={cfg.variant} className="flex w-fit items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    {p.closingSummary?.transactionCount ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {isOpen && fyStatus !== 'locked' && (
                        <Button
                          variant="ghost"
                          className="!py-1.5 !px-3 !text-xs"
                          icon={CheckCircle2}
                          loading={closePeriod.isPending}
                          onClick={() => closePeriod.mutate({ periodId: p._id })}
                        >
                          Close
                        </Button>
                      )}
                      {isClosed && fyStatus !== 'locked' && (
                        <>
                          <Button
                            variant="ghost"
                            className="!py-1.5 !px-3 !text-xs"
                            icon={Lock}
                            loading={lockPeriod.isPending}
                            onClick={() => lockPeriod.mutate({ periodId: p._id })}
                          >
                            Lock
                          </Button>
                          <Button
                            variant="ghost"
                            className="!py-1.5 !px-3 !text-xs text-amber hover:text-amber"
                            icon={RotateCcw}
                            loading={reopenPeriod.isPending}
                            onClick={() => reopenPeriod.mutate({ periodId: p._id })}
                          >
                            Reopen
                          </Button>
                        </>
                      )}
                      {isLocked && (
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Adjusting entries button — only for non-locked FYs */}
      {fyStatus !== 'locked' && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            icon={ArrowRightLeft}
            className="!text-xs"
            onClick={() => setShowAdjust(true)}
          >
            Post Adjusting Entry
          </Button>
        </div>
      )}

      {showAdjust && (
        <AdjustingEntryModal
          fiscalYearId={fiscalYearId}
          periods={periods}
          onClose={() => setShowAdjust(false)}
        />
      )}
    </div>
  )
}

/* ── Fiscal Year Row ─────────────────────────────────────────────────────── */

function FiscalYearRow({ fy }) {
  const [expanded, setExpanded]       = useState(false)
  const [showCloseConfirm, setShowCC] = useState(false)
  const [showLockConfirm, setShowLC]  = useState(false)

  const closeFY = useCloseFiscalYear()
  const lockFY  = useLockFiscalYear()

  const badge   = FY_BADGE[fy.status] ?? FY_BADGE.open
  const isOpen  = fy.status === 'open'
  const isClosed = fy.status === 'closed'

  return (
    <Card className="overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="flex items-center gap-2">
            {expanded
              ? <ChevronDown className="h-4 w-4 text-text-muted" />
              : <ChevronRight className="h-4 w-4 text-text-muted" />
            }
            <span className="font-bold text-text-primary">{fy.name}</span>
          </span>
          <span className="text-xs text-text-secondary">
            {fmt(fy.startDate)} — {fmt(fy.endDate)}
          </span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </button>

        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {isOpen && (
            <Button
              variant="amber"
              className="!py-1.5 !px-3 !text-xs"
              icon={CheckCircle2}
              onClick={() => setShowCC(true)}
            >
              Run Year-End Close
            </Button>
          )}
          {isClosed && (
            <Button
              variant="danger"
              className="!py-1.5 !px-3 !text-xs"
              icon={Lock}
              onClick={() => setShowLC(true)}
            >
              Lock Year
            </Button>
          )}
          {fy.status === 'locked' && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Lock className="h-3.5 w-3.5" /> Permanently Locked
            </span>
          )}
        </div>
      </div>

      {/* Expanded periods */}
      {expanded && (
        <div className="mt-4 border-t border-glass pt-4">
          <PeriodsTable fiscalYearId={fy._id} fyStatus={fy.status} />
        </div>
      )}

      {/* Year-end close confirm */}
      {showCloseConfirm && (
        <div className="mt-4 rounded-lg border border-amber/30 bg-amber/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber">Run Year-End Closing Entries?</p>
              <p className="text-xs text-text-muted mt-1">
                This will transfer all Revenue and Expense balances to Retained Earnings.
                All 12 monthly periods must be closed first. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => setShowCC(false)}>
              Cancel
            </Button>
            <Button
              variant="amber"
              className="!py-1.5 !px-3 !text-xs"
              loading={closeFY.isPending}
              onClick={() => closeFY.mutate({ id: fy._id }, { onSuccess: () => setShowCC(false) })}
            >
              Yes, Close Fiscal Year
            </Button>
          </div>
        </div>
      )}

      {/* Lock confirm */}
      {showLockConfirm && (
        <div className="mt-4 rounded-lg border border-negative/30 bg-negative/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-negative mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-negative">Permanently Lock This Fiscal Year?</p>
              <p className="text-xs text-text-muted mt-1">
                Once locked, no transactions can be posted, edited, or reversed in any period of this
                fiscal year. This action is irreversible.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => setShowLC(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="!py-1.5 !px-3 !text-xs"
              loading={lockFY.isPending}
              onClick={() => lockFY.mutate({ id: fy._id }, { onSuccess: () => setShowLC(false) })}
            >
              Lock Permanently
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function FiscalYearPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data: fiscalYears, isLoading, refetch, isFetching } = useFiscalYears()

  const openCount   = fiscalYears?.filter((fy) => fy.status === 'open').length   ?? 0
  const closedCount = fiscalYears?.filter((fy) => fy.status === 'closed').length ?? 0
  const lockedCount = fiscalYears?.filter((fy) => fy.status === 'locked').length ?? 0

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-cyan" />
          <div>
            <h1 className="text-2xl font-black text-text-primary">Fiscal Year Management</h1>
            <p className="text-sm text-text-muted">
              Manage accounting periods, year-end closing, and adjusting entries
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            icon={RefreshCw}
            loading={isFetching}
            className="!py-2 !px-3 !text-xs"
            onClick={() => refetch()}
          />
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            New Fiscal Year
          </Button>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider">Open Years</p>
          <p className="mt-1 text-3xl font-black text-positive">{openCount}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider">Closed Years</p>
          <p className="mt-1 text-3xl font-black text-amber">{closedCount}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider">Locked Years</p>
          <p className="mt-1 text-3xl font-black text-negative">{lockedCount}</p>
        </Card>
      </div>

      {/* ── Explainer ─────────────────────────────────────────────────── */}
      <Card className="border-cyan/20 bg-cyan/5">
        <div className="flex items-start gap-3">
          <LockOpen className="h-5 w-5 text-cyan mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-cyan">How Accounting Periods Work</p>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li><strong className="text-text-primary">Open</strong> — transactions can be created and edited freely</li>
              <li><strong className="text-text-primary">Closed</strong> — transactions are blocked; admin can force-post or reopen</li>
              <li><strong className="text-text-primary">Locked</strong> — permanently frozen; no changes allowed under any circumstance</li>
              <li>Run <strong className="text-text-primary">Year-End Close</strong> after closing all 12 monthly periods to transfer Revenue &amp; Expense to Retained Earnings</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* ── Fiscal Years List ─────────────────────────────────────────── */}
      {isLoading ? (
        <SkeletonLoader count={3} />
      ) : !fiscalYears?.length ? (
        <Card className="py-12 text-center space-y-3">
          <Calendar className="mx-auto h-10 w-10 text-text-muted" />
          <p className="text-text-secondary font-medium">No fiscal years yet</p>
          <p className="text-xs text-text-muted">Create your first fiscal year to start managing accounting periods.</p>
          <Button icon={Plus} onClick={() => setShowCreate(true)} className="mx-auto">
            Create Fiscal Year
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {fiscalYears.map((fy) => (
            <FiscalYearRow key={fy._id} fy={fy} />
          ))}
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────── */}
      {showCreate && <CreateFiscalYearModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
