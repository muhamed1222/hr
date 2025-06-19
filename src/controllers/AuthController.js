const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const { asyncHandler } = require('../services/errors');

/**
 * Контроллер аутентификации
 * Обрабатывает HTTP запросы и делегирует бизнес-логику сервисам
 */
class AuthController {
  /**
   * Валидация для логина
   */
  static loginValidation = [
    body('username')
      .isLength({ min: 3, max: 50 })
      .trim()
      .escape()
      .withMessage('Имя пользователя должно быть от 3 до 50 символов'),
    body('password')
      .isLength({ min: 6, max: 128 })
      .withMessage('Пароль должен быть от 6 до 128 символов')
  ];

  /**
   * Валидация для смены пароля
   */
  static changePasswordValidation = [
    body('currentPassword')
      .isLength({ min: 6, max: 128 })
      .withMessage('Текущий пароль обязателен'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Новый пароль должен содержать минимум 8 символов, включая заглавную букву, цифру и спецсимвол')
  ];

  /**
   * Аутентификация пользователя
   */
  static login = asyncHandler(async (req, res) => {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные данные',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
    
    // Делегируем бизнес-логику сервису
    const result = await AuthService.authenticate(username, password);
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  });

  /**
   * Верификация токена
   */
  static verify = asyncHandler(async (req, res) => {
    res.json({
      success: true,
      user: req.user
    });
  });

  /**
   * Смена пароля
   */
  static changePassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные данные',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    // Делегируем бизнес-логику сервису
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });
  });

  /**
   * Создание администратора (для CLI скриптов)
   */
  static createAdmin = asyncHandler(async (adminData) => {
    return await AuthService.createAdmin(adminData);
  });

  /**
   * Получение информации о текущем пользователе
   */
  static getProfile = asyncHandler(async (req, res) => {
    const user = await AuthService.verifyToken(req.headers.authorization?.split(' ')[1]);
    
    res.json({
      success: true,
      user: AuthService._sanitizeUser ? AuthService._sanitizeUser(user) : user
    });
  });

  /**
   * Выход из системы (очистка токена на клиенте)
   */
  static logout = asyncHandler(async (req, res) => {
    // В будущем здесь можно добавить blacklist токенов
    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });
  });
}

module.exports = AuthController; 