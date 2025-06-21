"use strict";

const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../utils/logger");

const express = require("express");
const { Team, User, UserTeam, WorkLog } = require("../models");
const { Op } = require("sequelize");
const {
  authenticateToken,
  requireRole,
  requireTeamAccess,
  logRequestInfo,
} = require("../middleware/auth");
const AuditLogger = require("../utils/auditLogger");

const router = express.Router();

// Применяем middleware ко всем роутам
router.use(logRequestInfo);
router.use(authenticateToken);

/**
 * Получить все команды с фильтрацией
 */
router.get("/", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      managerId = "",
      page = 1,
      limit = LIMITS.DEFAULT_PAGE_SIZE,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const whereClause = {};

    // Поиск по названию
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    // Фильтр по статусу
    if (status) {
      whereClause.status = status;
    }

    // Фильтр по менеджеру
    if (managerId) {
      whereClause.managerId = managerId;
    }

    // Менеджеры видят только свои команды
    if (req.user.role === "manager") {
      whereClause.managerId = req.user.id;
    }

    const offset = (page - 1) * limit;

    const { rows: teams, count } = await Team.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "manager",
          attributes: ["id", "name", "username"],
          required: false,
        },
        {
          model: User,
          as: "members",
          through: {
            where: { status: "active" },
            attributes: ["role", "joinedAt"],
          },
          attributes: ["id", "name", "username", "role", "status"],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true,
    });

    // Добавляем статистику для каждой команды
    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const teamJson = team.toJSON();

        // Подсчитываем количество участников
        teamJson.memberCount = teamJson.members.length;

        // Статистика по ролям
        teamJson.membersByRole = teamJson.members.reduce((acc, member) => {
          const role = member.UserTeam.role;
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {});

        return teamJson;
      }),
    );

    res.json({
      success: true,
      data: teamsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    _error("Ошибка получения команд:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения данных команд",
    });
  }
});

/**
 * Получить конкретную команду
 */
router.get("/:id", requireTeamAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findByPk(id, {
      include: [
        {
          model: User,
          as: "manager",
          attributes: ["id", "name", "username", "role"],
        },
        {
          model: User,
          as: "members",
          through: {
            attributes: ["role", "joinedAt", "status"],
          },
          attributes: [
            "id",
            "name",
            "username",
            "role",
            "status",
            "telegramId",
          ],
        },
      ],
    });

    if (!team) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Команда не найдена",
      });
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    _error("Ошибка получения команды:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения данных команды",
    });
  }
});

/**
 * Создать новую команду
 */
router.post("/", requireRole(["admin"]), async (req, res) => {
  try {
    const {
      name,
      description = "",
      managerId = null,
      settings = {},
      members = [],
    } = req.body;

    // Валидация
    if (!name) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Название команды обязательно",
      });
    }

    // Проверяем уникальность названия
    const existingTeam = await Team.findOne({ where: { name } });
    if (existingTeam) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Команда с таким названием уже существует",
      });
    }

    // Проверяем существование менеджера
    if (managerId) {
      const manager = await User.findByPk(managerId);
      if (!manager) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Указанный менеджер не найден",
        });
      }

      if (!["manager", "admin"].includes(manager.role)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Пользователь не может быть менеджером команды",
        });
      }
    }

    const defaultSettings = {
      reminders_enabled: true,
      work_hours: {
        start: "09:00",
        end: "18:00",
        lunch_duration: 60,
      },
      timezone: "Europe/Moscow",
      ...settings,
    };

    const newTeam = await Team.create({
      name,
      description,
      managerId,
      settings: defaultSettings,
      status: "active",
    });

    // Добавляем участников
    if (members.length > 0) {
      const teamMemberships = members.map((member) => ({
        userId: typeof member === "object" ? member.userId : member,
        teamId: newTeam.id,
        role: typeof member === "object" ? member.role || "member" : "member",
        status: "active",
      }));

      await UserTeam.bulkCreate(teamMemberships);
    }

    // Логируем создание
    await AuditLogger.logTeamCreated(req.user.id, newTeam, req);

    // Получаем полные данные команды
    const teamWithMembers = await Team.findByPk(newTeam.id, {
      include: [
        {
          model: User,
          as: "manager",
          attributes: ["id", "name", "username"],
        },
        {
          model: User,
          as: "members",
          through: { attributes: ["role"] },
          attributes: ["id", "name", "username"],
        },
      ],
    });

    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: teamWithMembers,
      message: "Команда успешно создана",
    });
  } catch (error) {
    _error("Ошибка создания команды:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка создания команды",
    });
  }
});

