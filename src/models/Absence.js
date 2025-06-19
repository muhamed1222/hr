const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Absence = sequelize.define('Absence', {
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
  type: {
    type: DataTypes.ENUM('vacation', 'sick', 'business_trip', 'day_off'),
    allowNull: false,
    defaultValue: 'vacation'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  daysCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'days_count',
    defaultValue: 1
  }
}, {
  tableName: 'absences',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: (absence) => {
      // Автоматически рассчитываем количество дней
      const start = new Date(absence.startDate);
      const end = new Date(absence.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      absence.daysCount = diffDays;
    },
    beforeUpdate: (absence) => {
      // Пересчитываем дни при обновлении дат
      if (absence.changed('startDate') || absence.changed('endDate')) {
        const start = new Date(absence.startDate);
        const end = new Date(absence.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        absence.daysCount = diffDays;
      }
    }
  }
});

module.exports = Absence; 