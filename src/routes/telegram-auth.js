const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auditLogger } = require('../utils/auditLogger');
const { HTTP_STATUS_CODES } = require('../constants');

const router = express.Router();

/**
 * Валидация данных инициализации Telegram WebApp
 * @param {string} initData - строка initData от Telegram
 * @param {string} botToken - токен бота
 * @returns {boolean} валидность подписи
 */
function verifyTelegramInitData(initData, botToken) {
  try {
    // Парсим URL-параметры
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      // // console.log('❌ Telegram auth: отсутствует hash');
      return false;
    }
    
    // Удаляем hash из параметров для создания строки проверки
    urlParams.delete('hash');
    
    // Сортируем параметры по ключу
    const sortedParams = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Создаем секретный ключ из токена бота
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    // Вычисляем подпись
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');
    
    const isValid = computedHash === hash;
    
    
    return isValid;
  } catch (error) {
    console.error('❌ Ошибка валидации Telegram данных:', error);
    return false;
  }
}

/**
 * Парсинг данных пользователя из initData
 * @param {string} initData - строка initData от Telegram
 * @returns {object|null} данные пользователя
 */
function parseTelegramUser(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const userString = urlParams.get('user');
    
    if (!userString) {
      // // console.log('❌ Telegram auth: отсутствуют данные пользователя');
      return null;
    }
    
    const userData = JSON.parse(decodeURIComponent(userString));
    return userData;
  } catch (error) {
    console.error('❌ Ошибка парсинга данных пользователя:', error);
    return null;
  }
}

/**
 * Поиск или создание пользователя по Telegram данным
 * @param {object} telegramUser - данные пользователя из Telegram
 * @returns {object} пользователь из базы данных
 */
async function findOrCreateUserByTelegram(telegramUser) {
  try {
    // Ищем пользователя по telegram_id
    let user = await User.findOne({
      where: { telegram_id: telegramUser.id.toString() }
    });
    
    if (user) {
      // Обновляем данные пользователя из Telegram
      await user.update({
        telegram_username: telegramUser.username,
        telegram_first_name: telegramUser.first_name,
        telegram_last_name: telegramUser.last_name,
        last_login: new Date()
      });
      
      // // console.log('✅ Найден существующий пользователь:', user.username);
      return user;
    }
    
    // Создаем нового пользователя
    const username = telegramUser.username || `user_${telegramUser.id}`;
    const name = `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim();
    
    user = await User.create({
      username: username,
      name: name,
      telegram_id: telegramUser.id.toString(),
      telegram_username: telegramUser.username,
      telegram_first_name: telegramUser.first_name,
      telegram_last_name: telegramUser.last_name,
      role: 'employee', // По умолчанию роль сотрудника
      created_via_telegram: true,
      last_login: new Date()
    });
    
    // // console.log('🆕 Создан новый пользователь из Telegram:', user.username);
    return user;
  } catch (error) {
    console.error('❌ Ошибка поиска/создания пользователя:', error);
    throw error;
  }
}

/**
 * POST /api/auth/telegram-login
 * Аутентификация через Telegram WebApp
 */
router.post('/telegram-login', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        error: 'Отсутствуют данные инициализации Telegram'
      });
    }
    
    // Проверяем токен бота
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('❌ Не настроен TELEGRAM_BOT_TOKEN');
      return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        error: 'Telegram аутентификация не настроена'
      });
    }
    
    // Валидируем подпись Telegram
    const isValid = verifyTelegramInitData(initData, botToken);
    if (!isValid) {
      await auditLogger.logSecurityEvent(null, 'invalid_telegram_signature', {
        initData: initData.substring(0, 100) // Логируем только начало для безопасности
      });
      
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        error: 'Недействительная подпись Telegram'
      });
    }
    
    // Парсим данные пользователя
    const telegramUser = parseTelegramUser(initData);
    if (!telegramUser) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        error: 'Не удалось получить данные пользователя из Telegram'
      });
    }
    
    // Находим или создаем пользователя
    const user = await findOrCreateUserByTelegram(telegramUser);
    
    // Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        role: user.role,
        telegramId: user.telegram_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Логируем успешную аутентификацию
    await auditLogger.logUserAction(user.id, 'telegram_login', {
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      ip: req.ip
    });
    
    // console.log('✅ Успешная Telegram аутентификация:', {
    //   userId: user.id,
    //   username: user.username,
    //   telegramId: user.telegram_id
    // });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        telegram_id: user.telegram_id,
        telegram_username: user.telegram_username
      }
    });
  } catch (error) {
    console.error('❌ Ошибка аутентификации через Telegram:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * GET /api/auth/telegram-status
 * Проверка статуса Telegram бота
 */
router.get('/telegram-status', (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  res.json({
    enabled: !!botToken && botToken !== 'placeholder',
    bot_username: process.env.TELEGRAM_BOT_USERNAME || null
  });
});

module.exports = router; 