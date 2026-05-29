/**
 * audit.service.js — ERP Step 9
 * Frontend API client for the unified cross-module audit / activity trail.
 */
import api from './api'

const auditService = {
  // Merged durable-log + live-event timeline (optionally entity-scoped).
  getActivity: (params = {}) => api.get('/audit/activity', { params }),
  // Durable audit log (paginated, filterable).
  getLogs:     (params = {}) => api.get('/audit/logs', { params }),
  // Full trail for one entity.
  getEntityTrail: (entityType, entityId, params = {}) =>
    api.get(`/audit/entity/${entityType}/${entityId}`, { params }),
}

export default auditService
