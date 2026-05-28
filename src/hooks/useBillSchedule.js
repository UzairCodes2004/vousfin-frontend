// src/hooks/useBillSchedule.js — Phase 3.3
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import billScheduleService from '@/services/billSchedule.service'
import { getErrorMessage } from '@/utils/errorHandler'

export function useBillSchedules(params = {}) {
  return useQuery({
    queryKey: ['bill-schedules', params],
    queryFn: async () => {
      const { data } = await billScheduleService.list(params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useBillReminderSummary() {
  return useQuery({
    queryKey: ['bill-reminder-summary'],
    queryFn: async () => {
      const { data } = await billScheduleService.reminderSummary()
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateBillSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => billScheduleService.create(data),
    onSuccess: () => {
      toast.success('Bill schedule created')
      qc.invalidateQueries({ queryKey: ['bill-schedules'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateBillSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => billScheduleService.update(id, data),
    onSuccess: () => {
      toast.success('Schedule updated')
      qc.invalidateQueries({ queryKey: ['bill-schedules'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeactivateBillSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => billScheduleService.deactivate(id),
    onSuccess: () => {
      toast.success('Schedule deactivated')
      qc.invalidateQueries({ queryKey: ['bill-schedules'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
