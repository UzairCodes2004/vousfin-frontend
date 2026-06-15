/**
 * useAutonomy.js — Autonomy roadmap Phase 0
 * TanStack Query hooks for the Command Center inbox + the autonomy dials.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import autonomyService from '@/services/autonomy.service'

const KEY = ['autonomy']

export function useAutonomyInbox() {
  return useQuery({
    queryKey: [...KEY, 'inbox'],
    queryFn:  () => autonomyService.getInbox().then(r => r.data?.data),
    staleTime: 30 * 1000,
  })
}

export function useAutonomyPolicy() {
  return useQuery({
    queryKey: [...KEY, 'policy'],
    queryFn:  () => autonomyService.getPolicy().then(r => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetCapability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ capability, ...body }) => autonomyService.setCapability(capability, body).then(r => r.data?.data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: [...KEY, 'policy'] }); toast.success('Autonomy updated') },
    onError:    (err) => toast.error(err.response?.data?.message || 'Could not update autonomy'),
  })
}

export function useApproveAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => autonomyService.approveAction(id).then(r => r.data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: [...KEY, 'inbox'] }); toast.success('Approved') },
    onError:    (err) => toast.error(err.response?.data?.message || 'Could not approve'),
  })
}

export function useRejectAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => autonomyService.rejectAction(id).then(r => r.data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: [...KEY, 'inbox'] }); toast('Dismissed', { icon: '✕' }) },
    onError:    (err) => toast.error(err.response?.data?.message || 'Could not dismiss'),
  })
}
