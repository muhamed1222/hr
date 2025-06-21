"use strict";

const { info: _info, warn: _warn, debug: _debug } = require("../utils/logger");

const express = require("express");
const { WorkLog, User } = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");
const { notifyWorkLogEdited: _notifyWorkLogEdited } = require("../utils/sendTelegramMessage");
const CacheService = require('../services/CacheService');

const router = express.Router();

// Кэшируем GET запросы на 10 минут
const WORK_LOGS_CACHE_TTL = 600;

// Получить логи за период
router.get("/", 
  CacheService.cacheMiddleware('work-logs-list', WORK_LOGS_CACHE_TTL),
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        userId,
        workMode,
        page = 1,
        limit = LIMITS.DEFAULT_PAGE_SIZE,
      } = req.query;

      const offset = (page - 1) * limit;

      const whereClause = {};

      // Фильтры
      if (startDate && endDate) {
        whereClause.workDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      if (userId) {
        whereClause.userId = userId;
      }

      if (workMode) {
        whereClause.workMode = workMode;
      }

      const { rows: workLogs, count } = await WorkLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username", "role"],
          },
        ],
        order: [["workDate", "DESC"]],
        limit: parseInt(limit),
        offset: offset,
      });

      res.json({
        success: true,
        data: workLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      logger.error("Ошибка получения логов:", error);
      res.status(LIMITS.MAX_TEAM_MEMBERS0).json({
        success: false,
        message: "Ошибка получения данных",
      });
    }
  }
);

// Получить статистику за период
router.get("/stats", 
  CacheService.cacheMiddleware('work-logs-stats', WORK_LOGS_CACHE_TTL),
  async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.workDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      if (userId) {
        whereClause.userId = userId;
      }

      const logs = await WorkLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name"],
          },
        ],
      });

      // Вычисляем статистику
      const stats = {
        totalDays: logs.length,
        totalWorkMinutes: logs.reduce(
          (sum, log) => sum + (log.totalMinutes || 0),
          0,
        ),
        averageWorkHours: 0,
        workModeStats: {
          office: logs.filter((log) => log.workMode === "office").length,
          remote: logs.filter((log) => log.workMode === "remote").length,
          sick: logs.filter((log) => log.workMode === "sick").length,
          vacation: logs.filter((log) => log.workMode === "vacation").length,
        },
        lateArrivals: logs.filter((log) => {
          if (!log.arrivedAt) return false;
          const arrivalTime = moment(log.arrivedAt, "HH:mm:ss");
          const expectedTime = moment("09:00:00", "HH:mm:ss");
          return arrivalTime.isAfter(expectedTime);
        }).length,
      };

      stats.averageWorkHours =
        stats.totalDays > 0
          ? (stats.totalWorkMinutes / stats.totalDays / 60).toFixed(1)
          : 0;

      res.json(stats);
    } catch (error) {
      logger.error("Ошибка получения статистики:", error);
      res.status(LIMITS.MAX_TEAM_MEMBERS0).json({
        success: false,
        message: "Ошибка получения статистики",
      });
    }
  }
);

// Получить сводку по команде за сегодня (важно: этот маршрут должен быть ДО /:userId/:date)
router.get("/team/today", async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");

    const workLogs = await WorkLog.findAll({
      where: {
        workDate: today,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username", "role"],
          where: {
            status: "active",
          },
        },
      ],
      order: [[{ model: User, as: "user" }, "name", "ASC"]],
    });

    // Получаем всех активных пользователей
    const allUsers = await User.findAll({
      where: { status: "active" },
      attributes: ["id", "name", "username", "role"],
    });

    // Создаём полную сводку
    const teamSummary = allUsers.map((user) => {
      const workLog = workLogs.find((log) => log.userId === user.id);

      return {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
        workLog: workLog || null,
        status: getEmployeeStatus(workLog),
      };
    });

    res.json({
      success: true,
      data: teamSummary,
    });
  } catch (error) {
    logger.error("Ошибка получения сводки команды:", error);
    res.status(LIMITS.MAX_TEAM_MEMBERS0).json({
      success: false,
      message: "Ошибка получения данных команды",
    });
  }
});

// Получить лог конкретного дня
router.get("/:userId/:date", async (req, res) => {
  try {
    const { userId, date } = req.params;

    const workLog = await WorkLog.findOne({
      where: {
        userId,
        workDate: date,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username"],
        },
      ],
    });

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Запись не найдена",
      });
    }

    res.json({
      success: true,
      data: workLog,
    });
  } catch (error) {
    logger.error("Ошибка получения лога:", error);
    res.status(LIMITS.MAX_TEAM_MEMBERS0).json({
      success: false,
      message: "Ошибка получения данных",
    });
  }
});

