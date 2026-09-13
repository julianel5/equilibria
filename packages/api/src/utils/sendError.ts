import { Response } from 'express';

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

  if (error instanceof Error) {
    res.status(400).json({ success: false, error: error.message, issues: [] });
    return;
  }

  res.status(500).json({ success: false, error: 'Error interno del servidor', issues: [] });
}