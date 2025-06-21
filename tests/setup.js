const { Sequelize } = require('sequelize');
const { logger } = require('../src/config/logging');
const Database = require('better-sqlite3');

// Отключаем логирование во время тестов
logger.silent = true;

// Создаем тестовую базу данных в памяти
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  dialectModule: Database
});

// Глобальные моки
global.mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  flushall: jest.fn()
};

// Мокаем модуль ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => global.mockRedisClient);
});

// Мокаем JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ userId: 1 })
}));

// Мокаем bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Очищаем все моки после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});

// Закрываем соединения после всех тестов
afterAll(async () => {
  await sequelize.close();
}); 