"use strict";

const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../utils/logger");

const express = require("express");
const { AuditLog, User } = require("../models");
const { Op } = require("sequelize");
const {
  authenticateToken,
  requireRole,
  logRequestInfo,
} = require("../middleware/auth");

const router = express.Router();

// Применяем middleware ко всем роутам
router.use(logRequestInfo);
router.use(authenticateToken);

/**
 * Получить аудит логи с фильтрацией
 */
router.get("/", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const {
      adminId = "",
      userId = "",
      resource = "",
      action = "",
      startDate = "",
      endDate = "",
      page = 1,
      limit = LIMITS.DEFAULT_PAGE_SIZE,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const whereClause = {};

    // Фильтр по администратору
    if (adminId) {
      whereClause.adminId = adminId;
    }

    // Фильтр по пользователю
    if (userId) {
      whereClause.userId = userId;
    }

    // Фильтр по ресурсу
    if (resource) {
      whereClause.resource = resource;
    }

    // Фильтр по действию
    if (action) {
      whereClause.action = { [Op.like]: `%${action}%` };
    }

    // Фильтр по датам
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.createdAt = {
        [Op.lte]: new Date(endDate),
      };
    }

    // Менеджеры видят только логи, связанные с их командами
    if (req.user.role === "manager") {
      // Получаем ID пользователей из команд менеджера
      const { Team, _UserTeam } = require("../models");

      const managedTeams = await Team.findAll({
        where: { managerId: req.user.id },
        include: [
          {
            model: User,
            as: "members",
            through: { where: { status: "active" } },
            attributes: ["id"],
          },
        ],
      });

      const managedUserIds = managedTeams.flatMap((team) =>
        team.members.map((member) => member.id),
      );

      // Добавляем себя в список
      managedUserIds.push(req.user.id);

      whereClause[Op.or] = [
        { userId: { [Op.in]: managedUserIds } },
        { adminId: req.user.id },
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: logs, count } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "admin",
          attributes: ["id", "name", "username"],
          required: false,
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username"],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    _error("Ошибка получения аудит логов:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения аудит логов",
    });
  }
});

/**
 * Получить статистику аудит логов
 */
router.get("/stats", requireRole(["admin"]), async (req, res) => {
  try {
    const { period = "7d" } = req.query;

    let startDate;
    const endDate = new Date();

    switch (period) {
      case "1d":
        startDate = new Date(
          Date.now() - 24 * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
        );
        break;
      case "7d":
        startDate = new Date(
          Date.now() -
            7 * 24 * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
        );
        break;
      case "30d":
        startDate = new Date(
          Date.now() -
            30 * 24 * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
        );
        break;
      default:
        startDate = new Date(
          Date.now() -
            7 * 24 * 60 * TIME_CONSTANTS.MINUTE * LIMITS.MAX_PAGE_SIZE0,
        );
    }

    const whereClause = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    const [
      totalActions,
      actionsByType,
      actionsByResource,
      topAdmins,
      recentActions,
    ] = await Promise.all([
      // Общее количество действий
      AuditLog.count({ where: whereClause }),

      // Группировка по типу действий
      AuditLog.findAll({
        where: whereClause,
        attributes: [
          "action",
          [
            AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("action")),
            "count",
          ],
        ],
        group: ["action"],
        order: [[AuditLog.sequelize.literal("count"), "DESC"]],
        limit: 10,
        raw: true,
      }),

      // Группировка по ресурсам
      AuditLog.findAll({
        where: whereClause,
        attributes: [
          "resource",
          [
            AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("resource")),
            "count",
          ],
        ],
        group: ["resource"],
        order: [[AuditLog.sequelize.literal("count"), "DESC"]],
        raw: true,
      }),

      // Топ активных администраторов
      AuditLog.findAll({
        where: whereClause,
        attributes: [
          "adminId",
          [
            AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("adminId")),
            "count",
          ],
        ],
        include: [
          {
            model: User,
            as: "admin",
            attributes: ["name", "username"],
          },
        ],
        group: ["adminId", "admin.id"],
        order: [[AuditLog.sequelize.literal("count"), "DESC"]],
        limit: 10,
      }),

      // Последние 10 действий
      AuditLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "admin",
            attributes: ["name", "username"],
          },
          {
            model: User,
            as: "user",
            attributes: ["name", "username"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalActions,
        period,
        actionsByType: actionsByType.map((item) => ({
          action: item.action,
          count: parseInt(item.count),
        })),
        actionsByResource: actionsByResource.map((item) => ({
          resource: item.resource,
          count: parseInt(item.count),
        })),
        topAdmins: topAdmins.map((item) => ({
          adminId: item.adminId,
          name: item.admin?.name || "Unknown",
          username: item.admin?.username || "unknown",
          count: parseInt(item.getDataValue("count")),
        })),
        recentActions,
      },
    });
  } catch (error) {
    _error("Ошибка получения статистики аудит логов:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения статистики",
    });
  }
});

/**
 * Получить детали конкретного аудит лога
 */
