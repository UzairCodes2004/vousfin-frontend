import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/useAuthStore'

const STALE  = 5  * 60 * 1000
const GC     = 10 * 60 * 1000

const buildParams = (obj) => {
  const p = new URLSearchParams()
  Object.entries(obj || {}).forEach(([k, v]) => { if (v != null && v !== '') p.append(k, v) })
  return p.toString()
}

export function useIncomeStatement(dateRange) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'income-statement', businessId, dateRange],
    queryFn: async () => {
      const { data } = await api.get(`/reports/income-statement?${buildParams(dateRange)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId,
  })
}

export function useBalanceSheet(dateRange) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'balance-sheet', businessId, dateRange],
    queryFn: async () => {
      const params = { asOfDate: dateRange?.asOfDate || dateRange?.endDate }
      if (dateRange?.compareDate) params.compareDate = dateRange.compareDate
      const { data } = await api.get(`/reports/balance-sheet?${buildParams(params)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId,
  })
}

export function useCashFlow(dateRange) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'cash-flow', businessId, dateRange],
    queryFn: async () => {
      const { data } = await api.get(`/reports/cash-flow?${buildParams(dateRange)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId,
  })
}

export function useTrialBalance(dateRange) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'trial-balance', businessId, dateRange],
    queryFn: async () => {
      const params = {
        asOfDate: dateRange?.asOfDate || dateRange?.endDate,
        fromDate: dateRange?.fromDate || dateRange?.startDate || undefined,
      }
      const { data } = await api.get(`/reports/trial-balance?${buildParams(params)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId,
  })
}

export function useGeneralLedger(params) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'general-ledger', businessId, params],
    queryFn: async () => {
      const { data } = await api.get(`/reports/general-ledger?${buildParams(params)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId && !!params?.startDate && !!params?.endDate,
  })
}

export function useAgingReport(type) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'aging', businessId, type],
    queryFn: async () => {
      const { data } = await api.get(`/reports/aging?type=${type}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId && !!type,
  })
}

export function useTaxSummary(dateRange) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'tax-summary', businessId, dateRange],
    queryFn: async () => {
      const { data } = await api.get(`/reports/tax-summary?${buildParams(dateRange)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId,
  })
}

export function useLiabilityReport(asOfDate) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['reports', 'liabilities', businessId, asOfDate],
    queryFn: async () => {
      const { data } = await api.get(`/reports/liabilities?asOfDate=${asOfDate || ''}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId,
  })
}

export function useComparativeIncome(params) {
  const businessId = useAuthStore(s => s.user?.businessId)
  const ready = !!businessId && !!params?.currentStart && !!params?.currentEnd && !!params?.priorStart && !!params?.priorEnd
  return useQuery({
    queryKey: ['reports', 'comparative-income', businessId, params],
    queryFn: async () => {
      const { data } = await api.get(`/reports/comparative/income?${buildParams(params)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: ready,
  })
}

export function useDashboardAll(dateRange) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['dashboard', 'all', businessId, dateRange],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/all?${buildParams(dateRange)}`)
      return data.data
    },
    staleTime: STALE, gcTime: GC, enabled: !!businessId,
  })
}
