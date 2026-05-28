/**
 * InvoiceEditorPage — Phase 2 — wraps the InvoiceEditor component with
 * data loading + mutation wiring for both create + edit flows.
 *
 * Routes:
 *   /sales/invoices/new         → create mode
 *   /sales/invoices/:id/edit    → edit mode (loads existing invoice)
 */
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  useInvoice, useCreateInvoiceDraft, useUpdateInvoiceDraft,
  useSubmitInvoice, useDownloadInvoicePdf,
} from '@/hooks/useInvoices'
import { useCustomers } from '@/hooks/useParties'
import InvoiceEditor from '@/components/invoice/InvoiceEditor'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: invoice, isLoading } = useInvoice(id)
  const { data: customersData } = useCustomers({ limit: 200 })
  const customers = Array.isArray(customersData?.docs) ? customersData.docs
                   : Array.isArray(customersData?.data) ? customersData.data
                   : Array.isArray(customersData) ? customersData : []

  const createDraft = useCreateInvoiceDraft()
  const updateDraft = useUpdateInvoiceDraft()
  const submit     = useSubmitInvoice()
  const downloadPdf = useDownloadInvoicePdf()

  const saving = createDraft.isPending || updateDraft.isPending || submit.isPending

  const handleSaveDraft = async (formData) => {
    if (isEdit) {
      await updateDraft.mutateAsync({ id, ...formData })
    } else {
      const resp = await createDraft.mutateAsync(formData)
      // Navigate to edit mode of newly-created draft
      const newId = resp?.data?.data?._id || resp?.data?._id
      if (newId) navigate(`/sales/invoices/${newId}/edit`, { replace: true })
    }
  }

  const handleSubmitForApproval = async (formData) => {
    let invoiceId = id
    if (!isEdit) {
      // Save first, then submit
      const resp = await createDraft.mutateAsync(formData)
      invoiceId = resp?.data?.data?._id || resp?.data?._id
    } else {
      await updateDraft.mutateAsync({ id, ...formData })
    }
    if (invoiceId) {
      await submit.mutateAsync({ id: invoiceId })
      navigate('/sales/invoices')
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-5">
        <SkeletonLoader count={3} />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/sales/invoices')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-cyan transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Invoices
      </button>

      <InvoiceEditor
        invoice={isEdit ? invoice : null}
        customers={customers}
        saving={saving}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmitForApproval}
        onDownloadPdf={(invId) => downloadPdf.mutate(invId)}
      />
    </div>
  )
}
