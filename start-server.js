#!/usr/bin/env node

"use strict";

console.log("🔧 Инициализация веб-сервера...");

require("dotenv").config();
console.log("✅ .env загружен");

const { logger } = require("./src/config/logging");

const app = require("./src/app");
console.log("✅ app.js загружен");

// Получаем порт из переменной окружения или используем 3001 по умолчанию
const port = process.env.PORT || 3001;

// Запускаем инициализацию перед запуском сервера
app.initialize().then(() => {
  const server = app.listen(port, () => {
    logger.info(`✅ Сервер запущен на порту ${port}`);
    console.log(`🌐 Ссылка: http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
  });

  // Обработка ошибок сервера
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Порт ${port} уже используется`);
      process.exit(1);
    } else {
      logger.error('❌ Ошибка сервера:', error);
      process.exit(1);
    }
  });
}).catch(error => {
  logger.error("❌ Критическая ошибка при инициализации:", error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log("🛑 Получен сигнал SIGTERM, завершаем работу...");
  server.close(() => {
    console.log("✅ Сервер остановлен");
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log("🛑 Получен сигнал SIGINT, завершаем работу...");
  server.close(() => {
    console.log("✅ Сервер остановлен");
    process.exit(0);
  });
}); 