import { Request, Response } from 'express';
import { CompanyService } from '../services/CompanyService';
import { AppError } from '../services/errors/AppError';
import { validateEmail } from '../utils/validation';
import logger from '../config/logging';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    logger.info('Received registration request:', req.body);
    
    const { companyName, adminName, adminEmail, adminPassword } = req.body;

    // Validate required fields
    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      throw new AppError('Все поля обязательны для заполнения', 400);
    }

    // Validate email format
    if (!validateEmail(adminEmail)) {
      throw new AppError('Неверный формат email', 400);
    }

    // Validate password length
    if (adminPassword.length < 6) {
      throw new AppError('Пароль должен содержать минимум 6 символов', 400);
    }

    try {
      const result = await this.companyService.registerCompanyWithAdmin({
        companyName,
        adminName,
        adminEmail,
        adminPassword,
      });

      logger.info('Company registered successfully:', result);

      res.status(201).json({
        message: 'Компания и администратор успешно зарегистрированы',
        data: {
          companyId: result.companyId,
          adminId: result.adminId,
        },
      });
    } catch (error: any) {
      logger.error('Error during company registration:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new AppError(
          'Компания с таким названием или администратор с таким email уже существуют',
          409
        );
      }
      throw error;
    }
  };
} 