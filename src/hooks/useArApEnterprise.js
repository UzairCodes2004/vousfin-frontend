/**
 * useArApEnterprise.js — AR/AP M8
 * TanStack Query hooks for recurring invoices, customer statements,
 * dunning/collections, and early-payment discounts.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import arApEnterpriseService from '@/services/arApEnterprise.service'
import { getErrorMessage } from '@/utils/errorHandler'

// ── Customer statement ───────────────────────────────────────────────────────
export function useCustomerStatement(customerId, { from, to } = {}, enabled = true) {
  return useQuery({
    queryKey: ['customer-statement', customerId, from, to],
    queryFn: () => arApEnterpriseService.getCustomerStatement(customerId, { from, to }).then((r) => r.data?.data),
    staleTime: 60 * 1000,
    enabled: !!customerId && enabled,
  })
}

// ── Recurring invoice schedules ──────────────────────────────────────────────
export function useInvoiceSchedules(params = {}) {
  return useQuery({
    queryKey: ['invoice-schedules', params],
    queryFn: () => arApEnterpriseService.listInvoiceSchedules(params).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useInvoiceScheduleMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoice-schedules'] })
  const create = useMutation({
    mutationFn: (payload) => arApEnterpriseService.createInvoiceSchedule(payload),
    onSuccess: () => { invalidate(); toast.success('Recurring schedule created') },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const deactivate = useMutation({
    mutationFn: (id) => arApEnterpriseService.deactivateInvoiceSchedule(id),
    onSuccess: () => { invalidate(); toast.success('Schedule deactivated') },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  return { create, deactivate }
}

// ── Dunning / collections ────────────────────────────────────────────────────
export function useDunningSummary() {
  return useQuery({
    queryKey: ['dunning-summary'],
    queryFn: () => arApEnterpriseService.getDunningSummary().then((r) => r.data?.data),
    staleTime: 60 * 1000,
  })
}

export function useDunningWorklist(params = {}) {
  return useQuery({
    queryKey: ['dunning-worklist', params],
    queryFn: () => arApEnterpriseService.getDunningWorklist(params).then((r) => r.data?.data),
    staleTime: 60 * 1000,
  })
}

// ── Early-payment discount ────────────────────────────────────────────────────
export function useEarlyPaymentDiscount() {
  const qc = useQueryClient()
  const applyInvoice = useMutation({
    mutationFn: (invoiceId) => arApEnterpriseService.applyInvoiceDiscount(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['ar-ap-report'] })
      toast.success('Early-payment discount applied')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const applyBill = useMutation({
    mutationFn: (billId) => arApEnterpriseService.applyBillDiscount(billId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['ar-ap-report'] })
      toast.success('Early-payment discount applied')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  return { applyInvoice, applyBill }
}
