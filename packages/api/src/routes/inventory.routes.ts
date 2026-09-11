import { Router, Request, Response } from 'express';
import { calcularEOQ, EOQInputSchema } from '@math-platform/engine';

const router = Router();

router.post('/eoq', (req: Request, res: Response) => {
  try {
    const validated = EOQInputSchema.parse(req.body);
    const resultado = calcularEOQ(validated);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
});

export default router;
