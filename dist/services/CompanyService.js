"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const Company_1 = __importDefault(require("../models/Company"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = require("../config/database");
class CompanyService {
    async hashPassword(password) {
        const saltRounds = 10;
        return bcrypt_1.default.hash(password, saltRounds);
    }
    async registerCompanyWithAdmin(data) {
        const { companyName, adminName, adminEmail, adminPassword } = data;
        // Выполняем все операции в транзакции
        const result = await database_1.sequelize.transaction(async (t) => {
            // Создаем компанию
            const company = await Company_1.default.create({
                name: companyName,
            }, { transaction: t });
            // Хэшируем пароль
            const hashedPassword = await this.hashPassword(adminPassword);
            // Создаем администратора
            const admin = await User_1.default.create({
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                company_id: company.id,
            }, { transaction: t });
            return {
                companyId: company.id,
                adminId: admin.id,
            };
        });
        return result;
    }
}
exports.CompanyService = CompanyService;
