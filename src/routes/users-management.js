"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _express = require("express");
const { User, Team, UserTeam, _WorkLog } = require("../models");
const { Op } = require("sequelize");
const {
  authenticateToken,
  requireRole,
  requireUserAccess,
  logRequestInfo,
} = require("../middleware/auth");
const _AuditLogger = require("../utils/auditLogger");
const { sendTelegramMessage } = require("../utils/sendTelegramMessage");
const _crypto = require("crypto");
const _bcrypt = require("bcrypt");

const router = express.Router();

// Применяем middleware ко всем роутам
router.use(logRequestInfo);
router.use(authenticateToken);

/**
 * Получить всех пользователей с фильтрацией и поиском
 */
router.get("/", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const {
      search = "",
      role = "",
      status = "",
      teamId = "",
      page = 1,
      limit = LIMITS.DEFAULT_PAGE_SIZE,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const whereClause = {};
    const includeClause = [
      {
        model: Team,
        as: "teams",
        through: {
          where: { status: "active" },
          attributes: ["role", "joinedAt"],
        },
        required: false,
      },
    ];

    // Поиск по имени или username
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
      ];
    }

    // Фильтр по роли
    if (role) {
      whereClause.role = role;
    }

    // Фильтр по статусу
    if (status) {
      whereClause.status = status;
    }

    // Фильтр по команде
    if (teamId) {
      includeClause[0].required = true;
      includeClause[0].where = { id: teamId };
    }

    // Менеджеры видят только свои команды
    if (req.user.role === "manager") {
      const managedTeams = await Team.findAll({
        where: { managerId: req.user.id },
        attributes: ["id"],
      });

      const teamIds = managedTeams.map((t) => t.id);

      if (teamIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: LIMITS.DEFAULT_PAGE_SIZE, total: 0, pages: 0 },
        });
      }

      includeClause[0].required = true;
      includeClause[0].where = { id: { [Op.in]: teamIds } };
    }

    const offset = (page - 1) * limit;

    const { rows: users, count } = await User.findAndCountAll({
      where: whereClause,
      include: includeClause,
      attributes: [
        "id",
        "name",
        "username",
        "role",
        "status",
        "telegramId",
        "createdAt",
        "updatedAt",
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true,
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
      message: "Ошибка получения данных",
    });
  }
});

/**
 * Получить конкретного пользователя
 */
router.get("/:id", requireUserAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [
        {
          model: Team,
          as: "teams",
          through: {
            attributes: ["role", "joinedAt", "status"],
          },
        },
        {
          model: Team,
          as: "managedTeams",
          attributes: ["id", "name", "status"],
        },
      ],
      attributes: { exclude: ["password"] },
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
      message: "Ошибка получения данных",
    });
  }
});

/**
 * Создать нового пользователя
 */
router.post("/", requireRole(["admin"]), async (req, res) => {
  try {
    const {
      name,
      username,
      role = "employee",
      teams = [],
      sendInvite = true,
    } = req.body;

    // Валидация
    if (!name || !username) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Имя и username обязательны",
      });
    }

    // Проверяем уникальность username
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Пользователь с таким username уже существует",
      });
    }

    // Генерируем временный пароль и хеш
    const tempPassword = crypto.randomBytes(8).toString("hex").toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Генерируем временный Telegram ID
    const tempTelegramId = `temp_${crypto.randomBytes(8).toString("hex")}`;

    const newUser = await User.create({
      name,
      username,
      password: hashedPassword,
      role,
      status: "active",
      telegramId: tempTelegramId,
    });

    // Добавляем в команды
    if (teams.length > 0) {
      const teamMemberships = teams.map((teamId) => ({
        userId: newUser.id,
        teamId,
        role: "member",
        status: "active",
      }));

      await UserTeam.bulkCreate(teamMemberships);
    }

    // Логируем создание
    await AuditLogger.logUserCreated(req.user.id, newUser, req);

    // Отправляем приглашение в Telegram (если у админа настроен Telegram)
    if (sendInvite && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        // Пытаемся отправить админу уведомление о новом сотруднике
        const inviteMessage =
          `👥 Создан новый пользователь: ${name}\n` +
          `🔑 Логин: ${username}\n` +
          `🔐 Временный пароль: ${tempPassword}\n` +
          `👤 Роль: ${role}\n\n` +
          `Передайте эти данные сотруднику для первого входа в систему.`;

        await sendTelegramMessage(req.user.telegramId, inviteMessage);
      } catch (telegramError) {
        // // info('Не удалось отправить приглашение через Telegram:', telegramError);
      }
    }

    // Получаем полные данные пользователя
    const userWithTeams = await User.findByPk(newUser.id, {
      include: [
        {
          model: Team,
          as: "teams",
          through: { attributes: ["role"] },
        },
      ],
      attributes: { exclude: ["password"] },
    });

    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: {
        ...userWithTeams.toJSON(),
        tempPassword: sendInvite ? tempPassword : undefined,
      },
      message: "Пользователь успешно создан",
    });
  } catch (error) {
    _error("Ошибка создания пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка создания пользователя",
    });
  }
});

