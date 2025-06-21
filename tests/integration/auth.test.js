const request = require('supertest');
const { app } = require('../../src/app');
const { User } = require('../../src/models/User');
const { sequelize } = require('../../src/config/database');
const bcrypt = require('bcrypt');

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User'
    };

    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(validUser.email);
      expect(response.body.user.name).toBe(validUser.name);
      expect(response.body.user).not.toHaveProperty('password');

      // Проверяем, что пользователь сохранен в базе
      const savedUser = await User.findOne({
        where: { email: validUser.email }
      });
      expect(savedUser).not.toBeNull();
      expect(savedUser.email).toBe(validUser.email);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate email', async () => {
      // Сначала создаем пользователя
      await User.create(validUser);

      // Пытаемся создать пользователя с тем же email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User'
    };

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await User.create({
        ...testUser,
        password: hashedPassword
      });
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;
    const testUser = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User'
    };

    beforeEach(async () => {
      // Создаем пользователя и получаем токен
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await User.create({
        ...testUser,
        password: hashedPassword
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      token = loginResponse.body.token;
    });

    it('should return user data for authenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 for request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 