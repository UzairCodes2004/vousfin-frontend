/**
 * useForecastDomain.js — Forecast Platform F6
 * Hook for the institutional domain forecasts (liquidity stress, AR payment
 * behavior, inventory demand, debt exposure, profitability, macro sensitivity).
 */
import { useQuery } from '@tanstack/react-query'
import forecastDomainService from '@/services/forecastDomain.service'

export function useForecastDomain(domain, horizon = 6, enabled = true) {
  return useQuery({
    queryKey: ['forecast-domain', domain, horizon],
    queryFn: () => forecastDomainService.get(domain, horizon).then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!domain && enabled,
  })
}
