#!/usr/bin/env node

"use strict";

console.log("🔧 Инициализация...");

require("dotenv").config();
console.log("✅ .env загружен");

try {
  console.log("📦 Загрузка модулей...");
  const TimeBot = require("./src/telegram/bot");
  console.log("✅ TimeBot загружен");

  console.log("🤖 Запуск Outcast TimeBot...");

  // Проверяем наличие токена
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env файле");
    process.exit(1);
  }
  console.log("✅ Токен найден");

  // Создаем и запускаем бота
  console.log("🚀 Создание экземпляра бота...");
  const bot = new TimeBot();
  
  console.log("✅ Бот успешно запущен!");
  console.log("📱 Бот готов к работе");
  console.log("🔗 Ссылка на бота: https://t.me/hr_oc_bot");
  
  // Обработка завершения работы
  process.on("SIGINT", () => {
    console.log("\n🛑 Получен сигнал завершения...");
    console.log("👋 Бот остановлен");
    process.exit(0);
  });
  
  process.on("SIGTERM", () => {
    console.log("\n🛑 Получен сигнал завершения...");
    console.log("👋 Бот остановлен");
    process.exit(0);
  });
  
} catch (error) {
  console.error("❌ Ошибка запуска бота:", error.message);
  console.error("📋 Stack trace:", error.stack);
  process.exit(1);
} 