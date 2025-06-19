const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('./_database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для парсинга JSON
const parseBody = (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
};

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// Middleware для проверки авторизации
const authenticate = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = async (req, res) => {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;
  const path = url.split('?')[0];

  try {
    // Проверка авторизации
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    // GET /api/users - получить список пользователей
    if (method === 'GET' && path === '/api/users') {
      const usersResult = await query(`
        SELECT 
          id, 
          email, 
          first_name, 
          last_name, 
          role, 
          telegram_id,
          created_at,
          updated_at
        FROM users 
        ORDER BY created_at DESC
      `);

      // В mock режиме возвращаем демо пользователя
      if (usersResult.rows.length === 0 && !process.env.DATABASE_URL) {
        return res.status(200).json({
          message: 'Пользователи получены успешно (демо режим)',
          users: [{
            id: 1,
            email: 'admin@example.com',
            firstName: 'Администратор',
            lastName: 'Системы',
            role: 'admin',
            telegramId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          total: 1,
          note: 'Демо данные - база данных не подключена'
        });
      }

      const users = usersResult.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        telegramId: user.telegram_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      return res.status(200).json({
        message: 'Пользователи получены успешно',
        users,
        total: users.length
      });
    }

    // POST /api/users - создать нового пользователя
    if (method === 'POST' && path === '/api/users') {
      // Проверка прав админа
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }

      const { email, password, firstName, lastName, role = 'employee' } = await parseBody(req);
      
      if (!email || !password || !firstName) {
        return res.status(400).json({ 
          error: 'Email, пароль и имя обязательны' 
        });
      }

      // Проверка существования пользователя
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
      }

      // Хеширование пароля
      const passwordHash = await bcrypt.hash(password, 12);

      // Создание пользователя
      const newUserResult = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, first_name, last_name, role, created_at`,
        [email, passwordHash, firstName, lastName, role]
      );

      const newUser = newUserResult.rows[0];

      return res.status(201).json({
        message: 'Пользователь создан успешно',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          createdAt: newUser.created_at
        }
      });
    }

    // GET /api/users/profile - получить профиль текущего пользователя
    if (method === 'GET' && path === '/api/users/profile') {
      const userResult = await query(
        `SELECT 
          id, email, first_name, last_name, role, telegram_id, created_at, updated_at
         FROM users WHERE id = $1`,
        [user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const userData = userResult.rows[0];

      return res.status(200).json({
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          telegramId: userData.telegram_id,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at
        }
      });
    }

    return res.status(404).json({ error: 'Роут не найден' });

  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 