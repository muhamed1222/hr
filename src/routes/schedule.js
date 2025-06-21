"use strict";

const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../utils/logger");

const express = require("express");
const { Op } = require("sequelize");
const moment = require("moment");
const { User, Team, UserTeam, WorkLog } = require("../models");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Применяем аутентификацию ко всем маршрутам
router.use(authenticateToken);

/**
 * GET /api/schedule/month - Получить календарь на месяц
 */
router.get("/month", async (req, res) => {
  try {
    const { teamId, month = moment().format("YYYY-MM"), userId } = req.query;
    const user = req.user;

    // Парсим месяц
    const targetMonth = moment(month, "YYYY-MM");
    if (!targetMonth.isValid()) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Некорректный формат месяца (YYYY-MM)",
      });
    }

    const startDate = targetMonth.clone().startOf("month").format("YYYY-MM-DD");
    const endDate = targetMonth.clone().endOf("month").format("YYYY-MM-DD");

    // Определяем пользователей для отображения
    let targetUsers = [];

    if (userId) {
      // Конкретный пользователь
      const targetUser = await User.findByPk(userId, {
        attributes: ["id", "name", "username", "role"],
      });
      if (targetUser) {
        targetUsers = [targetUser];
      }
    } else if (teamId) {
      // Команда
      const team = await Team.findByPk(teamId, {
        include: [
          {
            model: User,
            as: "members",
            attributes: ["id", "name", "username", "role"],
            through: {
              where: { status: "active" },
              attributes: [],
            },
          },
        ],
      });

      if (team) {
        targetUsers = team.members;
      }
    } else if (user.role === "admin") {
      // Админ видит всех
      targetUsers = await User.findAll({
        where: { status: "active" },
        attributes: ["id", "name", "username", "role"],
      });
    } else if (user.role === "manager") {
      // Менеджер видит свои команды
      const managedTeams = await Team.findAll({
        where: { managerId: user.id },
        include: [
          {
            model: User,
            as: "members",
            attributes: ["id", "name", "username", "role"],
            through: {
              where: { status: "active" },
              attributes: [],
            },
          },
        ],
      });

      targetUsers = managedTeams.flatMap((team) => team.members);
      // Убираем дубликаты
      targetUsers = targetUsers.filter(
        (user, index, self) =>
          index === self.findIndex((u) => u.id === user.id),
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
          calendar: {},
        },
      });
    }

    const userIds = targetUsers.map((u) => u.id);

    // Получаем рабочие логи за месяц
    const workLogs = await WorkLog.findAll({
      where: {
        userId: { [Op.in]: userIds },
        workDate: { [Op.between]: [startDate, endDate] },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username"],
        },
      ],
    });

    // Формируем календарь
    const calendar = {};
    const daysInMonth = targetMonth.daysInMonth();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = targetMonth.clone().date(day).format("YYYY-MM-DD");
      const dayOfWeek = targetMonth.clone().date(day).day();

      calendar[currentDate] = {
        date: currentDate,
        dayOfWeek: dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        users: {},
      };

      // Заполняем данные по пользователям
      targetUsers.forEach((user) => {
        calendar[currentDate].users[user.id] = {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
          },
          status: "not_worked",
          absence: null,
          workLog: null,
        };

        // Проверяем рабочий лог
        const userWorkLog = workLogs.find(
          (log) => log.userId === user.id && log.workDate === currentDate,
        );

        if (userWorkLog) {
          calendar[currentDate].users[user.id].workLog = {
            id: userWorkLog.id,
            arrivedAt: userWorkLog.arrivedAt,
            leftAt: userWorkLog.leftAt,
            workMode: userWorkLog.workMode,
            totalMinutes: userWorkLog.totalMinutes,
          };

          if (
            userWorkLog.workMode === "sick" ||
            userWorkLog.workMode === "vacation"
          ) {
            calendar[currentDate].users[user.id].status = userWorkLog.workMode;
          } else if (userWorkLog.arrivedAt && userWorkLog.leftAt) {
            calendar[currentDate].users[user.id].status = "worked";
          } else if (userWorkLog.arrivedAt) {
            calendar[currentDate].users[user.id].status = "working";
          } else {
            calendar[currentDate].users[user.id].status = "not_worked";
          }
        } else if (calendar[currentDate].isWeekend) {
          calendar[currentDate].users[user.id].status = "weekend";
        }
      });
    }

    // Статистика за месяц
    const statistics = calculateMonthStatistics(
      targetUsers,
      workLogs,
      targetMonth,
    );

    res.json({
      success: true,
      data: {
        month: month,
        startDate: startDate,
        endDate: endDate,
        users: targetUsers,
        calendar: calendar,
        statistics: statistics,
      },
    });
  } catch (error) {
    _error("Ошибка получения календаря:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения календаря",
    });
  }
});

