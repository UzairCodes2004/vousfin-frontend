/**
 * TaxConfigPage — Phase 5.4.8
 *
 * Country-Aware Tax Engine configuration page.
 *
 * Sections:
 *   1. Tax Setup Card  — enable tax, choose country, set registration number
 *   2. Country Profile — shows applicable taxes, WHT schedules, RC rules
 *   3. Filing Settings — frequency, inclusive/exclusive default
 *   4. Custom Rate Overrides
 *   5. Tax Accounts    — list of seeded CoA accounts
 */
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Receipt, Settings, Zap, Shield, Globe, ChevronDown,
  CheckCircle2, AlertCircle, RefreshCw, Plus, Info,
} from 'lucide-react'

import {
  useTaxConfig, useUpdateTaxConfig, useEnableTax,
  useTaxProfiles, useTaxAccounts, useWhtSchedules, useFilingSummary,
} from '@/hooks/useTax'
import Button   from '@/components/ui/Button'
import Input    from '@/components/ui/Input'
import Select   from '@/components/ui/Select'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { useBusinessStore } from '@/stores/useBusinessStore'

// ── Zod schema ─────────────────────────────────────────────────────────────────
const taxConfigSchema = z.object({
  country:               z.string().length(2).toUpperCase(),
  taxRegistrationNumber: z.string().max(50).optional().or(z.literal('')),
  gstEnabled:            z.boolean(),
  vatEnabled:            z.boolean(),
  whtEnabled:            z.boolean(),
  reverseChargeEnabled:  z.boolean(),
  registeredForTax:      z.boolean(),
  taxInclusive:          z.boolean(),
  filingFrequency:       z.enum(['monthly', 'quarterly', 'annual']),
})

const COUNTRIES = [
  { value: 'PK', label: '🇵🇰 Pakistan (GST / WHT)' },
  { value: 'AE', label: '🇦🇪 UAE (VAT 5%)' },
  { value: 'SA', label: '🇸🇦 Saudi Arabia (VAT 15%)' },
  { value: 'IN', label: '🇮🇳 India (GST / TDS)' },
  { value: 'GB', label: '🇬🇧 United Kingdom (VAT 20%)' },
  { value: 'US', label: '🇺🇸 United States (Sales Tax)' },
]

const FILING_OPTIONS = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual',    label: 'Annual' },
]

