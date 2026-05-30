/**
 * useArApReport.js — AR/AP M7
 * TanStack Query hook for the unified reconciled AR/AP aging report.
 */
import { useQuery } from '@tanstack/react-query'
import arApReportService from '@/services/arApReport.service'

export function useArApReport(type) {
  return useQuery({
    queryKey: ['ar-ap-report', type],
    queryFn:  () => arApReportService.getAging(type).then(r => r.data?.data),
    staleTime: 60 * 1000,
    enabled: !!type,
  })
}
