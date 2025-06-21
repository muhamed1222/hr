"use strict";

const { _info, _error, _warn, _debug } = require("./utils/logger");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Инициализация приложения
_info("🚀 Запуск приложения...");

// Загрузка переменных окружения
require("dotenv").config();
_info("📋 Переменные окружения загружены");

// Загрузка базовых модулей
const sequelize = require("./config/database");
_info("📦 Базовые модули загружены");

// Загрузка Sequelize
_info("📊 Sequelize загружен");

// Загрузка остальных модулей
const { sslConfig, generateSelfSignedCert } = require("./config/ssl");
const { errorHandler, notFoundHandler } = require("./services/errors");
_info("📦 Остальные модули загружены");

// Загрузка роутов
const authRoutes = require("./routes/auth");
const telegramAdminRoutes = require("./routes/telegram-admin");
const userRoutes = require("./routes/users");
const usersManagementRoutes = require("./routes/users-management");
const teamRoutes = require("./routes/teams");
const auditLogRoutes = require("./routes/audit-logs");
const workLogRoutes = require("./routes/workLogs");
const reportsRoutes = require("./routes/reports");
const metricsRoutes = require("./routes/metrics");
const telegramRoutes = require("./routes/telegram");
const analyticsRoutes = require("./routes/analytics");
const systemConfigRoutes = require("./routes/system-config");
const scheduleRoutes = require("./routes/schedule");
const remindersRoutes = require("./routes/reminders");
const testEventsRoutes = require("./routes/test-events");
const testTeamsApiRoutes = require("./routes/test-teams-api");

const app = express();
const DEFAULT_PORT = 3000;
const DEFAULT_HTTPS_PORT = 3443;
const PORT = process.env.PORT || DEFAULT_PORT;
const HTTPS_PORT = process.env.HTTPS_PORT || DEFAULT_HTTPS_PORT;

// Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://localhost:5173",
          "ws://localhost:5173",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }),
);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com", "https://www.yourdomain.com"]
        : [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://localhost:3443",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "null", // для файлов, открытых напрямую в браузере
          ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для сбора метрик (если доступен)
if (metricsRoutes && metricsRoutes.middleware) {
  app.use(metricsRoutes.middleware());
}

// Rate limiting (временно отключено для разработки)
const RATE_LIMIT_WINDOW_MS = 15 * TIME_CONSTANTS.MINUTE; // 15 минут
const RATE_LIMIT_MAX_REQUESTS = LIMITS.MAX_PAGE_SIZE0; // увеличен лимит для разработки
const _limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
});
// app.use('/api/', _limiter); // отключено для разработки

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/telegram-admin", telegramAdminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users-management", usersManagementRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/work-logs", workLogRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/test-events", testEventsRoutes);
app.use("/api/test-teams", testTeamsApiRoutes);

// Добавляем недостающие роуты для устранения HTTP_STATUS_CODES.NOT_FOUND ошибок
app.use("/api/stats", analyticsRoutes);
app.use("/api/employees", userRoutes);
app.use("/api/logs", workLogRoutes);
app.use("/api/settings", systemConfigRoutes);
app.use("/api/system-config", systemConfigRoutes);

// Health check
app.get("/health", (req, res) => {
  const memUsage = process.memoryUsage();

  const response = {
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: Math.floor(process.uptime()) + "s",
    system: {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
      },
    },
  };

  // Добавляем метрики если доступны
  if (metricsRoutes && metricsRoutes.getStats) {
    const stats = metricsRoutes.getStats();
    response.metrics = {
      requests: {
        total: stats.requests.total,
        errors: stats.requests.errors,
        errorRate: stats.requests.errorRate,
        avgResponseTime: stats.requests.avgResponseTime,
      },
      auth: {
        logins: stats.auth.logins,
        failedLogins: stats.auth.failedLogins,
      },
      system: {
        cpu: stats.system.cpu,
      },
    };
  }

  res.json(response);
});

