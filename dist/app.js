"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const database_1 = require("./config/database");
const logging_1 = __importDefault(require("./config/logging"));
const errorHandler_1 = require("./middleware/errorHandler");
const AppError_1 = require("./services/errors/AppError");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const CompanyController_1 = require("./controllers/CompanyController");
const asyncHandler_1 = require("./middleware/asyncHandler");
const app = (0, express_1.default)();
const companyController = new CompanyController_1.CompanyController();
// Middleware для логирования запросов
app.use((req, res, next) => {
    logging_1.default.info(`${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
        query: req.query
    });
    next();
});
// Middleware
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Test route for JSON parsing
app.post('/test-json', (req, res) => {
    logging_1.default.info('Test JSON route hit:', req.body);
    res.json({
        message: 'Test route',
        receivedData: req.body
    });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
// Company routes
app.post('/api/companies/register', (0, asyncHandler_1.asyncHandler)(companyController.register.bind(companyController)));
// Error handling
app.use((req, res, next) => {
    logging_1.default.warn('Route not found:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    next(AppError_1.AppError.NotFoundError('Route'));
});
app.use(errorHandler_1.errorHandler);
// Database connection and server start
const PORT = process.env.PORT || 3001;
async function startServer() {
    try {
        await database_1.sequelize.authenticate();
        logging_1.default.info('Database connection established successfully.');
        await database_1.sequelize.sync();
        logging_1.default.info('Database models synchronized successfully.');
        app.listen(PORT, () => {
            logging_1.default.info(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        logging_1.default.error('Unable to start server:', error);
        process.exit(1);
    }
}
startServer();
