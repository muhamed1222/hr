'use strict';

console.log('🚀 Запуск приложения...');

// Обработчики необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('❌ Необработанное исключение:', err.message);
  console.error('Stack trace:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

require('dotenv').config();

console.log('📋 Переменные окружения загружены');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const _TimeBot = require('./telegram/bot');
const { errorHandler, notFoundHandler } = require('./services/errors');
const { info, error, cron, telegram } = require('./utils/logger');

console.log('📦 Модули загружены');

const app = express();
const PORT = process.env.PORT || 3001;

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
// app.use('/api/auth', require('./routes/telegram-auth')); // Отключено из-за синтаксической ошибки
app.use('/api/telegram-admin', require('./routes/telegram-admin')); // Telegram админка
app.use('/api/users', require('./routes/users'));
app.use('/api/users-management', require('./routes/users-management'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/audit-logs', require('./routes/audit-logs'));
app.use('/api/work-logs', require('./routes/workLogs'));
app.use('/api/reports', require('./routes/reports'));
// app.use('/api/analytics', require('./routes/analytics')); // Временно отключено
app.use('/api/system-config', require('./routes/system-config')); // Системные настройки
app.use('/api/organizations', require('./routes/organizations')); // Управление организациями
app.use('/api/monitoring', require('./routes/monitoring')); // Мониторинг и health-checks
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
    console.log('🔄 Начинаем инициализацию...');
    
    // Подключение к базе данных
    console.log('🔗 Подключаемся к БД...');
    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');

    // Синхронизация моделей
    console.log('🔄 Синхронизируем модели...');
    await sequelize.sync({ force: false });
    console.log('✅ Модели синхронизированы');

    // Запуск сервера
    console.log('➡️ Перед запуском app.listen');
    app.listen(PORT, () => {
      info('Сервер запущен', { port: PORT, environment: process.env.NODE_ENV || 'development' });
      console.log(`✅ Сервер запущен на порту ${PORT}`);
    });

    // Запуск Telegram бота (временно отключён для тестирования API)
    console.log('🤖 Инициализируем Telegram бота...');
    telegram('Telegram бот временно отключён для тестирования API уведомлений');

    // Инициализация системы событий
    console.log('📡 Инициализируем систему событий...');
    const { initEventListeners, emitEvent } = require('./events/notifyOnEvent');
    initEventListeners();
    
    // Делаем emitEvent доступным глобально
    global.emitEvent = emitEvent;
    
    // Запуск системы событий
    emitEvent('system.startup');
    console.log('✅ Система событий инициализирована');

    // Запуск планировщика напоминаний
    console.log('⏰ Инициализируем планировщик напоминаний...');
    const ReminderScheduler = require('./cron/scheduler');
    global.reminderScheduler = new ReminderScheduler();
    cron('Планировщик напоминаний инициализирован');
    console.log('✅ Планировщик напоминаний инициализирован');

    // Инициализация ConfigService
    console.log('⚙️ Инициализируем ConfigService...');
    const ConfigService = require('./services/ConfigService');
    await ConfigService.initialize();
    global.ConfigService = ConfigService;
    console.log('✅ ConfigService инициализирован');

    // Инициализация мониторинга
    console.log('📊 Инициализируем систему мониторинга...');
    const MonitoringService = require('./services/MonitoringService');
    global.monitoringService = new MonitoringService();
    
    // Запуск автоматических backup'ов
    global.monitoringService.scheduleBackups();
    info('Система мониторинга и backup\'ов инициализирована');
    console.log('✅ Система мониторинга инициализирована');

    console.log('🎉 Инициализация завершена успешно!');

  } catch (err) {
    console.error('❌ Ошибка инициализации:', err.message);
    console.error('Stack trace:', err.stack);
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