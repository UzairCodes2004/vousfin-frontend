// src/services/billSchedule.service.js — Phase 3.3
import api from './api'

const billScheduleService = {
  create:       (data)           => api.post('/bill-schedules', data),
  list:         (params)         => api.get('/bill-schedules', { params }),
  getById:      (id)             => api.get(`/bill-schedules/${id}`),
  update:       (id, data)       => api.patch(`/bill-schedules/${id}`, data),
  deactivate:   (id)             => api.patch(`/bill-schedules/${id}/deactivate`),
  reminderSummary: ()            => api.get('/bill-schedules/reminders'),
  triggerGenerate: ()            => api.post('/bill-schedules/trigger'),
}

export default billScheduleService
