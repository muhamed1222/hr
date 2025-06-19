const AuthService = require('../../src/services/AuthService');
const { User } = require('../../src/models');
const { ValidationError, AuthenticationError, NotFoundError } = require('../../src/services/errors');
const { setupTestDB, createTestUser, createTestAdmin } = require('../setup');

describe('AuthService', () => {
  beforeEach(async () => {
    await setupTestDB();
  });

  describe('authenticate', () => {
    it('должен успешно аутентифицировать пользователя с корректными данными', async () => {
      const admin = await createTestAdmin('admin1', 'TestPassword123!');
      
      const result = await AuthService.authenticate('admin1', 'TestPassword123!');
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.username).toBe('admin1');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('должен выбросить ValidationError при отсутствии username', async () => {
      await expect(AuthService.authenticate('', 'password'))
        .rejects.toThrow(ValidationError);
    });

    it('должен выбросить ValidationError при отсутствии password', async () => {
      await expect(AuthService.authenticate('username', ''))
        .rejects.toThrow(ValidationError);
    });

    it('должен выбросить AuthenticationError для несуществующего пользователя', async () => {
      await expect(AuthService.authenticate('nonexistent', 'password'))
        .rejects.toThrow(AuthenticationError);
    });

    it('должен выбросить AuthenticationError для неактивного пользователя', async () => {
      const admin = await createTestAdmin('inactive', 'TestPassword123!');
      await admin.update({ status: 'inactive' });

      await expect(AuthService.authenticate('inactive', 'TestPassword123!'))
        .rejects.toThrow(AuthenticationError);
    });

    it('должен выбросить AuthenticationError для неверного пароля', async () => {
      await createTestAdmin('admin2', 'TestPassword123!');

      await expect(AuthService.authenticate('admin2', 'wrongpassword'))
        .rejects.toThrow(AuthenticationError);
    });

    it('должен обновить время последнего входа при успешной аутентификации', async () => {
      const admin = await createTestAdmin('admin3', 'TestPassword123!');
      const oldLastLogin = admin.lastLogin;

      await new Promise(resolve => setTimeout(resolve, 100));
      await AuthService.authenticate('admin3', 'TestPassword123!');

      await admin.reload();
      expect(admin.lastLogin).not.toEqual(oldLastLogin);
    });
  });

  describe('verifyToken', () => {
    it('должен успешно верифицировать валидный токен', async () => {
      const admin = await createTestAdmin('admin4', 'TestPassword123!');
      const { token } = await AuthService.authenticate('admin4', 'TestPassword123!');

      const user = await AuthService.verifyToken(token);
      
      expect(user.id).toBe(admin.id);
      expect(user.username).toBe('admin4');
    });

    it('должен выбросить AuthenticationError для недействительного токена', async () => {
      await expect(AuthService.verifyToken('invalid.token.here'))
        .rejects.toThrow(AuthenticationError);
    });

    it('должен выбросить AuthenticationError для неактивного пользователя', async () => {
      const admin = await createTestAdmin('admin5', 'TestPassword123!');
      const { token } = await AuthService.authenticate('admin5', 'TestPassword123!');
      
      await admin.update({ status: 'inactive' });

      await expect(AuthService.verifyToken(token))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('changePassword', () => {
    it('должен успешно изменить пароль', async () => {
      const admin = await createTestAdmin('admin6', 'OldPassword123!');
      
      await AuthService.changePassword(admin.id, 'OldPassword123!', 'NewPassword123!');
      
      // Проверяем что можем войти с новым паролем
      const result = await AuthService.authenticate('admin6', 'NewPassword123!');
      expect(result.user.username).toBe('admin6');
    });

    it('должен выбросить NotFoundError для несуществующего пользователя', async () => {
      await expect(AuthService.changePassword(999, 'old', 'NewPassword123!'))
        .rejects.toThrow(NotFoundError);
    });

    it('должен выбросить AuthenticationError для неверного текущего пароля', async () => {
      const admin = await createTestAdmin('admin7', 'TestPassword123!');

      await expect(AuthService.changePassword(admin.id, 'wrongpassword', 'NewPassword123!'))
        .rejects.toThrow(AuthenticationError);
    });

    it('должен выбросить ValidationError для слабого нового пароля', async () => {
      const admin = await createTestAdmin('admin8', 'TestPassword123!');

      await expect(AuthService.changePassword(admin.id, 'TestPassword123!', 'weak'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('createAdmin', () => {
    it('должен успешно создать нового администратора', async () => {
      const adminData = {
        username: 'newadmin',
        password: 'SecurePassword123!',
        name: 'New Admin'
      };

      const admin = await AuthService.createAdmin(adminData);
      
      expect(admin.username).toBe('newadmin');
      expect(admin.name).toBe('New Admin');
      expect(admin.role).toBe('admin');
      expect(admin.status).toBe('active');
      expect(admin).not.toHaveProperty('passwordHash');
    });

    it('должен выбросить ValidationError при создании админа с существующим username', async () => {
      await createTestAdmin('existing', 'TestPassword123!');

      const adminData = {
        username: 'existing',
        password: 'SecurePassword123!',
        name: 'Duplicate Admin'
      };

      await expect(AuthService.createAdmin(adminData))
        .rejects.toThrow(ValidationError);
    });

    it('должен выбросить ValidationError для слабого пароля', async () => {
      const adminData = {
        username: 'weakpassword',
        password: 'weak',
        name: 'Weak Password Admin'
      };

      await expect(AuthService.createAdmin(adminData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('_sanitizeUser', () => {
    it('должен удалить чувствительные данные из объекта пользователя', async () => {
      const admin = await createTestAdmin('sanitize', 'TestPassword123!');
      const { user } = await AuthService.authenticate('sanitize', 'TestPassword123!');

      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('telegramId');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('name');
    });
  });
}); 