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

  // Auditable server-side Business Health Score (liquidity/profitability/
  // efficiency/leverage/tax) with data-sufficiency confidence.
  healthScore: () =>
    api.get('/ai/health-score'),

  // Health score over time + change vs last month (trend sparkline).
  healthHistory: (days = 90) =>
    api.get('/ai/health-history', { params: { days } }),

  // Forward-looking outlook: projected runway / margin / forward health
  // + proactive signals, derived from the ensemble forecast.
  healthOutlook: (horizon = 6) =>
    api.get('/ai/health-outlook', { params: { horizon } }),

  // Unified "Needs attention" feed — merged + ranked insights/forecast/anomalies.
  needsAttention: () =>
    api.get('/ai/needs-attention'),
}

export default aiService
