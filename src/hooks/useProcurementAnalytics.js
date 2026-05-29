// src/hooks/useProcurementAnalytics.js
// Phase 3.4 — TanStack Query hooks for procurement analytics & AP forecasting
import { useQuery } from '@tanstack/react-query'
import * as svc from '@/services/procurementAnalytics.service'

const STALE = 5 * 60 * 1000 // 5 min — analytics are expensive, cache aggressively

// ── Analytics hooks ────────────────────────────────────────────────────────────

export function useVendorSpend(params = {}) {
  return useQuery({
    queryKey: ['vendor-spend', params],
    queryFn:  () => svc.getVendorSpend(params),
    staleTime: STALE,
  })
}

export function useCycleTime(params = {}) {
  return useQuery({
    queryKey: ['cycle-time', params],
    queryFn:  () => svc.getCycleTime(params),
    staleTime: STALE,
  })
}

export function useOverdueStats() {
  return useQuery({
    queryKey: ['overdue-stats'],
    queryFn:  svc.getOverdueStats,
    staleTime: 60 * 1000, // 1 min — overdue changes frequently
  })
}

export function usePaymentBehavior(params = {}) {
  return useQuery({
    queryKey: ['payment-behavior', params],
    queryFn:  () => svc.getPaymentBehavior(params),
    staleTime: STALE,
  })
}

export function useRecurringExpenses(params = {}) {
  return useQuery({
    queryKey: ['recurring-expenses', params],
    queryFn:  () => svc.getRecurringExpenses(params),
    staleTime: STALE,
  })
}

export function usePurchasingEfficiency(params = {}) {
  return useQuery({
    queryKey: ['purchasing-efficiency', params],
    queryFn:  () => svc.getPurchasingEfficiency(params),
    staleTime: STALE,
  })
}

export function useFullAnalytics(params = {}) {
  return useQuery({
    queryKey: ['full-analytics', params],
    queryFn:  () => svc.getFullAnalytics(params),
    staleTime: STALE,
  })
}

// ── Forecast hooks ─────────────────────────────────────────────────────────────

export function usePayableObligations(params = {}) {
  return useQuery({
    queryKey: ['payable-obligations', params],
    queryFn:  () => svc.getPayableObligations(params),
    staleTime: 60 * 1000,
  })
}

export function useCashRequirements() {
  return useQuery({
    queryKey: ['cash-requirements'],
    queryFn:  svc.getCashRequirements,
    staleTime: 60 * 1000,
  })
}

export function useUpcomingDueBills(params = {}) {
  return useQuery({
    queryKey: ['upcoming-due-bills', params],
    queryFn:  () => svc.getUpcomingDueBills(params),
    staleTime: 60 * 1000,
  })
}

export function useDashboardForecast() {
  return useQuery({
    queryKey: ['dashboard-forecast'],
    queryFn:  svc.getDashboardForecast,
    staleTime: 60 * 1000,
  })
}

// ── Audit hooks ────────────────────────────────────────────────────────────────

export function useEntityAuditTrail(entityType, entityId, params = {}) {
  return useQuery({
    queryKey: ['audit-trail', entityType, entityId, params],
    queryFn:  () => svc.getEntityAuditTrail(entityType, entityId, params),
    enabled:  !!(entityType && entityId),
    staleTime: 30 * 1000,
  })
}

export function useRecentActivity(params = {}) {
  return useQuery({
    queryKey: ['recent-activity', params],
    queryFn:  () => svc.getRecentActivity(params),
    staleTime: 30 * 1000,
  })
}

export function useActionSummary(params = {}) {
  return useQuery({
    queryKey: ['action-summary', params],
    queryFn:  () => svc.getActionSummary(params),
    staleTime: STALE,
  })
}
