const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkLog = sequelize.define('WorkLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  workDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'work_date'
  },
  arrivedAt: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'arrived_at'
  },
  leftAt: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'left_at'
  },
  lunchStart: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'lunch_start'
  },
  lunchEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'lunch_end'
  },
  workMode: {
    type: DataTypes.ENUM('office', 'remote', 'sick', 'vacation'),
    defaultValue: 'office',
    field: 'work_mode'
  },
  dailyReport: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'daily_report'
  },
  problems: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_minutes'
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
  }
}, {
  tableName: 'work_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'work_date']
    }
  ]
});

module.exports = WorkLog; 