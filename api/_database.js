// Простое подключение к PostgreSQL для Vercel Functions
let pool = null;

const getPool = () => {
  if (!pool) {
    // Проверяем доступность PostgreSQL
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️ DATABASE_URL не установлен, используется mock режим');
      return null;
    }

    try {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      console.log('✅ PostgreSQL pool создан');
    } catch (error) {
      console.error('❌ Ошибка подключения к PostgreSQL:', error);
      return null;
    }
  }
  return pool;
};

const query = async (text, params) => {
  const client = getPool();
  
  if (!client) {
    // Mock режим - возвращаем пустые результаты
    console.warn('🔧 Mock mode: query:', text.substring(0, 50) + '...');
    return {
      rows: [],
      rowCount: 0
    };
  }

  try {
    const result = await client.query(text, params);
    return result;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

module.exports = { query, getPool }; 