/**
 * Обновить команду
 */
router.patch("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const team = await Team.findByPk(id);
    if (!team) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Команда не найдена",
      });
    }

    // Сохраняем старые значения для аудита
    const oldValues = { ...team.dataValues };

    // Проверяем уникальность названия
    if (updates.name && updates.name !== team.name) {
      const existingTeam = await Team.findOne({
        where: {
          name: updates.name,
          id: { [Op.ne]: id },
        },
      });

      if (existingTeam) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Команда с таким названием уже существует",
        });
      }
    }

    // Проверяем нового менеджера
    if (updates.managerId) {
      const manager = await User.findByPk(updates.managerId);
      if (!manager) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Указанный менеджер не найден",
        });
      }

      if (!["manager", "admin"].includes(manager.role)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Пользователь не может быть менеджером команды",
        });
      }
    }

    await team.update(updates);

    // Логируем изменения
    await AuditLogger.log({
      adminId: req.user.id,
      action: "update",
      resource: "teams",
      resourceId: id,
      description: `Обновлена команда: ${team.name}`,
      oldValues,
      newValues: updates,
      ipAddress: req.clientIP,
      userAgent: req.userAgent,
    });

    const updatedTeam = await Team.findByPk(id, {
      include: [
        {
          model: User,
          as: "manager",
          attributes: ["id", "name", "username"],
        },
        {
          model: User,
          as: "members",
          through: { attributes: ["role"] },
          attributes: ["id", "name", "username"],
        },
      ],
    });

    res.json({
      success: true,
      data: updatedTeam,
      message: "Команда успешно обновлена",
    });
  } catch (error) {
    _error("Ошибка обновления команды:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка обновления команды",
    });
  }
});

/**
 * Деактивировать команду
 */
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findByPk(id);
    if (!team) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Команда не найдена",
      });
    }

    await team.update({ status: "inactive" });

    // Деактивируем всех участников команды
    await UserTeam.update(
      { status: "inactive", leftAt: new Date() },
      { where: { teamId: id, status: "active" } },
    );

    // Логируем деактивацию
    await AuditLogger.log({
      adminId: req.user.id,
      action: "deactivate",
      resource: "teams",
      resourceId: id,
      description: `Деактивирована команда: ${team.name}`,
      ipAddress: req.clientIP,
      userAgent: req.userAgent,
    });

    res.json({
      success: true,
      message: "Команда успешно деактивирована",
    });
  } catch (error) {
    _error("Ошибка деактивации команды:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка деактивации команды",
    });
  }
});

/**
 * Добавить участника в команду
 */
router.post("/:id/members", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = "member" } = req.body;

    const team = await Team.findByPk(id);
    if (!team) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Команда не найдена",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMembership = await UserTeam.findOne({
      where: { userId, teamId: id, status: "active" },
    });

    if (existingMembership) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Пользователь уже является участником этой команды",
      });
    }

    await UserTeam.create({
      userId,
      teamId: id,
      role,
      status: "active",
    });

    await AuditLogger.logTeamMembershipChanged(
      req.user.id,
      id,
      userId,
      "add",
      req,
    );

    res.json({
      success: true,
      message: "Участник добавлен в команду",
    });
  } catch (error) {
    _error("Ошибка добавления участника:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка добавления участника",
    });
  }
});

/**
 * Удалить участника из команды
 */
router.delete(
  "/:id/members/:userId",
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      const membership = await UserTeam.findOne({
        where: { userId, teamId: id, status: "active" },
      });

      if (!membership) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: "Пользователь не является участником этой команды",
        });
      }

      await membership.update({ status: "inactive", leftAt: new Date() });

      await AuditLogger.logTeamMembershipChanged(
        req.user.id,
        id,
        userId,
        "remove",
        req,
      );

      res.json({
        success: true,
        message: "Участник удалён из команды",
      });
    } catch (error) {
      _error("Ошибка удаления участника:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка удаления участника",
      });
    }
  },
);

