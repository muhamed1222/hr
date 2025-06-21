import jwt from 'jsonwebtoken';
import { User, UserAttributes, UserCreationAttributes } from '../models/User';
import { AppError } from './errors/AppError';
import { CacheService } from './CacheService';

interface LoginResponse {
  token: string;
  user: Omit<UserAttributes, 'password'>;
}

interface RegisterData extends Omit<UserCreationAttributes, 'role' | 'status'> {
  role?: 'user' | 'admin';
}

class AuthService {
  private static generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );
  }

  static async login(email: string, password: string): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Обновляем время последнего входа
    user.lastLoginAt = new Date();
    await user.save();

    // Инвалидируем кэш пользователя
    await CacheService.delete(`user:${user.id}`);

    const token = this.generateToken(user);

    return {
      token,
      user: user.toJSON()
    };
  }

  static async register(data: RegisterData): Promise<LoginResponse> {
    const existingUser = await User.findOne({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const user = await User.create({
      ...data,
      role: data.role || 'user',
      status: 'active'
    });

    const token = this.generateToken(user);

    return {
      token,
      user: user.toJSON()
    };
  }

  static async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      ) as { id: number };

      const user = await User.findByPk(decoded.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      return user;
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }
  }
}

export { AuthService, LoginResponse, RegisterData }; 