router.get("/:id", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findByPk(id, {
      include: [
        {
          model: User,
          as: "admin",
          attributes: ["id", "name", "username", "role"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username", "role"],
          required: false,
        },
      ],
    });

    if (!log) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Аудит лог не найден",
      });
    }

    // Менеджеры могут видеть только логи, связанные с их командами
    if (req.user.role === "manager") {
      const { Team } = require("../models");

      const managedTeams = await Team.findAll({
        where: { managerId: req.user.id },
        include: [
          {
            model: User,
            as: "members",
            through: { where: { status: "active" } },
            attributes: ["id"],
          },
        ],
      });

      const managedUserIds = managedTeams.flatMap((team) =>
        team.members.map((member) => member.id),
      );
      managedUserIds.push(req.user.id);

      if (
        log.adminId !== req.user.id &&
        (!log.userId || !managedUserIds.includes(log.userId))
      ) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: "Недостаточно прав для просмотра этого лога",
        });
      }
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    _error("Ошибка получения аудит лога:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения аудит лога",
    });
  }
});

/**
 * Получить доступные фильтры
 */
router.get(
  "/filters/options",
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const whereClause = {};

      // Менеджеры видят только данные своих команд
      if (req.user.role === "manager") {
        const { Team } = require("../models");

        const managedTeams = await Team.findAll({
          where: { managerId: req.user.id },
          include: [
            {
              model: User,
              as: "members",
              through: { where: { status: "active" } },
              attributes: ["id"],
            },
          ],
        });

        const managedUserIds = managedTeams.flatMap((team) =>
          team.members.map((member) => member.id),
        );
        managedUserIds.push(req.user.id);

        whereClause[Op.or] = [
          { userId: { [Op.in]: managedUserIds } },
          { adminId: req.user.id },
        ];
      }

      const [resources, actions, admins, users] = await Promise.all([
        // Доступные ресурсы
        AuditLog.findAll({
          where: whereClause,
          attributes: ["resource"],
          group: ["resource"],
          order: [["resource", "ASC"]],
          raw: true,
        }),

        // Доступные действия
        AuditLog.findAll({
          where: whereClause,
          attributes: ["action"],
          group: ["action"],
          order: [["action", "ASC"]],
          raw: true,
        }),

        // Администраторы
        AuditLog.findAll({
          where: whereClause,
          attributes: ["adminId"],
          include: [
            {
              model: User,
              as: "admin",
              attributes: ["id", "name", "username"],
            },
          ],
          group: ["adminId", "admin.id"],
          order: [["admin", "name", "ASC"]],
        }),

        // Пользователи
        AuditLog.findAll({
          where: { ...whereClause, userId: { [Op.not]: null } },
          attributes: ["userId"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "username"],
            },
          ],
          group: ["userId", "user.id"],
          order: [["user", "name", "ASC"]],
        }),
      ]);

      res.json({
        success: true,
        data: {
          resources: resources.map((r) => r.resource),
          actions: actions.map((a) => a.action),
          admins: admins.map((a) => ({
            id: a.adminId,
            name: a.admin?.name || "Unknown",
            username: a.admin?.username || "unknown",
          })),
          users: users.map((u) => ({
            id: u.userId,
            name: u.user?.name || "Unknown",
            username: u.user?.username || "unknown",
          })),
        },
      });
    } catch (error) {
      _error("Ошибка получения фильтров:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка получения фильтров",
      });
    }
  },
);

/**
 * Экспорт аудит логов
 */
router.post("/export", requireRole(["admin"]), async (req, res) => {
  try {
    const { format = "json", filters = {} } = req.body;

    const whereClause = {};

    // Применяем фильтры
    if (filters.adminId) whereClause.adminId = filters.adminId;
    if (filters.userId) whereClause.userId = filters.userId;
    if (filters.resource) whereClause.resource = filters.resource;
    if (filters.action)
      whereClause.action = { [Op.like]: `%${filters.action}%` };
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
      };
    }

    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "admin",
          attributes: ["name", "username"],
        },
        {
          model: User,
          as: "user",
          attributes: ["name", "username"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: LIMITS.MAX_PAGE_SIZE00, // Ограничиваем экспорт
    });

    // Логируем экспорт
    const AuditLogger = require("../utils/auditLogger");
    await AuditLogger.logReportExported(
      req.user.id,
      `audit_logs_${format}`,
      { filters, count: logs.length },
      req,
    );

    if (format === "csv") {
      // Конвертируем в CSV
      const csvHeaders = [
        "ID",
        "Дата",
        "Администратор",
        "Пользователь",
        "Действие",
        "Ресурс",
        "Описание",
        "IP",
      ];

      const csvData = logs.map((log) => [
        log.id,
        log.createdAt.toISOString(),
        log.admin ? `${log.admin.name} (${log.admin.username})` : "",
        log.user ? `${log.user.name} (${log.user.username})` : "",
        log.action,
        log.resource,
        log.description,
        log.ipAddress || "",
      ]);

      const csv = [csvHeaders, ...csvData]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit_logs_${Date.now()}.csv"`,
      );
      return res.send("\ufeff" + csv); // BOM для правильного отображения в Excel
    }

    // JSON формат по умолчанию
    res.json({
      success: true,
      data: logs,
      exportInfo: {
        format,
        count: logs.length,
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: req.user.id,
          name: req.user.name,
          username: req.user.username,
        },
      },
    });
  } catch (error) {
    _error("Ошибка экспорта аудит логов:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка экспорта аудит логов",
    });
  }
});

module.exports = router;
