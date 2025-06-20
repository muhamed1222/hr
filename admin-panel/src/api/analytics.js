import apiClient from './client'

export const analyticsAPI = {
  // Получить аналитику по работе (среднее и суммарное время)
  getWorkAnalytics: async (params = {}) => {
    const { startDate, endDate, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/reports/analytics?${queryParams.toString()}`)
    return response.data
  },

  // Получить рейтинг надёжности
  getReliabilityRanking: async (params = {}) => {
    const { startDate, endDate, limit = 10 } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    queryParams.append('limit', limit)

    const response = await apiClient.get(`/users/ranking/reliability?${queryParams.toString()}`)
    return response.data
  },

  // Получить статистику пользователя
  getUserStats: async (userId, params = {}) => {
    const { startDate, endDate } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const response = await apiClient.get(`/users/${userId}/stats?${queryParams.toString()}`)
    return response.data
  },

  // Получить общую статистику пользователей
  getUsersOverview: async () => {
    const response = await apiClient.get('/users-management/stats/overview')
    return response.data
  },

  // Получить статистику рабочих логов
  getWorkLogsStats: async (params = {}) => {
    const { startDate, endDate, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/work-logs/stats?${queryParams.toString()}`)
    return response.data
  },

  // Получить статистику команды
  getTeamStats: async (teamId, params = {}) => {
    const { startDate, endDate } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const response = await apiClient.get(`/teams/${teamId}/stats?${queryParams.toString()}`)
    return response.data
  },

  // Получить статистику напоминаний
  getRemindersStats: async () => {
    const response = await apiClient.get('/reminders/stats')
    return response.data
  },

  // === НОВЫЕ МЕТОДЫ ДЛЯ BI MINI-PLATFORM ===

  // Получить данные для тепловой карты активности
  getActivityHeatmap: async (params = {}) => {
    const { startDate, endDate, teamId, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (teamId) queryParams.append('teamId', teamId)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/analytics/activity-heatmap?${queryParams.toString()}`)
    return response.data
  },

  // Получить продвинутые рейтинги (надёжность, пунктуальность, переработки, стабильность)
  getAdvancedRankings: async (params = {}) => {
    const { startDate, endDate, limit = 10 } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    queryParams.append('limit', limit)

    const response = await apiClient.get(`/analytics/advanced-rankings?${queryParams.toString()}`)
    return response.data
  },

  // Получить распределение режимов работы (офис/удалёнка)
  getWorkModeDistribution: async (params = {}) => {
    const { startDate, endDate, teamId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (teamId) queryParams.append('teamId', teamId)

    const response = await apiClient.get(`/analytics/work-mode-distribution?${queryParams.toString()}`)
    return response.data
  },

  // Получить детальную аналитику по опозданиям
  getPunctualityAnalytics: async (params = {}) => {
    const { startDate, endDate, teamId, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (teamId) queryParams.append('teamId', teamId)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/analytics/punctuality?${queryParams.toString()}`)
    return response.data
  },

  // Получить аналитику переработок
  getOvertimeAnalytics: async (params = {}) => {
    const { startDate, endDate, teamId, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (teamId) queryParams.append('teamId', teamId)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/analytics/overtime?${queryParams.toString()}`)
    return response.data
  },

  // Получить аналитику по отсутствиям
  getAbsenceAnalytics: async (params = {}) => {
    const { startDate, endDate, teamId, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (teamId) queryParams.append('teamId', teamId)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/analytics/absences?${queryParams.toString()}`)
    return response.data
  },

  // Получить тренды по различным метрикам
  getMetricsTrends: async (params = {}) => {
    const { startDate, endDate, metrics, period = 'week' } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (metrics) queryParams.append('metrics', metrics.join(','))
    queryParams.append('period', period)

    const response = await apiClient.get(`/analytics/trends?${queryParams.toString()}`)
    return response.data
  },

  // Получить сравнительную аналитику команд
  getTeamsComparison: async (params = {}) => {
    const { startDate, endDate, teamIds, metrics } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (teamIds) queryParams.append('teamIds', teamIds.join(','))
    if (metrics) queryParams.append('metrics', metrics.join(','))

    const response = await apiClient.get(`/analytics/teams-comparison?${queryParams.toString()}`)
    return response.data
  },

  // Сгенерировать и экспортировать отчёт
  generateReport: async (reportConfig) => {
    const response = await apiClient.post('/analytics/generate-report', reportConfig, {
      responseType: 'blob' // Для скачивания файлов
    })
    return response
  },

  // Получить список доступных отчётов
  getReportTemplates: async () => {
    const response = await apiClient.get('/analytics/report-templates')
    return response.data
  },

  // Сохранить шаблон отчёта
  saveReportTemplate: async (template) => {
    const response = await apiClient.post('/analytics/report-templates', template)
    return response.data
  },

  // Получить кастомную аналитику по SQL запросу (для админов)
  getCustomAnalytics: async (query, params = {}) => {
    const response = await apiClient.post('/analytics/custom', {
      query,
      params
    })
    return response.data
  },

  // Получить статистику производительности системы
  getSystemPerformance: async (params = {}) => {
    const { startDate, endDate } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const response = await apiClient.get(`/analytics/system-performance?${queryParams.toString()}`)
    return response.data
  }
} 