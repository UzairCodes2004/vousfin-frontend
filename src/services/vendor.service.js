// src/services/vendor.service.js
import api from './api';

const vendorService = {
  createVendor: (data) => api.post('/vendors', data),
  listVendors: (params) => api.get('/vendors', { params }),
  getVendorById: (id) => api.get(`/vendors/${id}`),
  updateVendor: (id, data) => api.put(`/vendors/${id}`, data),
  getVendorBalance: (id) => api.get(`/vendors/${id}/balance`),
  getVendorTransactions: (id, params) => api.get(`/vendors/${id}/transactions`, { params }),
  getVendorStats: (id) => api.get(`/vendors/${id}/stats`),
  toggleActive: (id) => api.patch(`/vendors/${id}/toggle-active`),
};

export default vendorService;
