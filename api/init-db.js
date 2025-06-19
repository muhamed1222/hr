const { query } = require('./_database');
const bcrypt = require('bcrypt');

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const createTables = async () => {
  try {
    // Создание таблицы users
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'employee',
        telegram_id BIGINT UNIQUE,
        telegram_username VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы teams
    await query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы work_logs
    await query(`
      CREATE TABLE IF NOT EXISTS work_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_duration INTEGER DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);

    // Создание таблицы user_teams
    await query(`
      CREATE TABLE IF NOT EXISTS user_teams (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, team_id)
      )
    `);

    // Создание таблицы absences
    await query(`
      CREATE TABLE IF NOT EXISTS absences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы audit_logs
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание индексов
    await query('CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, date)');
    await query('CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(date)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');

    console.log('✅ Таблицы созданы успешно');
    return true;
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
    throw error;
  }
};

const createDefaultAdmin = async () => {
  try {
    // Проверка существования админа
    const existingAdmin = await query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('👤 Админ уже существует');
      return;
    }

    // Создание админа по умолчанию
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5)`,
      ['admin@example.com', passwordHash, 'Администратор', 'Системы', 'admin']
    );

    console.log('👤 Админ создан: admin@example.com / admin123');
  } catch (error) {
    console.error('❌ Ошибка создания админа:', error);
    throw error;
  }
};

module.exports = async (req, res) => {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешён' });
  }

  try {
    await createTables();
    await createDefaultAdmin();

    return res.status(200).json({
      message: 'База данных инициализирована успешно',
      details: {
        tables: ['users', 'teams', 'work_logs', 'user_teams', 'absences', 'audit_logs'],
        defaultAdmin: {
          email: 'admin@example.com',
          password: 'admin123'
        }
      }
    });
  } catch (error) {
    console.error('Database init error:', error);
    return res.status(500).json({ 
      error: 'Ошибка инициализации базы данных',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 