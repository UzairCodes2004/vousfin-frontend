/**
 * forecastRegistry.service.js — Forecast Platform F3
 * Forecast runs, model versions, realized accuracy, and on-demand backtests.
 */
import api from './api'

const forecastRegistryService = {
  listRuns:   (params = {}) => api.get('/forecast-registry/runs', { params }),
  listModels: (params = {}) => api.get('/forecast-registry/models', { params }),
  accuracy:   (params = {}) => api.get('/forecast-registry/accuracy', { params }),
  accuracyScore: (params = {}) => api.get('/forecast-registry/accuracy-score', { params }), // A1
  governance: () => api.get('/forecast-registry/governance/dashboard'), // F9
  usage:      (params = {}) => api.get('/forecast-registry/usage', { params }), // F9
  ensemble:   (params = {}) => api.get('/forecast-registry/ensemble', { params }), // F4
  hierarchical: (params = {}) => api.get('/forecast-registry/hierarchical', { params }), // B1
  drift:      (params = {}) => api.get('/forecast-registry/drift', { params }),    // F5
  champion:   (params = {}) => api.get('/forecast-registry/champion', { params }), // F5
  explain:    (params = {}) => api.get('/forecast-registry/explain', { params }),  // F7
  backtest:   (payload = {}) => api.post('/forecast-registry/backtest', payload),
  retrain:    (payload = {}) => api.post('/forecast-registry/retrain', payload),   // F5
  scenario:   (payload = {}) => api.post('/forecast-registry/scenario', payload),  // F7
  runAccuracy:() => api.post('/forecast-registry/accuracy/run'),
}

export default forecastRegistryService
