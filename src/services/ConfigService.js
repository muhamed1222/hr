const { SystemConfig } = require('../models');

class ConfigService {
  static cache = new Map();
  static cacheTimeout = 5 * 60 * 1000; // 5 минут

  // Получить значение настройки с кэшированием
  static async get(key, defaultValue = null) {
    try {
      // Проверяем кэш
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.value;
      }

      // Получаем из БД
      const value = await SystemConfig.getValue(key, defaultValue);
      
      // Сохраняем в кэш
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });

      return value;
    } catch (error) {
      console.error('ConfigService.get error:', key, error);
      return defaultValue;
    }
  }

  // Установить значение настройки
  static async set(key, value, userId = null) {
    try {
      await SystemConfig.setValue(key, value, userId);
      
      // Очищаем кэш для этого ключа
      this.cache.delete(key);
      
      return true;
    } catch (error) {
      console.error('ConfigService.set error:', key, error);
      throw error;
    }
  }

  // Очистить весь кэш
  static clearCache() {
    this.cache.clear();
  }

  // Очистить кэш для конкретного ключа
  static clearKey(key) {
    this.cache.delete(key);
  }

  // === СПЕЦИФИЧНЫЕ МЕТОДЫ ДЛЯ ЧАСТО ИСПОЛЬЗУЕМЫХ НАСТРОЕК ===

  // Рабочее время
  static async getWorkSchedule() {
    return {
      startTime: await this.get('work.start_time', '09:00'),
      endTime: await this.get('work.end_time', '18:00'),
      lunchStart: await this.get('work.lunch_start', '13:00'),
      lunchEnd: await this.get('work.lunch_end', '14:00'),
      lateThreshold: await this.get('work.late_threshold', 15)
    };
  }

  // Настройки уведомлений
  static async getNotificationSettings() {
    return {
      enabled: await this.get('notifications.enabled', true),
      reminderEnabled: await this.get('notifications.reminder_enabled', true),
      reminderTime: await this.get('notifications.reminder_time', '17:30'),
      lateWarningEnabled: await this.get('notifications.late_warning_enabled', true),
      absenceApprovalEnabled: await this.get('notifications.absence_approval_enabled', true)
    };
  }

  // Шаблоны сообщений
  static async getMessageTemplate(templateKey) {
    const templates = {
      reminder: await this.get('templates.reminder_message'),
      lateWarning: await this.get('templates.late_warning'),
      absenceCreated: await this.get('templates.absence_created'),
      absenceApproved: await this.get('templates.absence_approved'),
      absenceRejected: await this.get('templates.absence_rejected')
    };

    return templates[templateKey] || null;
  }

  // Форматирование шаблона с данными
  static formatTemplate(template, data) {
    if (!template) return '';

    let formatted = template;
    
    // Заменяем плейсхолдеры
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      formatted = formatted.replace(new RegExp(placeholder, 'g'), data[key] || '');
    });

    return formatted;
  }

  // Настройки системы
  static async getSystemSettings() {
    return {
      timezone: await this.get('system.timezone', 'Europe/Moscow'),
      dateFormat: await this.get('system.date_format', 'DD.MM.YYYY'),
      timeFormat: await this.get('system.time_format', 'HH:mm'),
      weekStart: await this.get('system.week_start', 1),
      maxUploadSize: await this.get('system.max_upload_size', 10)
    };
  }

  // Права доступа
  static async getAccessSettings() {
    return {
      allowSelfEdit: await this.get('access.allow_self_edit', true),
      editDeadlineHours: await this.get('access.edit_deadline_hours', 24),
      managerOverride: await this.get('access.manager_override', true),
      adminFullAccess: await this.get('access.admin_full_access', true)
    };
  }

  // Интеграции
  static async getIntegrationSettings() {
    return {
      telegramEnabled: await this.get('telegram.bot_enabled', true),
      deepLinksEnabled: await this.get('telegram.deep_links_enabled', true),
      emailEnabled: await this.get('email.enabled', false),
      slackEnabled: await this.get('slack.enabled', false)
    };
  }

  // Аналитика
  static async getAnalyticsSettings() {
    return {
      retentionDays: await this.get('analytics.retention_days', 365),
      autoGenerate: await this.get('reports.auto_generate', true),
      sendToManagers: await this.get('reports.send_to_managers', true),
      cacheDuration: await this.get('performance.cache_duration', 300)
    };
  }

  // Проверить включен ли модуль
  static async isModuleEnabled(module) {
    const moduleSettings = {
      notifications: 'notifications.enabled',
      telegram: 'telegram.bot_enabled',
      email: 'email.enabled',
      slack: 'slack.enabled',
      reminders: 'notifications.reminder_enabled',
      analytics: 'reports.auto_generate'
    };

    const settingKey = moduleSettings[module];
    if (!settingKey) {
      return false;
    }

    return await this.get(settingKey, false);
  }

  // Получить настройки с валидацией времени
  static async getValidatedTimeSettings() {
    const schedule = await this.getWorkSchedule();
    
    // Валидация времени
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    return {
      startTime: timeRegex.test(schedule.startTime) ? schedule.startTime : '09:00',
      endTime: timeRegex.test(schedule.endTime) ? schedule.endTime : '18:00',
      lunchStart: timeRegex.test(schedule.lunchStart) ? schedule.lunchStart : '13:00',
      lunchEnd: timeRegex.test(schedule.lunchEnd) ? schedule.lunchEnd : '14:00',
      lateThreshold: Math.max(0, Math.min(120, schedule.lateThreshold))
    };
  }

  // Получить все настройки категории
  static async getCategorySettings(category) {
    try {
      return await SystemConfig.getByCategory(category);
    } catch (error) {
      console.error('ConfigService.getCategorySettings error:', category, error);
      return {};
    }
  }

  // Получить статистику использования кэша
  static getCacheStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp < this.cacheTimeout) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      cacheTimeout: this.cacheTimeout
    };
  }

  // Инициализация критических настроек при старте приложения
  static async initialize() {
    try {
      // // console.log('Инициализация ConfigService...');
      
      // Предзагружаем критические настройки
      const criticalSettings = [
        'notifications.enabled',
        'telegram.bot_enabled',
        'work.start_time',
        'work.end_time',
        'work.late_threshold'
      ];

      for (const setting of criticalSettings) {
        await this.get(setting);
      }

      // // console.log('ConfigService инициализирован с', this.cache.size, 'настройками');
    } catch (error) {
      console.error('Ошибка инициализации ConfigService:', error);
    }
  }

  // Получить конфигурацию для frontend
  static async getFrontendConfig() {
    return {
      workSchedule: await this.getValidatedTimeSettings(),
      notifications: {
        enabled: await this.get('notifications.enabled', true),
        reminderEnabled: await this.get('notifications.reminder_enabled', true)
      },
      system: {
        dateFormat: await this.get('system.date_format', 'DD.MM.YYYY'),
        timeFormat: await this.get('system.time_format', 'HH:mm'),
        timezone: await this.get('system.timezone', 'Europe/Moscow')
      },
      features: {
        telegramEnabled: await this.get('telegram.bot_enabled', true),
        deepLinksEnabled: await this.get('telegram.deep_links_enabled', true),
        analyticsEnabled: await this.get('reports.auto_generate', true)
      }
    };
  }
}

module.exports = ConfigService; 