import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { getErrorMessage } from '@/utils/errorHandler'
import { Building2, Briefcase, DollarSign, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

// ─── Validation schema ────────────────────────────────────────────────────────
const businessSchema = z.object({
  name:                 z.string().min(2, 'Business name is required'),
  registrationNumber:   z.string().optional(),
  type:                 z.string().min(1, 'Business type is required'),
  baseCurrency:         z.string().min(3, 'Currency is required'),
  fiscalYearStartMonth: z.coerce.number().min(1).max(12),
})

// ─── Wizard steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Profile',    icon: Building2 },
  { id: 2, title: 'Type',       icon: Briefcase },
  { id: 3, title: 'Financials', icon: DollarSign },
]

// ─── Comprehensive business-type options ─────────────────────────────────────
// These values are sent directly to the backend; no mapping needed.
// Must match the BUSINESS_TYPES array in config/constants.js.
const TYPE_OPTIONS = [
  // ── Technology & Digital ──────────────────────────────────────────────────
  { value: 'IT Services / Software Development', label: 'IT Services / Software Dev',   group: 'Technology & Digital' },
  { value: 'SaaS / Software Product',            label: 'SaaS / Software Product',       group: 'Technology & Digital' },
  { value: 'Digital Agency / Marketing',         label: 'Digital Agency / Marketing',    group: 'Technology & Digital' },
  { value: 'E-commerce / Online Retail',         label: 'E-commerce / Online Retail',    group: 'Technology & Digital' },
  // ── Trade & Commerce ──────────────────────────────────────────────────────
  { value: 'Retail Store',                       label: 'Retail Store',                  group: 'Trade & Commerce' },
  { value: 'Wholesale / Distribution',           label: 'Wholesale / Distribution',      group: 'Trade & Commerce' },
  { value: 'Import & Export',                    label: 'Import & Export',               group: 'Trade & Commerce' },
  // ── Professional Services ─────────────────────────────────────────────────
  { value: 'Consulting / Advisory',              label: 'Consulting / Advisory',         group: 'Professional Services' },
  { value: 'Accounting / Audit Firm',            label: 'Accounting / Audit Firm',       group: 'Professional Services' },
  { value: 'Law Firm / Legal Services',          label: 'Law Firm / Legal Services',     group: 'Professional Services' },
  { value: 'Healthcare / Medical Practice',      label: 'Healthcare / Medical Practice', group: 'Professional Services' },
  { value: 'Education & Training',               label: 'Education & Training',          group: 'Professional Services' },
  // ── Production & Industry ─────────────────────────────────────────────────
  { value: 'Manufacturing',                      label: 'Manufacturing',                 group: 'Production & Industry' },
  { value: 'Construction / Contracting',         label: 'Construction / Contracting',    group: 'Production & Industry' },
  { value: 'Agriculture / Farming',              label: 'Agriculture / Farming',         group: 'Production & Industry' },
  // ── Hospitality & Food ────────────────────────────────────────────────────
  { value: 'Restaurant / Food Service',          label: 'Restaurant / Food Service',     group: 'Hospitality & Food' },
  { value: 'Hotel & Hospitality',                label: 'Hotel & Hospitality',           group: 'Hospitality & Food' },
  // ── Other Industries ──────────────────────────────────────────────────────
  { value: 'Logistics & Transportation',         label: 'Logistics & Transportation',    group: 'Other Industries' },
  { value: 'Real Estate',                        label: 'Real Estate',                   group: 'Other Industries' },
  { value: 'Media & Entertainment',              label: 'Media & Entertainment',         group: 'Other Industries' },
  // ── Legal Entity Types ────────────────────────────────────────────────────
  { value: 'Sole Proprietorship',                label: 'Sole Proprietorship',           group: 'Legal Entity Type' },
  { value: 'Partnership',                        label: 'Partnership',                   group: 'Legal Entity Type' },
  { value: 'Private Limited Company',            label: 'Private Limited Company',       group: 'Legal Entity Type' },
  { value: 'Public Limited Company',             label: 'Public Limited Company',        group: 'Legal Entity Type' },
  { value: 'Non-Profit / NGO',                   label: 'Non-Profit / NGO',              group: 'Legal Entity Type' },
  { value: 'Cooperative Society',                label: 'Cooperative Society',           group: 'Legal Entity Type' },
  { value: 'Freelancer / Self-Employed',         label: 'Freelancer / Self-Employed',    group: 'Legal Entity Type' },
  { value: 'Other',                              label: 'Other',                         group: 'Legal Entity Type' },
]

