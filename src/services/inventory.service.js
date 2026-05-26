// src/services/inventory.service.js
import api from './api';

const inventoryService = {
  createItem:          (data)            => api.post('/inventory', data),
  listItems:           (params)          => api.get('/inventory', { params }),
  getItemById:         (id)              => api.get(`/inventory/${id}`),
  updateItem:          (id, data)        => api.put(`/inventory/${id}`, data),
  toggleActive:        (id)              => api.patch(`/inventory/${id}/toggle-active`),
  getLowStockAlerts:   ()               => api.get('/inventory/low-stock'),
  getInventoryValuation: ()             => api.get('/inventory/valuation'),
  addStock:            (id, data)        => api.post(`/inventory/${id}/add-stock`, data),
};

export default inventoryService;