/**
 * Изменить роль участника в команде
 */
router.patch(
  "/members/:teamId/:userId/role",
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { teamId, userId } = req.params;
      const { role } = req.body;

      if (!role || !["member", "lead", "manager"].includes(role)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Некорректная роль",
        });
      }

      const membership = await UserTeam.findOne({
        where: { userId, teamId, status: "active" },
      });

      if (!membership) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: "Пользователь не является участником этой команды",
        });
      }

      const oldRole = membership.role;
      await membership.update({ role });

      await AuditLogger.log({
        adminId: req.user.id,
        userId: parseInt(userId),
        action: "update_team_role",
        resource: "teams",
        resourceId: teamId,
        description: `Изменена роль в команде с ${oldRole} на ${role}`,
        oldValues: { role: oldRole },
        newValues: { role },
        ipAddress: req.clientIP,
        userAgent: req.userAgent,
        metadata: { teamId },
      });

      res.json({
        success: true,
        message: "Роль участника обновлена",
      });
    } catch (error) {
      _error("Ошибка изменения роли:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка изменения роли",
      });
    }
  },
);

/**
 * Получить статистику команды
 */
router.get("/:id/stats", requireTeamAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const team = await Team.findByPk(id, {
      include: [
        {
          model: User,
          as: "members",
          through: { where: { status: "active" } },
          attributes: ["id"],
        },
      ],
    });

    if (!team) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Команда не найдена",
      });
    }

    const memberIds = team.members.map((member) => member.id);

    if (memberIds.length === 0) {
      return res.json({
        success: true,
        data: {
          team: { id: team.id, name: team.name },
          memberCount: 0,
          stats: {},
        },
      });
    }

    const whereClause = { userId: { [Op.in]: memberIds } };

    if (startDate && endDate) {
      whereClause.workDate = {
        [Op.between]: [startDate, endDate],
      };
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

    // Статистика команды
    const stats = {
      totalWorkDays: workLogs.length,
      totalWorkHours:
        workLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0) / 60,
      averageWorkHours:
        workLogs.length > 0
          ? (
              workLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0) /
              60 /
              workLogs.length
            ).toFixed(1)
          : 0,

      workModeDistribution: {
        office: workLogs.filter((log) => log.workMode === "office").length,
        remote: workLogs.filter((log) => log.workMode === "remote").length,
        sick: workLogs.filter((log) => log.workMode === "sick").length,
        vacation: workLogs.filter((log) => log.workMode === "vacation").length,
      },

      memberStats: memberIds.map((memberId) => {
        const memberLogs = workLogs.filter((log) => log.userId === memberId);
        const user = memberLogs[0]?.user;

        return {
          userId: memberId,
          name: user?.name || "Unknown",
          username: user?.username || "unknown",
          workDays: memberLogs.length,
          totalHours: (
            memberLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0) /
            60
          ).toFixed(1),
          averageHours:
            memberLogs.length > 0
              ? (
                  memberLogs.reduce(
                    (sum, log) => sum + (log.totalMinutes || 0),
                    0,
                  ) /
                  60 /
                  memberLogs.length
                ).toFixed(1)
              : 0,
        };
      }),
    };

    res.json({
      success: true,
      data: {
        team: { id: team.id, name: team.name },
        memberCount: memberIds.length,
        stats,
      },
    });
  } catch (error) {
    _error("Ошибка получения статистики команды:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения статистики",
    });
  }
});

/**
 * Получить доступные команды для назначения менеджерам
 */
router.get("/available/managers", requireRole(["admin"]), async (req, res) => {
  try {
    const managers = await User.findAll({
      where: {
        role: { [Op.in]: ["manager", "admin"] },
        status: "active",
      },
      attributes: ["id", "name", "username", "role"],
    });

    res.json({
      success: true,
      data: managers,
    });
  } catch (error) {
    _error("Ошибка получения менеджеров:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка получения списка менеджеров",
    });
  }
});

module.exports = router;
