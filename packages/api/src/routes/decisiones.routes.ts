import { Router } from 'express';
import { calcularTeoriaDecisiones, TeoriaDecisionesInputSchema } from '@math-platform/engine';
import { sendError } from '../utils/sendError';

const router = Router();

router.post('/evaluar', (req, res) => {
  try {
    const validated = TeoriaDecisionesInputSchema.parse(req.body);
    const resultado = calcularTeoriaDecisiones(validated);
    res.json({ success: true, data: resultado });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;