"use strict";

const _express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const { info, error } = require("../utils/logger");

// Константы
const LIMITS = {
  DEFAULT_PAGE_SIZE: LIMITS.DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE0: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
};

const HTTP_STATUS_CODES = {
  INTERNAL_SERVER_ERROR: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
};

/**
 * GET /api/system-config
 * Получить системную конфигурацию
 */
router.get(
  "/",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const config = {
        workSchedule: {
          startTime: process.env.WORK_START_TIME || "09:00",
          endTime: process.env.WORK_END_TIME || "18:00",
          lateThreshold: parseInt(process.env.LATE_THRESHOLD) || 15,
        },
        notifications: {
          enabled: process.env.NOTIFICATIONS_ENABLED !== "false",
          reminderEnabled: process.env.REMINDER_ENABLED !== "false",
          telegramEnabled: !!process.env.TELEGRAM_BOT_TOKEN,
        },
        system: {
          dateFormat: process.env.DATE_FORMAT || "DD.MM.YYYY",
          timeFormat: process.env.TIME_FORMAT || "HH:mm",
          timezone: process.env.TIMEZONE || "Europe/Moscow",
          environment: process.env.NODE_ENV || "development",
        },
        features: {
          telegramEnabled: !!process.env.TELEGRAM_BOT_TOKEN,
          deepLinksEnabled: true,
          analyticsEnabled: true,
          reportsEnabled: true,
          teamsEnabled: true,
        },
        limits: {
          maxWorkLogsPerDay: 1,
          maxReportsPerMonth: 10,
          maxTeamMembers: LIMITS.DEFAULT_PAGE_SIZE,
        },
      };

      info("Системная конфигурация запрошена", { userId: req.user.id });

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      error("Ошибка получения системной конфигурации:", err);
      res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Ошибка получения системной конфигурации",
      });
    }
  },
);

/**
 * GET /api/system-config/frontend-config
 * Получить конфигурацию для фронтенда
 */
router.get("/frontend-config", async (req, res) => {
  try {
    const config = {
      workSchedule: {
        startTime: process.env.WORK_START_TIME || "09:00",
        endTime: process.env.WORK_END_TIME || "18:00",
        lateThreshold: parseInt(process.env.LATE_THRESHOLD) || 15,
      },
      notifications: {
        enabled: process.env.NOTIFICATIONS_ENABLED !== "false",
        reminderEnabled: process.env.REMINDER_ENABLED !== "false",
      },
      system: {
        dateFormat: process.env.DATE_FORMAT || "DD.MM.YYYY",
        timeFormat: process.env.TIME_FORMAT || "HH:mm",
        timezone: process.env.TIMEZONE || "Europe/Moscow",
      },
      features: {
        telegramEnabled: !!process.env.TELEGRAM_BOT_TOKEN,
        deepLinksEnabled: true,
        analyticsEnabled: true,
      },
    };

    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    error("Ошибка получения frontend конфигурации:", err);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Ошибка получения frontend конфигурации",
    });
  }
});

/**
 * PUT /api/system-config
 * Обновить системную конфигурацию
 */
router.put("/", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { workSchedule, notifications, system, features } = req.body;

    // В реальном приложении здесь была бы валидация и сохранение в БД
    // Пока просто возвращаем обновленную конфигурацию

    const updatedConfig = {
      workSchedule: {
        startTime: workSchedule?.startTime || "09:00",
        endTime: workSchedule?.endTime || "18:00",
        lateThreshold: workSchedule?.lateThreshold || 15,
      },
      notifications: {
        enabled: notifications?.enabled !== false,
        reminderEnabled: notifications?.reminderEnabled !== false,
        telegramEnabled: !!process.env.TELEGRAM_BOT_TOKEN,
      },
      system: {
        dateFormat: system?.dateFormat || "DD.MM.YYYY",
        timeFormat: system?.timeFormat || "HH:mm",
        timezone: system?.timezone || "Europe/Moscow",
        environment: process.env.NODE_ENV || "development",
      },
      features: {
        telegramEnabled: !!process.env.TELEGRAM_BOT_TOKEN,
        deepLinksEnabled: features?.deepLinksEnabled !== false,
        analyticsEnabled: features?.analyticsEnabled !== false,
        reportsEnabled: features?.reportsEnabled !== false,
        teamsEnabled: features?.teamsEnabled !== false,
      },
    };

    info("Системная конфигурация обновлена", {
      userId: req.user.id,
      changes: Object.keys(req.body),
    });

    res.json({
      success: true,
      data: updatedConfig,
      message: "Конфигурация обновлена успешно",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    error("Ошибка обновления системной конфигурации:", err);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Ошибка обновления системной конфигурации",
    });
  }
});

module.exports = router;
