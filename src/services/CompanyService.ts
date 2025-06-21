import { Transaction } from 'sequelize';
import bcrypt from 'bcrypt';
import Company from '../models/Company';
import User from '../models/User';
import { sequelize } from '../config/database';
import { AppError } from './errors/AppError';

interface RegisterCompanyData {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

interface RegistrationResult {
  companyId: string;
  adminId: string;
}

export class CompanyService {
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  public async registerCompanyWithAdmin(data: RegisterCompanyData): Promise<RegistrationResult> {
    const { companyName, adminName, adminEmail, adminPassword } = data;

    // Выполняем все операции в транзакции
    const result = await sequelize.transaction(async (t: Transaction) => {
      // Создаем компанию
      const company = await Company.create(
        {
          name: companyName,
        },
        { transaction: t }
      );

      // Хэшируем пароль
      const hashedPassword = await this.hashPassword(adminPassword);

      // Создаем администратора
      const admin = await User.create(
        {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          company_id: company.id,
        },
        { transaction: t }
      );

      return {
        companyId: company.id,
        adminId: admin.id,
      };
    });

    return result;
  }
} 