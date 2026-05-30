/**
 * useArApIntegrity.js — AR/AP M9
 * Hooks for the consistency verification + projection-rebuild admin surface.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import arApIntegrityService from '@/services/arApIntegrity.service'
import { getErrorMessage } from '@/utils/errorHandler'

export function useArApVerification(enabled = true) {
  return useQuery({
    queryKey: ['ar-ap-integrity', 'verify'],
    queryFn: () => arApIntegrityService.verify().then((r) => r.data?.data),
    staleTime: 60 * 1000,
    enabled,
  })
}

export function useEventLog(params = {}) {
  return useQuery({
    queryKey: ['ar-ap-integrity', 'events', params],
    queryFn: () => arApIntegrityService.listEvents(params).then((r) => r.data?.data),
    staleTime: 30 * 1000,
  })
}

export function useProjectionRebuild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload = {}) => arApIntegrityService.rebuild(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['ar-ap-report'] })
      qc.invalidateQueries({ queryKey: ['ar-ap-integrity'] })
      const s = res?.data?.data
      toast.success(s ? `Rebuilt ${s.rebuilt} · in-sync ${s.alreadyInSync}` : 'Projections rebuilt')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}
