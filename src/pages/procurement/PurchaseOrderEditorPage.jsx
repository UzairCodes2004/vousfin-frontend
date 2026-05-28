/**
 * PurchaseOrderEditorPage — Phase 3.1
 * Wraps the POEditor with data + mutation wiring.
 * Supports create (/new) and edit (/:id/edit).
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  usePurchaseOrder,
  useCreatePODraft,
  useUpdatePODraft,
  useSubmitPO,
  useApprovePO,
  useRejectPO,
  useCancelPO,
  useClosePO,
} from '@/hooks/useProcurement'
import { useVendors } from '@/hooks/useParties'
import POEditor from '@/components/procurement/POEditor'
import PartyFormModal from '@/components/forms/PartyFormModal'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function PurchaseOrderEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: po, isLoading } = usePurchaseOrder(id)
  const { data: vendorsData } = useVendors({ limit: 200 })
  const vendors = Array.isArray(vendorsData?.docs)  ? vendorsData.docs
                : Array.isArray(vendorsData?.data)  ? vendorsData.data
                : Array.isArray(vendorsData)         ? vendorsData : []

  const createDraft = useCreatePODraft()
  const updateDraft = useUpdatePODraft()
  const submit      = useSubmitPO()
  const approve     = useApprovePO()
  const reject      = useRejectPO()
  const cancel      = useCancelPO()
  const close       = useClosePO()

  const [showVendorModal, setShowVendorModal] = useState(false)
  const [pendingVendorId, setPendingVendorId] = useState(null)

  const saving =
    createDraft.isPending || updateDraft.isPending || submit.isPending ||
    approve.isPending || reject.isPending || cancel.isPending || close.isPending

  const handleSaveDraft = async (formData) => {
    if (isEdit) {
      await updateDraft.mutateAsync({ id, ...formData })
    } else {
      const resp = await createDraft.mutateAsync(formData)
      const newId = resp?.data?.data?._id || resp?.data?._id
      if (newId) navigate(`/procurement/purchase-orders/${newId}/edit`, { replace: true })
    }
  }

  const handleSubmit = async (formData) => {
    let poId = id
    if (!isEdit) {
      const resp = await createDraft.mutateAsync(formData)
      poId = resp?.data?.data?._id || resp?.data?._id
    } else {
      await updateDraft.mutateAsync({ id, ...formData })
    }
    if (poId) {
      await submit.mutateAsync({ id: poId })
      navigate('/procurement/purchase-orders')
    }
  }

  if (isEdit && (isLoading || !po)) {
    return <div className="space-y-5"><SkeletonLoader count={4} /></div>
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/procurement/purchase-orders')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-cyan transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Purchase Orders
      </button>

      <POEditor
        key={`${po?._id || 'new'}-${pendingVendorId || ''}`}
        po={isEdit ? po : null}
        vendors={vendors}
        defaultVendorId={pendingVendorId || (isEdit ? (po?.vendorId?._id || po?.vendorId) : null)}
        saving={saving}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onApprove={(poId, note) => approve.mutate({ id: poId, note })}
        onReject={(poId, note) => reject.mutate({ id: poId, note })}
        onCancel={(poId, reason) => cancel.mutate({ id: poId, reason })}
        onClose={(poId, reason) => close.mutate({ id: poId, reason })}
        onAddVendor={() => setShowVendorModal(true)}
      />

      <PartyFormModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        onCreated={(v) => setPendingVendorId(v._id)}
        type="vendor"
      />
    </div>
  )
}
