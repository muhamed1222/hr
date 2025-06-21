const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');

describe('System Config API', () => {
  let authToken;
  let adminUser;

  beforeAll(async () => {
    // Создаем тестового админа
    adminUser = await User.create({
      name: 'Test Admin',
      username: 'testadmin',
      role: 'admin',
      status: 'active'
    });

    // Получаем токен для аутентификации
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testpass'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Очищаем тестовые данные
    await User.destroy({ where: { username: 'testadmin' } });
  });

  describe('GET /api/system-config', () => {
    it('should return system configuration for admin', async () => {
      const response = await request(app)
        .get('/api/system-config')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('workSchedule');
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('features');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/system-config');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/system-config/frontend-config', () => {
    it('should return frontend configuration without auth', async () => {
      const response = await request(app)
        .get('/api/system-config/frontend-config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('workSchedule');
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('features');
    });
  });

  describe('PUT /api/system-config', () => {
    it('should update system configuration for admin', async () => {
      const updateData = {
        workSchedule: {
          startTime: '08:00',
          endTime: '17:00',
          lateThreshold: 10
        },
        notifications: {
          enabled: false,
          reminderEnabled: true
        }
      };

      const response = await request(app)
        .put('/api/system-config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.workSchedule.startTime).toBe('08:00');
      expect(response.body.data.notifications.enabled).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      // Создаем обычного пользователя
      const regularUser = await User.create({
        name: 'Test User',
        username: 'testuser',
        role: 'employee',
        status: 'active'
      });

      const userToken = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        })
        .then(res => res.body.token);

      const response = await request(app)
        .put('/api/system-config')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ workSchedule: { startTime: '09:00' } });

      expect(response.status).toBe(403);

      // Очищаем
      await User.destroy({ where: { username: 'testuser' } });
    });
  });
}); 