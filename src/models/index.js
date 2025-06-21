"use strict";

const { Sequelize } = require("sequelize");
const { logger } = require("../utils/logger");

// Конфигурация базы данных
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "database.sqlite",
  logging: process.env.NODE_ENV === "development" ? logger.info : false,
});

// Загрузка определений моделей
const UserDefinition = require("./User");
const TeamDefinition = require("./Team");
const UserTeamDefinition = require("./UserTeam");
const WorkLogDefinition = require("./WorkLog");
const AuditLogDefinition = require("./AuditLog");

// Создание моделей Sequelize
const User = sequelize.define("User", UserDefinition.definition, {
  tableName: "users",
  timestamps: true,
  underscored: true,
});

const Team = sequelize.define("Team", TeamDefinition.definition, {
  tableName: "teams",
  timestamps: true,
  underscored: true,
});

const UserTeam = sequelize.define("UserTeam", UserTeamDefinition.definition, {
  tableName: "user_teams",
  timestamps: true,
  underscored: true,
});

const WorkLog = sequelize.define("WorkLog", WorkLogDefinition.definition, {
  tableName: "work_logs",
  timestamps: true,
  underscored: true,
});

const AuditLog = sequelize.define("AuditLog", AuditLogDefinition.definition, {
  tableName: "audit_logs",
  timestamps: true,
  underscored: true,
});

// Установка ассоциаций
User.belongsToMany(Team, { through: UserTeam, as: "teams" });
Team.belongsToMany(User, { through: UserTeam, as: "members" });
User.hasMany(WorkLog, { foreignKey: "userId", as: "workLogs" });
WorkLog.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(AuditLog, { foreignKey: "userId" });
AuditLog.belongsTo(User, { foreignKey: "userId" });

// Ассоциация для команд, которыми управляет пользователь
User.hasMany(Team, { foreignKey: "managerId", as: "managedTeams" });
Team.belongsTo(User, { foreignKey: "managerId", as: "manager" });

// Добавление методов к моделям
if (UserDefinition.instanceMethods) {
  Object.assign(User.prototype, UserDefinition.instanceMethods);
}

if (UserDefinition.classMethods) {
  Object.assign(User, UserDefinition.classMethods);
}

module.exports = {
  sequelize,
  User,
  Team,
  UserTeam,
  WorkLog,
  AuditLog,
};
