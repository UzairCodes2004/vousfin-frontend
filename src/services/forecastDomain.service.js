/**
 * forecastDomain.service.js — Forecast Platform F6
 * Domain forecasts: profitability, liquidity-stress, debt-exposure,
 * ar-payment-behavior, inventory-demand, macro-sensitivity.
 */
import api from './api'

const forecastDomainService = {
  list: () => api.get('/forecast-domains'),
  get: (domain, horizon = 6) => api.get(`/forecast-domains/${domain}`, { params: { horizon } }),
}

export default forecastDomainService
