const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const { User, Absence, Team, UserTeam, WorkLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const checkAbsencePermissions = require('../middleware/absencePermissions');

const router = express.Router();

// Применяем аутентификацию ко всем маршрутам
router.use(authenticateToken);

/**
 * GET /api/schedule/month - Получить календарь на месяц
 */
router.get('/month', checkAbsencePermissions.canViewSchedule, async (req, res) => {
  try {
    const { teamId, month = moment().format('YYYY-MM'), userId } = req.query;
    const user = req.user;

    // Парсим месяц
    const targetMonth = moment(month, 'YYYY-MM');
    if (!targetMonth.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный формат месяца (YYYY-MM)'
      });
    }

    const startDate = targetMonth.clone().startOf('month').format('YYYY-MM-DD');
    const endDate = targetMonth.clone().endOf('month').format('YYYY-MM-DD');

    // Определяем пользователей для отображения
    let targetUsers = [];
    
    if (userId) {
      // Конкретный пользователь
      const targetUser = await User.findByPk(userId, {
        attributes: ['id', 'name', 'username', 'role']
      });
      if (targetUser) {
        targetUsers = [targetUser];
      }
    } else if (teamId) {
      // Команда
      const team = await Team.findByPk(teamId, {
        include: [{
          model: User,
          as: 'members',
          attributes: ['id', 'name', 'username', 'role'],
          through: { 
            where: { status: 'active' },
            attributes: [] 
          }
        }]
      });
      
      if (team) {
        targetUsers = team.members;
      }
    } else if (user.role === 'admin') {
      // Админ видит всех
      targetUsers = await User.findAll({
        where: { status: 'active' },
        attributes: ['id', 'name', 'username', 'role']
      });
    } else if (user.role === 'manager') {
      // Менеджер видит свои команды
      const managedTeams = await Team.findAll({
        where: { managerId: user.id },
        include: [{
          model: User,
          as: 'members',
          attributes: ['id', 'name', 'username', 'role'],
          through: { 
            where: { status: 'active' },
            attributes: [] 
          }
        }]
      });
      
      targetUsers = managedTeams.flatMap(team => team.members);
      // Убираем дубликаты
      targetUsers = targetUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
    } else {
      // Обычный сотрудник видит только себя
      targetUsers = [user];
    }

    if (targetUsers.length === 0) {
      return res.json({
        success: true,
        data: {
          month: month,
          users: [],
          calendar: {}
        }
      });
    }

    const userIds = targetUsers.map(u => u.id);

    // Получаем отсутствия за месяц
    const absences = await Absence.findAll({
      where: {
        userId: { [Op.in]: userIds },
        status: 'approved',
        [Op.or]: [
          {
            startDate: { [Op.between]: [startDate, endDate] }
          },
          {
            endDate: { [Op.between]: [startDate, endDate] }
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username']
      }]
    });

    // Получаем рабочие логи за месяц
    const workLogs = await WorkLog.findAll({
      where: {
        userId: { [Op.in]: userIds },
        workDate: { [Op.between]: [startDate, endDate] }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username']
      }]
    });

    // Формируем календарь
    const calendar = {};
    const daysInMonth = targetMonth.daysInMonth();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = targetMonth.clone().date(day).format('YYYY-MM-DD');
      const dayOfWeek = targetMonth.clone().date(day).day();
      
      calendar[currentDate] = {
        date: currentDate,
        dayOfWeek: dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        users: {}
      };

      // Заполняем данные по пользователям
      targetUsers.forEach(user => {
        calendar[currentDate].users[user.id] = {
          user: {
            id: user.id,
            name: user.name,
            username: user.username
          },
          status: 'not_worked',
          absence: null,
          workLog: null
        };

        // Проверяем отсутствие
        const userAbsence = absences.find(abs => 
          abs.userId === user.id && 
          currentDate >= abs.startDate && 
          currentDate <= abs.endDate
        );

        if (userAbsence) {
          calendar[currentDate].users[user.id].status = userAbsence.type;
          calendar[currentDate].users[user.id].absence = {
            id: userAbsence.id,
            type: userAbsence.type,
            reason: userAbsence.reason
          };
        } else {
          // Проверяем рабочий лог
          const userWorkLog = workLogs.find(log => 
            log.userId === user.id && log.workDate === currentDate
          );

          if (userWorkLog) {
            calendar[currentDate].users[user.id].workLog = {
              id: userWorkLog.id,
              arrivedAt: userWorkLog.arrivedAt,
              leftAt: userWorkLog.leftAt,
              workMode: userWorkLog.workMode,
              totalMinutes: userWorkLog.totalMinutes
            };

            if (userWorkLog.workMode === 'absent') {
              calendar[currentDate].users[user.id].status = 'absent';
            } else if (userWorkLog.arrivedAt && userWorkLog.leftAt) {
              calendar[currentDate].users[user.id].status = 'worked';
            } else if (userWorkLog.arrivedAt) {
              calendar[currentDate].users[user.id].status = 'working';
            } else {
              calendar[currentDate].users[user.id].status = 'not_worked';
            }
          } else if (calendar[currentDate].isWeekend) {
            calendar[currentDate].users[user.id].status = 'weekend';
          }
        }
      });
    }

    // Статистика за месяц
    const statistics = calculateMonthStatistics(targetUsers, absences, workLogs, targetMonth);

    res.json({
      success: true,
      data: {
        month: month,
        startDate: startDate,
        endDate: endDate,
        users: targetUsers,
        calendar: calendar,
        statistics: statistics
      }
    });

  } catch (error) {
    console.error('Ошибка получения календаря:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения календаря'
    });
  }
});

