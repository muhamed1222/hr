const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ValidationError, AuthenticationError, NotFoundError } = require('./errors');

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
    if (!username || !password) {
      throw new ValidationError('Имя пользователя и пароль обязательны');
    }

    // Поиск активного админа
    const user = await User.findOne({
      where: { 
        username: username.trim(),
        status: 'active',
        role: 'admin'
      }
    });

    if (!user) {
      throw new AuthenticationError('Неверные учетные данные');
    }

    // Проверка пароля
    const isValidPassword = await this._validatePassword(user, password);
    if (!isValidPassword) {
      throw new AuthenticationError('Неверные учетные данные');
    }

    // Обновление времени последнего входа
    await this._updateLastLogin(user);

    // Генерация токена
    const token = this._generateToken(user);

    return {
      user: this._sanitizeUser(user),
      token
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
        attributes: ['id', 'name', 'username', 'role', 'status'],
        include: ['teams', 'managedTeams']
      });

      if (!user || user.status !== 'active') {
        throw new AuthenticationError('Пользователь неактивен или не найден');
      }

      return user;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Недействительный токен');
      }
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Токен истёк');
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
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }

    // Проверка текущего пароля
    if (user.passwordHash && !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AuthenticationError('Неверный текущий пароль');
    }

    // Валидация нового пароля
    this._validateNewPassword(newPassword);

    // Хеширование и сохранение
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await user.update({ passwordHash });
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
      throw new ValidationError('Пользователь с таким именем уже существует');
    }

    // Валидация пароля
    this._validateNewPassword(password);

    // Создание пользователя
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      passwordHash,
      name: name || username,
      role: 'admin',
      status: 'active'
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
    if (user.username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD) {
      // Создаем хеш для будущих входов
      const passwordHash = await bcrypt.hash(password, 12);
      await user.update({ passwordHash });
      return true;
    }

    return false;
  }

  /**
   * Обновление времени последнего входа
   * @private
   */
  async _updateLastLogin(user) {
    await user.update({ lastLogin: new Date() });
  }

  /**
   * Генерация JWT токена
   * @private
   */
  _generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id,
        id: user.id, // для совместимости
        role: user.role, 
        username: user.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
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

  /**
   * Валидация нового пароля
   * @private
   */
  _validateNewPassword(password) {
    if (!password || password.length < 8) {
      throw new ValidationError('Пароль должен содержать минимум 8 символов');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new ValidationError(
        'Пароль должен содержать заглавную букву, строчную букву, цифру и спецсимвол'
      );
    }
  }
}

module.exports = new AuthService(); 