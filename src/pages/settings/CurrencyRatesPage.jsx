/**
 * CurrencyRatesPage — Live Exchange Rate Management
 *
 * Automatically fetches today's rates from open.er-api.com on first load
 * (or when rates are stale). Users can also sync manually at any time.
 * Manual overrides are supported for custom rates.
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  DollarSign, RefreshCw, Plus, Trash2, Edit2, X, Check,
  TrendingUp, Wifi, WifiOff, Clock, Zap, Info, Loader2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  useFxRates, useLatestRates,
  useCreateFxRate, useUpdateFxRate, useDeleteFxRate,
  useRunRevaluation, useSyncLiveRates,
} from '@/hooks/useFxRates'
import { useBusinessStore } from '@/stores/useBusinessStore'
import Button        from '@/components/ui/Button'
import Input         from '@/components/ui/Input'
import CurrencyBadge from '@/components/ui/CurrencyBadge'
import { formatDate } from '@/utils/formatters'

// ── Zod schema ────────────────────────────────────────────────────────────────
const rateSchema = z.object({
  fromCurrency: z.string().length(3, 'Must be 3-letter code').toUpperCase(),
  toCurrency:   z.string().length(3, 'Must be 3-letter code').toUpperCase(),
  rate:         z.coerce.number().positive('Must be positive'),
  rateDate:     z.string().min(1, 'Date required'),
  notes:        z.string().max(200).optional(),
}).refine(d => d.fromCurrency !== d.toCurrency, {
  message: 'From and To must differ', path: ['toCurrency'],
})

// ── Inline rate form ───────────────────────────────────────────────────────────
function RateForm({ defaultValues, baseCurrency, onSave, onCancel, isPending }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(rateSchema),
    defaultValues: defaultValues ?? {
      fromCurrency: '',
      toCurrency:   baseCurrency || 'PKR',
      rate:         '',
      rateDate:     new Date().toISOString().slice(0, 10),
      notes:        '',
    },
  })
  return (
    <form onSubmit={handleSubmit(onSave)}
      className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-4 bg-glass-panel rounded-xl border border-cyan/20">
      <Input label="From" placeholder="USD" {...register('fromCurrency')}
        error={errors.fromCurrency?.message} className="uppercase" />
      <Input label="To" placeholder="PKR" {...register('toCurrency')}
        error={errors.toCurrency?.message} className="uppercase" />
      <Input label="Rate" type="number" step="0.000001" placeholder="280.50"
        {...register('rate')} error={errors.rate?.message} />
      <Input label="Date" type="date" {...register('rateDate')} error={errors.rateDate?.message} />
      <Input label="Notes (optional)" placeholder="Source / reference"
        {...register('notes')} containerClassName="col-span-2 sm:col-span-1" />
      <div className="flex items-end gap-2 col-span-2 sm:col-span-1">
        <Button type="submit" size="sm" icon={Check} loading={isPending} className="flex-1">Save</Button>
        <Button type="button" variant="secondary" size="sm" icon={X} onClick={onCancel} />
      </div>
    </form>
  )
}

// ── Last-synced helper ────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return formatDate(dateStr)
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CurrencyRatesPage() {
  const baseCurrency = useBusinessStore(s => s.currency || s.baseCurrency || 'PKR')

  const [showAddForm, setShowAddForm] = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [lastSynced,  setLastSynced]  = useState(null)  // ISO string
  const [syncSource,  setSyncSource]  = useState(null)
  const [filterFrom,  setFilterFrom]  = useState('')
  const autoSynced = useRef(false)

  const params = useMemo(() => ({
    ...(filterFrom ? { fromCurrency: filterFrom.toUpperCase() } : {}),
    limit: 200,
  }), [filterFrom])

  const { data: ratesData, isLoading }  = useFxRates(params)
  const { data: latestRates }           = useLatestRates()

  const syncMutation      = useSyncLiveRates()
  const createMutation    = useCreateFxRate()
  const updateMutation    = useUpdateFxRate()
  const deleteMutation    = useDeleteFxRate()
  const revaluateMutation = useRunRevaluation()

  const rates    = ratesData?.data ?? []
  const isSyncing = syncMutation.isPending

  // ── Auto-sync on first load if rates are empty or older than 12h ──────────
  useEffect(() => {
    if (autoSynced.current || isLoading) return
    const isEmpty = latestRates !== undefined && latestRates.length === 0

    // Check staleness: if latest rate's updatedAt is >12h, treat as stale
    const isStale = latestRates?.length > 0 && (() => {
      const newest = latestRates.reduce((a, b) =>
        new Date(a.rateDate) > new Date(b.rateDate) ? a : b, latestRates[0])
      const ageHours = (Date.now() - new Date(newest.rateDate).getTime()) / 3600000
      return ageHours > 12
    })()

    if (isEmpty || isStale) {
      autoSynced.current = true
      syncMutation.mutate(undefined, {
        onSuccess: (res) => {
          setLastSynced(new Date().toISOString())
          setSyncSource(res.data?.data?.source)
        },
      })
    } else if (latestRates?.length > 0) {
      // Rates already fresh — show last known sync time
      const newest = latestRates.reduce((a, b) =>
        new Date(a.rateDate) > new Date(b.rateDate) ? a : b, latestRates[0])
      setLastSynced(new Date(newest.rateDate).toISOString())
    }
  }, [isLoading, latestRates]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        setLastSynced(new Date().toISOString())
        setSyncSource(res.data?.data?.source)
      },
    })
  }

  const handleCreate = (values) =>
    createMutation.mutate(values, { onSuccess: () => setShowAddForm(false) })

  const handleUpdate = (values) =>
    updateMutation.mutate({ id: editTarget._id, data: values }, { onSuccess: () => setEditTarget(null) })

  const handleDelete = (id) => {
    if (!window.confirm('Delete this rate?')) return
    deleteMutation.mutate(id)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-text-primary tracking-tight sm:text-2xl">
            <DollarSign className="h-5 w-5 text-cyan sm:h-6 sm:w-6" />
            Exchange Rates
          </h1>
          <p className="text-text-secondary text-sm mt-0.5 flex items-center gap-1.5">
            Live rates — base currency:
            <CurrencyBadge code={baseCurrency} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary" size="sm" icon={TrendingUp}
            loading={revaluateMutation.isPending}
            onClick={() => revaluateMutation.mutate(null)}
            title="Run month-end unrealised FX revaluation for open AR/AP"
          >
            Revaluate
          </Button>
          <Button
            variant="secondary" size="sm" icon={Plus}
            onClick={() => { setShowAddForm(v => !v); setEditTarget(null) }}
          >
            Manual Rate
          </Button>
          <Button
            size="sm"
            icon={isSyncing ? Loader2 : RefreshCw}
            loading={isSyncing}
            onClick={handleManualSync}
            className="bg-cyan text-navy hover:bg-cyan/90"
          >
            {isSyncing ? 'Fetching…' : 'Sync Live Rates'}
          </Button>
        </div>
      </div>

      {/* ── Live sync status bar ─────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
        isSyncing
          ? 'border-cyan/30 bg-cyan/5'
          : lastSynced
            ? 'border-positive/20 bg-positive/5'
            : 'border-glass bg-glass-panel'
      }`}>
        {isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 text-cyan animate-spin shrink-0" />
            <span className="text-cyan font-medium">Fetching live rates from open.er-api.com…</span>
          </>
        ) : lastSynced ? (
          <>
            <Zap className="h-4 w-4 text-positive shrink-0" />
            <span className="text-text-secondary">
              Last synced <strong className="text-text-primary">{timeAgo(lastSynced)}</strong>
              {syncSource && <span className="text-text-muted"> · {syncSource}</span>}
            </span>
            <span className="ml-auto text-[11px] text-text-muted hidden sm:flex items-center gap-1">
              <Clock className="h-3 w-3" /> Auto-syncs daily at 08:00
            </span>
          </>
        ) : (
          <>
            <Info className="h-4 w-4 text-text-muted shrink-0" />
            <span className="text-text-muted">Rates sync automatically on page load and daily at 08:00</span>
          </>
        )}
      </div>

      {/* ── Latest rates cards ────────────────────────────────────────────── */}
      {latestRates?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            Today's Rates · 1 Foreign = X {baseCurrency}
          </p>
          <div className="flex flex-wrap gap-2">
            {latestRates
              .filter(r => r.toCurrency === baseCurrency)
              .sort((a, b) => a.fromCurrency.localeCompare(b.fromCurrency))
              .map(r => (
              <div key={`${r.fromCurrency}-${r.toCurrency}`}
                className="flex items-center gap-2 rounded-lg border border-glass bg-glass-panel px-3 py-2">
                <CurrencyBadge code={r.fromCurrency} baseCurrency={baseCurrency} size="sm" />
                <span className="text-text-muted text-xs">→</span>
                <span className="font-mono font-bold text-text-primary tabular-nums text-sm">
                  {r.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="text-[10px] text-text-muted">{baseCurrency}</span>
                <span className={`ml-1 text-[9px] rounded px-1 py-px font-semibold ${
                  r.source === 'imported'
                    ? 'bg-cyan/10 text-cyan border border-cyan/20'
                    : 'bg-amber/10 text-amber border border-amber/20'
                }`}>
                  {r.source === 'imported' ? 'LIVE' : 'MANUAL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Manual rate form ─────────────────────────────────────────────── */}
      {showAddForm && !editTarget && (
        <RateForm
          baseCurrency={baseCurrency}
          onSave={handleCreate}
          onCancel={() => setShowAddForm(false)}
          isPending={createMutation.isPending}
        />
      )}

      {/* ── Filter ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter by currency (e.g. USD)"
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          containerClassName="w-52"
          className="uppercase"
        />
        {filterFrom && (
          <button onClick={() => setFilterFrom('')}
            className="text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
        <span className="ml-auto text-[11px] text-text-muted">{rates.length} records</span>
      </div>

      {/* ── Rates table ──────────────────────────────────────────────────── */}
      <div className="premium-card overflow-hidden">
        {(isLoading || (isSyncing && rates.length === 0)) ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-cyan animate-spin opacity-60" />
            <p className="text-sm text-text-muted">
              {isSyncing ? 'Fetching live rates…' : 'Loading…'}
            </p>
          </div>
        ) : rates.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <WifiOff className="h-10 w-10 text-text-muted opacity-30" />
            <p className="text-sm font-semibold text-text-secondary">No exchange rates yet</p>
            <p className="text-xs text-text-muted max-w-xs">
              Click <strong>"Sync Live Rates"</strong> above to automatically fetch today's
              rates from open.er-api.com — no API key needed.
            </p>
            <Button size="sm" icon={RefreshCw} loading={isSyncing} onClick={handleManualSync}>
              Sync Now
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-glass-panel text-[10px] uppercase text-text-muted tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">From</th>
                  <th className="px-4 py-2.5 font-semibold">To</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Rate</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 font-semibold hidden lg:table-cell">Notes</th>
                  <th className="px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {rates.map(r => (
                  editTarget?._id === r._id ? (
                    <tr key={r._id}>
                      <td colSpan={7} className="p-0">
                        <RateForm
                          baseCurrency={baseCurrency}
                          defaultValues={{
                            fromCurrency: r.fromCurrency,
                            toCurrency:   r.toCurrency,
                            rate:         r.rate,
                            rateDate:     new Date(r.rateDate).toISOString().slice(0, 10),
                            notes:        r.notes || '',
                          }}
                          onSave={handleUpdate}
                          onCancel={() => setEditTarget(null)}
                          isPending={updateMutation.isPending}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={r._id} className="hover:bg-glass-hover transition-colors text-text-secondary">
                      <td className="px-4 py-3">
                        <CurrencyBadge code={r.fromCurrency} baseCurrency={baseCurrency} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <CurrencyBadge code={r.toCurrency} baseCurrency={baseCurrency} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-text-primary tabular-nums">
                        {r.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-4 py-3 text-xs">{formatDate(r.rateDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] rounded px-1.5 py-px font-semibold border ${
                          r.source === 'imported'
                            ? 'bg-cyan/10 text-cyan border-cyan/20'
                            : 'bg-amber/10 text-amber border-amber/20'
                        }`}>
                          {r.source === 'imported' ? '⚡ LIVE' : '✎ MANUAL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-[11px] text-text-muted truncate max-w-[180px]">
                        {r.notes ? r.notes.replace(/Auto-synced via [^ ]+ on .+/, 'Auto-synced') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => { setEditTarget(r); setShowAddForm(false) }}
                            className="rounded p-1.5 text-text-muted hover:text-cyan hover:bg-glass-hover transition-colors"
                            title="Override rate">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(r._id)}
                            className="rounded p-1.5 text-text-muted hover:text-negative hover:bg-negative/10 transition-colors"
                            title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Info footer ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-glass bg-glass-panel px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5 text-cyan" /> How automatic sync works
        </p>
        <p className="text-xs text-text-muted leading-relaxed">
          Rates are fetched from <strong className="text-text-secondary">open.er-api.com</strong> (free,
          no API key needed) with <strong className="text-text-secondary">frankfurter.app (ECB)</strong> as
          fallback. The server syncs all businesses automatically every day at 08:00. You can also sync
          manually using the button above. Manual entries override live rates for that date.
          Use <em>Revaluate</em> at month-end to post IAS 21 unrealised FX adjustments.
        </p>
      </div>
    </div>
  )
}
