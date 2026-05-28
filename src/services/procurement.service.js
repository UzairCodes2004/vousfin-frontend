// src/services/procurement.service.js
// Phase 3.1 — REST clients for Purchase Order, Goods Receipt, and Vendor Credit.
import api from './api'

// ── Purchase Orders ───────────────────────────────────────────────────────────
export const purchaseOrderService = {
  createDraft:      (data)           => api.post('/purchase-orders', data),
  updateDraft:      (id, data)       => api.put(`/purchase-orders/${id}`, data),
  list:             (params)         => api.get('/purchase-orders', { params }),
  getById:          (id)             => api.get(`/purchase-orders/${id}`),
  getTimeline:      (id)             => api.get(`/purchase-orders/${id}/timeline`),

  submitForApproval:(id)             => api.post(`/purchase-orders/${id}/submit`),
  approve:          (id, note)       => api.post(`/purchase-orders/${id}/approve`, { note }),
  reject:           (id, note)       => api.post(`/purchase-orders/${id}/reject`,  { note }),
  cancel:           (id, reason)     => api.post(`/purchase-orders/${id}/cancel`,  { reason }),
  close:            (id, reason)     => api.post(`/purchase-orders/${id}/close`,   { reason }),

  runThreeWayMatch: (id, body)       => api.post(`/purchase-orders/${id}/three-way-match`, body),
  archive:          (id)             => api.delete(`/purchase-orders/${id}`),
}

// ── Goods Receipts ────────────────────────────────────────────────────────────
export const goodsReceiptService = {
  createDraft: (data)              => api.post('/goods-receipts', data),
  list:        (params)            => api.get('/goods-receipts', { params }),
  getById:     (id)                => api.get(`/goods-receipts/${id}`),
  confirm:     (id)                => api.post(`/goods-receipts/${id}/confirm`),
  reconcile:   (id, resolutions)   => api.post(`/goods-receipts/${id}/reconcile`, { resolutions }),
  cancel:      (id, reason)        => api.post(`/goods-receipts/${id}/cancel`, { reason }),
  archive:     (id)                => api.delete(`/goods-receipts/${id}`),
}

// ── Vendor Credits ────────────────────────────────────────────────────────────
export const vendorCreditService = {
  create:           (data)           => api.post('/vendor-credits', data),
  list:             (params)         => api.get('/vendor-credits', { params }),
  getById:          (id)             => api.get(`/vendor-credits/${id}`),
  getAvailable:     (vendorId)       => api.get('/vendor-credits/available', { params: { vendorId } }),
  applyToBill:      (id, body)       => api.post(`/vendor-credits/${id}/apply`, body),
  cancel:           (id, reason)     => api.post(`/vendor-credits/${id}/cancel`, { reason }),
  archive:          (id)             => api.delete(`/vendor-credits/${id}`),
}
