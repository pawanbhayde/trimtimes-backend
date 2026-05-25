import { Response } from 'express';
import { ValidationError } from 'express-validator';

export function apiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  field: string | null = null,
): void {
  res.status(status).json({ error: { code, message, field } });
}

export function validationError(res: Response, errors: ValidationError[]): void {
  const first = errors[0];
  const field = 'path' in first ? (first.path as string) : null;
  const message = first.msg as string;
  apiError(res, 422, 'VALIDATION_ERROR', message, field);
}
