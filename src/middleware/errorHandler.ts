import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/errors/AppError';
import { logger } from '../config/logging';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    // Operational, trusted error: send message to client
    logger.warn({
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
      path: req.path,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
};

// Catch unhandled rejections and exceptions
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
}); 