// ── Sub-component: Section card ────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`premium-card p-5 space-y-4 ${className}`}>
      <h2 className="flex items-center gap-2 font-semibold text-text-primary text-sm">
        <Icon className="h-4 w-4 text-cyan shrink-0" />
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── Sub-component: Toggle row ─────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-2 border-b border-glass last:border-0">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-cyan' : 'bg-glass'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-navy-2 shadow-sm transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TaxConfigPage() {
  const { data: configData, isLoading: cfgLoading } = useTaxConfig()
  const { data: profiles = []  }                     = useTaxProfiles()
  const { data: taxAccounts = [] }                   = useTaxAccounts()
  const { data: whtData }                            = useWhtSchedules()
  const updateMutation  = useUpdateTaxConfig()
  const enableMutation  = useEnableTax()

  const taxCfg  = configData?.taxConfig   || {}
  const profile = configData?.profile     || {}

  const { register, handleSubmit, watch, setValue, reset, formState: { isDirty } } = useForm({
    resolver: zodResolver(taxConfigSchema),
    defaultValues: {
      country:               taxCfg.country               || 'PK',
      taxRegistrationNumber: taxCfg.taxRegistrationNumber  || '',
      gstEnabled:            taxCfg.gstEnabled             ?? false,
      vatEnabled:            taxCfg.vatEnabled             ?? false,
      whtEnabled:            taxCfg.whtEnabled             ?? false,
      reverseChargeEnabled:  taxCfg.reverseChargeEnabled   ?? false,
      registeredForTax:      taxCfg.registeredForTax       ?? false,
      taxInclusive:          taxCfg.taxInclusive           ?? true,
      filingFrequency:       taxCfg.filingFrequency        || 'monthly',
    },
  })

  // Sync form when server data arrives
  useEffect(() => {
    if (taxCfg.country) {
      reset({
        country:               taxCfg.country,
        taxRegistrationNumber: taxCfg.taxRegistrationNumber  || '',
        gstEnabled:            taxCfg.gstEnabled             ?? false,
        vatEnabled:            taxCfg.vatEnabled             ?? false,
        whtEnabled:            taxCfg.whtEnabled             ?? false,
        reverseChargeEnabled:  taxCfg.reverseChargeEnabled   ?? false,
        registeredForTax:      taxCfg.registeredForTax       ?? false,
        taxInclusive:          taxCfg.taxInclusive           ?? true,
        filingFrequency:       taxCfg.filingFrequency        || 'monthly',
      })
    }
  }, [taxCfg.country]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedCountry = watch('country')
  const watchedGst     = watch('gstEnabled')
  const watchedVat     = watch('vatEnabled')
  const watchedWht     = watch('whtEnabled')
  const watchedRc      = watch('reverseChargeEnabled')
  const watchedTaxIncl = watch('taxInclusive')
  const watchedReg     = watch('registeredForTax')

  const onSave = (values) => updateMutation.mutate(values)

  const handleEnableTax = () => enableMutation.mutate(watchedCountry)

  const anyEnabled = watchedGst || watchedVat || watchedWht

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-text-primary tracking-tight sm:text-2xl">
          <Receipt className="h-5 w-5 text-cyan sm:h-6 sm:w-6" />
          Tax Engine
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">
          Country-aware GST / VAT / WHT automation · {profile.countryName || '—'}
        </p>
      </div>

      {/* Status banner */}
      {!cfgLoading && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          anyEnabled
            ? 'border-positive/20 bg-positive/5'
            : 'border-amber/20 bg-amber/5'
        }`}>
          {anyEnabled
            ? <><CheckCircle2 className="h-4 w-4 text-positive shrink-0" />
                <span className="text-text-secondary">
                  Tax engine <strong className="text-positive">active</strong> ·{' '}
                  {profile.countryName} · {taxCfg.filingFrequency} filing
                  {taxCfg.taxRegistrationNumber && <> · Reg: <strong>{taxCfg.taxRegistrationNumber}</strong></>}
                </span></>
            : <><AlertCircle className="h-4 w-4 text-amber shrink-0" />
                <span className="text-text-muted">
                  Tax engine is <strong className="text-amber">disabled</strong>.
                  Select a country and click <strong>Enable Tax</strong> to get started.
                </span>
                <Button size="sm" icon={Zap} loading={enableMutation.isPending}
                  onClick={handleEnableTax} className="ml-auto shrink-0 bg-amber hover:bg-amber text-white">
                  Enable Tax
                </Button></>
          }
        </div>
      )}

      <form onSubmit={handleSubmit(onSave)} className="space-y-5">

        {/* ── Tax Setup ───────────────────────────────────────────────────── */}
        <SectionCard title="Tax Setup" icon={Settings}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Country
              </label>
              <select
                {...register('country')}
                className="w-full rounded-lg border border-glass bg-glass-panel px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan/30"
              >
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <Input
              label={profile.taxIdentifierLabel || 'Tax Registration Number'}
              placeholder="e.g. 1234567-8 (NTN)"
              {...register('taxRegistrationNumber')}
            />
          </div>

          <div className="space-y-0.5">
            <ToggleRow
              label="Registered for Tax"
              description="Business is officially registered with the tax authority"
              checked={watchedReg}
              onChange={v => setValue('registeredForTax', v, { shouldDirty: true })}
            />
            <ToggleRow
              label="GST / Sales Tax"
              description="Pakistan GST · India GST (CGST/SGST/IGST) · US Sales Tax"
              checked={watchedGst}
              onChange={v => setValue('gstEnabled', v, { shouldDirty: true })}
            />
            <ToggleRow
              label="VAT"
              description="UAE (5%) · Saudi Arabia (15%) · UK (20%)"
              checked={watchedVat}
              onChange={v => setValue('vatEnabled', v, { shouldDirty: true })}
            />
            <ToggleRow
              label="Withholding Tax (WHT / TDS)"
              description="Pakistan WHT · India TDS · SA WHT on non-resident payments"
              checked={watchedWht}
              onChange={v => setValue('whtEnabled', v, { shouldDirty: true })}
            />
            <ToggleRow
              label="Reverse Charge"
              description="Auto-apply reverse charge for imported services (AE/SA/IN/GB)"
              checked={watchedRc}
              onChange={v => setValue('reverseChargeEnabled', v, { shouldDirty: true })}
            />
          </div>
        </SectionCard>

        {/* ── Filing & Mode ─────────────────────────────────────────────────── */}
        <SectionCard title="Filing & Calculation" icon={Receipt}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Filing Frequency
              </label>
              <select
                {...register('filingFrequency')}
                className="w-full rounded-lg border border-glass bg-glass-panel px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan/30"
              >
                {FILING_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <ToggleRow
                label="Tax-Inclusive Amounts"
                description="Entered amounts include tax by default"
                checked={watchedTaxIncl}
                onChange={v => setValue('taxInclusive', v, { shouldDirty: true })}
              />
            </div>
          </div>
        </SectionCard>

        {/* Save */}
        <div className="flex justify-end gap-3">
          {anyEnabled && (
            <Button
              type="button" variant="secondary" size="sm" icon={Zap}
              loading={enableMutation.isPending}
              onClick={handleEnableTax}
              title="Re-seed tax accounts for the selected country"
            >
              Re-seed Accounts
            </Button>
          )}
          <Button
            type="submit" size="sm" loading={updateMutation.isPending}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        </div>
      </form>

      {/* ── Country Profile Info ──────────────────────────────────────────────── */}
      {profile.taxTypes?.length > 0 && (
        <SectionCard title="Country Tax Profile" icon={Globe}>
          <div className="flex flex-wrap gap-2">
            {profile.taxTypes.map(t => (
              <div key={t.type}
                className="flex items-center gap-2 rounded-lg border border-glass bg-glass-panel px-3 py-2">
                <span className="font-semibold text-xs text-text-primary">{t.type}</span>
                <span className="text-text-muted text-xs">·</span>
                <span className="font-mono text-xs text-cyan">{t.rate}%</span>
                <span className={`text-[9px] rounded px-1 py-px font-semibold border ${
                  t.side === 'output'
                    ? 'bg-positive/10 text-positive border-positive/20'
                    : t.side === 'input'
                      ? 'bg-cyan/10 text-cyan border-cyan/20'
                      : 'bg-amber/10 text-amber border-amber/20'
                }`}>{t.side.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
            {profile.hasWht && (
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-amber" /> WHT available
              </span>
            )}
            {profile.hasReverseCharge && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-accent-2" /> Reverse charge supported
              </span>
            )}
            {profile.eInvoicingRequired && (
              <span className="flex items-center gap-1 text-amber">
                <AlertCircle className="h-3 w-3" /> e-Invoicing required ({profile.countryName})
              </span>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── WHT Schedules ─────────────────────────────────────────────────────── */}
      {whtData?.data?.length > 0 && (
        <SectionCard title={`WHT Schedules · ${whtData.country}`} icon={Shield}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-text-muted tracking-wider">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Category</th>
                  <th className="py-2 pr-4 font-semibold text-right">Rate (Filer)</th>
                  <th className="py-2 pr-4 font-semibold text-right">Rate (Non-filer)</th>
                  <th className="py-2 font-semibold">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {whtData.data.map(s => (
                  <tr key={s.category} className="text-text-secondary hover:bg-glass-hover">
                    <td className="py-2 pr-4 capitalize">{s.category.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-4 text-right font-mono font-semibold text-text-primary">{s.rateNormal}%</td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {s.rateNonFiler != null ? `${s.rateNonFiler}%` : '—'}
                    </td>
                    <td className="py-2 text-text-muted">{s.account}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Tax Accounts ──────────────────────────────────────────────────────── */}
      {taxAccounts.length > 0 && (
        <SectionCard title="Tax Accounts (Chart of Accounts)" icon={Receipt}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {taxAccounts.map(a => (
              <div key={a._id}
                className="flex items-center justify-between rounded-lg border border-glass bg-glass-panel px-3 py-2">
                <span className="text-xs font-mono text-text-muted w-12 shrink-0">{a.accountCode}</span>
                <span className="text-xs text-text-secondary flex-1 mx-2">{a.accountName}</span>
                <span className={`text-[9px] rounded px-1.5 py-px font-semibold border ${
                  a.accountType === 'Asset'
                    ? 'bg-cyan/10 text-cyan border-cyan/20'
                    : 'bg-accent-2/10 text-accent-2 border-accent-2/20'
                }`}>{a.accountType}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Tax accounts are seeded automatically when you enable tax for a country.
            Click <strong>Re-seed Accounts</strong> to add any missing accounts.
          </p>
        </SectionCard>
      )}

      {/* Tax Return / Filing summary — only when tax is active */}
      {anyEnabled && <TaxReturnCard />}
    </div>
  )
}

// ── Sub-component: Tax Return (filing summary + ledger reconciliation) ──────────
function TaxReturnCard() {
  const currency = useBusinessStore((s) => s.currency)
  const iso = (d) => d.toISOString().split('T')[0]
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return {
      startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate:   iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
  })

  const { data: filing, isLoading } = useFilingSummary(period)
  const recon = filing?.reconciliation

  const statusColor = {
    payable:    'text-amber',
    refundable: 'text-positive',
    nil:        'text-text-muted',
  }[filing?.status] || 'text-text-primary'

  return (
    <SectionCard title="Tax Return (Filing Summary)" icon={Receipt}>
      {/* Period picker */}
      <div className="grid grid-cols-2 gap-3">
        <Input type="date" label="From" value={period.startDate}
          onChange={(e) => setPeriod((p) => ({ ...p, startDate: e.target.value }))} />
        <Input type="date" label="To" value={period.endDate}
          onChange={(e) => setPeriod((p) => ({ ...p, endDate: e.target.value }))} />
      </div>

      {isLoading && <p className="text-sm text-text-muted">Calculating…</p>}

      {!isLoading && filing && (
        <>
          {filing.form && (
            <p className="text-xs text-text-muted">
              Return form: <strong className="text-text-secondary">{filing.form}</strong>
              {filing.countryName && <> · {filing.countryName}</>}
            </p>
          )}

          {/* Output / Input / Net tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-glass bg-glass-panel px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Output Tax (sales)</p>
              <p className="text-lg font-black text-text-primary">{formatCurrency(filing.outputTax, currency)}</p>
            </div>
            <div className="rounded-lg border border-glass bg-glass-panel px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Input Tax (purchases)</p>
              <p className="text-lg font-black text-text-primary">{formatCurrency(filing.inputTax, currency)}</p>
            </div>
            <div className="rounded-lg border border-glass bg-glass-panel px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">
                Net {filing.status === 'refundable' ? 'Refundable' : 'Payable'}
              </p>
              <p className={`text-lg font-black ${statusColor}`}>
                {formatCurrency(Math.abs(filing.netPayable), currency)}
              </p>
            </div>
          </div>

          {/* Ledger reconciliation badge — proves the return ties to the GL */}
          {recon && (
            <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
              recon.reconciled
                ? 'border-positive/20 bg-positive/5'
                : 'border-negative/20 bg-negative/5'
            }`}>
              {recon.reconciled
                ? <CheckCircle2 className="h-4 w-4 text-positive shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 text-negative shrink-0 mt-0.5" />}
              <div className="space-y-0.5">
                {recon.reconciled ? (
                  <p className="text-positive font-semibold">Reconciled to the general ledger</p>
                ) : (
                  <p className="text-negative font-semibold">Does not match the general ledger</p>
                )}
                <p className="text-[11px] text-text-muted">
                  Ledger net {formatCurrency(recon.glNetPayable, currency)} vs return net {formatCurrency(recon.reportNetPayable, currency)}
                  {!recon.reconciled && ' — a tax posting may be missing from the return. Check the tax accounts.'}
                </p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            The net figure is computed directly from your tax control accounts in the ledger, so the return always ties to your books.
          </p>
        </>
      )}
    </SectionCard>
  )
}
