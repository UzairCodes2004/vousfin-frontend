/**
 * useForecastRegistry.js — Forecast Platform F3
 * Realized accuracy + model-version/gate hooks + on-demand backtest.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import forecastRegistryService from '@/services/forecastRegistry.service'
import { getErrorMessage } from '@/utils/errorHandler'

// A1 — measured accuracy % + confidence for a target
export function useAccuracyScore(target = 'Revenue', horizon = 6) {
  return useQuery({
    queryKey: ['forecast-accuracy-score', target, horizon],
    queryFn: () => forecastRegistryService.accuracyScore({ target, horizon }).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

// F9 — champion model governance dashboard
export function useGovernanceDashboard() {
  return useQuery({
    queryKey: ['forecast-governance'],
    queryFn: () => forecastRegistryService.governance().then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * A3 — everything the Forecast Card needs: the ensemble forecast + the measured
 * accuracy/confidence + the plain-English drivers, fetched together.
 */
export function useForecastCard(target = 'Revenue', horizon = 6) {
  const ensemble = useQuery({
    queryKey: ['forecast-card-ensemble', target, horizon],
    queryFn: () => forecastRegistryService.ensemble({ target, horizon }).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
  const score = useAccuracyScore(target, horizon)
  const explain = useQuery({
    queryKey: ['forecast-card-explain', target, horizon],
    queryFn: () => forecastRegistryService.explain({ target, horizon }).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
  return {
    ensemble: ensemble.data,
    score: score.data,
    explain: explain.data,
    isLoading: ensemble.isLoading || score.isLoading || explain.isLoading,
    isError: ensemble.isError,
  }
}

export function useForecastAccuracy(target) {
  return useQuery({
    queryKey: ['forecast-accuracy', target],
    queryFn: () => forecastRegistryService.accuracy(target ? { target } : {}).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useForecastModels(key) {
  return useQuery({
    queryKey: ['forecast-models', key],
    queryFn: () => forecastRegistryService.listModels(key ? { key } : {}).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEnsembleForecast(target = 'Revenue', horizon = 6) {
  return useQuery({
    queryKey: ['forecast-ensemble', target, horizon],
    queryFn: () => forecastRegistryService.ensemble({ target, horizon }).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useForecastExplanation(target = 'Revenue', horizon = 6) {
  return useQuery({
    queryKey: ['forecast-explain', target, horizon],
    queryFn: () => forecastRegistryService.explain({ target, horizon }).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useForecastScenario() {
  return useMutation({
    mutationFn: (payload) => forecastRegistryService.scenario(payload).then((r) => r.data?.data),
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useForecastDrift(target = 'Revenue') {
  return useQuery({
    queryKey: ['forecast-drift', target],
    queryFn: () => forecastRegistryService.drift({ target }).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRetrainModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => forecastRegistryService.retrain(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['forecast-models'] })
      const r = res?.data?.data
      toast.success(r?.promoted ? `New champion promoted (MASE ${r.modelMase})` : (r?.decision || 'Retrained'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useRunBacktest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => forecastRegistryService.backtest(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['forecast-models'] })
      const v = res?.data?.data
      toast.success(v ? `Backtest: MASE ${v.modelMase ?? '—'} vs baseline ${v.baselineMase ?? '—'} · ${v.gatePassed ? 'PASS' : 'fallback'}` : 'Backtest complete')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}
