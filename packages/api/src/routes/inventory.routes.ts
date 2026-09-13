import { Router } from 'express';
import {
  calcularEOQ,
  EOQInputSchema,
  calcularEPQ,
  EPQValidatedSchema,
  calcularEOQFaltantes,
  EOQFaltantesInputSchema,
  calcularEOQDescuentos,
  EOQDescuentosInputSchema,
} from '@math-platform/engine';
import { sendError } from '../utils/sendError';

const router = Router();

router.post('/eoq', (req, res) => {
  try {
    const validated = EOQInputSchema.parse(req.body);
    const resultado = calcularEOQ(validated);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/epq', (req, res) => {
  try {
    const validated = EPQValidatedSchema.parse(req.body);
    const resultado = calcularEPQ(validated);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/eoq-faltantes', (req, res) => {
  try {
    const validated = EOQFaltantesInputSchema.parse(req.body);
    const resultado = calcularEOQFaltantes(validated);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/eoq-descuentos', (req, res) => {
  try {
    const validated = EOQDescuentosInputSchema.parse(req.body);
    const resultado = calcularEOQDescuentos(validated);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;