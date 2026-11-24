import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = message.includes('API_KEY_INVALID') || message.includes('GEMINI_API_KEY') ? 503 : 500;
  console.error('[Server Error]', message);
  res.status(status).json({ error: message });
}
