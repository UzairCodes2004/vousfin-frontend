/**
 * autonomy.service.js — Autonomy roadmap Phase 0
 * Client for the control plane + the one inbox.
 */
import api from './api'

const autonomyService = {
  getInbox:      ()                 => api.get('/autonomy/inbox'),
  getReport:     ()                 => api.get('/autonomy/report'),
  getPolicy:     ()                 => api.get('/autonomy/policy'),
  setCapability: (capability, body) => api.put(`/autonomy/policy/${capability}`, body),
  approveAction: (id)               => api.post(`/autonomy/actions/${id}/approve`),
  rejectAction:  (id)               => api.post(`/autonomy/actions/${id}/reject`),
  reverseAction: (id)               => api.post(`/autonomy/actions/${id}/reverse`),

  // Bookkeeper agent (Phase 2) — hand the books a document; list intake + outcomes
  ingestDocument: (rawText, source) => api.post('/bookkeeping/ingest', { rawText, source }),
  getDocuments:   ()                => api.get('/bookkeeping/documents'),
}

export default autonomyService
