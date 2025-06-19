// Главная функция API для Vercel
const authHandler = require('./auth');
const usersHandler = require('./users');
const workLogsHandler = require('./work-logs');
const initDbHandler = require('./init-db');

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

  const { url } = req;
  const path = url.split('?')[0];

  try {
    // Маршрутизация API эндпоинтов
    
    // Аутентификация
    if (path.startsWith('/api/auth')) {
      return await authHandler(req, res);
    }
    
    // Пользователи
    if (path.startsWith('/api/users')) {
      return await usersHandler(req, res);
    }
    
    // Рабочие логи
    if (path.startsWith('/api/work-logs')) {
      return await workLogsHandler(req, res);
    }
    
    // Инициализация базы данных
    if (path === '/api/init-db') {
      return await initDbHandler(req, res);
    }

    // Health check
    if (path === '/api/health') {
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    }

    // Документация API
    if (path === '/api' || path === '/api/') {
      return res.status(200).json({
        message: 'HR TimeBot API v1.0',
        status: 'Полностью функциональный',
        timestamp: new Date().toISOString(),
        endpoints: {
          auth: {
            'POST /api/auth': 'Логин (email/password)',
            'POST /api/auth/telegram': 'Telegram авторизация', 
            'GET /api/auth/status': 'Проверка токена'
          },
          users: {
            'GET /api/users': 'Список пользователей',
            'POST /api/users': 'Создать пользователя (admin)',
            'GET /api/users/profile': 'Профиль текущего пользователя'
          },
          workLogs: {
            'GET /api/work-logs': 'Рабочие логи',
            'POST /api/work-logs': 'Создать рабочий лог',
            'PUT /api/work-logs/[id]': 'Обновить рабочий лог'
          },
          database: {
            'POST /api/init-db': 'Инициализация базы данных'
          },
          system: {
            'GET /api/health': 'Health check',
            'GET /api': 'Документация API'
          }
        },
        features: [
          '✅ JWT аутентификация',
          '✅ Telegram авторизация',
          '✅ Управление пользователями',
          '✅ Учёт рабочего времени',
          '✅ PostgreSQL подключение',
          '✅ Валидация данных',
          '✅ CORS поддержка',
          '✅ Автоматическая миграция БД'
        ],
        defaultAdmin: {
          email: 'admin@example.com',
          password: 'admin123',
          note: 'Создается автоматически при инициализации БД'
        }
      });
    }

    // 404 для неизвестных роутов
    return res.status(404).json({ 
      error: 'Эндпоинт не найден',
      path,
      availableEndpoints: [
        '/api',
        '/api/auth',
        '/api/users', 
        '/api/work-logs',
        '/api/init-db',
        '/api/health'
      ]
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 