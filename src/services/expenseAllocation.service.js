// src/services/expenseAllocation.service.js — Phase 3.3
import api from './api'

const expenseAllocationService = {
  create:      (billId, data)    => api.post(`/expense-allocation/bills/${billId}`, data),
  getByBill:   (billId)          => api.get(`/expense-allocation/bills/${billId}`),
  delete:      (billId)          => api.delete(`/expense-allocation/bills/${billId}`),
  getAgingReport: ()             => api.get('/expense-allocation/aging'),
}

export default expenseAllocationService
