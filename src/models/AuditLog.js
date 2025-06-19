const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'admin_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING(50),
    allowNull: false // users, teams, work_logs, reports
  },
  resourceId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'resource_id'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  oldValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'old_values'
  },
  newValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'new_values'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'audit_logs',
  timestamps: false, // только createdAt
  underscored: true
});

module.exports = AuditLog; 