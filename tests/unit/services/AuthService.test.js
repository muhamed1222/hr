const AuthService = require('../../../src/services/AuthService');
const { User } = require('../../../src/models');
const { AppError } = require('../../../src/services/errors/AppError');

// Мокаем модель User
jest.mock('../../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('должен успешно аутентифицировать пользователя с правильными учетными данными', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: '$2b$10$mockHashedPassword',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
    });

    it('должен выбрасывать ошибку при неверных учетных данных', async () => {
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne.mockResolvedValue(mockUser);

      await expect(AuthService.login('test@example.com', 'wrongpassword'))
        .rejects
        .toThrow(AppError);
    });

    it('должен выбрасывать ошибку, если пользователь не найден', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(AuthService.login('nonexistent@example.com', 'password123'))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('register', () => {
    it('должен успешно регистрировать нового пользователя', async () => {
      const mockUser = {
        id: 1,
        email: 'new@example.com',
        name: 'Test User'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);

      const result = await AuthService.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'Test User'
      });

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(User.create).toHaveBeenCalled();
    });

    it('должен выбрасывать ошибку, если email уже существует', async () => {
      User.findOne.mockResolvedValue({ id: 1 });

      await expect(AuthService.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User'
      }))
        .rejects
        .toThrow(AppError);
    });
  });
}); 