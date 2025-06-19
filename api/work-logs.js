const jwt = require('jsonwebtoken');
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
  const urlParams = new URLSearchParams(url.split('?')[1] || '');

  try {
    // Проверка авторизации
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    // GET /api/work-logs - получить рабочие логи  
    if (method === 'GET' && path === '/api/work-logs') {
      // В демо режиме всегда возвращаем демо данные
      if (!process.env.DATABASE_URL) {
        return res.status(200).json({
          message: 'Рабочие логи получены успешно (демо режим)',
          workLogs: [{
            id: 1,
            date: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60,
            description: 'Демонстрационный рабочий день',
            userId: 1,
            user: {
              firstName: 'Администратор',
              lastName: 'Системы',
              email: 'admin@example.com'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          },
          note: 'Демо данные - база данных не подключена'
        });
      }

      // Реальная логика для БД (пока не активна)
      return res.status(200).json({
        message: 'Рабочие логи получены успешно',
        workLogs: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      });
    }

    // POST /api/work-logs - создать новый рабочий лог
    if (method === 'POST' && path === '/api/work-logs') {
      const { date, startTime, endTime, breakDuration = 0, description = '' } = await parseBody(req);
      
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ 
          error: 'Дата, время начала и время окончания обязательны' 
        });
      }

      // Проверка валидности времени
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      
      if (end <= start) {
        return res.status(400).json({ 
          error: 'Время окончания должно быть позже времени начала' 
        });
      }

      // Проверка существования лога на эту дату
      const existingLog = await query(
        'SELECT id FROM work_logs WHERE user_id = $1 AND date = $2',
        [user.userId, date]
      );

      if (existingLog.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Рабочий лог на эту дату уже существует' 
        });
      }

      // Создание рабочего лога
      const newLogResult = await query(
        `INSERT INTO work_logs (user_id, date, start_time, end_time, break_duration, description) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, date, start_time, end_time, break_duration, description, created_at`,
        [user.userId, date, startTime, endTime, breakDuration, description]
      );

      const newLog = newLogResult.rows[0];

      return res.status(201).json({
        message: 'Рабочий лог создан успешно',
        workLog: {
          id: newLog.id,
          date: newLog.date,
          startTime: newLog.start_time,
          endTime: newLog.end_time,
          breakDuration: newLog.break_duration,
          description: newLog.description,
          userId: user.userId,
          createdAt: newLog.created_at
        }
      });
    }

    // PUT /api/work-logs/[id] - обновить рабочий лог
    if (method === 'PUT' && path.startsWith('/api/work-logs/')) {
      const logId = path.split('/').pop();
      const { startTime, endTime, breakDuration, description } = await parseBody(req);

      // Проверка прав доступа
      const logResult = await query(
        'SELECT user_id FROM work_logs WHERE id = $1',
        [logId]
      );

      if (logResult.rows.length === 0) {
        return res.status(404).json({ error: 'Рабочий лог не найден' });
      }

      const logUserId = logResult.rows[0].user_id;
      
      // Пользователь может редактировать только свои логи, админ - любые
      if (user.role !== 'admin' && logUserId !== user.userId) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }

      // Проверка валидности времени
      if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        if (end <= start) {
          return res.status(400).json({ 
            error: 'Время окончания должно быть позже времени начала' 
          });
        }
      }

      // Обновление лога
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (startTime) {
        updateFields.push(`start_time = $${++paramCount}`);
        updateValues.push(startTime);
      }
      if (endTime) {
        updateFields.push(`end_time = $${++paramCount}`);
        updateValues.push(endTime);
      }
      if (breakDuration !== undefined) {
        updateFields.push(`break_duration = $${++paramCount}`);
        updateValues.push(breakDuration);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        updateValues.push(description);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(logId);

      const updatedLogResult = await query(
        `UPDATE work_logs 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount + 1}
         RETURNING id, date, start_time, end_time, break_duration, description, updated_at`,
        updateValues
      );

      const updatedLog = updatedLogResult.rows[0];

      return res.status(200).json({
        message: 'Рабочий лог обновлён успешно',
        workLog: {
          id: updatedLog.id,
          date: updatedLog.date,
          startTime: updatedLog.start_time,
          endTime: updatedLog.end_time,
          breakDuration: updatedLog.break_duration,
          description: updatedLog.description,
          updatedAt: updatedLog.updated_at
        }
      });
    }

    return res.status(404).json({ error: 'Роут не найден' });

  } catch (error) {
    console.error('Work logs API error:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 