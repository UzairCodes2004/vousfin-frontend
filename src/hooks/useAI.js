import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { forecastService } from '@/services/forecast.service'
import { useAuthStore } from '@/stores/useAuthStore'

// ── AI module forecast (uses /ai/forecast route — backward compat) ──
export function useForecast() {
  return useMutation({
    mutationFn: async ({ metric, horizon }) => {
      const { data } = await api.post('/ai/forecast', { metric, horizon })
      return data.data
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate forecast')
    },
  })
}

// ── Dedicated LSTM endpoints ──
export function useRevenueForecast() {
  return useMutation({
    mutationFn: ({ horizon = 6 }) => forecastService.revenue(horizon),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to generate revenue forecast'),
  })
}

export function useCashflowForecast() {
  return useMutation({
    mutationFn: ({ horizon = 6 }) => forecastService.cashflow(horizon),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to generate cash flow forecast'),
  })
}

export function useExpensesForecast() {
  return useMutation({
    mutationFn: ({ horizon = 6 }) => forecastService.expenses(horizon),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to generate expense forecast'),
  })
}

export function useBusinessGrowthForecast() {
  return useMutation({
    mutationFn: ({ horizon = 6 }) => forecastService.businessGrowth(horizon),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to generate growth forecast'),
  })
}

// ── NEW: Scenario simulation ──
export function useScenarioForecast() {
  return useMutation({
    mutationFn: (params) => forecastService.scenario(params),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to run scenario simulation'),
  })
}

// ── NEW: Category breakdown ──
export function useCategoryBreakdown(months = 3) {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['categoryBreakdown', businessId, months],
    queryFn:  () => forecastService.categoryBreakdown(months),
    staleTime: 10 * 60 * 1000,
    enabled: !!businessId,
    retry: false,
  })
}

// ── NEW: Anomaly risk for forecast ──
export function useForecastAnomalyRisk() {
  const businessId = useAuthStore(s => s.user?.businessId)
  return useQuery({
    queryKey: ['forecastAnomalyRisk', businessId],
    queryFn:  forecastService.anomalyRisk,
    staleTime: 5 * 60 * 1000,
    enabled: !!businessId,
    retry: false,
  })
}

// ── Forecast engine health check ──
export function useForecastHealth() {
  return useQuery({
    queryKey: ['forecastHealth'],
    queryFn:  forecastService.health,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