/**
 * GET /api/schedule/user/:id - Получить расписание конкретного пользователя
 */
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const currentUser = req.user;

    // Проверка доступа
    if (currentUser.role === "employee" && parseInt(id) !== currentUser.id) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: "Доступ запрещен",
      });
    }

    const targetUser = await User.findByPk(id, {
      attributes: ["id", "name", "username", "role", "vacationDays"],
    });

    if (!targetUser) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Проверка для менеджера
    if (currentUser.role === "manager") {
      const userTeams = await UserTeam.findAll({
        where: { userId: id },
        include: [
          {
            model: Team,
            as: "team",
            where: { managerId: currentUser.id },
          },
        ],
      });

      if (userTeams.length === 0) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: "Доступ запрещен",
        });
      }
    }

    const start = startDate || moment().startOf("month").format("YYYY-MM-DD");
    const end = endDate || moment().endOf("month").format("YYYY-MM-DD");

    // Получаем рабочие логи
    const workLogs = await WorkLog.findAll({
      where: {
        userId: id,
        workDate: { [Op.between]: [start, end] },
      },
      order: [["workDate", "ASC"]],
    });

    res.json({
      success: true,
      data: {
        user: targetUser,
        period: { startDate: start, endDate: end },
        workLogs: workLogs,
        statistics: calculateUserStatistics(workLogs, start, end),
      },
    });
  } catch (error) {
    _error("Ошибка получения расписания пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения расписания",
    });
  }
});

/**
 * GET /api/schedule/upcoming - Получить ближайшие отсутствия
 */
router.get("/upcoming", async (req, res) => {
  try {
    const { teamId, days = 30 } = req.query;
    const user = req.user;

    const startDate = moment().format("YYYY-MM-DD");
    const endDate = moment().add(parseInt(days), "days").format("YYYY-MM-DD");

    const whereClause = {
      workDate: { [Op.between]: [startDate, endDate] },
    };

    const includeClause = [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "username", "role"],
      },
    ];

    // Фильтрация по ролям
    if (user.role === "employee") {
      whereClause.userId = user.id;
    } else if (user.role === "manager") {
      if (teamId) {
        // Конкретная команда
        const team = await Team.findByPk(teamId);
        if (!team || team.managerId !== user.id) {
          return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
            success: false,
            message: "Нет доступа к данной команде",
          });
        }

        includeClause[0].include = [
          {
            model: Team,
            as: "teams",
            where: { id: teamId },
            through: { attributes: [] },
          },
        ];
      } else {
        // Все команды менеджера
        includeClause[0].include = [
          {
            model: Team,
            as: "teams",
            where: { managerId: user.id },
            through: { attributes: [] },
          },
        ];
      }
    }
    // Админы видят все (без дополнительных фильтров)

    const upcomingWorkLogs = await WorkLog.findAll({
      where: whereClause,
      include: includeClause,
      order: [["workDate", "ASC"]],
      limit: LIMITS.DEFAULT_PAGE_SIZE,
    });

    res.json({
      success: true,
      data: upcomingWorkLogs,
    });
  } catch (error) {
    _error("Ошибка получения ближайших отсутствий:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения данных",
    });
  }
});

/**
 * Вспомогательные функции
 */

