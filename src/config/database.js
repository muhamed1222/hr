"use strict";

const { Sequelize } = require("sequelize");
require("dotenv").config();
const { debug: _debug } = require("../utils/logger");
const { LIMITS } = require("../constants");

// Конфигурация PostgreSQL
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: process.env.NODE_ENV === "development"
        ? (sql) => _debug("SQL запрос (PostgreSQL)", { sql })
        : false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === "production"
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
    })
  : new Sequelize({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dialect: "postgres",
      logging: process.env.NODE_ENV === "development"
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

module.exports = sequelize;
