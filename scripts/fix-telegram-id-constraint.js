require('dotenv').config();
const { sequelize } = require('../src/models');

async function fixTelegramIdConstraint() {
  try {
    console.log('🔧 Исправление ограничения NOT NULL для telegram_id...');
    
    // Проверяем подключение к базе данных
    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');
    
    // В SQLite мы можем создать новую таблицу и перенести данные
    console.log('📋 Создание временной таблицы...');
    
    await sequelize.query(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id BIGINT UNIQUE,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        password_hash VARCHAR(255),
        role TEXT CHECK(role IN ('employee', 'manager', 'admin')) DEFAULT 'employee',
        status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        vacation_days INTEGER NOT NULL DEFAULT 28,
        temporary_password VARCHAR(255),
        telegram_temp_id VARCHAR(255),
        telegram_username VARCHAR(255),
        telegram_first_name VARCHAR(255),
        telegram_last_name VARCHAR(255),
        created_via_telegram BOOLEAN DEFAULT FALSE,
        last_login DATETIME
      );
    `);
    console.log('✅ Временная таблица создана');
    
    // Копируем данные
    console.log('📤 Копирование данных...');
    await sequelize.query(`
      INSERT INTO users_new (
        id, telegram_id, name, username, password_hash, role, status,
        created_at, updated_at, vacation_days, temporary_password,
        telegram_temp_id, telegram_username, telegram_first_name,
        telegram_last_name, created_via_telegram, last_login
      )
      SELECT 
        id, telegram_id, name, username, password_hash, role, status,
        created_at, updated_at, vacation_days, temporary_password,
        telegram_temp_id, telegram_username, telegram_first_name,
        telegram_last_name, created_via_telegram, last_login
      FROM users;
    `);
    console.log('✅ Данные скопированы');
    
    // Удаляем старую таблицу и переименовываем новую
    console.log('🔄 Замена таблиц...');
    await sequelize.query('DROP TABLE users;');
    await sequelize.query('ALTER TABLE users_new RENAME TO users;');
    console.log('✅ Таблица заменена');
    
    // Создаем индексы
    console.log('📇 Создание индексов...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username_status ON users(username, status);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash) WHERE password_hash IS NOT NULL;
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id) WHERE telegram_id IS NOT NULL;
    `);
    console.log('✅ Индексы созданы');
    
    console.log('🎉 Ограничение исправлено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Запускаем исправление
fixTelegramIdConstraint().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
}); 