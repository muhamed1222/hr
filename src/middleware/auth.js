"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _jwt = require("jsonwebtoken");
const { User, Team, UserTeam } = require("../models");
const { _AuthenticationError, _AuthorizationError } = require("../services/errors");

// HTTP статус коды
const HTTP_STATUS_CODES = {
  UNAUTHORIZED: HTTP_STATUS_CODES.UNAUTHORIZED,
  FORBIDDEN: HTTP_STATUS_CODES.FORBIDDEN,
  NOT_FOUND: HTTP_STATUS_CODES.NOT_FOUND,
  INTERNAL_SERVER_ERROR: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
};

/**
 * Middleware для проверки JWT токена
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: "Токен доступа не предоставлен",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: "Недействительный токен",
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: "Токен истёк",
        });
      }
      throw error;
    }

    // Получаем актуальные данные пользователя
    const user = await User.findByPk(decoded.userId, {
      attributes: ["id", "name", "username", "role", "status", "telegramId"],
    });

    if (!user || user.status !== "active") {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: "Пользователь неактивен или не найден",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    _error("Ошибка аутентификации:", error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Внутренняя ошибка сервера",
    });
  }
};

/**
 * Middleware для проверки ролей
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: "Пользователь не аутентифицирован",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: "Недостаточно прав доступа",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Middleware для проверки доступа к команде
 */
const requireTeamAccess = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const user = req.user;

    // Админы имеют доступ ко всем командам
    if (user.role === "admin") {
      return next();
    }

    // Проверяем является ли пользователь менеджером команды
    const team = await Team.findByPk(teamId);
    if (team && team.managerId === user.id) {
      return next();
    }

    // Проверяем является ли пользователь участником команды
    const userTeam = await UserTeam.findOne({
      where: {
        userId: user.id,
        teamId: teamId,
        status: "active",
      },
    });

    if (!userTeam) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: "У вас нет доступа к этой команде",
      });
    }

    next();
  } catch (error) {
    _error("Ошибка проверки доступа к команде:", error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Ошибка проверки доступа",
    });
  }
};

/**
 * Middleware для проверки доступа к пользователю
 */
const requireUserAccess = (req, res, next) => {
  const { userId } = req.params;
  const currentUser = req.user;

  // Админы имеют доступ ко всем пользователям
  if (currentUser.role === "admin") {
    return next();
  }

  // Пользователи могут редактировать только себя
  if (currentUser.role === "employee" && currentUser.id !== parseInt(userId)) {
    return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
      success: false,
      message: "Вы можете редактировать только свои данные",
    });
  }

  // Менеджеры могут редактировать участников своих команд
  if (currentUser.role === "manager") {
    // Эта проверка будет выполнена в контроллере с загрузкой команд
    return next();
  }

  next();
};

/**
 * Middleware для логирования IP адреса
 */
const logRequestInfo = (req, res, next) => {
  req.clientIP =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  req.userAgent = req.headers["user-agent"] || "Unknown";

  next();
};

/**
 * Проверка на демо режим (запрет опасных операций)
 */
const checkDemoMode = (req, res, next) => {
  if (process.env.DEMO_MODE === "true") {
    const dangerousMethods = ["DELETE", "PUT"];
    const dangerousPaths = ["/api/users", "/api/teams"];

    if (
      dangerousMethods.includes(req.method) &&
      dangerousPaths.some((path) => req.path.startsWith(path))
    ) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: "Операция недоступна в демо режиме",
      });
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireTeamAccess,
  requireUserAccess,
  logRequestInfo,
  checkDemoMode,
};
