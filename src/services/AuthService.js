"use strict";

const _bcrypt = require("bcryptjs");
const _jwt = require("jsonwebtoken");
const { User } = require("../models");
const {
  ValidationError,
  AuthenticationError,
  NotFoundError,
} = require("./errors");
const { metrics } = require("../utils/metrics");

/**
 * Сервис аутентификации
 * Содержит всю бизнес-логику связанную с аутентификацией пользователей
 */
class AuthService {
  /**
   * Аутентификация пользователя
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль
   * @returns {Promise<{user: Object, token: string}>}
   */
  async authenticate(username, password) {
    // Валидация входных данных
    if (!username || !password) {
      throw new ValidationError("Имя пользователя и пароль обязательны");
    }

    // Поиск пользователя
    const user = await User.findOne({
      where: { username },
    });

    if (!user) {
      metrics.recordAuthEvent("login", false);
      throw new AuthenticationError("Неверные учетные данные");
    }

    // Проверка пароля
    const isValidPassword = await this._validatePassword(user, password);
    if (!isValidPassword) {
      metrics.recordAuthEvent("login", false);
      throw new AuthenticationError("Неверные учетные данные");
    }

    // Проверка статуса пользователя
    if (user.status !== "active") {
      metrics.recordAuthEvent("login", false);
      throw new AuthenticationError("Неверные учетные данные");
    }

    // Проверка роли (только админы могут входить через API)
    if (user.role !== "admin") {
      metrics.recordAuthEvent("login", false);
      throw new AuthenticationError("Неверные учетные данные");
    }

    // Обновление времени последнего входа
    await user.update({ lastLogin: new Date() });

    // Генерация токена
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // Запись успешной аутентификации
    metrics.recordAuthEvent("login", true);

    return {
      token,
      user: this._sanitizeUser(user),
    };
  }

  /**
   * Верификация JWT токена
   * @param {string} token - JWT токен
   * @returns {Promise<Object>} - Объект пользователя
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findByPk(decoded.userId, {
        attributes: ["id", "name", "username", "role", "status"],
      });

      if (!user || user.status !== "active") {
        throw new AuthenticationError("Неверные учетные данные");
      }

      return user;
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        throw new AuthenticationError("Недействительный токен");
      }
      if (error.name === "TokenExpiredError") {
        throw new AuthenticationError("Токен истёк");
      }
      throw error;
    }
  }

  /**
   * Смена пароля пользователя
   * @param {number} userId - ID пользователя
   * @param {string} currentPassword - Текущий пароль
   * @param {string} newPassword - Новый пароль
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Поиск пользователя
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("Пользователь не найден");
    }

    // Проверка текущего пароля
    if (
      user.passwordHash &&
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      throw new AuthenticationError("Неверный текущий пароль");
    }

    // Валидация нового пароля
    if (!this._validatePasswordStrength(newPassword)) {
      throw new ValidationError(
        "Новый пароль должен содержать минимум 8 символов, включая заглавную букву, цифру и спецсимвол",
      );
    }

    // Хеширование нового пароля
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Обновление пароля
    await user.update({ passwordHash: newPasswordHash });

    // Запись успешной смены пароля
    metrics.recordAuthEvent("passwordChange", true);

    return this._sanitizeUser(user);
  }

  /**
   * Создание нового администратора
   * @param {Object} adminData - Данные администратора
   * @returns {Promise<Object>}
   */
  async createAdmin(adminData) {
    const { username, password, name } = adminData;

    // Проверка существования пользователя
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      throw new ValidationError("Пользователь с таким именем уже существует");
    }

    // Валидация пароля
    this._validateNewPassword(password);

    // Создание пользователя
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      passwordHash,
      name: name || username,
      role: "admin",
      status: "active",
    });

    return this._sanitizeUser(user);
  }

  /**
   * Валидация пароля при аутентификации
   * @private
   */
  async _validatePassword(user, password) {
    if (user.passwordHash) {
      return await bcrypt.compare(password, user.passwordHash);
    }

    // Совместимость с env переменными (только для перехода)
    if (
      user.username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Создаем хеш для будущих входов
      const passwordHash = await bcrypt.hash(password, 12);
      await user.update({ passwordHash });
      return true;
    }

    return false;
  }

  /**
   * Валидация нового пароля
   * @private
   */
  _validateNewPassword(password) {
    if (!password || password.length < 8) {
      throw new ValidationError("Пароль должен содержать минимум 8 символов");
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new ValidationError(
        "Пароль должен содержать заглавную букву, строчную букву, цифру и спецсимвол",
      );
    }
  }

  /**
   * Валидация силы пароля
   * @private
   */
  _validatePasswordStrength(password) {
    if (!password || password.length < 8) {
      return false;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  /**
   * Очистка пользовательских данных от чувствительной информации
   * @private
   */
  _sanitizeUser(user) {
    const userData = user.toJSON ? user.toJSON() : user;
    delete userData.passwordHash;
    delete userData.telegramId;
    return userData;
  }
}

module.exports = new AuthService();
