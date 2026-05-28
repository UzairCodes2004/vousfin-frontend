// src/hooks/useExpenseAllocation.js — Phase 3.3
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import expenseAllocationService from '@/services/expenseAllocation.service'
import { getErrorMessage } from '@/utils/errorHandler'

export function useBillAllocation(billId) {
  return useQuery({
    queryKey: ['bill-allocation', billId],
    enabled: !!billId,
    queryFn: async () => {
      const { data } = await expenseAllocationService.getByBill(billId)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useAgingReport() {
  return useQuery({
    queryKey: ['ap-aging-report'],
    queryFn: async () => {
      const { data } = await expenseAllocationService.getAgingReport()
      return data.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ billId, ...data }) => expenseAllocationService.create(billId, data),
    onSuccess: (_resp, vars) => {
      toast.success('Expense allocation saved')
      qc.invalidateQueries({ queryKey: ['bill-allocation', vars.billId] })
      qc.invalidateQueries({ queryKey: ['bill', vars.billId] })
      qc.invalidateQueries({ queryKey: ['ap-aging-report'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (billId) => expenseAllocationService.delete(billId),
    onSuccess: (_resp, billId) => {
      toast.success('Allocation removed')
      qc.invalidateQueries({ queryKey: ['bill-allocation', billId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
