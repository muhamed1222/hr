const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { User, WorkLog, Team, UserTeam, Absence } = require('../models');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Middleware для проверки прав
const requireManagerOrAdmin = (req, res, next) => {
  if (!['manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  next();
};

// Получить данные для тепловой карты активности
router.get('/activity-heatmap', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, teamId, userId } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const userWhere = {};
    if (userId) userWhere.id = userId;
    if (teamId) {
      const teamUsers = await UserTeam.findAll({
        where: { teamId },
        attributes: ['userId']
      });
      userWhere.id = { [Op.in]: teamUsers.map(ut => ut.userId) };
    }

    const workLogs = await WorkLog.findAll({
      where: whereClause,
      include: [{
        model: User,
        where: userWhere,
        attributes: ['id', 'name', 'username']
      }],
      attributes: ['startTime', 'endTime', 'date', 'userId']
    });

    // Группируем данные по дням недели и часам
    const heatmapData = [];
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    workLogs.forEach(log => {
      if (log.startTime) {
        const date = new Date(log.date);
        const dayIndex = (date.getDay() + 6) % 7; // Конвертируем в 0=Пн, 6=Вс
        const day = days[dayIndex];
        
        const startHour = parseInt(log.startTime.split(':')[0]);
        const endHour = log.endTime ? parseInt(log.endTime.split(':')[0]) : startHour + 8;
        
        // Добавляем активность для каждого часа работы
        for (let hour = startHour; hour <= Math.min(endHour, 23); hour++) {
          heatmapData.push({
            day,
            hour,
            activity: 1,
            date: log.date,
            userId: log.userId
          });
        }
      }
    });

    // Агрегируем данные
    const aggregated = {};
    heatmapData.forEach(item => {
      const key = `${item.day}-${item.hour}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...item, activity: 0 };
      }
      aggregated[key].activity += 1;
    });

    res.json({
      success: true,
      data: Object.values(aggregated)
    });
  } catch (error) {
    console.error('Ошибка при получении данных тепловой карты:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить продвинутые рейтинги
router.get('/advanced-rankings', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Запрос для надёжности
    const reliabilityData = await WorkLog.findAll({
      where: dateFilter,
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }],
      attributes: [
        'userId',
        [Sequelize.fn('COUNT', Sequelize.col('WorkLog.id')), 'totalDays'],
        [Sequelize.fn('SUM', 
          Sequelize.literal("CASE WHEN start_time <= '09:00' THEN 1 ELSE 0 END")
        ), 'onTimeDays'],
        [Sequelize.fn('AVG', 
          Sequelize.literal("CASE WHEN end_time IS NOT NULL THEN CAST(REPLACE(work_hours, 'ч', '') AS DECIMAL) ELSE 0 END")
        ), 'avgHours']
      ],
      group: ['userId', 'User.id', 'User.name', 'User.username'],
      having: Sequelize.literal('COUNT(WorkLog.id) > 0')
    });

    // Запрос для пунктуальности (опоздания)
    const punctualityData = await WorkLog.findAll({
      where: {
        ...dateFilter,
        startTime: { [Op.gt]: '09:00' }
      },
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }],
      attributes: [
        'userId',
        [Sequelize.fn('COUNT', Sequelize.col('WorkLog.id')), 'lateCount']
      ],
      group: ['userId', 'User.id', 'User.name', 'User.username']
    });

    // Запрос для переработок
    const overtimeData = await WorkLog.findAll({
      where: dateFilter,
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }],
      attributes: [
        'userId',
        [Sequelize.fn('SUM', 
          Sequelize.literal("CASE WHEN CAST(REPLACE(work_hours, 'ч', '') AS DECIMAL) > 8 THEN CAST(REPLACE(work_hours, 'ч', '') AS DECIMAL) - 8 ELSE 0 END")
        ), 'overtimeHours']
      ],
      group: ['userId', 'User.id', 'User.name', 'User.username']
    });

    // Формируем результат
    const rankings = {
      reliability: reliabilityData.map(item => ({
        user: item.User,
        score: Math.round((item.dataValues.onTimeDays / item.dataValues.totalDays) * 100),
        details: {
          totalDays: item.dataValues.totalDays,
          onTimeDays: item.dataValues.onTimeDays,
          avgHours: parseFloat(item.dataValues.avgHours || 0)
        }
      })).sort((a, b) => b.score - a.score).slice(0, limit),

      punctuality: punctualityData.map(item => ({
        user: item.User,
        score: parseInt(item.dataValues.lateCount || 0),
        details: {
          lateCount: item.dataValues.lateCount
        }
      })).sort((a, b) => a.score - b.score).slice(0, limit),

      overtime: overtimeData.map(item => ({
        user: item.User,
        score: Math.round(parseFloat(item.dataValues.overtimeHours || 0)),
        details: {
          overtimeHours: item.dataValues.overtimeHours
        }
      })).sort((a, b) => b.score - a.score).slice(0, limit),

      consistency: reliabilityData.map(item => ({
        user: item.User,
        score: Math.round((item.dataValues.avgHours / 8) * 100),
        details: {
          avgHours: parseFloat(item.dataValues.avgHours || 0)
        }
      })).sort((a, b) => b.score - a.score).slice(0, limit)
    };

    res.json({
      success: true,
      data: rankings
    });
  } catch (error) {
    console.error('Ошибка при получении продвинутых рейтингов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить распределение режимов работы
router.get('/work-mode-distribution', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, teamId } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const userWhere = {};
    if (teamId) {
      const teamUsers = await UserTeam.findAll({
        where: { teamId },
        attributes: ['userId']
      });
      userWhere.id = { [Op.in]: teamUsers.map(ut => ut.userId) };
    }

    // Общее распределение
    const overviewData = await WorkLog.findAll({
      where: whereClause,
      include: [{
        model: User,
        where: userWhere,
        attributes: []
      }],
      attributes: [
        'workMode',
        [Sequelize.fn('COUNT', Sequelize.col('WorkLog.id')), 'count']
      ],
      group: ['workMode']
    });

    const overview = {};
    overviewData.forEach(item => {
      overview[item.workMode || 'office'] = parseInt(item.dataValues.count);
    });

    // По командам
    const teams = await Team.findAll({
      attributes: ['id', 'name']
    });

    const teamsData = [];
    for (const team of teams) {
      const teamUsers = await UserTeam.findAll({
        where: { teamId: team.id },
        attributes: ['userId']
      });

      if (teamUsers.length > 0) {
        const teamWorkLogs = await WorkLog.findAll({
          where: {
            ...whereClause,
            userId: { [Op.in]: teamUsers.map(ut => ut.userId) }
          },
          attributes: [
            'workMode',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
          ],
          group: ['workMode']
        });

        const modes = { office: 0, remote: 0, hybrid: 0 };
        teamWorkLogs.forEach(item => {
          modes[item.workMode || 'office'] = parseInt(item.dataValues.count);
        });

        teamsData.push({
          id: team.id,
          name: team.name,
          modes
        });
      }
    }

    // Тренды (по неделям за последний месяц)
    const trends = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));

      const weekData = await WorkLog.findAll({
        where: {
          date: {
            [Op.between]: [weekStart, weekEnd]
          }
        },
        include: [{
          model: User,
          where: userWhere,
          attributes: []
        }],
        attributes: [
          'workMode',
          [Sequelize.fn('COUNT', Sequelize.col('WorkLog.id')), 'count']
        ],
        group: ['workMode']
      });

      const total = weekData.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0);
      const office = weekData.find(item => item.workMode === 'office')?.dataValues.count || 0;
      const remote = weekData.find(item => item.workMode === 'remote')?.dataValues.count || 0;

      trends.push({
        date: weekStart.toLocaleDateString('ru-RU'),
        office: total > 0 ? Math.round((office / total) * 100) : 0,
        remote: total > 0 ? Math.round((remote / total) * 100) : 0
      });
    }

    res.json({
      success: true,
      data: {
        overview,
        teams: teamsData,
        trends,
        trendsChange: {
          office: trends.length > 1 ? trends[trends.length - 1].office - trends[trends.length - 2].office : 0,
          remote: trends.length > 1 ? trends[trends.length - 1].remote - trends[trends.length - 2].remote : 0
        }
      }
    });
  } catch (error) {
    console.error('Ошибка при получении распределения режимов работы:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Генерировать отчёт (базовая версия)
router.post('/generate-report', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { title, dateRange, metrics, format, includeCharts, groupBy } = req.body;

    // Получаем данные в зависимости от выбранных метрик
    const reportData = {};

    if (metrics.reliability) {
      reportData.reliability = await getReliabilityData(dateRange);
    }

    if (metrics.punctuality) {
      reportData.punctuality = await getPunctualityData(dateRange);
    }

    if (metrics.workModes) {
      reportData.workModes = await getWorkModeData(dateRange);
    }

    // Для простоты пока возвращаем JSON
    res.json({
      success: true,
      data: {
        title,
        dateRange,
        metrics,
        format,
        reportData,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Ошибка при генерации отчёта:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Вспомогательные функции
async function getReliabilityData(dateRange) {
  const reliabilityData = await WorkLog.findAll({
    where: {
      date: {
        [Op.between]: [new Date(dateRange.startDate), new Date(dateRange.endDate)]
      }
    },
    include: [{
      model: User,
      attributes: ['id', 'name', 'username']
    }],
    attributes: [
      'userId',
      [Sequelize.fn('COUNT', Sequelize.col('WorkLog.id')), 'totalDays'],
      [Sequelize.fn('SUM', 
        Sequelize.literal("CASE WHEN start_time <= '09:00' THEN 1 ELSE 0 END")
      ), 'onTimeDays']
    ],
    group: ['userId', 'User.id', 'User.name', 'User.username'],
    having: Sequelize.literal('COUNT(WorkLog.id) > 0')
  });

  return reliabilityData.map(item => ({
    user: item.User,
    score: Math.round((item.dataValues.onTimeDays / item.dataValues.totalDays) * 100),
    details: {
      totalDays: item.dataValues.totalDays,
      onTimeDays: item.dataValues.onTimeDays
    }
  })).sort((a, b) => b.score - a.score);
}

async function getPunctualityData(dateRange) {
  const punctualityData = await WorkLog.findAll({
    where: {
      date: {
        [Op.between]: [new Date(dateRange.startDate), new Date(dateRange.endDate)]
      },
      startTime: { [Op.gt]: '09:00' }
    },
    include: [{
      model: User,
      attributes: ['id', 'name', 'username']
    }],
    attributes: [
      'userId',
      [Sequelize.fn('COUNT', Sequelize.col('WorkLog.id')), 'lateCount']
    ],
    group: ['userId', 'User.id', 'User.name', 'User.username']
  });

  return punctualityData.map(item => ({
    user: item.User,
    score: parseInt(item.dataValues.lateCount || 0)
  })).sort((a, b) => a.score - b.score);
}

async function getWorkModeData(dateRange) {
  const workModeData = await WorkLog.findAll({
    where: {
      date: {
        [Op.between]: [new Date(dateRange.startDate), new Date(dateRange.endDate)]
      }
    },
    attributes: [
      'workMode',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    group: ['workMode']
  });

  const result = {};
  workModeData.forEach(item => {
    result[item.workMode || 'office'] = parseInt(item.dataValues.count);
  });

  return result;
}

module.exports = router; 