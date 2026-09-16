import { Router } from 'express';
import {
  calcularDemandaProbabilistica,
  DemandaProbabilisticaInputSchema,
  calcularPeriodoUnico,
  PeriodoUnicoInputSchema,
} from '@math-platform/engine';
import { sendError } from '../utils/sendError';

const router = Router();

router.post('/punto-reorden', (req, res) => {
  try {
    const validated = DemandaProbabilisticaInputSchema.parse(req.body);
    const resultado = calcularDemandaProbabilistica(validated);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/periodo-unico', (req, res) => {
  try {
    const validated = PeriodoUnicoInputSchema.parse(req.body);
    const resultado = calcularPeriodoUnico(validated);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;