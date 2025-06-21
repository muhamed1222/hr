"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const AuthController = require("../controllers/AuthController");
const { authenticateToken } = require("../middleware/auth");
const { User } = require("../models");
const { Op } = require("sequelize");
const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../utils/logger");
const { HTTP_STATUS_CODES, LIMITS, TIME_CONSTANTS } = require("../constants");
const { body } = require("express-validator");

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Аутентификация пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Имя пользователя
 *               password:
 *                 type: string
 *                 description: Пароль пользователя
 *     responses:
 *       200:
 *         description: Успешная аутентификация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT токен
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: ID пользователя
 *                     username:
 *                       type: string
 *                       description: Имя пользователя
 *                     role:
 *                       type: string
 *                       description: Роль пользователя
 *       401:
 *         description: Неверные учетные данные
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  AuthController.login
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
