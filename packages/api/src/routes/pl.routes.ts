import { Router } from 'express';
import {
  calcularMetodoGrafico,
  MetodoGraficoInputSchema,
  calcularSimplex,
  SimplexInputSchema,
} from '@math-platform/engine';
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

// Método Simplex (Tabular y Revisado) con fracciones exactas: tableaus,
// traza matricial (B^{-1}, y^T, costos reducidos) y procesos paso a paso.
router.post('/simplex', (req, res) => {
  try {
    const validated = SimplexInputSchema.parse(req.body);
    const resultado = calcularSimplex(validated);
    res.json({ success: true, data: resultado });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;