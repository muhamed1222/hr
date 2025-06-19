const { sequelize } = require('../src/models');

// Настройка базы данных для тестов
beforeAll(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // пересоздаем таблицы для каждого тестового запуска
  } catch (error) {
    console.error('Ошибка настройки тестовой БД:', error);
    throw error;
  }
});

// Очистка после каждого теста
afterEach(async () => {
  try {
    // Очищаем все таблицы
    const models = Object.values(sequelize.models);
    for (const model of models) {
      await model.destroy({ where: {}, force: true });
    }
  } catch (error) {
    console.error('Ошибка очистки БД после теста:', error);
  }
});

// Закрытие соединения после всех тестов
afterAll(async () => {
  try {
    await sequelize.close();
  } catch (error) {
    console.error('Ошибка закрытия БД:', error);
  }
});

// Функция для настройки БД в отдельных тестах
const setupTestDB = async () => {
  try {
    // Очищаем все таблицы
    const models = Object.values(sequelize.models);
    for (const model of models) {
      await model.destroy({ where: {}, force: true });
    }
  } catch (error) {
    console.error('Ошибка очистки БД в setupTestDB:', error);
  }
};

// Функция для создания тестового пользователя
const createTestUser = async (usernameOrData = 'testuser', password = null, userData = {}) => {
  const { User } = require('../src/models');
  const bcrypt = require('bcryptjs');
  
  // Поддержка обоих форматов: createTestUser(userData) и createTestUser(username, password, userData)
  let finalData;
  if (typeof usernameOrData === 'object' && usernameOrData !== null) {
    // Старый формат: createTestUser({username: 'test', ...})
    finalData = {
      name: 'Test User',
      username: 'testuser',
      role: 'employee',
      status: 'active',
      ...usernameOrData
    };
  } else {
    // Новый формат: createTestUser('username', 'password', {})
    finalData = {
      name: userData.name || 'Test User',
      username: usernameOrData,
      role: userData.role || 'employee',
      status: userData.status || 'active',
      ...userData
    };
    
    if (password) {
      finalData.passwordHash = await bcrypt.hash(password, 12);
    }
  }

  return await User.create(finalData);
};

// Функция для создания тестового админа
const createTestAdmin = async (usernameOrData = 'testadmin', password = 'TestPass123!', userData = {}) => {
  const { User } = require('../src/models');
  const bcrypt = require('bcryptjs');
  
  // Поддержка обоих форматов: createTestAdmin(userData) и createTestAdmin(username, password, userData)
  let finalData;
  if (typeof usernameOrData === 'object' && usernameOrData !== null) {
    // Старый формат: createTestAdmin({username: 'test', ...})
    finalData = {
      name: 'Test Admin',
      username: 'testadmin',
      role: 'admin',
      status: 'active',
      passwordHash: await bcrypt.hash('TestPass123!', 12),
      ...usernameOrData
    };
  } else {
    // Новый формат: createTestAdmin('username', 'password', {})
    finalData = {
      name: userData.name || 'Test Admin',
      username: usernameOrData,
      role: 'admin',
      status: 'active',
      passwordHash: await bcrypt.hash(password, 12),
      ...userData
    };
  }
  
  return await User.create(finalData);
};

// Функция для генерации JWT токена для тестов
const generateTestToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      userId: user.id,
      id: user.id,
      role: user.role,
      username: user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Глобальные утилиты для тестов (backward compatibility)
global.testUtils = {
  createTestUser,
  createTestAdmin,
  generateTestToken
};

// Экспорт для использования в новых тестах
module.exports = {
  setupTestDB,
  createTestUser,
  createTestAdmin,
  generateTestToken
}; 