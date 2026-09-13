import { Router } from 'express';
import { calcularTeoriaColas, TeoriaColasInputSchema } from '@math-platform/engine';
import { sendError } from '../utils/sendError';

const router = Router();

router.post('/evaluar', (req, res) => {
  try {
    const validated = TeoriaColasInputSchema.parse(req.body);
    const resultado = calcularTeoriaColas(validated);
    res.json({ success: true, data: resultado });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;