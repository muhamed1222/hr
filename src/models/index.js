console.log('🔧 Загрузка моделей...');

const sequelize = require('../config/database');
console.log('📊 Sequelize инициализирован');

const User = require('./User');
const WorkLog = require('./WorkLog');
const Team = require('./Team');
const UserTeam = require('./UserTeam');
const AuditLog = require('./AuditLog');
const Absence = require('./Absence');
const SystemConfigFactory = require('./SystemConfig');
const OrganizationFactory = require('./Organization');

console.log('📋 Модели загружены');

// Инициализация моделей (некоторые экспортируются как функции)
const models = {
  User,
  WorkLog,
  Team,
  UserTeam,
  AuditLog,
  Absence,
  SystemConfig: SystemConfigFactory(sequelize),
  Organization: OrganizationFactory(sequelize)
};

console.log('🏗️ Модели инициализированы');

// Определение ассоциаций через associate методы
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

console.log('🔗 Ассоциации установлены');

module.exports = {
  sequelize,
  User: models.User,
  WorkLog: models.WorkLog,
  Team: models.Team,
  UserTeam: models.UserTeam,
  AuditLog: models.AuditLog,
  Absence: models.Absence,
  SystemConfig: models.SystemConfig,
  Organization: models.Organization
}; 