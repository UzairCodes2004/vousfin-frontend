/**
 * autonomy.service.js — Autonomy roadmap Phase 0
 * Client for the control plane + the one inbox.
 */
import api from './api'

const autonomyService = {
  getInbox:      ()                 => api.get('/autonomy/inbox'),
  getPolicy:     ()                 => api.get('/autonomy/policy'),
  setCapability: (capability, body) => api.put(`/autonomy/policy/${capability}`, body),
  approveAction: (id)               => api.post(`/autonomy/actions/${id}/approve`),
  rejectAction:  (id)               => api.post(`/autonomy/actions/${id}/reject`),
}

export default autonomyService
