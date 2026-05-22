import api from './api'

const aiService = {
  assistantChat: (question, chatHistory = []) =>
    api.post('/ai/rag-query', { question, chatHistory }),

  recommendations: () =>
    api.post('/ai/cashflow-recommendations'),

  forecast: (metric, horizon) =>
    api.post('/ai/forecast', { metric, horizon }),

  // Triggers a fresh anomaly scan; returns scan summary + anomalies[]
  // Pass { force: true } to override decision-suppression (full re-scan)
  anomalyDetection: (opts = {}) =>
    api.post('/ai/anomaly-scan', opts),

  // Fetches previously stored alerts from DB (paginated, filterable by status)
  // Supported statuses: pending | marked_legit | confirmed_fraud | ignored | rescanned
  getAnomalyAlerts: (params = {}) =>
    api.get('/ai/anomaly-alerts', { params }),

  // Review a stored alert: action = 'legitimate' | 'fraud' | 'ignore'
  // Optional `notes` for reviewer comments
  reviewAnomalyAlert: (alertId, action, notes = '') =>
    api.put(`/ai/anomaly-alerts/${alertId}/review`, { action, notes }),

  // Alert counts by status for stats cards
  getAnomalyStats: () =>
    api.get('/ai/anomaly-stats'),

  semanticSearch: (query) =>
    api.post('/ai/semantic-search', { query }),

  parseNL: (text) =>
    api.post('/ai/parse-nl', { text }),
}

export default aiService
