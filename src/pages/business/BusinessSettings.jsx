import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { getErrorMessage } from '@/utils/errorHandler'
import api from '@/services/api'

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
  const { activeBusiness, fetchBusiness, updateBusiness } = useBusinessStore()
  const { user } = useAuthStore()
  const [form,        setForm]        = useState({})
  const [loading,     setLoading]     = useState(false)
  const [syncing,     setSyncing]     = useState(false)

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
              businessName:         b.businessName,
              businessType:         b.businessType || '',
              currency:             b.currency,
              fiscalYearStartMonth: b.fiscalYearStartMonth,
            })
          }
        })
        .catch((e) => toast.error(getErrorMessage(e)))
    }
  }, [user?.businessId, fetchBusiness])

  const save = async (e) => {
    e.preventDefault()
    if (!activeBusiness) {
      toast.error('No business profile found')
      return
    }
    setLoading(true)
    try {
      await updateBusiness(form)
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
      if (inserted > 0) {
        toast.success(`Synced ${inserted} missing accounts to your chart of accounts`)
      } else {
        toast.success('Chart of accounts is already up to date')
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-text-primary tracking-tight">Business Settings</h1>
        <p className="text-text-secondary mt-1">Update your business profile and preferences.</p>
      </div>

      <form onSubmit={save} className="premium-card space-y-6 p-6 sm:p-8">
        <Input
          label="Business Name"
          value={form.businessName || ''}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          placeholder="Your business name"
        />

        <Select
          label="Business Type"
          value={form.businessType || ''}
          onChange={(v) => setForm({ ...form, businessType: v })}
          options={BUSINESS_TYPE_OPTIONS}
          placeholder="Select type…"
          searchable
        />

        <Select
          label="Base Currency"
          value={form.currency || 'PKR'}
          onChange={(v) => setForm({ ...form, currency: v })}
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
          value={String(form.fiscalYearStartMonth ?? 7)}
          onChange={(v) => setForm({ ...form, fiscalYearStartMonth: parseInt(v, 10) })}
          options={[
            { value: '1',  label: 'January' },
            { value: '4',  label: 'April' },
            { value: '7',  label: 'July' },
            { value: '10', label: 'October' },
          ]}
        />

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
          <Button
            type="button"
            variant="secondary"
            loading={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Default Accounts
          </Button>
          <span className="text-xs text-text-muted">
            Adds any accounts that are missing from your chart
          </span>
        </div>
      </div>
    </div>
  )
}
