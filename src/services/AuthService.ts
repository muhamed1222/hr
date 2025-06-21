import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from './errors/AppError';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
}

interface JwtPayload {
  id: number;
  role: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_EXPIRES_IN = '24h';

  public async validateUser(email: string, password: string) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new AppError('Неверный email или пароль', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Неверный email или пароль', 401);
    }

    return user;
  }

  public generateToken(userId: string) {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  async register(data: RegisterData) {
    const existingUser = await User.findOne({ where: { email: data.email } });
    if (existingUser) {
      throw AppError.ValidationError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      name: data.username,
      userRole: 'user'
    });

    return user;
  }

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        throw AppError.NotFoundError('User');
      }
      
      return user;
    } catch (error) {
      throw AppError.AuthenticationError('Invalid token');
    }
  }
} 