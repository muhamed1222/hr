"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _express = require("express");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { metrics } = require("../utils/metrics");
const { alertSystem } = require("../utils/alerts");

// Константы
const LIMITS = {
  DEFAULT_PAGE_SIZE: LIMITS.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: LIMITS.MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE0: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
};

const HTTP_STATUS_CODES = {
  BAD_REQUEST: HTTP_STATUS_CODES.BAD_REQUEST,
  UNAUTHORIZED: HTTP_STATUS_CODES.UNAUTHORIZED,
  FORBIDDEN: HTTP_STATUS_CODES.FORBIDDEN,
  NOT_FOUND: HTTP_STATUS_CODES.NOT_FOUND,
  INTERNAL_SERVER_ERROR: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
};

const router = express.Router();

// Middleware для аутентификации и авторизации (только админы)
router.use(authenticateToken);
router.use(requireRole(["admin"]));

/**
 * GET /api/metrics
 * Получение общей статистики системы
 */
router.get("/", async (req, res) => {
  try {
    const stats = metrics.getStats();

    _info("Метрики запрошены", { userId: req.user.id });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    _error("Ошибка получения метрик:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения метрик",
    });
  }
});

/**
 * GET /api/metrics/requests
 * Детальная статистика запросов
 */
router.get("/requests", async (req, res) => {
  try {
    const stats = metrics.getStats();

    res.json({
      success: true,
      data: {
        requests: stats.requests,
        topEndpoints: Object.entries(stats.requests.byEndpoint)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([endpoint, count]) => ({ endpoint, count })),
        topMethods: Object.entries(stats.requests.byMethod)
          .sort(([, a], [, b]) => b - a)
          .map(([method, count]) => ({ method, count })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    _error("Ошибка получения статистики запросов:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения статистики запросов",
    });
  }
});

/**
 * GET /api/metrics/system
 * Системная информация
 */
router.get("/system", async (req, res) => {
  try {
    const stats = metrics.getStats();

    res.json({
      success: true,
      data: {
        system: stats.system,
        memory: {
          current: stats.system.memory,
          trend: metrics.metrics.system.memory.slice(-10), // последние 10 измерений
        },
        cpu: {
          current: stats.system.cpu,
          trend: metrics.metrics.system.cpu.slice(-10), // последние 10 измерений
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    _error("Ошибка получения системной информации:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения системной информации",
    });
  }
});

/**
 * GET /api/metrics/auth
 * Статистика аутентификации
 */
router.get("/auth", async (req, res) => {
  try {
    const stats = metrics.getStats();

    res.json({
      success: true,
      data: {
        auth: stats.auth,
        successRate:
          stats.auth.logins + stats.auth.failedLogins > 0
            ? (
                (stats.auth.logins /
                  (stats.auth.logins + stats.auth.failedLogins)) *
                LIMITS.MAX_PAGE_SIZE
              ).toFixed(2) + "%"
            : "0%",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    _error("Ошибка получения статистики аутентификации:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения статистики аутентификации",
    });
  }
});

/**
 * GET /api/metrics/alerts
 * Получение алертов
 */
router.get("/alerts", async (req, res) => {
  try {
    const { limit = LIMITS.DEFAULT_PAGE_SIZE, active = false } = req.query;

    let alerts;
    if (active === "true") {
      alerts = alertSystem.getActiveAlerts();
    } else {
      alerts = alertSystem.getAlertHistory(parseInt(limit));
    }

    res.json({
      success: true,
      data: {
        alerts,
        activeCount: alertSystem.getActiveAlerts().length,
        totalCount: alertSystem.getAlertHistory().length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    _error("Ошибка получения алертов:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения алертов",
    });
  }
});

/**
 * POST /api/metrics/alerts/threshold
 * Настройка порогов алертов
 */
router.post("/alerts/threshold", async (req, res) => {
  try {
    const { type, threshold } = req.body;

    if (!type || threshold === undefined) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Необходимо указать тип алерта и порог",
      });
    }

    alertSystem.setAlertThreshold(type, parseFloat(threshold));

    res.json({
      success: true,
      message: `Порог алерта "${type}" установлен на ${threshold}`,
      data: { type, threshold: parseFloat(threshold) },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    _error("Ошибка настройки порога алерта:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка настройки порога алерта",
    });
  }
});

module.exports = router;
