// src/services/bill.service.js
// Phase 1 — REST client for first-class Bill domain endpoints.
import api from './api';

const billService = {
  createDraft:        (data)              => api.post('/bills', data),
  updateDraft:        (id, data)          => api.put(`/bills/${id}`, data),
  list:               (params)            => api.get('/bills', { params }),
  getById:            (id)                => api.get(`/bills/${id}`),
  getTimeline:        (id)                => api.get(`/bills/${id}/timeline`),

  // Approval workflow
  submitForApproval:  (id)                => api.post(`/bills/${id}/submit`),
  approve:            (id, note)          => api.post(`/bills/${id}/approve`, { note }),
  reject:             (id, note)          => api.post(`/bills/${id}/reject`,  { note }),

  // Lifecycle
  schedule:           (id, payDate)       => api.post(`/bills/${id}/schedule`, { payDate }),
  cancel:             (id, reason)        => api.post(`/bills/${id}/cancel`,   { reason }),
  transition:         (id, toState, reason) => api.post(`/bills/${id}/transition`, { toState, reason }),

  archive:            (id)                => api.delete(`/bills/${id}`),

  // Phase 3.2 — 3-way match
  runMatch:           (id, toleranceCfg)  => api.post(`/bills/${id}/match`, { toleranceCfg: toleranceCfg || {} }),
};

export default billService;
