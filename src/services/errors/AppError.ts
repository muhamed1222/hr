export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, isOperational: boolean = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static ValidationError(message: string, details?: any) {
    return new AppError(message, 400, true, details);
  }

  static AuthenticationError(message: string) {
    return new AppError(message, 401, true);
  }

  static AuthorizationError(message: string) {
    return new AppError(message, 403, true);
  }

  static NotFoundError(resource: string) {
    return new AppError(`${resource} not found`, 404, true);
  }

  static ConflictError(message: string) {
    return new AppError(message, 409, true);
  }
} 