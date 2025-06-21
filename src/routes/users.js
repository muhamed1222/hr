"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _express = require("express");
const { User, WorkLog } = require("../models");
const { Op } = require("sequelize");

const router = express.Router();

// Получить всех пользователей
router.get("/", async (req, res) => {
  try {
    const {
      role,
      status,
      search,
      page = 1,
      limit = LIMITS.DEFAULT_PAGE_SIZE,
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (role) {
      whereClause.role = role;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows: users, count } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "telegramId",
        "name",
        "username",
        "role",
        "status",
        "createdAt",
      ],
      order: [["name", "ASC"]],
      limit: parseInt(limit),
      offset: offset,
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    _error("Ошибка получения пользователей:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения данных пользователей",
    });
  }
});

// Получить конкретного пользователя
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: [
        "id",
        "telegramId",
        "name",
        "username",
        "role",
        "status",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    _error("Ошибка получения пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения данных пользователя",
    });
  }
});

// Обновить пользователя
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, role, status } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (username !== undefined) updates.username = username;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    await user.update(updates);

    res.json({
      success: true,
      data: user,
      message: "Пользователь обновлён",
    });
  } catch (error) {
    _error("Ошибка обновления пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка обновления пользователя",
    });
  }
});

// Получить статистику пользователя
router.get("/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const whereClause = { userId: id };

    if (startDate && endDate) {
      whereClause.workDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const workLogs = await WorkLog.findAll({
      where: whereClause,
      order: [["workDate", "DESC"]],
    });

    // Вычисляем статистику
    const stats = {
      totalDays: workLogs.length,
      totalWorkMinutes: workLogs.reduce(
        (sum, log) => sum + (log.totalMinutes || 0),
        0,
      ),
      averageWorkHours: 0,
      workModeStats: {
        office: workLogs.filter((log) => log.workMode === "office").length,
        remote: workLogs.filter((log) => log.workMode === "remote").length,
        sick: workLogs.filter((log) => log.workMode === "sick").length,
        vacation: workLogs.filter((log) => log.workMode === "vacation").length,
      },
      lateArrivals: workLogs.filter((log) => {
        if (!log.arrivedAt) return false;
        const arrivalHour = parseInt(log.arrivedAt.split(":")[0]);
        const arrivalMinute = parseInt(log.arrivedAt.split(":")[1]);
        return arrivalHour > 9 || (arrivalHour === 9 && arrivalMinute > 0);
      }).length,
      daysWithoutReport: workLogs.filter(
        (log) => !log.dailyReport || log.dailyReport.trim() === "",
      ).length,
    };

    stats.averageWorkHours =
      stats.totalDays > 0
        ? (stats.totalWorkMinutes / stats.totalDays / 60).toFixed(1)
        : 0;

    stats.reliabilityScore = calculateReliabilityScore(stats);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
        stats,
      },
    });
  } catch (error) {
    _error("Ошибка получения статистики пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения статистики",
    });
  }
});

// Удалить пользователя (деактивировать)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Деактивируем вместо удаления
    await user.update({ status: "inactive" });

    res.json({
      success: true,
      message: "Пользователь деактивирован",
    });
  } catch (error) {
    _error("Ошибка деактивации пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка деактивации пользователя",
    });
  }
});

// Получить рейтинг сотрудников
router.get("/ranking/reliability", async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const users = await User.findAll({
      where: { status: "active", role: "employee" },
      attributes: ["id", "name", "username"],
    });

    const userRankings = await Promise.all(
      users.map(async (user) => {
        const whereClause = { userId: user.id };

        if (startDate && endDate) {
          whereClause.workDate = {
            [Op.between]: [startDate, endDate],
          };
        }

        const workLogs = await WorkLog.findAll({
          where: whereClause,
        });

        const stats = {
          totalDays: workLogs.length,
          lateArrivals: workLogs.filter((log) => {
            if (!log.arrivedAt) return false;
            const arrivalHour = parseInt(log.arrivedAt.split(":")[0]);
            const arrivalMinute = parseInt(log.arrivedAt.split(":")[1]);
            return arrivalHour > 9 || (arrivalHour === 9 && arrivalMinute > 0);
          }).length,
          daysWithoutReport: workLogs.filter(
            (log) => !log.dailyReport || log.dailyReport.trim() === "",
          ).length,
          averageWorkMinutes:
            workLogs.length > 0
              ? workLogs.reduce(
                  (sum, log) => sum + (log.totalMinutes || 0),
                  0,
                ) / workLogs.length
              : 0,
        };

        return {
          user,
          stats,
          reliabilityScore: calculateReliabilityScore(stats),
        };
      }),
    );

    // Сортируем по рейтингу надёжности
    userRankings.sort((a, b) => b.reliabilityScore - a.reliabilityScore);

    res.json(userRankings.slice(0, parseInt(limit)));
  } catch (error) {
    _error("Ошибка получения рейтинга:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения рейтинга",
    });
  }
});

// Вспомогательная функция для расчёта рейтинга надёжности
function calculateReliabilityScore(stats) {
  if (stats.totalDays === 0) return 0;

  const _score = LIMITS.MAX_PAGE_SIZE;

  // Штраф за опоздания (максимум -30 баллов)
  const lateRate = stats.lateArrivals / stats.totalDays;
  score -= Math.min(30, lateRate * LIMITS.MAX_PAGE_SIZE);

  // Штраф за отсутствие отчётов (максимум -25 баллов)
  const noReportRate = stats.daysWithoutReport / stats.totalDays;
  score -= Math.min(25, noReportRate * LIMITS.MAX_PAGE_SIZE);

  // Бонус за среднее время работы больше 8 часов (максимум +15 баллов)
  if (stats.averageWorkMinutes > 480) {
    // 8 часов = 480 минут
    const overtimeBonus = Math.min(
      15,
      ((stats.averageWorkMinutes - 480) / 60) * 5,
    );
    score += overtimeBonus;
  }

  // Штраф за среднее время работы меньше 7 часов (максимум -LIMITS.DEFAULT_PAGE_SIZE баллов)
  if (stats.averageWorkMinutes < LIMITS.DEFAULT_PAGE_SIZE) {
    // 7 часов = LIMITS.DEFAULT_PAGE_SIZE минут
    const undertimePenalty = Math.min(
      LIMITS.DEFAULT_PAGE_SIZE,
      ((LIMITS.DEFAULT_PAGE_SIZE - stats.averageWorkMinutes) / 60) * 10,
    );
    score -= undertimePenalty;
  }

  return Math.max(0, Math.round(score));
}

module.exports = router;
