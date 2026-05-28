// src/services/vendorRisk.service.js — Phase 3.3
import api from './api'

const vendorRiskService = {
  // Compute risk for a single vendor
  compute:   (vendorId)         => api.post(`/vendor-risk/${vendorId}/compute`),
  // Refresh all vendors for the business
  refreshAll:()                 => api.post('/vendor-risk/refresh'),
  // List vendors sorted by risk, optional ?level=high
  listByRisk:(params)           => api.get('/vendor-risk/list', { params }),
  // Summary counts per level
  summary:   ()                 => api.get('/vendor-risk/summary'),
}

export default vendorRiskService