function calculateMonthStatistics(users, workLogs, targetMonth) {
  const monthStats = {
    totalUsers: users.length,
    totalWorkDays: 0,
    totalWorkedHours: 0,
    averageHoursPerDay: 0,
    remoteDays: 0,
    officeDays: 0,
    sickDays: 0,
    vacationDays: 0,
    userStats: {},
  };

  const startDate = targetMonth.clone().startOf("month");
  const endDate = targetMonth.clone().endOf("month");

  // Подсчет рабочих дней в месяце (без выходных)
  const _workDaysInMonth = 0;
  for (let _m = startDate.clone(); m.isSameOrBefore(endDate); m.add(1, "days")) {
    if (m.day() !== 0 && m.day() !== 6) {
      workDaysInMonth++;
    }
  }
  monthStats.totalWorkDays = workDaysInMonth * users.length;

  users.forEach((user) => {
    const userWorkLogs = workLogs.filter((log) => log.userId === user.id);

    const workedDays = userWorkLogs.filter(
      (log) => log.workMode === "office" || log.workMode === "remote",
    ).length;
    const remote = userWorkLogs.filter(
      (log) => log.workMode === "remote",
    ).length;
    const office = userWorkLogs.filter(
      (log) => log.workMode === "office",
    ).length;
    const sick = userWorkLogs.filter((log) => log.workMode === "sick").length;
    const vacation = userWorkLogs.filter(
      (log) => log.workMode === "vacation",
    ).length;
    const totalHours =
      userWorkLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0) / 60;

    monthStats.remoteDays += remote;
    monthStats.officeDays += office;
    monthStats.sickDays += sick;
    monthStats.vacationDays += vacation;
    monthStats.totalWorkedHours += totalHours;

    monthStats.userStats[user.id] = {
      userId: user.id,
      name: user.name,
      workedDays,
      expectedWorkDays: workDaysInMonth,
      remoteDays: remote,
      officeDays: office,
      sickDays: sick,
      vacationDays: vacation,
      totalHours: parseFloat(totalHours.toFixed(2)),
      completeness:
        workDaysInMonth > 0
          ? Math.round((workedDays / workDaysInMonth) * LIMITS.MAX_PAGE_SIZE)
          : 0,
    };
  });

  if (monthStats.totalWorkDays > 0) {
    const totalWorkedDaysAllUsers = Object.values(monthStats.userStats).reduce(
      (sum, stat) => sum + stat.workedDays,
      0,
    );
    monthStats.averageHoursPerDay =
      totalWorkedDaysAllUsers > 0
        ? parseFloat(
            (monthStats.totalWorkedHours / totalWorkedDaysAllUsers).toFixed(2),
          )
        : 0;
  }

  return monthStats;
}

function calculateUserStatistics(workLogs, startDate, endDate) {
  const start = moment(startDate);
  const end = moment(endDate);
  const _totalWorkDays = 0;

  for (let _m = start.clone(); m.isSameOrBefore(end); m.add(1, "days")) {
    if (m.day() !== 0 && m.day() !== 6) {
      totalWorkDays++;
    }
  }

  const workedDays = workLogs.filter(
    (log) => log.workMode === "office" || log.workMode === "remote",
  ).length;
  const remoteDays = workLogs.filter((log) => log.workMode === "remote").length;
  const officeDays = workLogs.filter((log) => log.workMode === "office").length;
  const sickDays = workLogs.filter((log) => log.workMode === "sick").length;
  const vacationDays = workLogs.filter(
    (log) => log.workMode === "vacation",
  ).length;

  const totalMinutes = workLogs.reduce(
    (sum, log) => sum + (log.totalMinutes || 0),
    0,
  );
  const totalHours = totalMinutes / 60;

  return {
    workedDays,
    remoteDays,
    officeDays,
    sickDays,
    vacationDays,
    totalWorkDays,
    totalHours: parseFloat(totalHours.toFixed(2)),
    completeness:
      totalWorkDays > 0
        ? Math.round((workedDays / totalWorkDays) * LIMITS.MAX_PAGE_SIZE)
        : 0,
  };
}

module.exports = router;
