/**
 * arApIntegrity.service.js — AR/AP M9
 * Durable event log, replay, projection rebuild, consistency verification.
 */
import api from './api'

const arApIntegrityService = {
  listEvents: (params = {}) => api.get('/ar-ap-integrity/events', { params }),
  eventStats: () => api.get('/ar-ap-integrity/events/stats'),
  verify:     () => api.get('/ar-ap-integrity/verify'),
  replay:     (payload = {}) => api.post('/ar-ap-integrity/replay', payload),
  rebuild:    (payload = {}) => api.post('/ar-ap-integrity/rebuild', payload),
  rebuildDocument: (kind, id) => api.post(`/ar-ap-integrity/rebuild/${kind}/${id}`),
}

export default arApIntegrityService
