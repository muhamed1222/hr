"use strict";

const { DataTypes } = require("sequelize");
const _sequelize = require("../config/database");

const UserTeam = sequelize.define(
  "UserTeam",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "team_id",
      references: {
        model: "teams",
        key: "id",
      },
    },
    role: {
      type: DataTypes.ENUM("member", "lead", "observer"),
      defaultValue: "member",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "pending"),
      defaultValue: "active",
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "joined_at",
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "left_at",
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
    tableName: "user_teams",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "team_id"],
        where: {
          status: "active",
        },
      },
    ],
  },
);

module.exports = UserTeam;
