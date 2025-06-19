'use strict';

const { Sequelize } = require('sequelize');
require('dotenv').config();
const { debug } = require('../utils/logger');

// Определяем конфигурацию в зависимости от типа БД
let sequelize;

if (process.env.DB_TYPE === 'sqlite') {
  // SQLite конфигурация для быстрого тестирования
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? (sql) => debug('SQL запрос (SQLite)', { sql }) : false,
  });
} else {
  // PostgreSQL конфигурация для продакшна
  sequelize = new Sequelize({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? (sql) => debug('SQL запрос (PostgreSQL)', { sql }) : false,
    timezone: process.env.TZ || 'Europe/Moscow',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

module.exports = sequelize; 