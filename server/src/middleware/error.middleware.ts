import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/AppError.util';
import { logger } from '@/utils/logger.util';
import { env } from '@/config/env.config';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : String(err),
  });
}
