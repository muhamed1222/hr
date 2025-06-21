"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _fs = require("fs");
const _path = require("path");
const sequelize = require("../config/database");

async function migrate() {
  try {
    // // info('🔄 Начинаем миграцию базы данных...');

    // Проверяем подключение
    await sequelize.authenticate();
    // // info('✅ Подключение к базе данных установлено');

    // Синхронизируем модели (создаём таблицы)
    await sequelize.sync({ force: process.env.NODE_ENV === "development" });
    // // info('✅ Модели синхронизированы');

    // // info('🎉 Миграция завершена успешно!');
    process.exit(0);
  } catch (error) {
    _error("❌ Ошибка миграции:", error);
    process.exit(1);
  }
}

migrate();
