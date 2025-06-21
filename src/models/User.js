"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const { DataTypes } = require("sequelize");
const _sequelize = require("../config/database");

// Константы для ограничений
const MAX_NAME_LENGTH = LIMITS.MAX_SEARCH_LENGTH;
const MAX_USERNAME_LENGTH = LIMITS.MAX_SEARCH_LENGTH;
const MAX_EMAIL_LENGTH = LIMITS.MAX_SEARCH_LENGTH;
const _MAX_ROLE_LENGTH = LIMITS.MAX_SEARCH_LENGTH;
const _MAX_STATUS_LENGTH = LIMITS.MAX_SEARCH_LENGTH;

const User = {
  definition: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    telegramId: {
      type: DataTypes.BIGINT,
      allowNull: true, // Сделаем необязательным для обычных пользователей
      unique: true,
      field: "telegram_id",
    },
    name: {
      type: DataTypes.STRING(MAX_NAME_LENGTH),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, MAX_NAME_LENGTH],
      },
    },
    username: {
      type: DataTypes.STRING(MAX_USERNAME_LENGTH),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, MAX_USERNAME_LENGTH],
      },
    },
    email: {
      type: DataTypes.STRING(MAX_EMAIL_LENGTH),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(MAX_NAME_LENGTH),
      allowNull: true,
      field: "password_hash",
    },
    role: {
      type: DataTypes.ENUM("employee", "manager", "admin"),
      defaultValue: "employee",
      allowNull: false,
      validate: {
        isIn: [["employee", "manager", "admin"]],
      },
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      defaultValue: "active",
      allowNull: false,
      validate: {
        isIn: [["active", "inactive", "suspended"]],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
    vacationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 28,
      field: "vacation_days",
    },
    temporaryPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "temporary_password",
    },
    telegramTempId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "telegram_temp_id",
    },
    telegramUsername: {
      type: DataTypes.STRING(MAX_NAME_LENGTH),
      allowNull: true,
      field: "telegram_username",
    },
    telegramFirstName: {
      type: DataTypes.STRING(MAX_NAME_LENGTH),
      allowNull: true,
      field: "telegram_first_name",
    },
    telegramLastName: {
      type: DataTypes.STRING(MAX_NAME_LENGTH),
      allowNull: true,
      field: "telegram_last_name",
    },
    createdViaTelegram: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "created_via_telegram",
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login",
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
  },

  // Методы экземпляра
  instanceMethods: {
    // Проверка прав доступа
    hasPermission(permission) {
      const permissions = {
        admin: ["all"],
        manager: ["read_users", "edit_team", "view_reports"],
        employee: ["read_self", "edit_self"],
      };

      return (
        permissions[this.role]?.includes(permission) ||
        permissions[this.role]?.includes("all")
      );
    },

    // Проверка активности
    isActive() {
      return this.status === "active";
    },

    // Обновление времени последнего входа
    updateLastLogin() {
      this.lastLogin = new Date();
      return this.save();
    },
  },

  // Методы класса
  classMethods: {
    // Поиск по Telegram ID
    async findByTelegramId(telegramId) {
      return this.findOne({ where: { telegramId } });
    },

    // Поиск активных пользователей
    async findActive() {
      return this.findAll({ where: { status: "active" } });
    },

    // Поиск по роли
    async findByRole(role) {
      return this.findAll({ where: { role } });
    },
  },
};

User.associate = function (models) {
  // User - WorkLog
  User.hasMany(models.WorkLog, {
    foreignKey: "userId",
    as: "workLogs",
  });

  // User - Team (многие ко многим через UserTeam)
  User.belongsToMany(models.Team, {
    through: models.UserTeam,
    foreignKey: "userId",
    otherKey: "teamId",
    as: "teams",
  });

  // Team - Manager
  User.hasMany(models.Team, {
    foreignKey: "managerId",
    as: "managedTeams",
  });

  // AuditLog associations
  User.hasMany(models.AuditLog, {
    foreignKey: "userId",
    as: "auditLogs",
  });

  User.hasMany(models.AuditLog, {
    foreignKey: "adminId",
    as: "adminActions",
  });
};

module.exports = User;
