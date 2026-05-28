/**
 * InvoiceEditorPage — Phase 2 — wraps the InvoiceEditor with
 * data loading + mutation wiring for create / edit / view flows.
 *
 * Routes:
 *   /sales/invoices/new         → create mode
 *   /sales/invoices/:id/edit    → edit mode (draft) OR view mode (non-draft)
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  useInvoice, useCreateInvoiceDraft, useUpdateInvoiceDraft,
  useSubmitInvoice, useDownloadInvoicePdf, useApproveInvoice,
  useSendInvoice, useCancelInvoice,
} from '@/hooks/useInvoices'
import { useCustomers } from '@/hooks/useParties'
import InvoiceEditor from '@/components/invoice/InvoiceEditor'
import PartyFormModal from '@/components/forms/PartyFormModal'
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
  const submit      = useSubmitInvoice()
  const approve     = useApproveInvoice()
  const send        = useSendInvoice()
  const cancel      = useCancelInvoice()
  const downloadPdf = useDownloadInvoicePdf()

  const [showCustomerModal, setShowCustomerModal] = useState(false)

  const saving =
    createDraft.isPending || updateDraft.isPending || submit.isPending ||
    approve.isPending || send.isPending || cancel.isPending

  const handleSaveDraft = async (formData) => {
    if (isEdit) {
      await updateDraft.mutateAsync({ id, ...formData })
    } else {
      const resp = await createDraft.mutateAsync(formData)
      const newId = resp?.data?.data?._id || resp?.data?._id
      if (newId) navigate(`/sales/invoices/${newId}/edit`, { replace: true })
    }
  }

  const handleSubmitForApproval = async (formData) => {
    let invoiceId = id
    if (!isEdit) {
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
    return <div className="space-y-5"><SkeletonLoader count={3} /></div>
  }

  return (
    <div className="space-y-4 animate-fade-in">
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
        onApprove={(invId) => approve.mutate({ id: invId })}
        onSend={(invId) => send.mutate({ id: invId })}
        onCancel={(invId, reason) => cancel.mutate({ id: invId, reason })}
        onAddCustomer={() => setShowCustomerModal(true)}
      />

      <PartyFormModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        type="customer"
      />
    </div>
  )
}
