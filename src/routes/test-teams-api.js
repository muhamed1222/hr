"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _express = require("express");
const router = _express.Router();
const { _Team, _WorkLog, User, _UserTeam } = require("../models");
const { authenticateToken, _requireRole } = require("../middleware/auth");

/**
 * Middleware для проверки роли администратора
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
      success: false,
      error: "Доступ разрешен только администраторам",
    });
  }
  next();
};

/**
 * POST /api/test-teams/create
 * Создание новой команды (тестовый API)
 */
router.post("/create", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Название команды должно содержать минимум 2 символа",
      });
    }

    // Проверяем уникальность имени
    const existingTeam = await _Team.findOne({ where: { name: name.trim() } });
    if (existingTeam) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Команда с таким названием уже существует",
      });
    }

    const team = await _Team.create({
      name: name.trim(),
      description: description?.trim() || null,
    });

    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      message: "Команда успешно создана",
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    _error("Ошибка создания команды:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: "Ошибка создания команды",
      details: error.message,
    });
  }
});

/**
 * GET /api/test-teams/list
 * Получение списка команд (тестовый API)
 */
router.get("/list", authenticateToken, isAdmin, async (req, res) => {
  try {
    const teams = await _Team.findAll({
      order: [["createdAt", "DESC"]],
    });

    const formattedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      status: team.status,
      managerId: team.managerId,
      createdAt: team.createdAt,
    }));

    res.json({
      success: true,
      data: formattedTeams,
      count: formattedTeams.length,
    });
  } catch (error) {
    _error("Ошибка получения команд:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: "Ошибка получения команд",
      details: error.message,
    });
  }
});

/**
 * GET /api/test-teams/users
 * Получение списка пользователей (тестовый API)
 */
router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "name",
        "username",
        "role",
        "status",
        "telegramId",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    _error("Ошибка получения пользователей:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: "Ошибка получения пользователей",
      details: error.message,
    });
  }
});

/**
 * PATCH /api/test-teams/user/:id/role
 * Изменение роли пользователя (тестовый API)
 */
router.patch("/user/:id/role", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["employee", "manager", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Недопустимая роль",
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: "Пользователь не найден",
      });
    }

    const oldRole = user.role;
    await user.update({ role });

    res.json({
      success: true,
      message: "Роль пользователя успешно изменена",
      data: {
        userId: user.id,
        userName: user.name,
        oldRole,
        newRole: role,
      },
    });
  } catch (error) {
    _error("Ошибка изменения роли:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: "Ошибка изменения роли",
      details: error.message,
    });
  }
});

module.exports = router;