/**
 * Обновить пользователя
 */
router.patch("/:id", requireUserAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Сохраняем старые значения для аудита
    const oldValues = { ...user.dataValues };
    delete oldValues.password; // не логируем пароли

    // Ограничения для разных ролей
    if (req.user.role !== "admin") {
      // Обычные пользователи не могут менять роль и статус
      delete updates.role;
      delete updates.status;

      // Пользователи могут редактировать только себя
      if (req.user.id !== parseInt(id)) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: "Недостаточно прав для редактирования",
        });
      }
    }

    // Проверяем уникальность username
    if (updates.username && updates.username !== user.username) {
      const existingUser = await User.findOne({
        where: {
          username: updates.username,
          id: { [Op.ne]: id },
        },
      });

      if (existingUser) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Пользователь с таким username уже существует",
        });
      }
    }

    // Хешируем пароль если он обновляется
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    await user.update(updates);

    // Логируем изменения
    const newValues = { ...updates };
    delete newValues.password; // не логируем пароли

    await AuditLogger.logUserUpdated(
      req.user.id,
      user.id,
      oldValues,
      newValues,
      req,
    );

    const updatedUser = await User.findByPk(id, {
      include: [
        {
          model: Team,
          as: "teams",
          through: { attributes: ["role"] },
        },
      ],
      attributes: { exclude: ["password"] },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: "Пользователь успешно обновлён",
    });
  } catch (error) {
    _error("Ошибка обновления пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка обновления пользователя",
    });
  }
});

/**
 * Деактивировать пользователя
 */
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Нельзя деактивировать самого себя",
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    await user.update({ status: "inactive" });

    // Деактивируем участие в командах
    await UserTeam.update(
      { status: "inactive", leftAt: new Date() },
      { where: { userId: id, status: "active" } },
    );

    // Логируем деактивацию
    await AuditLogger.logUserDeactivated(req.user.id, user.id, user, req);

    res.json({
      success: true,
      message: "Пользователь успешно деактивирован",
    });
  } catch (error) {
    _error("Ошибка деактивации пользователя:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка деактивации пользователя",
    });
  }
});

/**
 * Сброс Telegram ID
 */
router.post("/:id/reset-telegram", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const newTempId = `temp_${crypto.randomBytes(8).toString("hex")}`;
    await user.update({ telegramId: newTempId });

    await AuditLogger.log({
      adminId: req.user.id,
      userId: user.id,
      action: "reset_telegram",
      resource: "users",
      resourceId: id,
      description: "Сброшен Telegram ID",
      ipAddress: req.clientIP,
      userAgent: req.userAgent,
    });

    res.json({
      success: true,
      message:
        "Telegram ID сброшен. Пользователю необходимо заново подключиться к боту.",
    });
  } catch (error) {
    _error("Ошибка сброса Telegram:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка сброса Telegram ID",
    });
  }
});

