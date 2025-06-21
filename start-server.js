#!/usr/bin/env node

"use strict";

console.log("🔧 Инициализация веб-сервера...");

require("dotenv").config();
console.log("✅ .env загружен");

try {
  console.log("📦 Загрузка модулей...");
  const app = require("./src/app");
  console.log("✅ app.js загружен");
  
  console.log("🚀 Веб-сервер готов к работе!");
  console.log("🌐 Ссылка: http://localhost:3000");
  console.log("📊 Health check: http://localhost:3000/health");
  
} catch (error) {
  console.error("❌ Ошибка запуска сервера:", error.message);
  console.error("📋 Stack trace:", error.stack);
  process.exit(1);
} 