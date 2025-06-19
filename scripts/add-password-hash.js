require('dotenv').config();
const { sequelize } = require('../src/models');

async function addPasswordHashField() {
  try {
    console.log('🔧 Добавление поля password_hash в таблицу users...');
    
    // Проверяем подключение к базе данных
    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');
    
    // Добавляем поле password_hash
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    `);
    console.log('✅ Поле password_hash добавлено');
    
    // Создаем индексы для оптимизации
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username_status ON users(username, status);
    `);
    console.log('✅ Индекс username_status создан');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash) WHERE password_hash IS NOT NULL;
    `);
    console.log('✅ Индекс password_hash создан');
    
    console.log('🎉 Миграция завершена успешно!');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ Поле password_hash уже существует');
    } else {
      console.error('❌ Ошибка миграции:', error.message);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Запускаем миграцию
addPasswordHashField().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
}); 