import apiClient from './client'

export const reportsAPI = {
  // Экспорт в Excel
  exportExcel: async (params = {}) => {
    const response = await apiClient.post('/reports/excel', params, {
      responseType: 'blob',
    })
    return response
  },

  // Экспорт в PDF
  exportPDF: async (params = {}) => {
    const response = await apiClient.post('/reports/pdf', params, {
      responseType: 'blob',
    })
    return response
  },

  // Получить аналитику
  getAnalytics: async (params = {}) => {
    const response = await apiClient.get('/reports/analytics', { params })
    return response.data
  },
} 