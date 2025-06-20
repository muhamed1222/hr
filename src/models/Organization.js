const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Название организации'
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'URL-friendly идентификатор'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Описание организации'
    },
    // Настройки брендинга
    settings: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      comment: 'JSON с настройками брендинга и конфигурации'
    },
    // Контактная информация
    contactInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON с контактной информацией'
    },
    // Telegram настройки
    telegramBotToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Токен Telegram бота организации'
    },
    telegramSettings: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      comment: 'JSON с настройками Telegram интеграции'
    },
    // Статус и ограничения
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Активна ли организация'
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Максимальное количество пользователей'
    },
    subscriptionType: {
      type: DataTypes.ENUM('free', 'basic', 'premium', 'enterprise'),
      allowNull: false,
      defaultValue: 'free',
      comment: 'Тип подписки'
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Дата окончания подписки'
    },
    // Технические поля
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Europe/Moscow',
      comment: 'Часовой пояс организации'
    },
    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ru',
      comment: 'Язык интерфейса'
    },
    // Владелец организации
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID владельца организации'
    }
  }, {
    tableName: 'organizations',
    timestamps: true,
    indexes: [
      {
        fields: ['slug'],
        unique: true
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['subscriptionType']
      },
      {
        fields: ['ownerId']
      }
    ],
    comment: 'Организации для мультитенантности'
  });

  Organization.associate = function(models) {
    // Организация имеет много пользователей
    Organization.hasMany(models.User, {
      foreignKey: 'organizationId',
      as: 'users'
    });

    // Организация имеет много команд
    Organization.hasMany(models.Team, {
      foreignKey: 'organizationId',
      as: 'teams'
    });

    // Владелец организации
    Organization.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
      constraints: false
    });

    // Организация имеет системные настройки
    Organization.hasMany(models.SystemConfig, {
      foreignKey: 'organizationId',
      as: 'configs'
    });
  };

  // Методы для работы с настройками
  Organization.prototype.getSettings = function() {
    try {
      return JSON.parse(this.settings || '{}');
    } catch (error) {
      return {};
    }
  };

  Organization.prototype.updateSettings = async function(newSettings) {
    const currentSettings = this.getSettings();
    const mergedSettings = { ...currentSettings, ...newSettings };
    
    await this.update({
      settings: JSON.stringify(mergedSettings)
    });
    
    return mergedSettings;
  };

  Organization.prototype.getTelegramSettings = function() {
    try {
      return JSON.parse(this.telegramSettings || '{}');
    } catch (error) {
      return {};
    }
  };

  Organization.prototype.getContactInfo = function() {
    try {
      return JSON.parse(this.contactInfo || '{}');
    } catch (error) {
      return {};
    }
  };

  // Проверка лимитов
  Organization.prototype.canAddUser = async function() {
    if (!this.maxUsers) return true;
    
    const userCount = await this.countUsers();
    return userCount < this.maxUsers;
  };

  Organization.prototype.isSubscriptionActive = function() {
    if (!this.subscriptionExpiresAt) return true;
    return new Date() < this.subscriptionExpiresAt;
  };

  // Получение брендинга
  Organization.prototype.getBranding = function() {
    const settings = this.getSettings();
    return {
      logo: settings.logo || '/default-logo.png',
      primaryColor: settings.primaryColor || '#3B82F6',
      secondaryColor: settings.secondaryColor || '#1F2937',
      companyName: this.name,
      favicon: settings.favicon || '/favicon.ico'
    };
  };

  return Organization;
}; 