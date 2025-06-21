"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");
const { LIMITS } = require("../constants");
const { DataTypes } = require("sequelize");
const _sequelize = require("../config/database");

const AuditLog = _sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "admin_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    action: {
      type: DataTypes.STRING(LIMITS.MAX_TEAM_MEMBERS),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(LIMITS.MAX_TEAM_MEMBERS),
      allowNull: false,
      field: "entity_type",
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "entity_id",
    },
    oldValues: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "old_values",
    },
    newValues: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "new_values",
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "user_agent",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    tableName: "audit_logs",
    timestamps: false, // только createdAt
    underscored: true,
  },
);

module.exports = AuditLog; 