/**
 * GET /api/schedule/user/:id - Получить расписание конкретного пользователя
 */
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const currentUser = req.user;

    // Проверка доступа
    if (currentUser.role === 'employee' && parseInt(id) !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }

    const targetUser = await User.findByPk(id, {
      attributes: ['id', 'name', 'username', 'role', 'vacationDays']
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверка для менеджера
    if (currentUser.role === 'manager') {
      const userTeams = await UserTeam.findAll({
        where: { userId: id },
        include: [{
          model: Team,
          as: 'team',
          where: { managerId: currentUser.id }
        }]
      });
      
      if (userTeams.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }
    }

    const start = startDate || moment().startOf('month').format('YYYY-MM-DD');
    const end = endDate || moment().endOf('month').format('YYYY-MM-DD');

    // Получаем отсутствия
    const absences = await Absence.findAll({
      where: {
        userId: id,
        [Op.or]: [
          {
            startDate: { [Op.between]: [start, end] }
          },
          {
            endDate: { [Op.between]: [start, end] }
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: start } },
              { endDate: { [Op.gte]: end } }
            ]
          }
        ]
      },
      include: [{
        model: User,
        as: 'approver',
        attributes: ['id', 'name', 'username'],
        required: false
      }],
      order: [['startDate', 'ASC']]
    });

    // Получаем рабочие логи
    const workLogs = await WorkLog.findAll({
      where: {
        userId: id,
        workDate: { [Op.between]: [start, end] }
      },
      order: [['workDate', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        user: targetUser,
        period: { startDate: start, endDate: end },
        absences: absences,
        workLogs: workLogs,
        statistics: calculateUserStatistics(absences, workLogs, start, end)
      }
    });

  } catch (error) {
    console.error('Ошибка получения расписания пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения расписания'
    });
  }
});

/**
 * GET /api/schedule/upcoming - Получить ближайшие отсутствия
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { teamId, days = 30 } = req.query;
    const user = req.user;

    const startDate = moment().format('YYYY-MM-DD');
    const endDate = moment().add(parseInt(days), 'days').format('YYYY-MM-DD');

    let whereClause = {
      status: 'approved',
      startDate: { [Op.between]: [startDate, endDate] }
    };

    let includeClause = [{
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'username', 'role']
    }];

    // Фильтрация по ролям
    if (user.role === 'employee') {
      whereClause.userId = user.id;
    } else if (user.role === 'manager') {
      if (teamId) {
        // Конкретная команда
        const team = await Team.findByPk(teamId);
        if (!team || team.managerId !== user.id) {
          return res.status(403).json({
            success: false,
            message: 'Нет доступа к данной команде'
          });
        }
        
        includeClause[0].include = [{
          model: Team,
          as: 'teams',
          where: { id: teamId },
          through: { attributes: [] }
        }];
      } else {
        // Все команды менеджера
        includeClause[0].include = [{
          model: Team,
          as: 'teams',
          where: { managerId: user.id },
          through: { attributes: [] }
        }];
      }
    }
    // Админы видят все (без дополнительных фильтров)

    const upcomingAbsences = await Absence.findAll({
      where: whereClause,
      include: includeClause,
      order: [['startDate', 'ASC']],
      limit: 50
    });

    res.json({
      success: true,
      data: upcomingAbsences
    });

  } catch (error) {
    console.error('Ошибка получения ближайших отсутствий:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения данных'
    });
  }
});

/**
 * Вспомогательные функции
 */

function calculateMonthStatistics(users, absences, workLogs, targetMonth) {
  const stats = {
    totalUsers: users.length,
    totalAbsences: absences.length,
    absencesByType: {
      vacation: 0,
      sick: 0,
      business_trip: 0,
      day_off: 0
    },
    workingDays: 0,
    weekends: 0,
    totalWorkingMinutes: 0
  };

  // Подсчет рабочих дней и выходных
  const daysInMonth = targetMonth.daysInMonth();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = targetMonth.clone().date(day).day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      stats.weekends++;
    } else {
      stats.workingDays++;
    }
  }

  // Подсчет отсутствий по типам
  absences.forEach(absence => {
    if (stats.absencesByType[absence.type] !== undefined) {
      stats.absencesByType[absence.type]++;
    }
  });

  // Подсчет рабочих минут
  stats.totalWorkingMinutes = workLogs.reduce((total, log) => {
    return total + (log.totalMinutes || 0);
  }, 0);

  return stats;
}

function calculateUserStatistics(absences, workLogs, startDate, endDate) {
  const stats = {
    totalAbsences: absences.length,
    totalAbsenceDays: 0,
    absencesByType: {
      vacation: 0,
      sick: 0,
      business_trip: 0,
      day_off: 0
    },
    totalWorkingMinutes: 0,
    averageWorkingHours: 0,
    workingDays: 0
  };

  // Подсчет дней отсутствия
  absences.forEach(absence => {
    if (absence.status === 'approved') {
      stats.totalAbsenceDays += absence.daysCount;
      if (stats.absencesByType[absence.type] !== undefined) {
        stats.absencesByType[absence.type] += absence.daysCount;
      }
    }
  });

  // Подсчет рабочих минут
  workLogs.forEach(log => {
    if (log.totalMinutes > 0) {
      stats.totalWorkingMinutes += log.totalMinutes;
      stats.workingDays++;
    }
  });

  // Средние часы в день
  if (stats.workingDays > 0) {
    stats.averageWorkingHours = Math.round((stats.totalWorkingMinutes / stats.workingDays / 60) * 100) / 100;
  }

  return stats;
}

module.exports = router; 