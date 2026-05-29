// src/hooks/useProcurement.js
// Phase 3.1 — React Query hooks for Purchase Order, Goods Receipt, Vendor Credit.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  purchaseOrderService,
  goodsReceiptService,
  vendorCreditService,
} from '@/services/procurement.service'
import { getErrorMessage } from '@/utils/errorHandler'

// ── Purchase Orders ───────────────────────────────────────────────────────────

export function usePurchaseOrders(params = {}) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const { data } = await purchaseOrderService.list(params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: ['purchase-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await purchaseOrderService.getById(id)
      return data.data
    },
  })
}

export function usePurchaseOrderTimeline(id) {
  return useQuery({
    queryKey: ['po-timeline', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await purchaseOrderService.getTimeline(id)
      return data.data
    },
    staleTime: 30 * 1000,
  })
}

function makePOMutation(call, { successMessage, invalidateId } = {}) {
  return function usePOMutation() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: call,
      onSuccess: (_resp, vars) => {
        if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(vars) : successMessage)
        qc.invalidateQueries({ queryKey: ['purchase-orders'] })
        if (invalidateId && vars?.id) {
          qc.invalidateQueries({ queryKey: ['purchase-order', vars.id] })
          qc.invalidateQueries({ queryKey: ['po-timeline', vars.id] })
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }
}

export const useCreatePODraft      = makePOMutation((data)           => purchaseOrderService.createDraft(data),
  { successMessage: 'Purchase order created' })
export const useUpdatePODraft      = makePOMutation(({ id, ...d })   => purchaseOrderService.updateDraft(id, d),
  { successMessage: 'Purchase order updated', invalidateId: true })
export const useSubmitPO           = makePOMutation(({ id })         => purchaseOrderService.submitForApproval(id),
  { successMessage: 'PO submitted for approval', invalidateId: true })
export const useApprovePO          = makePOMutation(({ id, note })   => purchaseOrderService.approve(id, note),
  { successMessage: 'PO approved', invalidateId: true })
export const useRejectPO           = makePOMutation(({ id, note })   => purchaseOrderService.reject(id, note),
  { successMessage: 'PO rejected', invalidateId: true })
export const useCancelPO           = makePOMutation(({ id, reason }) => purchaseOrderService.cancel(id, reason),
  { successMessage: 'PO cancelled', invalidateId: true })
export const useClosePO            = makePOMutation(({ id, reason }) => purchaseOrderService.close(id, reason),
  { successMessage: 'PO closed', invalidateId: true })
export const useArchivePO          = makePOMutation(({ id })         => purchaseOrderService.archive(id),
  { successMessage: 'PO archived', invalidateId: true })

// ── Goods Receipts ────────────────────────────────────────────────────────────

export function useGoodsReceipts(params = {}) {
  return useQuery({
    queryKey: ['goods-receipts', params],
    queryFn: async () => {
      const { data } = await goodsReceiptService.list(params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useGoodsReceipt(id) {
  return useQuery({
    queryKey: ['goods-receipt', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await goodsReceiptService.getById(id)
      return data.data
    },
  })
}

function makeGRNMutation(call, { successMessage, invalidateId } = {}) {
  return function useGRNMutation() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: call,
      onSuccess: (_resp, vars) => {
        if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(vars) : successMessage)
        qc.invalidateQueries({ queryKey: ['goods-receipts'] })
        qc.invalidateQueries({ queryKey: ['purchase-orders'] })
        if (invalidateId && vars?.id) {
          qc.invalidateQueries({ queryKey: ['goods-receipt', vars.id] })
        }
        // ERP Step 7 — confirming a receipt adds stock at landed cost, changing
        // inventory valuation; refresh inventory, dashboard and reports.
        qc.invalidateQueries({ queryKey: ['inventory'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['reports'] })
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }
}

export const useCreateGRNDraft = makeGRNMutation((data)           => goodsReceiptService.createDraft(data),
  { successMessage: 'Goods receipt created' })
export const useConfirmGRN     = makeGRNMutation(({ id })         => goodsReceiptService.confirm(id),
  { successMessage: 'Goods receipt confirmed', invalidateId: true })
export const useReconcileGRN   = makeGRNMutation(({ id, resolutions }) => goodsReceiptService.reconcile(id, resolutions),
  { successMessage: 'Discrepancies updated', invalidateId: true })
export const useCancelGRN      = makeGRNMutation(({ id, reason }) => goodsReceiptService.cancel(id, reason),
  { successMessage: 'GRN cancelled', invalidateId: true })
export const useArchiveGRN     = makeGRNMutation(({ id })         => goodsReceiptService.archive(id),
  { successMessage: 'GRN archived', invalidateId: true })

// ── Vendor Credits ────────────────────────────────────────────────────────────

export function useVendorCredits(params = {}) {
  return useQuery({
    queryKey: ['vendor-credits', params],
    queryFn: async () => {
      const { data } = await vendorCreditService.list(params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useVendorCredit(id) {
  return useQuery({
    queryKey: ['vendor-credit', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await vendorCreditService.getById(id)
      return data.data
    },
  })
}

export function useAvailableVendorCredits(vendorId) {
  return useQuery({
    queryKey: ['vendor-credits-available', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await vendorCreditService.getAvailable(vendorId)
      return data.data
    },
    staleTime: 30 * 1000,
  })
}

function makeVCMutation(call, { successMessage, invalidateId } = {}) {
  return function useVCMutation() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: call,
      onSuccess: (_resp, vars) => {
        if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(vars) : successMessage)
        qc.invalidateQueries({ queryKey: ['vendor-credits'] })
        qc.invalidateQueries({ queryKey: ['vendor-credits-available'] })
        if (invalidateId && vars?.id) {
          qc.invalidateQueries({ queryKey: ['vendor-credit', vars.id] })
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }
}

export const useCreateVendorCredit  = makeVCMutation((data)               => vendorCreditService.create(data),
  { successMessage: 'Vendor credit created' })
export const useApplyVendorCredit   = makeVCMutation(({ id, ...body })    => vendorCreditService.applyToBill(id, body),
  { successMessage: 'Credit applied to bill', invalidateId: true })
export const useCancelVendorCredit  = makeVCMutation(({ id, reason })     => vendorCreditService.cancel(id, reason),
  { successMessage: 'Vendor credit cancelled', invalidateId: true })
export const useArchiveVendorCredit = makeVCMutation(({ id })             => vendorCreditService.archive(id),
  { successMessage: 'Vendor credit archived', invalidateId: true })
