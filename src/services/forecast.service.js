import api from './api'

export const forecastService = {
  revenue:       (horizon = 6)   => api.post('/forecast/revenue',   { horizon }).then(r => r.data.data),
  cashflow:      (horizon = 6)   => api.post('/forecast/cashflow',  { horizon }).then(r => r.data.data),
  expenses:      (horizon = 6)   => api.post('/forecast/expenses',  { horizon }).then(r => r.data.data),
  businessGrowth:(horizon = 6)   => api.post('/forecast/business-growth', { horizon }).then(r => r.data.data),
  health:        ()              => api.get('/forecast/health').then(r => r.data.data),

  /** What-if scenario simulation */
  scenario: ({ metric = 'revenue', horizon = 6, revenueMultiplier = 1.0, expenseMultiplier = 1.0, label = 'Custom' } = {}) =>
    api.post('/forecast/scenario', { metric, horizon, revenueMultiplier, expenseMultiplier, label }).then(r => r.data.data),

  /** Top spending/revenue categories */
  categoryBreakdown: (months = 3) =>
    api.get('/forecast/category-breakdown', { params: { months } }).then(r => r.data.data),

  /** Standalone anomaly risk score */
  anomalyRisk: () =>
    api.get('/forecast/anomaly-risk').then(r => r.data.data),

  /** Invalidate server-side forecast cache (call after bulk transaction imports) */
  invalidateCache: () =>
    api.post('/forecast/invalidate-cache').then(r => r.data.data),
}
