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
  useTaxProfiles, useTaxAccounts, useWhtSchedules,
} from '@/hooks/useTax'
import Button   from '@/components/ui/Button'
import Input    from '@/components/ui/Input'
import Select   from '@/components/ui/Select'
import { formatDate } from '@/utils/formatters'

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
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
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
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : 'border-amber-500/20 bg-amber-500/5'
        }`}>
          {anyEnabled
            ? <><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-text-secondary">
                  Tax engine <strong className="text-emerald-400">active</strong> ·{' '}
                  {profile.countryName} · {taxCfg.filingFrequency} filing
                  {taxCfg.taxRegistrationNumber && <> · Reg: <strong>{taxCfg.taxRegistrationNumber}</strong></>}
                </span></>
            : <><AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-text-muted">
                  Tax engine is <strong className="text-amber-400">disabled</strong>.
                  Select a country and click <strong>Enable Tax</strong> to get started.
                </span>
                <Button size="sm" icon={Zap} loading={enableMutation.isPending}
                  onClick={handleEnableTax} className="ml-auto shrink-0 bg-amber-500 hover:bg-amber-400 text-white">
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
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : t.side === 'input'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>{t.side.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
            {profile.hasWht && (
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-amber-400" /> WHT available
              </span>
            )}
            {profile.hasReverseCharge && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-purple-400" /> Reverse charge supported
              </span>
            )}
            {profile.eInvoicingRequired && (
              <span className="flex items-center gap-1 text-amber-400">
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
                className="flex items-center justify-between rounded-lg border border-glass bg-glass-panel/60 px-3 py-2">
                <span className="text-xs font-mono text-text-muted w-12 shrink-0">{a.accountCode}</span>
                <span className="text-xs text-text-secondary flex-1 mx-2">{a.accountName}</span>
                <span className={`text-[9px] rounded px-1.5 py-px font-semibold border ${
                  a.accountType === 'Asset'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
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
    </div>
  )
}