// API Documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "HR Management API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      teams: "/api/teams",
      workLogs: "/api/work-logs",
      reports: "/api/reports",
      health: "/health",
    },
    documentation: "https://docs.example.com",
  });
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, "../admin-panel/dist")));

// Handle React routing, return all requests to React app
app.get("*", (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith("/api/") || req.path === "/health") {
    return next();
  }

  // Serve React app for all other routes
  res.sendFile(path.join(__dirname, "../admin-panel/dist/index.html"));
});

// HTTP_STATUS_CODES.NOT_FOUND handler (only for API routes)
if (notFoundHandler) {
  app.use("/api/*", notFoundHandler);
}

// Global error handler
if (errorHandler) {
  app.use(errorHandler);
}

// Инициализация
async function initialize() {
  try {
    _info("🔄 Начинаем инициализацию...");

    // Подключение к базе данных
    _info("🔗 Подключаемся к БД...");
    if (sequelize) {
      await sequelize.authenticate();
      _info("✅ Подключение к БД установлено");

      // Синхронизация моделей
      _info("🔄 Синхронизируем модели...");
      await sequelize.sync({ force: false });
      _info("✅ Модели синхронизированы");
    } else {
      _warn("⚠️ Sequelize недоступен, пропускаем инициализацию БД");
    }

    // Генерация SSL сертификатов (если нужно)
    if (process.env.NODE_ENV !== "production" && generateSelfSignedCert) {
      generateSelfSignedCert();
    }

    // Запуск сервера
    _info("➡️ Перед запуском app.listen");

    // HTTP сервер
    app.listen(PORT, () => {
      _info("HTTP сервер запущен");
      _info(`✅ HTTP сервер запущен на порту ${PORT}`);
    });

    // HTTPS сервер (если настроен)
    if (sslConfig && sslConfig.enabled) {
      const https = require("https");
      const httpsServer = https.createServer(sslConfig.options, app);
      httpsServer.listen(HTTPS_PORT, () => {
        _info("HTTPS сервер запущен");
        _info(`🔐 HTTPS сервер запущен на порту ${HTTPS_PORT}`);
      });
    }

    // Инициализация Telegram бота
    _info("🤖 Инициализируем Telegram бота...");
    if (process.env.TELEGRAM_BOT_TOKEN) {
      // ___TimeBot.init(); // Временно отключено для тестирования
      _info("Telegram бот временно отключён для тестирования API уведомлений");
    }

    // Инициализация системы событий
    _info("📡 Инициализируем систему событий...");
    try {
      const { _eventEmitter } = require("./events/eventEmitter");
      _info("✅ Система событий инициализирована");
    } catch (err) {
      _warn("⚠️ Система событий недоступна:", err.message);
    }

    // Инициализация планировщика напоминаний
    _info("⏰ Инициализируем планировщик напоминаний...");
    try {
      const { _scheduler } = require("./cron/scheduler");
      _info("✅ Планировщик напоминаний инициализирован");
    } catch (err) {
      _warn("⚠️ Планировщик напоминаний недоступен:", err.message);
    }

    // Инициализация системы алертов
    _info("🚨 Инициализируем систему алертов...");
    try {
      const { alertSystem } = require("./utils/alerts");
      if (alertSystem && alertSystem.init) {
        alertSystem.init();
        _info("✅ Система алертов инициализирована");
      } else {
        _warn("⚠️ Система алертов недоступна");
      }
    } catch (err) {
      _warn("⚠️ Система алертов недоступна:", err.message);
    }

    _info("🎉 Инициализация завершена успешно!");
  } catch (err) {
    _error("❌ Ошибка инициализации:", err);
    process.exit(1);
  }
}

// Запуск приложения
try {
  initialize();
} catch (err) {
  _error("❌ Критическая ошибка при запуске приложения:", err);
  _error("Stack trace:", err.stack);
  process.exit(1);
}
