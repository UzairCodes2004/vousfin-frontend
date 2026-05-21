import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { forecastService } from '@/services/forecast.service'

// ── Existing: AI module forecast (uses /ai/forecast) ──
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

// ── Revenue forecast via dedicated LSTM endpoint ──
export function useRevenueForecast() {
  return useMutation({
    mutationFn: ({ horizon = 6 }) => forecastService.revenue(horizon),
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate revenue forecast')
    },
  })
}

// ── Cash flow forecast via dedicated LSTM endpoint ──
export function useCashflowForecast() {
  return useMutation({
    mutationFn: ({ horizon = 6 }) => forecastService.cashflow(horizon),
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate cash flow forecast')
    },
  })
}

// ── Business growth forecast ──
export function useBusinessGrowthForecast() {
  return useMutation({
    mutationFn: ({ horizon = 6 }) => forecastService.businessGrowth(horizon),
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate growth forecast')
    },
  })
}

// ── Forecast engine health check ──
export function useForecastHealth() {
  return useQuery({
    queryKey: ['forecastHealth'],
    queryFn: forecastService.health,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
