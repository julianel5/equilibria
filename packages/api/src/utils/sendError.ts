import { Response } from 'express';
import { ErrorValidacion } from '@math-platform/engine';

export function sendError(res: Response, error: unknown) {
  // ZodError: extraer solo los mensajes descriptivos (nada de estructuras JSON crudas)
  if (error instanceof Error && error.name === 'ZodError') {
    const zodError = error as Error & {
      issues?: Array<{ path: Array<string | number>; message: string }>;
    };
    const issues = (zodError.issues ?? []).map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({
      success: false,
      error: issues.map((i) => i.message).join(' '),
      issues,
    });
    return;
  }

  if (error instanceof ErrorValidacion) {
    res.status(400).json({ success: false, error: error.message, issues: [] });
    return;
  }

  console.error('Error inesperado en la API:', error);
  res.status(500).json({ success: false, error: 'Error interno del servidor', issues: [] });
}
