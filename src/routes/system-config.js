const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { SystemConfig, User } = require('../models');
const { auditLogger } = require('../utils/auditLogger');

// Middleware для проверки прав администратора
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
};

// Получить все настройки (группированные по категориям)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category } = req.query;

    let whereClause = {};
    if (category) {
      whereClause.category = category;
    }

    const configs = await SystemConfig.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'updater',
        attributes: ['id', 'name', 'username'],
        required: false
      }],
      order: [['category', 'ASC'], ['title', 'ASC']]
    });

    // Группируем по категориям
    const groupedConfigs = {};
    configs.forEach(config => {
      if (!groupedConfigs[config.category]) {
        groupedConfigs[config.category] = [];
      }

      let value = config.value;
      try {
        // Парсим значение в зависимости от типа
        switch (config.type) {
          case 'boolean':
            value = config.value === 'true' || config.value === true;
            break;
          case 'number':
            value = parseFloat(config.value);
            break;
          case 'json':
            value = config.value ? JSON.parse(config.value) : null;
            break;
          default:
            value = config.value;
        }
      } catch (error) {
        console.error('Ошибка парсинга значения:', config.key, error);
      }

      groupedConfigs[config.category].push({
        key: config.key,
        value,
        type: config.type,
        title: config.title,
        description: config.description,
        isEditable: config.isEditable,
        isSystem: config.isSystem,
        validation: config.validation ? JSON.parse(config.validation) : null,
        defaultValue: config.defaultValue,
        updatedAt: config.updatedAt,
        updater: config.updater
      });
    });

    res.json({
      success: true,
      data: groupedConfigs
    });
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить настройки конкретной категории
router.get('/category/:category', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const configs = await SystemConfig.getByCategory(category);

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Ошибка получения настроек категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить конкретную настройку
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    
    // Менеджеры могут получать только некритичные настройки
    if (req.user.role !== 'admin') {
      const config = await SystemConfig.findByPk(key);
      if (!config || config.isSystem) {
        return res.status(403).json({ error: 'Недостаточно прав для просмотра этой настройки' });
      }
    }

    const value = await SystemConfig.getValue(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }

    res.json({
      success: true,
      data: { key, value }
    });
  } catch (error) {
    console.error('Ошибка получения настройки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить настройку
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Значение обязательно' });
    }

    // Получаем настройку для валидации
    const config = await SystemConfig.findByPk(key);
    if (!config) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }

    if (!config.isEditable) {
      return res.status(403).json({ error: 'Настройка не может быть изменена' });
    }

    // Валидация значения
    if (config.validation) {
      const validation = JSON.parse(config.validation);
      const validationError = validateValue(value, config.type, validation);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
    }

    // Сохраняем старое значение для аудита
    const oldValue = await SystemConfig.getValue(key);

    // Обновляем настройку
    await SystemConfig.setValue(key, value, req.user.id);

    // Логируем изменение
    await auditLogger({
      action: 'system_config_update',
      userId: req.user.id,
      details: {
        key,
        oldValue,
        newValue: value,
        category: config.category
      },
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Настройка обновлена успешно',
      data: { key, value }
    });
  } catch (error) {
    console.error('Ошибка обновления настройки:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
});

