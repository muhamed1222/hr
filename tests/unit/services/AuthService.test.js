const { AuthService } = require('../../../src/services/AuthService');
const { User } = require('../../../src/models/User');
const { AppError } = require('../../../src/services/errors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../../../src/models/User');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User'
    };

    it('should successfully login user with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'correctPassword'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockToken');

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result).toEqual({
        token: 'mockToken',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        })
      });
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: credentials.email }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        mockUser.password
      );
    });

    it('should throw error when user not found', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'anyPassword'
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw error when password is incorrect', async () => {
      // Arrange
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.login({
          email: mockUser.email,
          password: 'wrongPassword'
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('register', () => {
    const mockUserData = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User'
    };

    it('should successfully register new user', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockResolvedValue({
        id: 1,
        ...mockUserData,
        password: 'hashedPassword'
      });
      jwt.sign.mockReturnValue('mockToken');

      // Act
      const result = await authService.register(mockUserData);

      // Assert
      expect(result).toEqual({
        token: 'mockToken',
        user: expect.objectContaining({
          id: 1,
          email: mockUserData.email,
          name: mockUserData.name
        })
      });
      expect(User.create).toHaveBeenCalledWith({
        ...mockUserData,
        password: 'hashedPassword'
      });
    });

    it('should throw error when user already exists', async () => {
      // Arrange
      User.findOne.mockResolvedValue({ id: 1 });

      // Act & Assert
      await expect(
        authService.register(mockUserData)
      ).rejects.toThrow(AppError);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded token data for valid token', () => {
      // Arrange
      const mockDecodedData = { userId: 1 };
      jwt.verify.mockReturnValue(mockDecodedData);

      // Act
      const result = authService.verifyToken('validToken');

      // Assert
      expect(result).toEqual(mockDecodedData);
      expect(jwt.verify).toHaveBeenCalledWith(
        'validToken',
        process.env.JWT_SECRET
      );
    });

    it('should throw error for invalid token', () => {
      // Arrange
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => {
        authService.verifyToken('invalidToken');
      }).toThrow(AppError);
    });
  });
}); 