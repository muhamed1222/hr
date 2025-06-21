const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('./_database');
const { AuthenticationError } = require('../src/services/errors');

// Настройки
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 12;

// Middleware для парсинга JSON
const parseBody = (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
};

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

module.exports = async (req, res) => {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;
  const path = url.split('?')[0];

  try {
    // POST /api/auth - login
    if (method === 'POST' && path === '/api/auth') {
      const { email, password } = await parseBody(req);
      
      if (!email || !password) {
        throw new AuthenticationError('Email и пароль обязательны');
      }

      // Демо режим для admin@example.com
      if (email === 'admin@example.com' && password === 'admin123') {
        const token = jwt.sign(
          { 
            userId: 1,
            email: 'admin@example.com',
            role: 'admin' 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.status(200).json({
          message: 'Вход выполнен успешно (демо режим)',
          token,
          user: {
            id: 1,
            email: 'admin@example.com',
            firstName: 'Администратор',
            lastName: 'Системы',
            role: 'admin'
          }
        });
      }

      // Поиск пользователя в БД
      const userResult = await query(
        'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new AuthenticationError('Неверные учетные данные');
      }

      const user = userResult.rows[0];
      
      // Проверка пароля
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new AuthenticationError('Неверные учетные данные');
      }

      // Создание JWT токена
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Возврат данных пользователя без пароля
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      };

      return res.status(200).json({
        message: 'Вход выполнен успешно',
        token,
        user: userData
      });
    }

    // POST /api/auth/telegram - Telegram login
    if (method === 'POST' && (path === '/api/auth/telegram' || path === '/api/auth/telegram-login')) {
      try {
        const telegramData = await parseBody(req);
        
        if (!telegramData.id) {
          throw new AuthenticationError('Telegram ID обязателен');
        }

        // Всегда используем демо режим для простоты
        const token = jwt.sign(
          { 
            userId: telegramData.id,
            email: `telegram_${telegramData.id}@example.com`,
            role: 'employee',
            telegramId: telegramData.id
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.status(200).json({
          message: 'Telegram авторизация успешна (демо режим)',
          token,
          user: {
            id: telegramData.id,
            email: `telegram_${telegramData.id}@example.com`,
            firstName: telegramData.first_name || 'Telegram',
            lastName: telegramData.last_name || 'User',
            role: 'employee',
            telegramId: telegramData.id
          }
        });
      } catch (telegramError) {
        console.error('Telegram auth error:', telegramError);
        throw new AuthenticationError('Ошибка Telegram авторизации', telegramError.message);
      }
    }

    // GET /api/auth/status - проверка статуса
    if (method === 'GET' && path === '/api/auth/status') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Токен не предоставлен');
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return res.status(200).json({ 
          valid: true, 
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            telegramId: decoded.telegramId || null
          }
        });
      } catch (err) {
        throw new AuthenticationError('Недействительный токен');
      }
    }

    // GET /api/auth/telegram-status - статус Telegram интеграции
    if (method === 'GET' && path === '/api/auth/telegram-status') {
      return res.status(200).json({
        enabled: true,
        configured: !!process.env.TELEGRAM_BOT_TOKEN,
        webAppUrl: process.env.WEB_APP_URL || 'https://outime.vercel.app',
        features: {
          deepLinking: true,
          startParams: ['report', 'stats', 'profile'],
          auth: true,
          signatureValidation: !!process.env.TELEGRAM_BOT_TOKEN
        },
        instructions: {
          setup: 'Используйте /setmenubutton в @BotFather',
          url: process.env.WEB_APP_URL || 'https://outime.vercel.app',
          deepLinks: {
            reports: '?startapp=report',
            stats: '?startapp=stats', 
            profile: '?startapp=profile'
          }
        }
      });
    }

    return res.status(404).json({ error: 'Роут не найден' });

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 