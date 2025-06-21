"use strict";

const express = require("express");
const router = express.Router();
const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../utils/logger");

const { Op, _Sequelize } = require("sequelize");
const { authenticateToken } = require("../middleware/auth");
const { User, WorkLog, _Team, _UserTeam } = require("../models");
const __ExcelJS = require("exceljs");
const __PDFDocument = require("pdfkit");

const HTTP_STATUS_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
const LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_PAGE_SIZE0: 1000,
};

// Middleware для проверки прав
const requireManagerOrAdmin = (req, res, next) => {
  if (!["manager", "admin"].includes(req.user.role)) {
    return res
      .status(HTTP_STATUS_CODES.FORBIDDEN)
      .json({ error: "Недостаточно прав" });
  }
  next();
};

// Основной маршрут аналитики
router.get("/", authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, _userId } = req.query;

    // Базовые параметры
    const start =
      startDate ||
      new Date(
        Date.now() -
          30 * TIME_CONSTANTS.HOURS_PER_DAY * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
      )
        .toISOString()
        .split("T")[0];
    const end = endDate || new Date().toISOString().split("T")[0];

    // Получаем данные о работе
    const workLogsQuery = {
      where: {
        workDate: { [Op.between]: [start, end] },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username", "role"],
        },
      ],
    };

    if (_userId) {
      workLogsQuery.where.userId = _userId;
    }

    const workLogs = await WorkLog.findAll(workLogsQuery);

    // Рассчитываем статистику
    const totalWorkLogs = workLogs.length;
    const totalMinutes = workLogs.reduce(
      (sum, log) => sum + (log.totalMinutes || 0),
      0,
    );
    const averageMinutes = totalWorkLogs > 0 ? totalMinutes / totalWorkLogs : 0;

    // Статистика по режимам работы
    const workModes = workLogs.reduce((acc, log) => {
      acc[log.workMode] = (acc[log.workMode] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        summary: {
          totalWorkLogs,
          totalMinutes,
          averageMinutes: Math.round(averageMinutes),
          averageHours:
            Math.round((averageMinutes / 60) * LIMITS.MAX_PAGE_SIZE) /
            LIMITS.MAX_PAGE_SIZE,
        },
        workModes,
        workLogs: workLogs.slice(0, LIMITS.MAX_PAGE_SIZE), // Ограничиваем количество записей
      },
    });
  } catch (error) {
    _error("Ошибка аналитики:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения аналитики",
    });
  }
});

// Рейтинг надежности
router.get(
  "/reliability-ranking",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    try {
      const { startDate, endDate, limit = 10 } = req.query;

      const start =
        startDate ||
        new Date(
          Date.now() -
            30 * TIME_CONSTANTS.HOURS_PER_DAY * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
        )
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      // Получаем всех пользователей
      const users = await User.findAll({
        where: { status: "active" },
        attributes: ["id", "name", "username", "role"],
      });

      // Рассчитываем надежность для каждого пользователя
      const reliabilityData = [];

      for (const user of users) {
        const userWorkLogs = await WorkLog.findAll({
          where: {
            userId: user.id,
            workDate: { [Op.between]: [start, end] },
          },
        });

        if (userWorkLogs.length > 0) {
          const totalDays = userWorkLogs.length;
          const workedDays = userWorkLogs.filter(
            (log) => log.workMode === "office" || log.workMode === "remote",
          ).length;

          const reliability = Math.round(
            (workedDays / totalDays) * LIMITS.MAX_PAGE_SIZE,
          );

          reliabilityData.push({
            user: {
              id: user.id,
              name: user.name,
              username: user.username,
              role: user.role,
            },
            reliabilityScore: reliability,
            totalDays,
            workedDays,
            missedDays: totalDays - workedDays,
            stats: {
              totalDays,
              workedDays,
              missedDays: totalDays - workedDays,
            },
          });
        }
      }

      // Сортируем по надежности (убывание)
      reliabilityData.sort((a, b) => b.reliabilityScore - a.reliabilityScore);

      res.json({
        success: true,
        data: reliabilityData.slice(0, parseInt(limit)),
      });
    } catch (error) {
      _error("Ошибка рейтинга надежности:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка получения рейтинга надежности",
      });
    }
  },
);

// ВРЕМЕННО ОТКЛЮЧЕНО: Получить данные для тепловой карты активности
router.get(
  "/activity-heatmap",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    res.status(LIMITS.DEFAULT_PAGE_SIZE3).json({
      error: "Аналитика временно недоступна",
      message:
        "Функция находится в разработке и будет доступна в ближайшее время",
    });
  },
);

// ВРЕМЕННО ОТКЛЮЧЕНО: Получить продвинутые рейтинги
router.get(
  "/advanced-rankings",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    res.status(LIMITS.DEFAULT_PAGE_SIZE3).json({
      error: "Аналитика временно недоступна",
      message:
        "Функция находится в разработке и будет доступна в ближайшее время",
    });
  },
);

