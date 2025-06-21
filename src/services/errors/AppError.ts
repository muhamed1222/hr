export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    public isOperational = true,
    public details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, message, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized') {
    super(403, message, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND_ERROR', true);
  }
} 