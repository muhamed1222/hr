"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const AuthController = require("../controllers/AuthController");
const { authenticateToken } = require("../middleware/auth");
const { User } = require("../models");
const { Op } = require("sequelize");
const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../utils/logger");
const { HTTP_STATUS_CODES, LIMITS, TIME_CONSTANTS } = require("../constants");

const router = express.Router();

// Rate limiting для авторизации
const loginLimiter = rateLimit({
  windowMs: 15 * TIME_CONSTANTS.MINUTE, // 15 минут
  max: process.env.NODE_ENV === "production" ? 5 : LIMITS.DEFAULT_PAGE_SIZE, // 5 для production, LIMITS.DEFAULT_PAGE_SIZE для разработки
  message: {
    success: false,
    message: "Слишком много попыток входа. Попробуйте через 15 минут.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Аутентификация
router.post(
  "/login",
  loginLimiter,
  AuthController.loginValidation,
  AuthController.login,
);

// Верификация токена
router.get("/verify", authenticateToken, AuthController.verify);

// Смена пароля
router.post(
  "/change-password",
  authenticateToken,
  AuthController.changePasswordValidation,
  AuthController.changePassword,
);

// Получение профиля пользователя
router.get("/profile", authenticateToken, AuthController.getProfile);

// Выход из системы
router.post("/logout", authenticateToken, AuthController.logout);

module.exports = router;
