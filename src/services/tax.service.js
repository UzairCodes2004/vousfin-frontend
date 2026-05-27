/**
 * tax.service.js — Phase 5.4.8
 * Frontend API client for all /api/v1/tax/* endpoints.
 */
import api from './api'

const taxService = {
  // ── Config ──────────────────────────────────────────────────────────────────
  getConfig:    ()         => api.get('/tax/config'),
  updateConfig: (data)     => api.put('/tax/config', data),
  enableTax:    (country)  => api.post('/tax/enable', { country }),

  // ── Accounts ─────────────────────────────────────────────────────────────────
  listTaxAccounts: ()      => api.get('/tax/accounts'),

  // ── Preview (pure calc) ───────────────────────────────────────────────────────
  preview: ({ amount, transactionType, mode, taxType, taxRate }) =>
    api.post('/tax/preview', { amount, transactionType, mode, taxType, taxRate }),

  // ── Country profiles ─────────────────────────────────────────────────────────
  listProfiles:  ()        => api.get('/tax/profiles'),
  getProfile:    (code)    => api.get(`/tax/profiles/${code}`),

  // ── WHT ───────────────────────────────────────────────────────────────────────
  getWhtSchedules:     ()          => api.get('/tax/wht-schedules'),
  updateVendorWht:     (id, data)  => api.put(`/tax/vendor/${id}/wht`, data),

  // ── Reports ───────────────────────────────────────────────────────────────────
  getLedger:    (params) => api.get('/tax/reports/ledger',  { params }),
  getSummary:   (params) => api.get('/tax/reports/summary', { params }),
  getWhtReport: (params) => api.get('/tax/reports/wht',     { params }),
  getFiling:    (params) => api.get('/tax/reports/filing',  { params }),
}

export default taxService
