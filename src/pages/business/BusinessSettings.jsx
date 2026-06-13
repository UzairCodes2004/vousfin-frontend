import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RefreshCw, Upload, Trash2, AlertTriangle, Building2, X } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import TextArea from '@/components/ui/TextArea'
import Button from '@/components/ui/Button'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { getErrorMessage } from '@/utils/errorHandler'
import api from '@/services/api'

// Max logo size before base64 encoding (~2MB image).
const MAX_LOGO_BYTES = 2 * 1024 * 1024

const CURRENCY_OPTIONS = [
  { value: 'PKR', label: 'PKR — Pakistani Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

// ─── Business-type options (mirrors BusinessSetup.jsx + constants.js) ─────────
const BUSINESS_TYPE_OPTIONS = [
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
  { value: 'Private Limited',                    label: 'Private Limited (legacy)',      group: 'Legal Entity Type' },
  { value: 'Private Limited Company',            label: 'Private Limited Company',       group: 'Legal Entity Type' },
  { value: 'Public Limited Company',             label: 'Public Limited Company',        group: 'Legal Entity Type' },
  { value: 'Non-Profit / NGO',                   label: 'Non-Profit / NGO',              group: 'Legal Entity Type' },
  { value: 'Cooperative Society',                label: 'Cooperative Society',           group: 'Legal Entity Type' },
  { value: 'Freelancer',                         label: 'Freelancer (legacy)',           group: 'Legal Entity Type' },
  { value: 'Freelancer / Self-Employed',         label: 'Freelancer / Self-Employed',    group: 'Legal Entity Type' },
  { value: 'Other',                              label: 'Other',                         group: 'Legal Entity Type' },
]

export default function BusinessSettings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeBusiness, fetchBusiness, updateBusiness, resetBusinessData, deleteBusiness } = useBusinessStore()
  const { user, setBusinessId } = useAuthStore()
  const fileInputRef = useRef(null)

  const [form,    setForm]    = useState({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Danger-zone modal: { mode: 'reset' | 'delete' } | null
  const [danger, setDanger] = useState(null)

  useEffect(() => {
    if (user && !user.businessId) {
      navigate('/business/setup')
    }
  }, [user, navigate])

  useEffect(() => {
    if (user?.businessId) {
      fetchBusiness()
        .then((b) => {
          if (b) {
            setForm({
              businessName:         b.businessName || '',
              businessType:         b.businessType || '',
              registrationNumber:   b.registrationNumber || '',
              currency:             b.currency || 'PKR',
              reportingCurrency:    b.reportingCurrency || '',
              fiscalYearStartMonth: b.fiscalYearStartMonth,
              logoUrl:              b.logoUrl || '',
              phone:                b.phone || '',
              email:                b.email || '',
              address:              b.address || '',
              website:              b.website || '',
            })
          }
        })
        .catch((e) => toast.error(getErrorMessage(e)))
    }
  }, [user?.businessId, fetchBusiness])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleLogoPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Image is too large. Please pick one under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setField('logoUrl', reader.result)
    reader.onerror = () => toast.error('Could not read that image')
    reader.readAsDataURL(file)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!activeBusiness) {
      toast.error('No business profile found')
      return
    }
    setLoading(true)
    try {
      // Send only fields we manage; empty strings clear optional values.
      await updateBusiness({
        businessName:         form.businessName,
        businessType:         form.businessType,
        registrationNumber:   form.registrationNumber,
        currency:             form.currency,
        reportingCurrency:    form.reportingCurrency || null,
        fiscalYearStartMonth: form.fiscalYearStartMonth,
        logoUrl:              form.logoUrl || '',
        phone:                form.phone,
        email:                form.email,
        address:              form.address,
        website:              form.website,
      })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/business/accounts/sync')
      const { inserted } = res.data?.data ?? {}
      toast.success(inserted > 0
        ? `Synced ${inserted} missing accounts to your chart of accounts`
        : 'Chart of accounts is already up to date')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSyncing(false)
    }
  }

  const logoSrc = form.logoUrl || activeBusiness?.logoUrl || ''

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Business Settings</h1>
        <p className="text-text-secondary mt-1">Update your business profile, branding and preferences.</p>
      </div>

      <form onSubmit={save} className="premium-card space-y-6 p-6 sm:p-8">
        {/* ── Logo / profile picture ───────────────────────────────────── */}
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-glass bg-glass-panel flex items-center justify-center">
            {logoSrc
              ? <img src={logoSrc} alt="Business logo" className="h-full w-full object-cover" />
              : <Building2 className="h-8 w-8 text-text-muted" />}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-text-primary">Business Logo</p>
            <p className="text-xs text-text-muted">PNG, JPG or SVG. Up to 2MB.</p>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoPick}
              />
              <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
              {logoSrc && (
                <Button type="button" variant="danger" onClick={() => setField('logoUrl', '')}>
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-glass" />

        <Input
          label="Business Name"
          value={form.businessName || ''}
          onChange={(e) => setField('businessName', e.target.value)}
          placeholder="Your business name"
        />

        <Select
          label="Business Type"
          value={form.businessType || ''}
          onChange={(v) => setField('businessType', v)}
          options={BUSINESS_TYPE_OPTIONS}
          placeholder="Select type…"
          searchable
        />

        <Input
          label="Registration Number"
          value={form.registrationNumber || ''}
          onChange={(e) => setField('registrationNumber', e.target.value)}
          placeholder="e.g. NTN / company registration no. (optional)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Base Currency"
            value={form.currency || 'PKR'}
            onChange={(v) => setField('currency', v)}
            options={CURRENCY_OPTIONS}
          />
          <Select
            label="Reporting Currency"
            value={form.reportingCurrency || ''}
            onChange={(v) => setField('reportingCurrency', v)}
            options={[{ value: '', label: 'Same as base currency' }, ...CURRENCY_OPTIONS]}
          />
        </div>

        <Select
          label="Fiscal Year Start"
          value={String(form.fiscalYearStartMonth ?? 7)}
          onChange={(v) => setField('fiscalYearStartMonth', parseInt(v, 10))}
          options={[
            { value: '1',  label: 'January' },
            { value: '4',  label: 'April' },
            { value: '7',  label: 'July' },
            { value: '10', label: 'October' },
          ]}
        />

        {/* ── Contact details ──────────────────────────────────────────── */}
        <div className="border-t border-glass pt-2">
          <h2 className="text-base font-bold text-text-primary mb-1">Contact Details</h2>
          <p className="text-xs text-text-muted mb-4">Shown on your invoices and documents.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={form.phone || ''}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="+92 300 1234567"
            />
            <Input
              label="Email"
              type="email"
              value={form.email || ''}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="contact@business.com"
            />
            <Input
              label="Website"
              value={form.website || ''}
              onChange={(e) => setField('website', e.target.value)}
              placeholder="https://yourbusiness.com"
            />
          </div>
          <div className="mt-4">
            <TextArea
              label="Business Address"
              rows={3}
              value={form.address || ''}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Street, city, country"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-glass">
          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>

      {/* ── Chart of Accounts Sync ────────────────────────────────────── */}
      <div className="premium-card p-6 sm:p-8 space-y-3">
        <h2 className="text-base font-bold text-text-primary">Chart of Accounts</h2>
        <p className="text-sm text-text-secondary">
          If you are missing accounts in your transaction form dropdowns, use the sync button
          to add any default accounts that were introduced after your business was created.
          This is safe — it only adds missing accounts and never removes or changes existing ones.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Button type="button" variant="ghost" loading={syncing} onClick={handleSync}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Default Accounts
          </Button>
          <span className="text-xs text-text-muted">Adds any accounts that are missing from your chart</span>
        </div>
      </div>

      {/* ── Danger Zone ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-negative" />
          <h2 className="text-base font-bold text-negative">Danger Zone</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">Reset all business data</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Deletes every transaction, customer, vendor, invoice and bill, then gives you a
              fresh chart of accounts. Your business profile stays. This cannot be undone.
            </p>
          </div>
          <Button type="button" variant="danger" className="shrink-0" onClick={() => setDanger({ mode: 'reset' })}>
            Reset Data
          </Button>
        </div>

        <div className="border-t border-negative/20" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">Delete this business</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Permanently removes the business and all its data. You'll be taken to set up a new
              business. This cannot be undone.
            </p>
          </div>
          <Button type="button" variant="danger" className="shrink-0" onClick={() => setDanger({ mode: 'delete' })}>
            Delete Business
          </Button>
        </div>
      </div>

      {danger && (
        <DangerConfirm
          mode={danger.mode}
          businessName={activeBusiness?.businessName || ''}
          onClose={() => setDanger(null)}
          onConfirm={async (confirmName) => {
            try {
              if (danger.mode === 'reset') {
                await resetBusinessData(confirmName)
                queryClient.clear()
                toast.success('Business data reset. Starting fresh.')
                setDanger(null)
                navigate('/dashboard')
              } else {
                await deleteBusiness(confirmName)
                queryClient.clear()
                setBusinessId(null)
                toast.success('Business deleted. Let’s set up a new one.')
                setDanger(null)
                navigate('/business/setup')
              }
            } catch (err) {
              toast.error(getErrorMessage(err))
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Confirmation modal: requires typing the exact business name ──────────────
function DangerConfirm({ mode, businessName, onClose, onConfirm }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const matches = text.trim() === businessName.trim()
  const isDelete = mode === 'delete'

  const submit = async () => {
    if (!matches) return
    setBusy(true)
    await onConfirm(text.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-negative/30 bg-navy p-6 shadow-2xl animate-fade-in">
        <button
          type="button"
          onClick={busy ? undefined : onClose}
          className="absolute right-4 top-4 text-text-muted hover:text-text-primary"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-negative" />
          <h3 className="text-lg font-black text-text-primary">
            {isDelete ? 'Delete business?' : 'Reset all data?'}
          </h3>
        </div>

        <p className="text-sm text-text-secondary mb-4">
          {isDelete
            ? 'This permanently deletes your business and everything in it. This cannot be undone.'
            : 'This permanently deletes all your data and gives you a fresh start. Your business profile stays. This cannot be undone.'}
        </p>

        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
          Type <span className="font-bold text-text-primary">{businessName}</span> to confirm
        </label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Business name"
          autoFocus
        />

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={submit} disabled={!matches} loading={busy}>
            {isDelete ? 'Delete Business' : 'Reset Data'}
          </Button>
        </div>
      </div>
    </div>
  )
}
