/**
 * arApReport.service.js — AR/AP M7
 * Unified, reconciled AR/AP aging read model (sourced from Invoice/Bill).
 */
import api from './api'

const arApReportService = {
  // type: 'receivable' | 'payable' → { buckets, parties, reconciliation, asOf }
  getAging: (type) => api.get('/ar-ap/aging', { params: { type } }),
  getReconciliation: (type) => api.get('/ar-ap/reconciliation', { params: { type } }),
}

export default arApReportService
