import { Router } from 'express';
import { CompanyController } from '../controllers/CompanyController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const companyController = new CompanyController();

// Регистрация новой компании и администратора
router.post('/register', asyncHandler(companyController.register.bind(companyController)));

export default router; 