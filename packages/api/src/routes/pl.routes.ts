import { Router } from 'express';
import { calcularMetodoGrafico, MetodoGraficoInputSchema } from '@math-platform/engine';
import { sendError } from '../utils/sendError';

const router = Router();

// Método Gráfico de Programación Lineal: vértices factibles, óptimo, polígono
// ordenado para la UI y vértices descartados con su motivo.
router.post('/grafico', (req, res) => {
  try {
    const validated = MetodoGraficoInputSchema.parse(req.body);
    const resultado = calcularMetodoGrafico(validated);
    res.json({ success: true, data: resultado });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;