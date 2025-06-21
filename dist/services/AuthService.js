"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("./errors/AppError");
class AuthService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        this.JWT_EXPIRES_IN = '24h';
    }
    async validateUser(email, password) {
        const user = await User_1.default.findOne({ where: { email } });
        if (!user) {
            throw new AppError_1.AppError('Неверный email или пароль', 401);
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError_1.AppError('Неверный email или пароль', 401);
        }
        return user;
    }
    generateToken(userId) {
        return jsonwebtoken_1.default.sign({ userId }, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
        });
    }
    async register(data) {
        const existingUser = await User_1.default.findOne({ where: { email: data.email } });
        if (existingUser) {
            throw AppError_1.AppError.ValidationError('Email already registered');
        }
        const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
        const user = await User_1.default.create({
            email: data.email,
            password: hashedPassword,
            name: data.username,
            userRole: 'user'
        });
        return user;
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            const user = await User_1.default.findByPk(decoded.id);
            if (!user) {
                throw AppError_1.AppError.NotFoundError('User');
            }
            return user;
        }
        catch (error) {
            throw AppError_1.AppError.AuthenticationError('Invalid token');
        }
    }
}
exports.AuthService = AuthService;
