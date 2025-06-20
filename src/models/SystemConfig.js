const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemConfig = sequelize.define('SystemConfig', {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
      comment: 'Уникальный ключ настройки'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Значение настройки (JSON для сложных объектов)'
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'time', 'date'),
      allowNull: false,
      defaultValue: 'string',
      comment: 'Тип данных значения'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'general',
      comment: 'Категория настройки для группировки в UI'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Человекочитаемое название настройки'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Описание настройки для администраторов'
    },
    isEditable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Можно ли редактировать через UI'
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Системная настройка (требует особой осторожности)'
    },
    validation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON с правилами валидации'
    },
    defaultValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Значение по умолчанию'
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID пользователя, который последний раз обновлял настройку'
    }
  }, {
    tableName: 'system_config',
    timestamps: true,
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['isEditable']
      },
      {
        fields: ['isSystem']
      }
    ],
    comment: 'Централизованные настройки системы'
  });

  SystemConfig.associate = function(models) {
    SystemConfig.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
      constraints: false
    });
  };

  // Методы для работы с настройками
  SystemConfig.getValue = async function(key, defaultValue = null) {
    try {
      const config = await this.findByPk(key);
      if (!config || config.value === null) {
        return defaultValue;
      }

      switch (config.type) {
        case 'boolean':
          return config.value === 'true' || config.value === true;
        case 'number':
          return parseFloat(config.value);
        case 'json':
          return JSON.parse(config.value);
        case 'string':
        case 'time':
        case 'date':
        default:
          return config.value;
      }
    } catch (error) {
      console.error('Ошибка получения настройки:', key, error);
      return defaultValue;
    }
  };

  SystemConfig.setValue = async function(key, value, userId = null) {
    try {
      const config = await this.findByPk(key);
      if (!config) {
        throw new Error(`Настройка ${key} не найдена`);
      }

      if (!config.isEditable) {
        throw new Error(`Настройка ${key} не может быть изменена`);
      }

      let processedValue = value;
      if (config.type === 'json' && typeof value === 'object') {
        processedValue = JSON.stringify(value);
      } else if (config.type === 'boolean') {
        processedValue = value ? 'true' : 'false';
      } else {
        processedValue = String(value);
      }

      await config.update({
        value: processedValue,
        updatedBy: userId
      });

      return config;
    } catch (error) {
      console.error('Ошибка установки настройки:', key, error);
      throw error;
    }
  };

  SystemConfig.getByCategory = async function(category) {
    try {
      const configs = await this.findAll({
        where: { category },
        order: [['title', 'ASC']]
      });
      
      const result = {};
      for (const config of configs) {
        const value = await this.getValue(config.key);
        result[config.key] = {
          value,
          title: config.title,
          description: config.description,
          type: config.type,
          isEditable: config.isEditable,
          isSystem: config.isSystem,
          validation: config.validation ? JSON.parse(config.validation) : null
        };
      }
      
      return result;
    } catch (error) {
      console.error('Ошибка получения настроек категории:', category, error);
      throw error;
    }
  };

  return SystemConfig;
}; 