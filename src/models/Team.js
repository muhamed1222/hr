"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { LIMITS } = require("../constants");

const Team = sequelize.define(
  "Team",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(LIMITS.MAX_SEARCH_LENGTH),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "manager_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        reminders_enabled: true,
        work_hours: {
          start: "09:00",
          end: "18:00",
          lunch_duration: 60,
        },
        timezone: "Europe/Moscow",
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
  },
  {
    tableName: "teams",
    timestamps: true,
    underscored: true,
  },
);

Team.associate = function (models) {
  // Team - Manager
  Team.belongsTo(models.User, {
    foreignKey: "managerId",
    as: "manager",
  });

  // User - Team (многие ко многим через UserTeam)
  Team.belongsToMany(models.User, {
    through: models.UserTeam,
    foreignKey: "teamId",
    otherKey: "userId",
    as: "members",
  });
};

module.exports = Team; 