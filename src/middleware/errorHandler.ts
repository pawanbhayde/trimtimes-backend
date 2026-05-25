import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode = 500): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  const status = err.statusCode || 500;

  if (env.isDev) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(env.isDev && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}
