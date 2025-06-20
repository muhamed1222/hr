import { apiClient } from './client';

export const systemConfigApi = {
  // Получить все настройки
  getAllConfigs: async () => {
    const response = await apiClient.get('/api/system-config');
    return response.data.data;
  },

  // Получить настройки конкретной категории
  getCategoryConfigs: async (category) => {
    const response = await apiClient.get(`/api/system-config/category/${category}`);
    return response.data.data;
  },

  // Получить конкретную настройку
  getConfig: async (key) => {
    const response = await apiClient.get(`/api/system-config/${key}`);
    return response.data.data;
  },

  // Обновить настройку
  updateConfig: async (key, value) => {
    const response = await apiClient.put(`/api/system-config/${key}`, { value });
    return response.data;
  },

  // Массовое обновление настроек
  bulkUpdate: async (updates) => {
    const response = await apiClient.put('/api/system-config', { updates });
    return response.data.data;
  },

  // Сбросить настройку к значению по умолчанию
  resetToDefault: async (key) => {
    const response = await apiClient.post(`/api/system-config/${key}/reset`);
    return response.data;
  },

  // Получить список категорий
  getCategories: async () => {
    const response = await apiClient.get('/api/system-config/meta/categories');
    return response.data.data;
  },

  // Получить конфигурацию для frontend
  getFrontendConfig: async () => {
    try {
      const response = await apiClient.get('/api/system-config/frontend-config');
      return response.data.data;
    } catch (error) {
      console.warn('Не удалось загрузить frontend конфигурацию:', error);
      // Возвращаем базовую конфигурацию
      return {
        workSchedule: {
          startTime: '09:00',
          endTime: '18:00',
          lateThreshold: 15
        },
        notifications: {
          enabled: true,
          reminderEnabled: true
        },
        system: {
          dateFormat: 'DD.MM.YYYY',
          timeFormat: 'HH:mm',
          timezone: 'Europe/Moscow'
        },
        features: {
          telegramEnabled: true,
          deepLinksEnabled: true,
          analyticsEnabled: true
        }
      };
    }
  }
};

// Хук для использования в React компонентах
export const useSystemConfig = () => {
  const [config, setConfig] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemConfigApi.getFrontendConfig();
      setConfig(data);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка загрузки конфигурации:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key, value) => {
    try {
      await systemConfigApi.updateConfig(key, value);
      await loadConfig(); // Перезагружаем конфигурацию
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    config,
    loading,
    error,
    reload: loadConfig,
    updateConfig
  };
}; 