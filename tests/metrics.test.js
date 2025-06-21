const request = require('supertest');
const app = require('../src/app');
const metrics = require('../src/utils/metrics');

describe('Metrics API', () => {
  let authToken;

  beforeAll(async () => {
    // Получаем токен для аутентификации
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    authToken = loginResponse.body.token;
  });

  describe('GET /api/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requests');
      expect(response.body.data).toHaveProperty('auth');
      expect(response.body.data).toHaveProperty('system');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/metrics');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/metrics/requests', () => {
    it('should return detailed request statistics', async () => {
      const response = await request(app)
        .get('/api/metrics/requests')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requests');
      expect(response.body.data).toHaveProperty('topEndpoints');
      expect(response.body.data).toHaveProperty('topMethods');
    });
  });

  describe('GET /api/metrics/alerts', () => {
    it('should return system alerts', async () => {
      const response = await request(app)
        .get('/api/metrics/alerts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('activeCount');
      expect(response.body.data).toHaveProperty('totalCount');
    });
  });

  describe('Metrics Collection', () => {
    it('should collect request metrics', () => {
      const stats = metrics.getStats();
      expect(stats).toHaveProperty('requests');
      expect(stats.requests).toHaveProperty('total');
      expect(stats.requests).toHaveProperty('errors');
      expect(stats.requests).toHaveProperty('errorRate');
    });

    it('should collect auth metrics', () => {
      const stats = metrics.getStats();
      expect(stats).toHaveProperty('auth');
      expect(stats.auth).toHaveProperty('logins');
      expect(stats.auth).toHaveProperty('failedLogins');
    });

    it('should collect system metrics', () => {
      const stats = metrics.getStats();
      expect(stats).toHaveProperty('system');
      expect(stats.system).toHaveProperty('memory');
      expect(stats.system).toHaveProperty('cpu');
    });
  });
}); 