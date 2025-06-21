"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CompanyController_1 = require("../controllers/CompanyController");
const asyncHandler_1 = require("../middleware/asyncHandler");
const router = (0, express_1.Router)();
const companyController = new CompanyController_1.CompanyController();
// Регистрация новой компании и администратора
router.post('/register', (0, asyncHandler_1.asyncHandler)(companyController.register.bind(companyController)));
exports.default = router;
