// src/services/procurementAnalytics.service.js
// Phase 3.4 — Procurement Analytics + Cash Flow Forecast API calls
import api from './api'

const BASE = '/procurement-analytics'

// ── Analytics ──────────────────────────────────────────────────────────────────
export const getVendorSpend = (params = {}) =>
  api.get(`${BASE}/vendor-spend`, { params }).then(r => r.data.data)

export const getCycleTime = (params = {}) =>
  api.get(`${BASE}/cycle-time`, { params }).then(r => r.data.data)

export const getOverdueStats = () =>
  api.get(`${BASE}/overdue-stats`).then(r => r.data.data)

export const getPaymentBehavior = (params = {}) =>
  api.get(`${BASE}/payment-behavior`, { params }).then(r => r.data.data)

export const getRecurringExpenses = (params = {}) =>
  api.get(`${BASE}/recurring-expenses`, { params }).then(r => r.data.data)

export const getPurchasingEfficiency = (params = {}) =>
  api.get(`${BASE}/purchasing-efficiency`, { params }).then(r => r.data.data)

export const getFullAnalytics = (params = {}) =>
  api.get(`${BASE}/full`, { params }).then(r => r.data.data)

// ── Cash Flow Forecast ─────────────────────────────────────────────────────────
export const getPayableObligations = (params = {}) =>
  api.get(`${BASE}/forecast/obligations`, { params }).then(r => r.data.data)

export const getCashRequirements = () =>
  api.get(`${BASE}/forecast/requirements`).then(r => r.data.data)

export const getUpcomingDueBills = (params = {}) =>
  api.get(`${BASE}/forecast/upcoming-bills`, { params }).then(r => r.data.data)

export const getDashboardForecast = () =>
  api.get(`${BASE}/forecast/dashboard`).then(r => r.data.data)

// ── Audit Trail ────────────────────────────────────────────────────────────────
export const getEntityAuditTrail = (entityType, entityId, params = {}) =>
  api.get(`${BASE}/audit/${entityType}/${entityId}`, { params }).then(r => r.data.data)

export const getRecentActivity = (params = {}) =>
  api.get(`${BASE}/audit/activity`, { params }).then(r => r.data.data)

export const getActionSummary = (params = {}) =>
  api.get(`${BASE}/audit/summary`, { params }).then(r => r.data.data)
