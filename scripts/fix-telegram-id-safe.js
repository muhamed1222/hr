require('dotenv').config();
const { sequelize } = require('../src/models');

async function fixTelegramIdSafe() {
  try {
    console.log('🔧 Безопасное исправление ограничения NOT NULL для telegram_id...');
    
    // Проверяем подключение к базе данных
    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');
    
    // Отключаем внешние ключи временно
    console.log('🔓 Отключение внешних ключей...');
    await sequelize.query('PRAGMA foreign_keys=OFF;');
    
    // Создаем временную таблицу
    console.log('📋 Создание временной таблицы...');
    
    await sequelize.query(`
      CREATE TABLE users_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id BIGINT,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        password_hash VARCHAR(255),
        role TEXT DEFAULT 'employee',
        status TEXT DEFAULT 'active',
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
    
    // Проверяем, есть ли данные в users
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM users;');
    const hasData = results[0].count > 0;
    
    if (hasData) {
      console.log('📤 Копирование существующих данных...');
      // Копируем существующие данные, обрабатывая NULL telegram_id
      await sequelize.query(`
        INSERT INTO users_temp (
          id, telegram_id, name, username, password_hash, role, status,
          created_at, updated_at, vacation_days, temporary_password,
          telegram_temp_id, telegram_username, telegram_first_name,
          telegram_last_name, created_via_telegram, last_login
        )
        SELECT 
          id, 
          CASE WHEN telegram_id = 0 THEN NULL ELSE telegram_id END,
          name, username, password_hash, role, status,
          created_at, updated_at, vacation_days, temporary_password,
          telegram_temp_id, telegram_username, telegram_first_name,
          telegram_last_name, created_via_telegram, last_login
        FROM users;
      `);
      console.log('✅ Данные скопированы');
    }
    
    // Удаляем старую таблицу и переименовываем новую
    console.log('🔄 Замена таблиц...');
    await sequelize.query('DROP TABLE users;');
    await sequelize.query('ALTER TABLE users_temp RENAME TO users;');
    console.log('✅ Таблица заменена');
    
    // Создаем индексы
    console.log('📇 Создание индексов...');
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id) WHERE telegram_id IS NOT NULL;
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username_status ON users(username, status);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash) WHERE password_hash IS NOT NULL;
    `);
    console.log('✅ Индексы созданы');
    
    // Включаем внешние ключи обратно
    console.log('🔒 Включение внешних ключей...');
    await sequelize.query('PRAGMA foreign_keys=ON;');
    
    console.log('🎉 Ограничение исправлено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
    // Всегда включаем внешние ключи обратно в случае ошибки
    try {
      await sequelize.query('PRAGMA foreign_keys=ON;');
    } catch (e) {
      console.error('❌ Не удалось включить внешние ключи:', e);
    }
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Запускаем исправление
fixTelegramIdSafe().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
}); 