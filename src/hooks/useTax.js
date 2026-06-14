/**
 * useTax.js — Phase 5.4.8
 * TanStack Query hooks for the tax engine API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import taxService from '@/services/tax.service'
import toast from 'react-hot-toast'

const QUERY_KEY = ['tax']

// ── Config ───────────────────────────────────────────────────────────────────

export function useTaxConfig() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'config'],
    queryFn:  () => taxService.getConfig().then(r => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

// ── Live position (FR-04.1) ────────────────────────────────────────────────────

/**
 * Always-on tax position. Invalidated by transaction mutations (see
 * useTransactions) so it refreshes within seconds of a posting.
 */
export function useTaxPosition() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'position'],
    queryFn:  () => taxService.getPosition().then(r => r.data?.data),
    staleTime: 30 * 1000,
  })
}

export function useUpdateTaxConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => taxService.updateConfig(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Tax configuration saved')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save tax config'),
  })
}

export function useEnableTax() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (country) => taxService.enableTax(country),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(res.data?.message || 'Tax enabled successfully')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to enable tax'),
  })
}

// ── Country profiles ─────────────────────────────────────────────────────────

export function useTaxProfiles() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'profiles'],
    queryFn:  () => taxService.listProfiles().then(r => r.data?.data ?? []),
    staleTime: 60 * 60 * 1000,  // profiles are static — 1h
  })
}

export function useTaxProfile(code) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'profile', code],
    queryFn:  () => taxService.getProfile(code).then(r => r.data?.data),
    enabled:  !!code,
    staleTime: 60 * 60 * 1000,
  })
}

// ── Tax Accounts ─────────────────────────────────────────────────────────────

export function useTaxAccounts() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'accounts'],
    queryFn:  () => taxService.listTaxAccounts().then(r => r.data?.data ?? []),
    staleTime: 5 * 60 * 1000,
  })
}

// ── WHT ──────────────────────────────────────────────────────────────────────

export function useWhtSchedules() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'wht-schedules'],
    queryFn:  () => taxService.getWhtSchedules().then(r => r.data),
    staleTime: 60 * 60 * 1000,
  })
}

export function useUpdateVendorWht() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => taxService.updateVendorWht(id, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor WHT profile updated')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update WHT profile'),
  })
}

// ── Tax Preview ───────────────────────────────────────────────────────────────
/**
 * Live tax calculation preview.
 * Only fires when amount > 0 and transactionType is set.
 *
 * @param {{ amount, transactionType, mode, taxType, taxRate,
 *           isReverseCharge, isImportedService, whtApply, whtCategory }} params
 * @returns { data: TaxPreviewResult, isLoading }
 */
export function useTaxPreview({
  amount, transactionType, mode, taxType, taxRate,
  isReverseCharge, isImportedService, whtApply, whtCategory,
} = {}) {
  const enabled = !!(amount > 0 && transactionType)
  return useQuery({
    queryKey: [...QUERY_KEY, 'preview', amount, transactionType, mode, taxType, taxRate,
               isReverseCharge, isImportedService, whtApply, whtCategory],
    queryFn:  () => taxService.preview({
                      amount, transactionType, mode, taxType, taxRate,
                      isReverseCharge, isImportedService, whtApply, whtCategory,
                    }).then(r => r.data?.data),
    enabled,
    staleTime: 30 * 1000,
    placeholderData: null,
  })
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function useTaxLedger(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'ledger', params],
    queryFn:  () => taxService.getLedger(params).then(r => r.data?.data ?? []),
    staleTime: 60 * 1000,
  })
}

export function useTaxSummary(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'summary', params],
    queryFn:  () => taxService.getSummary(params).then(r => r.data?.data),
    staleTime: 60 * 1000,
  })
}

export function useWhtReport(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'wht-report', params],
    queryFn:  () => taxService.getWhtReport(params).then(r => r.data?.data),
    staleTime: 60 * 1000,
  })
}

export function useFilingSummary(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'filing', params],
    queryFn:  () => taxService.getFiling(params).then(r => r.data?.data),
    staleTime: 60 * 1000,
  })
}