// ВРЕМЕННО ОТКЛЮЧЕНО: Получить распределение режимов работы
router.get(
  "/work-mode-distribution",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    res.status(LIMITS.DEFAULT_PAGE_SIZE3).json({
      error: "Аналитика временно недоступна",
      message:
        "Функция находится в разработке и будет доступна в ближайшее время",
    });
  },
);

// ВРЕМЕННО ОТКЛЮЧЕНО: Генерировать отчёт
router.post(
  "/generate-report",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    res.status(LIMITS.DEFAULT_PAGE_SIZE3).json({
      error: "Генерация отчётов временно недоступна",
      message:
        "Функция находится в разработке и будет доступна в ближайшее время",
    });
  },
);

// Получить аналитику работы (для WorkAnalyticsChart)
router.get(
  "/work-analytics",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    try {
      const { startDate, endDate, _userId } = req.query;

      const start =
        startDate ||
        new Date(
          Date.now() -
            30 * TIME_CONSTANTS.HOURS_PER_DAY * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
        )
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      // Получаем всех активных пользователей
      const users = await User.findAll({
        where: { status: "active" },
        attributes: ["id", "name", "username"],
      });

      const workAnalytics = [];

      for (const user of users) {
        const userWorkLogs = await WorkLog.findAll({
          where: {
            userId: user.id,
            workDate: { [Op.between]: [start, end] },
          },
        });

        if (userWorkLogs.length > 0) {
          const totalMinutes = userWorkLogs.reduce(
            (sum, log) => sum + (log.totalMinutes || 0),
            0,
          );
          const avgMinutes = totalMinutes / userWorkLogs.length;
          const workDays = userWorkLogs.length;

          workAnalytics.push({
            userId: user.id,
            user: {
              id: user.id,
              name: user.name,
              username: user.username,
            },
            totalMinutes,
            avgMinutes: Math.round(avgMinutes),
            workDays,
          });
        }
      }

      // Сортируем по общему времени работы (убывание)
      workAnalytics.sort((a, b) => b.totalMinutes - a.totalMinutes);

      res.json({
        success: true,
        data: workAnalytics,
      });
    } catch (error) {
      _error("Ошибка получения аналитики работы:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка получения аналитики работы",
      });
    }
  },
);

// Получить общую статистику пользователей
router.get(
  "/users-overview",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    try {
      // Получаем всех активных пользователей
      const totalUsers = await User.count({ where: { status: "active" } });

      // Получаем пользователей, которые работают сегодня
      const today = new Date().toISOString().split("T")[0];
      const workingToday = await WorkLog.count({
        where: { workDate: today },
        include: [
          {
            model: User,
            as: "user",
            where: { status: "active" },
          },
        ],
      });

      // Получаем пользователей на обеде (временная заглушка)
      const onLunch = 0;

      // Получаем активных пользователей
      const activeUsers = await User.count({
        where: {
          status: "active",
          lastLogin: {
            [Op.gte]: new Date(
              Date.now() -
                TIME_CONSTANTS.DAYS_PER_WEEK * TIME_CONSTANTS.HOURS_PER_DAY * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
            ),
          },
        },
      });

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          workingToday,
          onLunch,
        },
      });
    } catch (error) {
      _error("Ошибка получения статистики пользователей:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка получения статистики пользователей",
      });
    }
  },
);

// Получить статистику рабочих логов
router.get(
  "/work-logs-stats",
  authenticateToken,
  requireManagerOrAdmin,
  async (req, res) => {
    try {
      const { startDate, endDate, _userId } = req.query;

      const start =
        startDate ||
        new Date(
          Date.now() -
            30 * TIME_CONSTANTS.HOURS_PER_DAY * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
        )
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      const whereClause = {
        workDate: { [Op.between]: [start, end] },
      };

      if (_userId) {
        whereClause.userId = _userId;
      }

      const workLogs = await WorkLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username"],
          },
        ],
      });

      // Рассчитываем статистику
      const totalMinutes = workLogs.reduce(
        (sum, log) => sum + (log.totalMinutes || 0),
        0,
      );
      const avgReliability =
        workLogs.length > 0
          ? Math.round(
              workLogs.reduce(
                (sum, log) => sum + (log.reliabilityScore || 0),
                0,
              ) / workLogs.length,
            )
          : 0;

      res.json({
        success: true,
        data: {
          totalMinutes,
          avgReliability,
          totalWorkLogs: workLogs.length,
        },
      });
    } catch (error) {
      _error("Ошибка получения статистики рабочих логов:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка получения статистики рабочих логов",
      });
    }
  },
);

// ВРЕМЕННО ОТКЛЮЧЕНО: Вспомогательные функции
async function _getReliabilityData(_dateRange, _rowNumber) {
  return [];
}

async function _getPunctualityData(_dateRange, _rowNumber) {
  return [];
}

async function _getWorkModeData(_dateRange, _rowNumber) {
  return {};
}

module.exports = router;