// ─── Quick-pick cards shown in the card grid (most common 12) ────────────────
const QUICK_PICKS = [
  { value: 'IT Services / Software Development', label: 'IT Services',       emoji: '💻' },
  { value: 'SaaS / Software Product',            label: 'SaaS',              emoji: '☁️' },
  { value: 'Retail Store',                       label: 'Retail Store',      emoji: '🏪' },
  { value: 'E-commerce / Online Retail',         label: 'E-commerce',        emoji: '🛒' },
  { value: 'Manufacturing',                      label: 'Manufacturing',     emoji: '🏭' },
  { value: 'Construction / Contracting',         label: 'Construction',      emoji: '🏗️' },
  { value: 'Restaurant / Food Service',          label: 'Restaurant',        emoji: '🍽️' },
  { value: 'Consulting / Advisory',              label: 'Consulting',        emoji: '📋' },
  { value: 'Healthcare / Medical Practice',      label: 'Healthcare',        emoji: '🏥' },
  { value: 'Import & Export',                    label: 'Import & Export',   emoji: '📦' },
  { value: 'Freelancer / Self-Employed',         label: 'Freelancer',        emoji: '👤' },
  { value: 'Other',                              label: 'Other',             emoji: '🔧' },
]

// ─── Component ───────────────────────────────────────────────────────────────
export default function BusinessSetup() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()
  const setAuthBusinessId = useAuthStore((s) => s.setBusinessId)
  const setBusiness       = useBusinessStore((s) => s.setBusiness)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name:                 '',
      registrationNumber:   '',
      type:                 '',
      baseCurrency:         'PKR',
      fiscalYearStartMonth: 7,
    },
  })

  const formValues = watch()

  const handleNext = async () => {
    let isValid = false
    if (step === 1) isValid = await trigger(['name', 'registrationNumber'])
    if (step === 2) isValid = await trigger(['type'])
    if (isValid) setStep((s) => Math.min(s + 1, 3))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const onSubmit = async (data) => {
    try {
      const payload = {
        businessName:         data.name,
        registrationNumber:   data.registrationNumber?.trim() || undefined,
        businessType:         data.type,
        currency:             data.baseCurrency || 'PKR',
        fiscalYearStartMonth: Number(data.fiscalYearStartMonth) || 7,
      }

      const res = await api.post('/business', payload)
      const businessData = res.data.data

      setAuthBusinessId(businessData._id || businessData.id)
      setBusiness(businessData)
      toast.success('Business setup complete!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-navy p-4 text-text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="premium-card relative z-10 w-full max-w-2xl p-8 sm:p-12">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-cyan">vousFin Setup</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">
            Set up your business
          </h1>
          <p className="mt-2 text-text-secondary">Tailor accounting for your company</p>
        </div>

        {/* ── Step progress ──────────────────────────────────────────────── */}
        <div className="relative mb-10 flex items-center justify-between px-4">
          {STEPS.map((stepItem) => {
            const Icon = stepItem.icon
            return (
              <div key={stepItem.id} className="flex flex-col items-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-premium ${
                    step >= stepItem.id
                      ? 'border-cyan bg-cyan/10 text-cyan shadow-glow-cyan'
                      : 'border-glass bg-glass-panel text-text-muted'
                  }`}
                >
                  {step > stepItem.id ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`mt-3 text-sm font-bold ${
                    step >= stepItem.id ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {stepItem.title}
                </span>
              </div>
            )
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ── Step 1: Profile ──────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <Input
                label="Legal Business Name"
                placeholder="e.g. Code Hub Solutions"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Registration Number (Optional)"
                placeholder="e.g. SEC-2024-00123"
                error={errors.registrationNumber?.message}
                {...register('registrationNumber')}
              />
              <p className="-mt-3 text-xs text-text-muted">
                Multiple users can share the same business name; use a unique registration number for your company.
              </p>
            </div>
          )}

          {/* ── Step 2: Business Type ────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm font-medium text-text-secondary">
                Choose the type that best describes your business. This helps VousFin
                suggest the right accounts and reports.
              </p>

              {/* Quick-pick cards (12 most common) */}
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {QUICK_PICKS.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('type', value, { shouldValidate: true })}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-premium ${
                      formValues.type === value
                        ? 'border-cyan bg-cyan/10 text-cyan shadow-glow-cyan/20'
                        : 'border-glass bg-glass-panel text-text-secondary hover:bg-glass-hover hover:text-text-primary'
                    }`}
                  >
                    <span className="text-xl leading-none" role="img" aria-hidden="true">{emoji}</span>
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-glass" />
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">or choose from all types</span>
                <div className="flex-1 h-px bg-glass" />
              </div>

              {/* Searchable full dropdown */}
              <Select
                label="All Business Types"
                options={TYPE_OPTIONS}
                value={formValues.type}
                onChange={(v) => setValue('type', v, { shouldValidate: true })}
                placeholder="Search or select…"
                searchable
              />

              {/* Selected type display */}
              {formValues.type && (
                <div className="flex items-center gap-2 rounded-lg bg-cyan/5 border border-cyan/20 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan flex-shrink-0" />
                  <span className="text-sm font-medium text-cyan">
                    {formValues.type}
                  </span>
                </div>
              )}

              {errors.type && (
                <p className="text-sm text-negative">{errors.type.message}</p>
              )}
            </div>
          )}

          {/* ── Step 3: Financials ───────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <Select
                label="Base Currency"
                value={formValues.baseCurrency}
                onChange={(val) => setValue('baseCurrency', val)}
                error={errors.baseCurrency?.message}
                options={[
                  { value: 'PKR', label: 'PKR — Pakistani Rupee' },
                  { value: 'USD', label: 'USD — US Dollar' },
                  { value: 'EUR', label: 'EUR — Euro' },
                  { value: 'GBP', label: 'GBP — British Pound' },
                  { value: 'AED', label: 'AED — UAE Dirham' },
                  { value: 'SAR', label: 'SAR — Saudi Riyal' },
                  { value: 'INR', label: 'INR — Indian Rupee' },
                ]}
              />
              <Select
                label="Fiscal Year Start"
                value={String(formValues.fiscalYearStartMonth ?? 7)}
                onChange={(val) => setValue('fiscalYearStartMonth', parseInt(val, 10))}
                error={errors.fiscalYearStartMonth?.message}
                options={[
                  { value: '1',  label: 'January' },
                  { value: '4',  label: 'April' },
                  { value: '7',  label: 'July' },
                  { value: '10', label: 'October' },
                ]}
              />
              <p className="text-xs text-text-muted">
                Pakistan standard fiscal year runs July–June (month 7). Change only if your
                business operates on a different cycle.
              </p>
            </div>
          )}

          {/* ── Navigation ───────────────────────────────────────────────── */}
          <div className="mt-10 flex items-center justify-between border-t border-glass pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || isSubmitting}
              className={step === 1 ? 'invisible' : ''}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                Continue →
              </Button>
            ) : (
              <Button type="submit" loading={isSubmitting}>
                Complete Setup
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
