"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { logger } = require('./config/logging');
const { configureSecurityMiddleware } = require('./config/security');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { generateToken, verifyToken } = require('./middleware/csrf');
const apiLogger = require('./middleware/apiLogger');
const { sequelize } = require('./models');

// Инициализация приложения
logger.info("🚀 Запуск приложения...");

// Загрузка переменных окружения
require("dotenv").config();
logger.info("📋 Переменные окружения загружены");

// Загрузка базовых модулей
logger.info("📦 Базовые модули загружены");

// Загрузка Sequelize
logger.info("📊 Sequelize загружен");

// Загрузка остальных модулей
const { sslConfig, generateSelfSignedCert } = require("./config/ssl");
logger.info("📦 Остальные модули загружены");

// Загрузка роутов
const authRoutes = require("./routes/auth");
const telegramAuthRoutes = require("./routes/telegram-auth");
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

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"]
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Security configuration
configureSecurityMiddleware(app);

// Rate limiting setup
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 минут
const RATE_LIMIT_MAX_REQUESTS = 1000; // увеличен лимит для разработки
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later."
  }
});

// CSRF and rate limiting
app.use(generateToken);
app.use('/api', verifyToken, limiter);

// Logging
app.use(apiLogger);

// Metrics middleware (if available)
if (metricsRoutes && metricsRoutes.middleware) {
  app.use(metricsRoutes.middleware());
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/telegram-auth", telegramAuthRoutes);
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
app.use("/api/system-config", systemConfigRoutes);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    let dbStatus = "unknown";
    try {
      await sequelize.authenticate();
      dbStatus = "up";
    } catch (error) {
      dbStatus = "down";
      logger.error("Database connection error:", error);
    }

    res.json({
      success: true,
      status: "OK",
      timestamp: new Date().toISOString(),
      services: {
        api: "up",
        database: dbStatus
      }
    });
  } catch (error) {
    logger.error("Health check error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
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
    documentation: "/api-docs"
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// API 404 handler
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found"
  });
});

// Static files
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// React app handler
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Необработанная ошибка:', { 
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// Инициализация
async function initialize() {
  try {
    logger.info("🔄 Начинаем инициализацию...");

    // Подключение к базе данных
    logger.info("🔗 Подключаемся к БД...");
    if (sequelize) {
      await sequelize.authenticate();
      logger.info("✅ Подключение к БД установлено");

      // Синхронизация моделей
      logger.info("🔄 Синхронизируем модели...");
      await sequelize.sync({ force: false });
      logger.info("✅ Модели синхронизированы");
    } else {
      logger.warn("⚠️ Sequelize недоступен, пропускаем инициализацию БД");
    }

    // Генерация SSL сертификатов (если нужно)
    if (process.env.NODE_ENV !== "production" && generateSelfSignedCert) {
      generateSelfSignedCert();
    }

    // Инициализация Telegram бота
    logger.info("🤖 Инициализируем Telegram бота...");
    if (process.env.TELEGRAM_BOT_TOKEN) {
      logger.info("Telegram бот временно отключён для тестирования API уведомлений");
    }

    // Инициализация системы событий
    logger.info("📡 Инициализируем систему событий...");
    logger.info("✅ Система событий инициализирована");

    logger.info("✅ Инициализация завершена");
  } catch (error) {
    logger.error("❌ Ошибка при инициализации:", error);
    throw error;
  }
}

// Экспорт приложения и функции инициализации
module.exports = app;
module.exports.initialize = initialize;
