/**
 * useFiscalYear.js — Phase 5.1 Accounting Period Engine (frontend hooks)
 *
 * Provides React Query hooks for:
 *  - Fiscal year CRUD
 *  - Period lifecycle (close / lock / reopen)
 *  - Current period status (drives the locked-period warning banner)
 *  - Adjusting entry posting
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { getErrorMessage } from '@/utils/errorHandler'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const inv = (qc, businessId) => {
  qc.invalidateQueries({ queryKey: ['fiscal-years', businessId] })
  qc.invalidateQueries({ queryKey: ['current-period', businessId] })
  qc.invalidateQueries({ queryKey: ['reports'] })
  qc.invalidateQueries({ queryKey: ['transactions'] })
}

/* ── Fiscal Years ─────────────────────────────────────────────────────────── */

export function useFiscalYears() {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['fiscal-years', businessId],
    queryFn: async () => {
      const { data } = await api.get('/fiscal-years')
      return data.data
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!businessId,
  })
}

export function useFiscalYear(id) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['fiscal-year', businessId, id],
    queryFn: async () => {
      const { data } = await api.get(`/fiscal-years/${id}`)
      return data.data
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!businessId && !!id,
  })
}

export function useCreateFiscalYear() {
  const businessId = useAuthStore(s => s.user?.businessId)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, startDate, endDate }) => {
      const { data } = await api.post('/fiscal-years', { name, startDate, endDate })
      return data.data
    },
    onSuccess: () => {
      inv(qc, businessId)
      toast.success('Fiscal year created with 12 monthly periods')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useCloseFiscalYear() {
  const businessId = useAuthStore(s => s.user?.businessId)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason = '' }) => {
      const { data } = await api.post(`/fiscal-years/${id}/close`, { reason })
      return data.data
    },
    onSuccess: (result) => {
      inv(qc, businessId)
      toast.success(`Year closed. Retained earnings transferred.`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useLockFiscalYear() {
  const businessId = useAuthStore(s => s.user?.businessId)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason = '' }) => {
      const { data } = await api.post(`/fiscal-years/${id}/lock`, { reason })
      return data.data
    },
    onSuccess: () => {
      inv(qc, businessId)
      toast.success('Fiscal year permanently locked')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

/* ── Accounting Periods ───────────────────────────────────────────────────── */

export function useAccountingPeriods(fiscalYearId) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['accounting-periods', businessId, fiscalYearId],
    queryFn: async () => {
      const { data } = await api.get(`/fiscal-years/${fiscalYearId}/periods`)
      return data.data
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!businessId && !!fiscalYearId,
  })
}

export function useCurrentPeriod() {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['current-period', businessId],
    queryFn: async () => {
      const { data } = await api.get('/fiscal-years/current-period')
      return data.data
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!businessId,
  })
}

export function useClosePeriod() {
  const businessId = useAuthStore(s => s.user?.businessId)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ periodId, reason = '' }) => {
      const { data } = await api.post(`/fiscal-years/periods/${periodId}/close`, { reason })
      return data.data
    },
    onSuccess: (_, { periodId }) => {
      inv(qc, businessId)
      toast.success('Period closed')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useLockPeriod() {
  const businessId = useAuthStore(s => s.user?.businessId)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ periodId, reason = '' }) => {
      const { data } = await api.post(`/fiscal-years/periods/${periodId}/lock`, { reason })
      return data.data
    },
    onSuccess: () => {
      inv(qc, businessId)
      toast.success('Period permanently locked')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useReopenPeriod() {
  const businessId = useAuthStore(s => s.user?.businessId)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ periodId, reason = '' }) => {
      const { data } = await api.post(`/fiscal-years/periods/${periodId}/reopen`, { reason })
      return data.data
    },
    onSuccess: () => {
      inv(qc, businessId)
      toast.success('Period reopened')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

/* ── Adjusting Entries ────────────────────────────────────────────────────── */

export function usePostAdjustingEntry() {
  const businessId = useAuthStore(s => s.user?.businessId)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entryData) => {
      const { data } = await api.post('/fiscal-years/adjusting-entries', entryData)
      return data.data
    },
    onSuccess: () => {
      inv(qc, businessId)
      toast.success('Adjusting entry posted')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
