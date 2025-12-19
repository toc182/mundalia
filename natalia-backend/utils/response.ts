import { Response } from 'express';
import { ApiResponse } from '../types';

/**
 * Respuesta exitosa
 */
function success<T>(res: Response, data: T, message: string | null = null, status: number = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  return res.status(status).json(response);
}

/**
 * Respuesta de error
 */
function error(res: Response, errorMessage: string, status: number = 500, code: string | null = null): Response {
  const response: ApiResponse = {
    success: false,
    error: errorMessage,
  };
  if (code) {
    response.code = code;
  }
  return res.status(status).json(response);
}

/**
 * Respuesta de error de validación
 */
function validationError(res: Response, errors: string | string[]): Response {
  return res.status(400).json({
    success: false,
    error: Array.isArray(errors) ? errors[0] : errors,
    errors: Array.isArray(errors) ? errors : [errors],
    code: 'VALIDATION_ERROR',
  } as ApiResponse);
}

/**
 * Respuesta 404 Not Found
 */
function notFound(res: Response, message: string = 'Resource not found'): Response {
  return error(res, message, 404, 'NOT_FOUND');
}

/**
 * Respuesta 401 Unauthorized
 */
function unauthorized(res: Response, message: string = 'Unauthorized'): Response {
  return error(res, message, 401, 'UNAUTHORIZED');
}

/**
 * Respuesta 403 Forbidden
 */
function forbidden(res: Response, message: string = 'Forbidden'): Response {
  return error(res, message, 403, 'FORBIDDEN');
}

/**
 * Respuesta de error del servidor
 */
function serverError(res: Response, err: Error | null = null): Response {
  if (err) {
    console.error('[SERVER ERROR]', err);
  }
  return error(res, 'Server error', 500, 'SERVER_ERROR');
}

/**
 * Respuesta de creación exitosa (201)
 */
function created<T>(res: Response, data: T, message: string | null = null): Response {
  return success(res, data, message, 201);
}

export {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  serverError,
  created,
};
