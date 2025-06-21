"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
    static ValidationError(message, details) {
        return new AppError(message, 400, true, details);
    }
    static AuthenticationError(message) {
        return new AppError(message, 401, true);
    }
    static AuthorizationError(message) {
        return new AppError(message, 403, true);
    }
    static NotFoundError(resource) {
        return new AppError(`${resource} not found`, 404, true);
    }
    static ConflictError(message) {
        return new AppError(message, 409, true);
    }
}
exports.AppError = AppError;
