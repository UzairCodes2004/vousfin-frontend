// src/hooks/useVendorRisk.js — Phase 3.3
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import vendorRiskService from '@/services/vendorRisk.service'
import { getErrorMessage } from '@/utils/errorHandler'

export function useVendorRiskSummary() {
  return useQuery({
    queryKey: ['vendor-risk-summary'],
    queryFn: async () => {
      const { data } = await vendorRiskService.summary()
      return data.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useVendorsByRisk(params = {}) {
  return useQuery({
    queryKey: ['vendor-risk-list', params],
    queryFn: async () => {
      const { data } = await vendorRiskService.listByRisk(params)
      return data.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useComputeVendorRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId }) => vendorRiskService.compute(vendorId),
    onSuccess: (resp) => {
      const r = resp?.data?.data
      toast.success(`Risk computed: ${r?.riskLevel ?? 'n/a'} (score ${r?.riskScore ?? '—'})`)
      qc.invalidateQueries({ queryKey: ['vendor-risk-summary'] })
      qc.invalidateQueries({ queryKey: ['vendor-risk-list'] })
      qc.invalidateQueries({ queryKey: ['vendor'] })
      qc.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useRefreshAllRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => vendorRiskService.refreshAll(),
    onSuccess: (resp) => {
      const count = resp?.data?.data?.length ?? 0
      toast.success(`${count} vendor risk scores refreshed`)
      qc.invalidateQueries({ queryKey: ['vendor-risk-summary'] })
      qc.invalidateQueries({ queryKey: ['vendor-risk-list'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
