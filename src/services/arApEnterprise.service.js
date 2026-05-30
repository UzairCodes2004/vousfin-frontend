/**
 * arApEnterprise.service.js — AR/AP M8 (enterprise extras)
 * Recurring invoices, customer statements, dunning, early-payment discounts.
 */
import api from './api'

const arApEnterpriseService = {
  // ── Customer statements (document-sourced) ────────────────────────────────
  // GET /ar-ap/statement?customerId=&from=&to=
  getCustomerStatement: (customerId, { from, to } = {}) =>
    api.get('/ar-ap/statement', { params: { customerId, from, to } }),

  // ── Recurring invoice schedules ───────────────────────────────────────────
  listInvoiceSchedules: (params = {}) => api.get('/invoice-schedules', { params }),
  getInvoiceSchedule:   (id) => api.get(`/invoice-schedules/${id}`),
  createInvoiceSchedule:(payload) => api.post('/invoice-schedules', payload),
  updateInvoiceSchedule:(id, payload) => api.patch(`/invoice-schedules/${id}`, payload),
  deactivateInvoiceSchedule: (id) => api.patch(`/invoice-schedules/${id}/deactivate`),
  triggerInvoiceSchedules:   () => api.post('/invoice-schedules/trigger'),

  // ── Dunning / collections ─────────────────────────────────────────────────
  getDunningSummary:  () => api.get('/dunning/summary'),
  getDunningWorklist: (params = {}) => api.get('/dunning/worklist', { params }),
  runDunning:         () => api.post('/dunning/run'),
  escalateInvoice:    (invoiceId) => api.post(`/dunning/${invoiceId}/escalate`),

  // ── Early-payment discounts ───────────────────────────────────────────────
  previewInvoiceDiscount: (invoiceId) => api.get(`/invoices/${invoiceId}/early-payment-discount`),
  applyInvoiceDiscount:   (invoiceId) => api.post(`/invoices/${invoiceId}/early-payment-discount`),
  previewBillDiscount:    (billId) => api.get(`/bills/${billId}/early-payment-discount`),
  applyBillDiscount:      (billId) => api.post(`/bills/${billId}/early-payment-discount`),
}

export default arApEnterpriseService
