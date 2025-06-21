import apiClient from './client'

export const analyticsAPI = {
  // Получить аналитику по работе (среднее и суммарное время)
  getWorkAnalytics: async (params = {}) => {
    const { startDate, endDate, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/analytics/work-analytics?${queryParams.toString()}`)
    return response.data.data || response.data
  },

  // Получить рейтинг надёжности
  getReliabilityRanking: async (params = {}) => {
    const { startDate, endDate, limit = 10 } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    queryParams.append('limit', limit)

    const response = await apiClient.get(`/analytics/reliability-ranking?${queryParams.toString()}`)
    return response.data.data || response.data
  },

  // Получить статистику пользователя
  getUserStats: async (userId, params = {}) => {
    const { startDate, endDate } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const response = await apiClient.get(`/users/${userId}/stats?${queryParams.toString()}`)
    return response.data.data || response.data
  },

  // Получить общую статистику пользователей
  getUsersOverview: async () => {
    const response = await apiClient.get('/analytics/users-overview')
    return response.data.data || response.data
  },

  // Получить статистику рабочих логов
  getWorkLogsStats: async (params = {}) => {
    const { startDate, endDate, userId } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    if (userId) queryParams.append('userId', userId)

    const response = await apiClient.get(`/analytics/work-logs-stats?${queryParams.toString()}`)
    return response.data.data || response.data
  },

  // Получить статистику команды
  getTeamStats: async (teamId, params = {}) => {
    const { startDate, endDate } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const response = await apiClient.get(`/teams/${teamId}/stats?${queryParams.toString()}`)
    return response.data.data || response.data
  },

  // Получить статистику напоминаний
  getRemindersStats: async () => {
    const response = await apiClient.get('/reminders/stats')
    return response.data.data || response.data
  },

  // === ВРЕМЕННО ОТКЛЮЧЕНО: НОВЫЕ МЕТОДЫ ДЛЯ BI MINI-PLATFORM ===

  // Получить данные для тепловой карты активности
  getActivityHeatmap: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: []
    }
  },

  // Получить продвинутые рейтинги
  getAdvancedRankings: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: {}
    }
  },

  // Получить распределение режимов работы
  getWorkModeDistribution: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: {}
    }
  },

  // Получить детальную аналитику по опозданиям
  getPunctualityAnalytics: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: []
    }
  },

  // Получить аналитику переработок
  getOvertimeAnalytics: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: []
    }
  },

  // Получить аналитику по отсутствиям
  getAbsenceAnalytics: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: []
    }
  },

  // Получить тренды по различным метрикам
  getMetricsTrends: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: []
    }
  },

  // Получить сравнительную аналитику команд
  getTeamsComparison: async (params = {}) => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: []
    }
  },

  // Сгенерировать и экспортировать отчёт
  generateReport: async (reportConfig) => {
    // Временная заглушка
    throw new Error('Генерация отчётов временно недоступна')
  },

  // Получить список доступных отчётов
  getReportTemplates: async () => {
    // Временная заглушка
    return {
      success: false,
      error: 'Функция временно недоступна',
      data: []
    }
  },

  // Сохранить шаблон отчёта
  saveReportTemplate: async (template) => {
    const response = await apiClient.post('/analytics/report-templates', template)
    return response.data.data || response.data
  },

  // Получить кастомную аналитику по SQL запросу (для админов)
  getCustomAnalytics: async (query, params = {}) => {
    const response = await apiClient.post('/analytics/custom', {
      query,
      params
    })
    return response.data.data || response.data
  },

  // Получить статистику производительности системы
  getSystemPerformance: async (params = {}) => {
    const { startDate, endDate } = params
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const response = await apiClient.get(`/analytics/system-performance?${queryParams.toString()}`)
    return response.data.data || response.data
  }
} 