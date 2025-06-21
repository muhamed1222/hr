"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const CompanyService_1 = require("../services/CompanyService");
const AppError_1 = require("../services/errors/AppError");
const validation_1 = require("../utils/validation");
const logging_1 = __importDefault(require("../config/logging"));
class CompanyController {
    constructor() {
        this.register = async (req, res) => {
            logging_1.default.info('Received registration request:', req.body);
            const { companyName, adminName, adminEmail, adminPassword } = req.body;
            // Validate required fields
            if (!companyName || !adminName || !adminEmail || !adminPassword) {
                throw new AppError_1.AppError('Все поля обязательны для заполнения', 400);
            }
            // Validate email format
            if (!(0, validation_1.validateEmail)(adminEmail)) {
                throw new AppError_1.AppError('Неверный формат email', 400);
            }
            // Validate password length
            if (adminPassword.length < 6) {
                throw new AppError_1.AppError('Пароль должен содержать минимум 6 символов', 400);
            }
            try {
                const result = await this.companyService.registerCompanyWithAdmin({
                    companyName,
                    adminName,
                    adminEmail,
                    adminPassword,
                });
                logging_1.default.info('Company registered successfully:', result);
                res.status(201).json({
                    message: 'Компания и администратор успешно зарегистрированы',
                    data: {
                        companyId: result.companyId,
                        adminId: result.adminId,
                    },
                });
            }
            catch (error) {
                logging_1.default.error('Error during company registration:', error);
                if (error instanceof AppError_1.AppError) {
                    throw error;
                }
                if (error?.name === 'SequelizeUniqueConstraintError') {
                    throw new AppError_1.AppError('Компания с таким названием или администратор с таким email уже существуют', 409);
                }
                throw error;
            }
        };
        this.companyService = new CompanyService_1.CompanyService();
    }
}
exports.CompanyController = CompanyController;
