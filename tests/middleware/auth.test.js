const { authenticateToken, requireRole, requireUserAccess } = require('../../src/middleware/auth');
const { User } = require('../../src/models');
const jwt = require('jsonwebtoken');

// Мокируем req, res, next
const createMockReqRes = () => {
  const req = {
    headers: {},
    user: null,
    params: {}
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('🛡️ Middleware аутентификации', () => {
  describe('authenticateToken', () => {
    describe('✅ Успешные сценарии', () => {
      test('должен успешно аутентифицировать пользователя с валидным токеном', async () => {
        const user = await testUtils.createTestAdmin();
        const token = testUtils.generateTestToken(user);
        
        const { req, res, next } = createMockReqRes();
        req.headers.authorization = `Bearer ${token}`;
        
        await authenticateToken(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(user.id);
        expect(res.status).not.toHaveBeenCalled();
      });

      test('должен загрузить связанные команды пользователя', async () => {
        const user = await testUtils.createTestAdmin();
        const token = testUtils.generateTestToken(user);
        
        const { req, res, next } = createMockReqRes();
        req.headers.authorization = `Bearer ${token}`;
        
        await authenticateToken(req, res, next);
        
        expect(req.user.teams).toBeDefined();
        expect(req.user.managedTeams).toBeDefined();
      });
    });

    describe('❌ Ошибки аутентификации', () => {
      test('должен отклонить запрос без токена', async () => {
        const { req, res, next } = createMockReqRes();
        
        await authenticateToken(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Токен доступа не предоставлен'
        });
        expect(next).not.toHaveBeenCalled();
      });

      test('должен отклонить невалидный токен', async () => {
        const { req, res, next } = createMockReqRes();
        req.headers.authorization = 'Bearer invalid-token';
        
        await authenticateToken(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Недействительный токен'
        });
        expect(next).not.toHaveBeenCalled();
      });

      test('должен отклонить истекший токен', async () => {
        const user = await testUtils.createTestAdmin();
        const expiredToken = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '-1h' } // токен истек час назад
        );
        
        const { req, res, next } = createMockReqRes();
        req.headers.authorization = `Bearer ${expiredToken}`;
        
        await authenticateToken(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Токен истёк'
        });
        expect(next).not.toHaveBeenCalled();
      });

      test('должен отклонить неактивного пользователя', async () => {
        const user = await testUtils.createTestAdmin({ status: 'inactive' });
        const token = testUtils.generateTestToken(user);
        
        const { req, res, next } = createMockReqRes();
        req.headers.authorization = `Bearer ${token}`;
        
        await authenticateToken(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Пользователь неактивен или не найден'
        });
        expect(next).not.toHaveBeenCalled();
      });

      test('должен отклонить токен несуществующего пользователя', async () => {
        const nonExistentToken = jwt.sign(
          { userId: 99999, role: 'admin' },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        
        const { req, res, next } = createMockReqRes();
        req.headers.authorization = `Bearer ${nonExistentToken}`;
        
        await authenticateToken(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Пользователь неактивен или не найден'
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireRole', () => {
    describe('✅ Успешные сценарии', () => {
      test('должен разрешить доступ пользователю с правильной ролью', () => {
        const { req, res, next } = createMockReqRes();
        req.user = { role: 'admin' };
        
        const middleware = requireRole(['admin', 'manager']);
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test('должен разрешить доступ при наличии одной из разрешенных ролей', () => {
        const { req, res, next } = createMockReqRes();
        req.user = { role: 'manager' };
        
        const middleware = requireRole(['admin', 'manager']);
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('❌ Ошибки авторизации', () => {
      test('должен отклонить неаутентифицированного пользователя', () => {
        const { req, res, next } = createMockReqRes();
        
        const middleware = requireRole(['admin']);
        middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Пользователь не аутентифицирован'
        });
        expect(next).not.toHaveBeenCalled();
      });

      test('должен отклонить пользователя с недостаточными правами', () => {
        const { req, res, next } = createMockReqRes();
        req.user = { role: 'employee' };
        
        const middleware = requireRole(['admin']);
        middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Недостаточно прав доступа',
          required: ['admin'],
          current: 'employee'
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireUserAccess', () => {
    describe('✅ Успешные сценарии', () => {
      test('должен разрешить админу доступ к любому пользователю', () => {
        const { req, res, next } = createMockReqRes();
        req.user = { role: 'admin', id: 1 };
        req.params = { userId: '2' };
        
        requireUserAccess(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test('должен разрешить сотруднику доступ к своим данным', () => {
        const { req, res, next } = createMockReqRes();
        req.user = { role: 'employee', id: 1 };
        req.params = { userId: '1' };
        
        requireUserAccess(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test('должен разрешить менеджеру доступ (проверка в контроллере)', () => {
        const { req, res, next } = createMockReqRes();
        req.user = { role: 'manager', id: 1 };
        req.params = { userId: '2' };
        
        requireUserAccess(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('❌ Ошибки доступа', () => {
      test('должен отклонить сотруднику доступ к чужим данным', () => {
        const { req, res, next } = createMockReqRes();
        req.user = { role: 'employee', id: 1 };
        req.params = { userId: '2' };
        
        requireUserAccess(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Вы можете редактировать только свои данные'
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('🧪 Интеграционные тесты', () => {
    test('должен корректно работать цепочка middleware', async () => {
      const user = await testUtils.createTestAdmin();
      const token = testUtils.generateTestToken(user);
      
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = `Bearer ${token}`;
      req.params = { userId: user.id.toString() };
      
      // Первый middleware - аутентификация
      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      
      // Второй middleware - проверка роли
      const roleMiddleware = requireRole(['admin']);
      roleMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      
      // Третий middleware - проверка доступа к пользователю
      requireUserAccess(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);
      
      // Убеждаемся, что ошибок не было
      expect(res.status).not.toHaveBeenCalled();
    });
  });
}); 