// Массовое обновление настроек
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates должен быть массивом' });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { key, value } = update;
        
        if (!key || value === undefined) {
          errors.push({ key, error: 'Ключ и значение обязательны' });
          continue;
        }

        const config = await SystemConfig.findByPk(key);
        if (!config) {
          errors.push({ key, error: 'Настройка не найдена' });
          continue;
        }

        if (!config.isEditable) {
          errors.push({ key, error: 'Настройка не может быть изменена' });
          continue;
        }

        // Валидация
        if (config.validation) {
          const validation = JSON.parse(config.validation);
          const validationError = validateValue(value, config.type, validation);
          if (validationError) {
            errors.push({ key, error: validationError });
            continue;
          }
        }

        const oldValue = await SystemConfig.getValue(key);
        await SystemConfig.setValue(key, value, req.user.id);

        results.push({ key, success: true, oldValue, newValue: value });

        // Аудит для каждого изменения
        await auditLogger({
          action: 'system_config_update',
          userId: req.user.id,
          details: {
            key,
            oldValue,
            newValue: value,
            category: config.category,
            bulkUpdate: true
          },
          adminId: req.user.id
        });
      } catch (error) {
        errors.push({ key: update.key, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      data: {
        updated: results,
        errors: errors
      },
      message: `Обновлено ${results.length} настроек, ошибок: ${errors.length}`
    });
  } catch (error) {
    console.error('Ошибка массового обновления настроек:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сброс настройки к значению по умолчанию
router.post('/:key/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;

    const config = await SystemConfig.findByPk(key);
    if (!config) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }

    if (!config.isEditable) {
      return res.status(403).json({ error: 'Настройка не может быть изменена' });
    }

    if (!config.defaultValue) {
      return res.status(400).json({ error: 'Для настройки не задано значение по умолчанию' });
    }

    const oldValue = await SystemConfig.getValue(key);
    await SystemConfig.setValue(key, config.defaultValue, req.user.id);

    await auditLogger({
      action: 'system_config_reset',
      userId: req.user.id,
      details: {
        key,
        oldValue,
        resetToDefault: config.defaultValue
      },
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Настройка сброшена к значению по умолчанию',
      data: { key, value: config.defaultValue }
    });
  } catch (error) {
    console.error('Ошибка сброса настройки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить список категорий
router.get('/meta/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categories = await SystemConfig.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(c => c.category);

    // Добавляем описания категорий
    const categoryDescriptions = {
      'work_schedule': {
        name: 'Рабочее расписание',
        description: 'Настройки рабочего времени и графика',
        icon: 'Clock'
      },
      'notifications': {
        name: 'Уведомления',
        description: 'Настройки системы уведомлений',
        icon: 'Bell'
      },
      'message_templates': {
        name: 'Шаблоны сообщений',
        description: 'Редактируемые шаблоны уведомлений',
        icon: 'MessageSquare'
      },
      'system': {
        name: 'Системные',
        description: 'Основные системные параметры',
        icon: 'Settings'
      },
      'access_control': {
        name: 'Контроль доступа',
        description: 'Управление правами пользователей',
        icon: 'Shield'
      },
      'integrations': {
        name: 'Интеграции',
        description: 'Настройки внешних сервисов',
        icon: 'Link'
      },
      'analytics': {
        name: 'Аналитика',
        description: 'Настройки отчётов и аналитики',
        icon: 'BarChart'
      }
    };

    const result = categoryList.map(category => ({
      key: category,
      ...categoryDescriptions[category] || {
        name: category,
        description: 'Прочие настройки',
        icon: 'Settings'
      }
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить конфигурацию для frontend
router.get('/frontend-config', async (req, res) => {
  try {
    const ConfigService = require('../services/ConfigService');
    const config = await ConfigService.getFrontendConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Ошибка получения frontend конфигурации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Валидация значений
function validateValue(value, type, validation) {
  if (!validation) return null;

  switch (type) {
    case 'number':
      const num = parseFloat(value);
      if (isNaN(num)) return 'Значение должно быть числом';
      if (validation.min !== undefined && num < validation.min) {
        return `Значение должно быть не менее ${validation.min}`;
      }
      if (validation.max !== undefined && num > validation.max) {
        return `Значение должно быть не более ${validation.max}`;
      }
      break;

    case 'string':
    case 'time':
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return 'Значение не соответствует требуемому формату';
        }
      }
      if (validation.minLength && value.length < validation.minLength) {
        return `Минимальная длина: ${validation.minLength} символов`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `Максимальная длина: ${validation.maxLength} символов`;
      }
      break;

    case 'json':
      try {
        JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
      } catch (error) {
        return 'Некорректный JSON формат';
      }
      break;
  }

  return null;
}

module.exports = router; 