"use strict";

const { logger } = require("../config/logging");

const _fs = require("fs");
const _path = require("path");
const sequelize = require("../config/database");

async function migrate() {
  try {
    console.log('🔄 Начинаем миграцию базы данных...');

    // Проверяем подключение
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    // Синхронизируем модели (создаём таблицы)
    await sequelize.sync({ force: process.env.NODE_ENV === "development" });
    console.log('✅ Модели синхронизированы');

    console.log('🎉 Миграция завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка миграции:", error);
    process.exit(1);
  }
}

migrate();
