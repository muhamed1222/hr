import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { sequelize } from './config/database';
import logger from './config/logging';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './services/errors/AppError';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import { CompanyController } from './controllers/CompanyController';
import { asyncHandler } from './middleware/asyncHandler';

const app: Express = express();
const companyController = new CompanyController();

// Middleware для логирования запросов
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, { 
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Test route for JSON parsing
app.post('/test-json', (req: Request, res: Response) => {
  logger.info('Test JSON route hit:', req.body);
  res.json({ 
    message: 'Test route',
    receivedData: req.body 
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Company routes
app.post('/api/companies/register', asyncHandler(companyController.register.bind(companyController)));

// Error handling
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.warn('Route not found:', { 
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });
  next(AppError.NotFoundError('Route'));
});

app.use(errorHandler);

// Database connection and server start
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    await sequelize.sync();
    logger.info('Database models synchronized successfully.');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer(); 