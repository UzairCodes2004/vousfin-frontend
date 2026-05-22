import { create } from 'zustand'
import aiService from '@/services/ai.service'

export const useAIStore = create((set, get) => ({
  messages: [],
  recommendations: [],

  // Anomaly state
  anomalies: [],          // current list shown in the UI
  anomalyTotal: 0,        // total from DB query
  anomalyStats: null,     // { pending, valid, confirmed_issue }
  lastScanResult: null,   // most recent scan summary

  forecast: null,
  searchResults: [],
  loading: false,

  // ─── Chat assistant ──────────────────────────────────────────────────────────

  sendMessage: async (question) => {
    const history = get().messages.map((m) => ({ role: m.role, content: m.content }))
    set((s) => ({
      messages: [...s.messages, { role: 'user', content: question, id: Date.now() }],
      loading: true,
    }))
    try {
      const { data } = await aiService.assistantChat(question, history)
      const answer = data.data?.answer || data.data?.response || data.message
      set((s) => ({
        messages: [
          ...s.messages,
          { role: 'assistant', content: answer, id: Date.now() + 1 },
        ],
        loading: false,
      }))
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  // ─── Recommendations ─────────────────────────────────────────────────────────

  fetchRecommendations: async () => {
    const { data } = await aiService.recommendations()
    set({ recommendations: data.data?.recommendations || data.data || [] })
  },

  // ─── Forecast ────────────────────────────────────────────────────────────────

  fetchForecast: async (metric, horizon) => {
    set({ loading: true })
    const { data } = await aiService.forecast(metric, horizon)
    set({ forecast: data.data, loading: false })
    return data.data
  },

  // ─── Anomaly detection ───────────────────────────────────────────────────────

  /**
   * Trigger a fresh anomaly scan (ensemble: IF + Z + heuristics + behavioural).
   * @param {object} opts - { force?: boolean }
   *                       force=true re-scores even previously-cleared txns
   */
  fetchAnomalies: async (opts = {}) => {
    set({ loading: true })
    try {
      const { data } = await aiService.anomalyDetection(opts)
      const payload = data.data || {}
      const anomalies = Array.isArray(payload.anomalies) ? payload.anomalies : []
      set({ anomalies, lastScanResult: payload, loading: false })
      return payload
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  /**
   * Load previously stored alerts from the DB.
   * @param {string|null} status - 'pending'|'marked_legit'|'confirmed_fraud'|'ignored'|'rescanned'|null
   */
  fetchStoredAlerts: async (status = null, page = 1) => {
    set({ loading: true })
    try {
      const params = { page, limit: 25 }
      if (status) params.status = status
      const { data } = await aiService.getAnomalyAlerts(params)
      const payload = data.data || {}
      const anomalies = Array.isArray(payload.anomalies) ? payload.anomalies : []
      set({ anomalies, anomalyTotal: payload.total || 0, loading: false })
      return payload
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  /**
   * Review an alert.
   * @param {string} alertId
   * @param {'legitimate'|'fraud'|'ignore'} action
   * @param {string} notes
   *
   * Optimistic update: removes the alert from the visible list immediately,
   * then refreshes stats so cards reflect the new counts.
   */
  reviewAnomaly: async (alertId, action, notes = '') => {
    // Optimistic remove
    const prev = get().anomalies
    set((s) => ({
      anomalies: s.anomalies.filter(
        (a) => String(a.alertId || a.id) !== String(alertId)
      ),
    }))
    try {
      await aiService.reviewAnomalyAlert(alertId, action, notes)
      // Refresh stats after review
      get().fetchAnomalyStats().catch(() => {})
    } catch (e) {
      // Rollback on failure
      set({ anomalies: prev })
      throw e
    }
  },

  /**
   * Load alert counts by status for the stats cards.
   */
  fetchAnomalyStats: async () => {
    try {
      const { data } = await aiService.getAnomalyStats()
      set({ anomalyStats: data.data || null })
      return data.data
    } catch {
      // Non-critical — silently ignore
    }
  },

  // ─── Semantic search ─────────────────────────────────────────────────────────

  semanticSearch: async (query) => {
    const { data } = await aiService.semanticSearch(query)
    set({ searchResults: data.data?.results || data.data || [] })
    return data.data
  },

  clearChat: () => set({ messages: [] }),
}))
