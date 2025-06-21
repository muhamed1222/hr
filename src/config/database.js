"use strict";

const { Sequelize } = require("sequelize");
require("dotenv").config();
const { debug: _debug } = require("../utils/logger");
const { LIMITS } = require("../constants");

// Определяем конфигурацию в зависимости от типа БД
let sequelize;

if (process.env.DATABASE_URL) {
  // Продакшн конфигурация с DATABASE_URL (Railway, Heroku и т.д.)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging:
      process.env.NODE_ENV === "development"
        ? (sql) => _debug("SQL запрос (PostgreSQL)", { sql })
        : false,
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: LIMITS.MAX_PAGE_SIZE00,
    },
  });
} else if (process.env.DB_TYPE === "sqlite") {
  // SQLite конфигурация для быстрого тестирования
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_STORAGE || "./database.sqlite",
    logging:
      process.env.NODE_ENV === "development"
        ? (sql) => _debug("SQL запрос (SQLite)", { sql })
        : false,
  });
} else {
  // PostgreSQL конфигурация для локальной разработки
  sequelize = new Sequelize({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: "postgres",
    logging:
      process.env.NODE_ENV === "development"
        ? (sql) => _debug("SQL запрос (PostgreSQL)", { sql })
        : false,
    timezone: process.env.TZ || "Europe/Moscow",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: LIMITS.MAX_PAGE_SIZE00,
    },
  });
}

module.exports = sequelize;
