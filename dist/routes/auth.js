"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthService_1 = require("../services/AuthService");
const asyncHandler_1 = require("../middleware/asyncHandler");
const router = (0, express_1.Router)();
const authService = new AuthService_1.AuthService();
router.post('/login', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const user = await authService.validateUser(email, password);
    const token = authService.generateToken(user.id);
    res.json({
        message: 'Успешная авторизация',
        data: {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        },
    });
}));
router.post('/register', async (req, res, next) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json(user);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
