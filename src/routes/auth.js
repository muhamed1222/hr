"use strict";

const _express = require("express");
const _rateLimit = require("express-rate-limit");
const _AuthController = require("../controllers/AuthController");
const { authenticateToken } = require("../middleware/auth");

// Константы
const TIME_CONSTANTS = {
  MINUTE: 60 * LIMITS.MAX_PAGE_SIZE0, // 1 минута в миллисекундах
  HOUR: 60 * TIME_CONSTANTS.MINUTE, // 1 час в миллисекундах
  DAY: 24 * 60 * TIME_CONSTANTS.MINUTE, // 1 день в миллисекундах
};

const LIMITS = {
  DEFAULT_PAGE_SIZE: LIMITS.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE0: LIMITS.MAX_PAGE_SIZE0,
};

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
