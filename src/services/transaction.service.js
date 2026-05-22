import api from './api'

const transactionService = {
  create: (data) => api.post('/transactions/form', data),
  list: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  reverse: (id) => api.delete(`/transactions/${id}`),
  
  // AR/AP & Settlements
  getOutstandingBalances: (type, opts = {}) =>
    api.get('/transactions/outstanding', {
      params: { type, ...(opts.withAging ? { withAging: 'true' } : {}) },
    }),
  recordPayment: (data) => api.post('/transactions/payment', data),
  getSettlementHistory: (id) => api.get(`/transactions/${id}/settlements`),

  // Installments
  createInstallment: (data) => api.post('/transactions/installment', data),
  recordInstallmentPayment: (planId, data) => api.post(`/transactions/installment/${planId}/pay`, data),

  // Excel import (do NOT set Content-Type manually — Axios must set it with the multipart boundary)
  importExcel: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/transactions/excel', form, { onUploadProgress: onProgress })
  },
  confirmExcel: (rows) => api.post('/transactions/excel/confirm', { rows }),
  downloadExcelTemplate: () => api.get('/transactions/excel/template', { responseType: 'blob' }),
  naturalLanguageParse: (text) => api.post('/transactions/nl', { text }),
  naturalLanguageConfirm: (data) => api.post('/transactions/nl/confirm', data),
}

export default transactionService
