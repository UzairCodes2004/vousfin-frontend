/**
 * BillEditorPage — Phase 2 — wraps BillEditor with data + mutation wiring.
 * Renders view mode for non-draft bills.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  useBill, useCreateBillDraft, useUpdateBillDraft, useSubmitBill,
  useApproveBill, useScheduleBill, useCancelBill, useRunBillMatch,
} from '@/hooks/useInvoices'
import { useVendors } from '@/hooks/useParties'
import BillEditor from '@/components/invoice/BillEditor'
import ThreeWayMatchPanel from '@/components/invoice/ThreeWayMatchPanel'
import AccountingImpactPanel from '@/components/invoice/AccountingImpactPanel'
import SmartContextPanel from '@/components/common/SmartContextPanel'
import PartyFormModal from '@/components/forms/PartyFormModal'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import { useBusinessStore } from '@/stores/useBusinessStore'

export default function BillEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const currency = useBusinessStore(s => s.currency)

  const { data: bill, isLoading } = useBill(id)
  const { data: vendorsData } = useVendors({ limit: 200 })
  const vendors = Array.isArray(vendorsData?.docs) ? vendorsData.docs
                 : Array.isArray(vendorsData?.data) ? vendorsData.data
                 : Array.isArray(vendorsData) ? vendorsData : []

  const createDraft = useCreateBillDraft()
  const updateDraft = useUpdateBillDraft()
  const submit      = useSubmitBill()
  const approve     = useApproveBill()
  const schedule    = useScheduleBill()
  const cancel      = useCancelBill()

  const runMatch = useRunBillMatch()
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [pendingVendorId, setPendingVendorId] = useState(null)

  const saving =
    createDraft.isPending || updateDraft.isPending || submit.isPending ||
    approve.isPending || schedule.isPending || cancel.isPending

  const handleSaveDraft = async (formData) => {
    if (isEdit) {
      await updateDraft.mutateAsync({ id, ...formData })
    } else {
      const resp = await createDraft.mutateAsync(formData)
      const newId = resp?.data?.data?._id || resp?.data?._id
      if (newId) navigate(`/purchases/bills/${newId}/edit`, { replace: true })
    }
  }

  const handleSubmitForApproval = async (formData) => {
    let billId = id
    if (!isEdit) {
      const resp = await createDraft.mutateAsync(formData)
      billId = resp?.data?.data?._id || resp?.data?._id
    } else {
      await updateDraft.mutateAsync({ id, ...formData })
    }
    if (billId) {
      await submit.mutateAsync({ id: billId })
      navigate('/purchases/bills')
    }
  }

  // Gate render until bill is actually loaded (not just !isLoading) to
  // prevent the editor from mounting with undefined data and locking in
  // empty form values.
  if (isEdit && (isLoading || !bill)) {
    return <div className="space-y-5"><SkeletonLoader count={3} /></div>
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/purchases/bills')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-cyan transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bills
      </button>

      <BillEditor
        key={`${bill?._id || 'new'}-${pendingVendorId || ''}`}
        bill={isEdit ? bill : null}
        vendors={vendors}
        defaultVendorId={pendingVendorId || (isEdit ? bill?.vendorId : null)}
        saving={saving}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmitForApproval}
        onApprove={(billId) => approve.mutate({ id: billId })}
        onSchedule={(billId, payDate) => schedule.mutate({ id: billId, payDate })}
        onCancel={(billId, reason) => cancel.mutate({ id: billId, reason })}
        onAddVendor={() => setShowVendorModal(true)}
      />

      {/* Phase 3.2 — 3-way match panel (only shown for existing bills with a linked PO) */}
      {isEdit && bill && (
        <ThreeWayMatchPanel
          bill={bill}
          isRunning={runMatch.isPending}
          onRunMatch={() => runMatch.mutate({ id: bill._id })}
        />
      )}

      {/* ERP Steps 8 + 4 — contextual intelligence + accounting impact,
          side-by-side on wide screens, stacked on mobile */}
      {isEdit && bill && (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <SmartContextPanel kind="bill" entity={bill} />
          <AccountingImpactPanel kind="bill" entity={bill} currency={currency} />
        </div>
      )}

      <PartyFormModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        onCreated={(v) => setPendingVendorId(v._id)}
        type="vendor"
      />
    </div>
  )
}
