import { apiClient } from './client';

export const organizationApi = {
  // Получить текущую организацию
  getCurrent: async () => {
    const response = await apiClient.get('/api/organizations/current');
    return response.data.data;
  },

  // Получить все организации (только для супер админа)
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const response = await apiClient.get(`/api/organizations?${searchParams}`);
    return response.data.data;
  },

  // Создать организацию
  create: async (organizationData) => {
    const response = await apiClient.post('/api/organizations', organizationData);
    return response.data.data;
  },

  // Обновить организацию
  update: async (orgId, updates) => {
    const response = await apiClient.put(`/api/organizations/${orgId}`, updates);
    return response.data.data;
  },

  // Загрузить шаблон для импорта
  downloadImportTemplate: async (orgId, format = 'xlsx') => {
    const response = await apiClient.get(`/api/organizations/${orgId}/import-template?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Валидировать файл импорта
  validateImport: async (orgId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/api/organizations/${orgId}/validate-import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data;
  },

  // Импортировать пользователей
  importUsers: async (orgId, file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });

    const response = await apiClient.post(`/api/organizations/${orgId}/import-users`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data;
  },

  // Получить статистику организации
  getStats: async (orgId, period = '30d') => {
    const response = await apiClient.get(`/api/organizations/${orgId}/stats?period=${period}`);
    return response.data.data;
  },

  // Обновить настройки брендинга
  updateBranding: async (orgId, brandingSettings) => {
    const response = await apiClient.put(`/api/organizations/${orgId}`, {
      settings: brandingSettings
    });
    return response.data.data;
  },

  // Обновить Telegram настройки
  updateTelegramSettings: async (orgId, telegramSettings) => {
    const response = await apiClient.put(`/api/organizations/${orgId}`, {
      telegramBotToken: telegramSettings.botToken,
      telegramSettings: telegramSettings
    });
    return response.data.data;
  }
};

export const monitoringApi = {
  // Health check
  getHealth: async (detailed = false) => {
    const endpoint = detailed ? '/api/monitoring/health/detailed' : '/api/monitoring/health';
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  // Системные метрики
  getMetrics: async () => {
    const response = await apiClient.get('/api/monitoring/metrics');
    return response.data.data;
  },

  // Создать backup
  createBackup: async (organizationId = null) => {
    const response = await apiClient.post('/api/monitoring/backup', {
      organizationId
    });
    return response.data.data;
  },

  // Получить логи
  getLogs: async (level = 'all', limit = 100) => {
    const response = await apiClient.get(`/api/monitoring/logs?level=${level}&limit=${limit}`);
    return response.data.data;
  },

  // Получить алерты
  getAlerts: async () => {
    const response = await apiClient.get('/api/monitoring/alerts');
    return response.data.data;
  },

  // Системная информация
  getSystemInfo: async () => {
    const response = await apiClient.get('/api/monitoring/system-info');
    return response.data.data;
  }
}; 