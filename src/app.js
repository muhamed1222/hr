'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const _TimeBot = require('./telegram/bot');
const { errorHandler, notFoundHandler } = require('./services/errors');
const { info, error, cron, telegram } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (временно отключено для разработки)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000 // увеличен лимит для разработки
});
// app.use('/api/', limiter); // отключено для разработки

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/telegram-auth')); // Telegram аутентификация
app.use('/api/telegram-admin', require('./routes/telegram-admin')); // Telegram админка
app.use('/api/users', require('./routes/users'));
app.use('/api/users-management', require('./routes/users-management'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/audit-logs', require('./routes/audit-logs'));
app.use('/api/work-logs', require('./routes/workLogs'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/absences', require('./routes/absences'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/test-events', require('./routes/test-events')); // Тестирование событий
app.use('/api/test-teams', require('./routes/test-teams-api')); // Тестирование API команд

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'HR Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      teams: '/api/teams',
      workLogs: '/api/work-logs',
      reports: '/api/reports',
      health: '/health'
    },
    documentation: 'https://docs.example.com'
  });
});

// 404 handler
app.use('*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// Инициализация
async function initialize() {
  try {
    // Подключение к базе данных
    await sequelize.authenticate();
    info('Подключение к БД установлено');

    // Синхронизация моделей
    await sequelize.sync({ force: false });
    info('Модели синхронизированы');

    // Запуск сервера
    app.listen(PORT, () => {
      info('Сервер запущен', { port: PORT, environment: process.env.NODE_ENV || 'development' });
    });

    // Запуск Telegram бота (временно отключён для тестирования API)
    telegram('Telegram бот временно отключён для тестирования API уведомлений');

    // Инициализация системы событий
    const { initEventListeners, emitEvent } = require('./events/notifyOnEvent');
    initEventListeners();
    
    // Делаем emitEvent доступным глобально
    global.emitEvent = emitEvent;
    
    // Запуск системы событий
    emitEvent('system.startup');

    // Запуск планировщика напоминаний
    const ReminderScheduler = require('./cron/scheduler');
    global.reminderScheduler = new ReminderScheduler();
    cron('Планировщик напоминаний инициализирован');

  } catch (err) {
    error('Ошибка инициализации', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  info('Получен сигнал SIGINT - завершение работы');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  info('Получен сигнал SIGTERM - завершение работы');
  await sequelize.close();
  process.exit(0);
});

initialize(); 