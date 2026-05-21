import api from './api'

export const forecastService = {
  revenue: (horizon = 6) =>
    api.post('/forecast/revenue', { horizon }).then(r => r.data.data),

  cashflow: (horizon = 6) =>
    api.post('/forecast/cashflow', { horizon }).then(r => r.data.data),

  businessGrowth: (horizon = 6) =>
    api.post('/forecast/business-growth', { horizon }).then(r => r.data.data),

  health: () =>
    api.get('/forecast/health').then(r => r.data.data),
}
