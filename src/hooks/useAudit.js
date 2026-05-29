/**
 * useAudit.js — ERP Step 9
 * TanStack Query hooks for the unified audit / activity trail.
 */
import { useQuery } from '@tanstack/react-query'
import auditService from '@/services/audit.service'

/** Merged cross-module activity timeline (durable log + live events). */
export function useActivityTimeline({ entityType, entityId, limit = 50 } = {}) {
  return useQuery({
    queryKey: ['audit', 'activity', entityType ?? null, entityId ?? null, limit],
    queryFn:  () => auditService.getActivity({ entityType, entityId, limit }).then(r => r.data?.data),
    staleTime: 30 * 1000,
  })
}

/** Paginated durable audit log. */
export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: ['audit', 'logs', params],
    queryFn:  () => auditService.getLogs(params).then(r => r.data?.data),
    staleTime: 60 * 1000,
  })
}
