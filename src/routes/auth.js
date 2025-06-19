const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting для авторизации
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 для production, 50 для разработки
  message: {
    success: false,
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Аутентификация
router.post('/login', 
  loginLimiter, 
  AuthController.loginValidation, 
  AuthController.login
);

// Верификация токена
router.get('/verify', 
  authenticateToken, 
  AuthController.verify
);

// Смена пароля
router.post('/change-password', 
  authenticateToken,
  AuthController.changePasswordValidation,
  AuthController.changePassword
);

// Получение профиля пользователя
router.get('/profile', 
  authenticateToken, 
  AuthController.getProfile
);

// Выход из системы
router.post('/logout', 
  authenticateToken, 
  AuthController.logout
);

module.exports = router; 