// Обновить лог (PATCH для частичного обновления с правами доступа)
router.patch("/:id", async (req, res) => {
  try {
    // Проверяем наличие токена и роли (если у вас есть middleware для auth)
    // Здесь предполагается, что req.user установлен middleware аутентификации

    const { id } = req.params;
    const updates = req.body;

    const workLog = await WorkLog.findByPk(id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Запись не найдена",
      });
    }

    // Сохраняем старые значения для аудита
    const oldValues = { ...workLog.dataValues };

    // Пересчитываем общее время работы если обновляются времена
    if (
      updates.arrivedAt ||
      updates.leftAt ||
      updates.lunchStart ||
      updates.lunchEnd
    ) {
      updates.totalMinutes = calculateWorkTime(
        updates.arrivedAt || workLog.arrivedAt,
        updates.leftAt || workLog.leftAt,
        updates.lunchStart || workLog.lunchStart,
        updates.lunchEnd || workLog.lunchEnd,
      );
    }

    // Добавляем информацию о редактировании
    updates.editedAt = new Date();
    if (req.user) {
      updates.editedBy = req.user.id;
    }

    await workLog.update(updates);

    // Записываем в аудит-лог (если модель существует)
    try {
      const { AuditLog } = require("../models");
      if (AuditLog) {
        await AuditLog.create({
          userId: workLog.userId,
          action: "update_work_log",
          details: `Лог обновлён через админ-панель`,
          oldValues: JSON.stringify(oldValues),
          newValues: JSON.stringify(updates),
          adminId: req.user?.id || null,
        });
      }
    } catch (auditError) {
      logger.error("Ошибка записи в аудит-лог:", auditError);
      // Не прерываем выполнение из-за ошибки аудита
    }

    const updatedLog = await WorkLog.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username", "telegramId"],
        },
      ],
    });

    // Эмитируем событие редактирования лога через новую систему событий
    try {
      if (
        updatedLog.user &&
        Object.keys(updates).some(
          (key) =>
            key !== "editedAt" && key !== "editedBy" && key !== "totalMinutes",
        )
      ) {
        // Формируем изменения
        const changes = {};
        Object.keys(updates).forEach((key) => {
          if (
            key !== "editedAt" &&
            key !== "editedBy" &&
            key !== "totalMinutes"
          ) {
            changes[key] = {
              old: oldValues[key],
              new: updates[key],
            };
          }
        });

        // Эмитируем событие через новую систему
        if (global.emitEvent && Object.keys(changes).length > 0) {
          global.emitEvent("log.edited", {
            workLog: updatedLog,
            editedBy: {
              id: req.user?.id,
              firstName: req.user?.username || "Администратор",
              lastName: "",
              role: req.user?.role || "admin",
            },
            user: {
              id: updatedLog.user.id,
              telegramId: updatedLog.user.telegramId,
              firstName: updatedLog.user.name,
              lastName: "",
            },
            changes,
          });
        }
      }
    } catch (eventError) {
      logger.error("Ошибка отправки события редактирования:", eventError);
      // Не прерываем выполнение из-за ошибки события
    }

    res.json({
      success: true,
      data: updatedLog,
      message: "Запись успешно обновлена",
    });
  } catch (error) {
    logger.error("Ошибка обновления лога:", error);
    res.status(LIMITS.MAX_TEAM_MEMBERS0).json({
      success: false,
      message: "Ошибка обновления данных",
    });
  }
});

// Обновить лог (PUT для полного обновления - только для админов)
router.put("/:id", 
  CacheService.invalidateCache('work-logs-list'),
  CacheService.invalidateCache('work-log-details'),
  CacheService.invalidateCache('work-logs-stats'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const workLog = await WorkLog.findByPk(id);

      if (!workLog) {
        return res.status(404).json({
          success: false,
          message: "Запись не найдена",
        });
      }

      // Пересчитываем общее время работы если обновляются времена
      if (
        updates.arrivedAt ||
        updates.leftAt ||
        updates.lunchStart ||
        updates.lunchEnd
      ) {
        updates.totalMinutes = calculateWorkTime(
          updates.arrivedAt || workLog.arrivedAt,
          updates.leftAt || workLog.leftAt,
          updates.lunchStart || workLog.lunchStart,
          updates.lunchEnd || workLog.lunchEnd,
        );
      }

      await workLog.update(updates);

      const updatedLog = await WorkLog.findByPk(id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username"],
          },
        ],
      });

      res.json({
        success: true,
        data: updatedLog,
      });
    } catch (error) {
      logger.error("Ошибка обновления лога:", error);
      res.status(LIMITS.MAX_TEAM_MEMBERS0).json({
        success: false,
        message: "Ошибка обновления данных",
      });
    }
  }
);

// Вспомогательные функции
function calculateWorkTime(arrivedAt, leftAt, lunchStart, lunchEnd) {
  if (!arrivedAt || !leftAt) return 0;

  const arrival = moment(arrivedAt, "HH:mm:ss");
  const departure = moment(leftAt, "HH:mm:ss");
  let totalMinutes = departure.diff(arrival, "minutes");

  // Вычитаем время обеда
  if (lunchStart && lunchEnd) {
    const lunchStartTime = moment(lunchStart, "HH:mm:ss");
    const lunchEndTime = moment(lunchEnd, "HH:mm:ss");
    const lunchMinutes = lunchEndTime.diff(lunchStartTime, "minutes");
    totalMinutes -= lunchMinutes;
  }

  return Math.max(0, totalMinutes);
}

function getEmployeeStatus(workLog) {
  if (!workLog) return "not_started";

  if (workLog.leftAt) return "finished";
  if (workLog.lunchStart && !workLog.lunchEnd) return "lunch";
  if (workLog.arrivedAt) return "working";

  return "not_started";
}

module.exports = router;
