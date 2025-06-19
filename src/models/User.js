const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  telegramId: {
    type: DataTypes.BIGINT,
    allowNull: true, // Сделаем необязательным для обычных пользователей
    unique: true,
    field: 'telegram_id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('employee', 'manager', 'admin'),
    defaultValue: 'employee'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
  vacationDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 28,
    field: 'vacation_days'
  },
  temporaryPassword: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'temporary_password'
  },
  telegramTempId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'telegram_temp_id'
  },
  telegramUsername: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'telegram_username'
  },
  telegramFirstName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'telegram_first_name'
  },
  telegramLastName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'telegram_last_name'
  },
  createdViaTelegram: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'created_via_telegram'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User; 