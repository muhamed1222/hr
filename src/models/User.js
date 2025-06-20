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

User.associate = function(models) {
  // User - Organization
  User.belongsTo(models.Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
  });

  // User - WorkLog
  User.hasMany(models.WorkLog, {
    foreignKey: 'userId',
    as: 'workLogs'
  });

  // User - Team (многие ко многим через UserTeam)
  User.belongsToMany(models.Team, {
    through: models.UserTeam,
    foreignKey: 'userId',
    otherKey: 'teamId',
    as: 'teams'
  });

  // Team - Manager
  User.hasMany(models.Team, {
    foreignKey: 'managerId',
    as: 'managedTeams'
  });

  // AuditLog associations
  User.hasMany(models.AuditLog, {
    foreignKey: 'userId',
    as: 'auditLogs'
  });

  User.hasMany(models.AuditLog, {
    foreignKey: 'adminId',
    as: 'adminActions'
  });

  // Absence associations
  User.hasMany(models.Absence, {
    foreignKey: 'userId',
    as: 'absences'
  });

  User.hasMany(models.Absence, {
    foreignKey: 'approvedBy',
    as: 'approvedAbsences'
  });
};

module.exports = User; 