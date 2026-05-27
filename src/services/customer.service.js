// src/services/customer.service.js
import api from './api';

const customerService = {
  createCustomer: (data) => api.post('/customers', data),
  listCustomers: (params) => api.get('/customers', { params }),
  getCustomerById: (id) => api.get(`/customers/${id}`),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  getCustomerBalance: (id) => api.get(`/customers/${id}/balance`),
  getCustomerTransactions: (id, params) => api.get(`/customers/${id}/transactions`, { params }),
  getCustomerStats: (id) => api.get(`/customers/${id}/stats`),
  getCustomerStatement: (id, params) => api.get(`/customers/${id}/statement`, { params }),
  toggleActive: (id) => api.patch(`/customers/${id}/toggle-active`),
};

export default customerService;
