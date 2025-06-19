const sequelize = require('../config/database');
const User = require('./User');
const WorkLog = require('./WorkLog');
const Team = require('./Team');
const UserTeam = require('./UserTeam');
const AuditLog = require('./AuditLog');
const Absence = require('./Absence');

// Определение ассоциаций

// User - WorkLog
User.hasMany(WorkLog, {
  foreignKey: 'userId',
  as: 'workLogs'
});

WorkLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User - Team (многие ко многим через UserTeam)
User.belongsToMany(Team, {
  through: UserTeam,
  foreignKey: 'userId',
  otherKey: 'teamId',
  as: 'teams'
});

Team.belongsToMany(User, {
  through: UserTeam,
  foreignKey: 'teamId',
  otherKey: 'userId',
  as: 'members'
});

// Team - Manager
Team.belongsTo(User, {
  foreignKey: 'managerId',
  as: 'manager'
});

User.hasMany(Team, {
  foreignKey: 'managerId',
  as: 'managedTeams'
});

// UserTeam associations
UserTeam.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

UserTeam.belongsTo(Team, {
  foreignKey: 'teamId',
  as: 'team'
});

// AuditLog associations
AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

AuditLog.belongsTo(User, {
  foreignKey: 'adminId',
  as: 'admin'
});

User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs'
});

User.hasMany(AuditLog, {
  foreignKey: 'adminId',
  as: 'adminActions'
});

// Absence associations
Absence.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Absence.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

User.hasMany(Absence, {
  foreignKey: 'userId',
  as: 'absences'
});

User.hasMany(Absence, {
  foreignKey: 'approvedBy',
  as: 'approvedAbsences'
});

module.exports = {
  sequelize,
  User,
  WorkLog,
  Team,
  UserTeam,
  AuditLog,
  Absence
}; 