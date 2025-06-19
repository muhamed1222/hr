import apiClient from './client'

export const workLogsAPI = {
  // Получить логи с фильтрами
  getWorkLogs: async (params = {}) => {
    const response = await apiClient.get('/work-logs', { params })
    return response.data
  },

  // Получить статистику
  getStats: async (params = {}) => {
    const response = await apiClient.get('/work-logs/stats', { params })
    return response.data
  },

  // Получить лог конкретного дня
  getWorkLog: async (userId, date) => {
    const response = await apiClient.get(`/work-logs/${userId}/${date}`)
    return response.data
  },

  // Обновить лог
  updateWorkLog: async (id, data) => {
    const response = await apiClient.patch(`/work-logs/${id}`, data)
    return response.data
  },

  // Получить сводку команды на сегодня
  getTeamToday: async () => {
    const response = await apiClient.get('/work-logs/team/today')
    return response.data
  },
} 