/**
 * Сброс пароля пользователя
 */
router.post("/:id/reset-password", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Генерируем новый временный пароль
    const newPassword = crypto.randomBytes(8).toString("hex").toUpperCase();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({ password: hashedPassword });

    await AuditLogger.log({
      adminId: req.user.id,
      userId: user.id,
      action: "reset_password",
      resource: "users",
      resourceId: id,
      description: "Сброшен пароль пользователя",
      ipAddress: req.clientIP,
      userAgent: req.userAgent,
    });

    // Отправляем новый пароль в Telegram если возможно
    if (user.telegramId && !user.telegramId.startsWith("temp_")) {
      try {
        const passwordMessage = `🔐 Ваш пароль был сброшен\n\nНовый пароль: ${newPassword}\n\nРекомендуем сменить его после входа в систему.`;
        await sendTelegramMessage(user.telegramId, passwordMessage);
      } catch (telegramError) {
        // // info('Не удалось отправить пароль через Telegram:', telegramError);
      }
    }

    res.json({
      success: true,
      data: { newPassword },
      message: "Пароль успешно сброшен",
    });
  } catch (error) {
    _error("Ошибка сброса пароля:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка сброса пароля",
    });
  }
});

/**
 * Получить статистику пользователей
 */
router.get(
  "/stats/overview",
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const whereClause = {};

      // Менеджеры видят только статистику своих команд
      if (req.user.role === "manager") {
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

        const userIds = managedTeams.flatMap((team) =>
          team.members.map((member) => member.id),
        );
        if (userIds.length === 0) {
          return res.json({
            success: true,
            data: {
              total: 0,
              active: 0,
              inactive: 0,
              withTelegram: 0,
              byRole: {},
            },
          });
        }
        whereClause.id = { [Op.in]: userIds };
      }

      const [total, active, byRole, withTelegram] = await Promise.all([
        User.count({ where: whereClause }),
        User.count({ where: { ...whereClause, status: "active" } }),
        User.findAll({
          where: whereClause,
          attributes: [
            "role",
            [User.sequelize.fn("COUNT", User.sequelize.col("role")), "count"],
          ],
          group: ["role"],
          raw: true,
        }),
        User.count({
          where: {
            ...whereClause,
            telegramId: { [Op.not]: null, [Op.notLike]: "temp_%" },
          },
        }),
      ]);

      const roleStats = byRole.reduce((acc, item) => {
        acc[item.role] = parseInt(item.count);
        return acc;
      }, {});

      res.json({
        total,
        active,
        inactive: total - active,
        withTelegram,
        byRole: roleStats,
      });
    } catch (error) {
      _error("Ошибка получения статистики пользователей:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка получения статистики",
      });
    }
  },
);

/**
 * Управление участием в командах
 */
router.post("/:id/teams", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId, role = "member" } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const team = await Team.findByPk(teamId);
    if (!team) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Команда не найдена",
      });
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMembership = await UserTeam.findOne({
      where: { userId: id, teamId, status: "active" },
    });

    if (existingMembership) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Пользователь уже является участником этой команды",
      });
    }

    await UserTeam.create({
      userId: id,
      teamId,
      role,
      status: "active",
    });

    await AuditLogger.logTeamMembershipChanged(
      req.user.id,
      teamId,
      id,
      "add",
      req,
    );

    res.json({
      success: true,
      message: "Пользователь добавлен в команду",
    });
  } catch (error) {
    _error("Ошибка добавления в команду:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка добавления в команду",
    });
  }
});

/**
 * Удалить из команды
 */
router.delete(
  "/:id/teams/:teamId",
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id, teamId } = req.params;

      const membership = await UserTeam.findOne({
        where: { userId: id, teamId, status: "active" },
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
        teamId,
        id,
        "remove",
        req,
      );

      res.json({
        success: true,
        message: "Пользователь удалён из команды",
      });
    } catch (error) {
      _error("Ошибка удаления из команды:", error);
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка удаления из команды",
      });
    }
  },
);

module.exports = router;
