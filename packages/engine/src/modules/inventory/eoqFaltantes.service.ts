import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// EOQ con Faltantes Planeados (Déficit Autorizado)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Modelo de inventario con demanda constante donde se permite que el stock se
// agote deliberadamente: las órdenes pendientes (backorders) se acumulan hasta
// un faltante máximo S* y se liquidan de inmediato cuando llega el lote Q*.
// A cambio de tolerar la escasez, el modelo reduce el costo total relevante,
// porque el costo de mantener se paga solo sobre la fracción del ciclo en que
// hay inventario en mano.
//
// Parámetros:
//   D  = Demanda anual (unidades/año)
//   S  = Costo fijo por orden
//   H  = Costo unitario de mantener inventario por año
//   B  = Costo de faltantes / escasez por unidad-año
//
// Fórmulas:
//
//   Q* = √( 2DS / H ) × √( (H + B) / B )
//     Q* = Lote óptimo de pedido con faltantes autorizados
//
//   S* = Q* × ( H / (H + B) )
//     S* = Faltante máximo (déficit óptimo) al finalizar la fase de escasez
//
//   Imax = Q* - S*
//     Imax = Inventario máximo en mano justo después de recibir el lote,
//            descontando las unidades destinadas a cubrir los backorders.
//
//   Ch = Imax² / (2·Q*) × H
//     Ch = Costo anual de mantener: el inventario en mano promedio es Imax²/(2Q*)
//          porque solo existe durante la fracción Imax/Q* del ciclo.
//
//   Cf = S*² / (2·Q*) × B
//     Cf = Costo anual de faltantes: el faltante promedio es S*²/(2Q*).
//
//   Co = (D/Q*) × S
//     Co = Costo anual de ordenar
//
//   TC = Co + Ch + Cf
//     TC = Costo relevante total anual (excluye la adquisición D·C)
//
//   N  = D / Q*      (pedidos por año)
//   T  = días / N    (ciclo de reposición)
//   ROP = d × L      (punto de reorden)
//
// ═══════════════════════════════════════════════════════════════════════════════

// --- Schema de validación (Zod) ---

export const EOQFaltantesInputSchema = z.object({
  demandaAnual: z.number()
    .positive({ message: 'La demanda anual debe ser un número positivo' })
    .describe('Demanda anual (D) en unidades/año'),
  costoOrdenar: z.number()
    .positive({ message: 'El costo de ordenar debe ser un número positivo' })
    .describe('Costo fijo por cada orden (S)'),
  costoMantener: z.number()
    .positive({ message: 'El costo de mantener debe ser un número positivo' })
    .describe('Costo unitario de mantener inventario por año (H)'),
  costoFaltantes: z.number()
    .positive({ message: 'El costo de faltantes debe ser un número positivo' })
    .describe('Costo de faltantes/escasez por unidad-año (B)'),
  costoUnitario: z.number()
    .min(0, { message: 'El costo unitario no puede ser negativo' })
    .optional()
    .describe('Costo unitario del producto (C) - opcional, default 0'),
  diasLaborables: z.number()
    .int({ message: 'Los días laborables deben ser un número entero' })
    .min(1, { message: 'Los días laborables deben ser al menos 1' })
    .max(366, { message: 'Los días laborales al año no pueden exceder los 366 días de un año bisiesto.' })
    .optional()
    .describe('Días laborables al año (d), por defecto 365'),
  leadTime: z.number()
    .min(0, { message: 'El tiempo de entrega no puede ser negativo' })
    .optional()
    .describe('Tiempo de entrega en días (L) - opcional, default 0'),
});

export type EOQFaltantesInput = z.infer<typeof EOQFaltantesInputSchema>;

// --- Resultado ---

export interface EOQFaltantesResult {
  cantidadOptima: number;       // Q* - Lote óptimo de pedido con faltantes
  faltanteMaximo: number;       // S* - Faltante máximo (déficit óptimo)
  inventarioMaximo: number;     // Imax - Inventario máximo en mano
  costoTotalAnual: number;      // TC - Costo relevante total anual (Co + Ch + Cf)
  numeroPedidos: number;        // N  - Pedidos por año (D / Q*)
  cicloReposicion: number;      // T  - Días entre pedidos
  costoAdquisicion: number;     // D × C - Costo de adquisición anual (informativo)
  costoOrdenar: number;         // (D/Q*) × S - Costo anual de ordenar
  costoMantener: number;        // Imax²/(2Q*) × H - Costo anual de mantener
  costoFaltantes: number;       // S*²/(2Q*) × B - Costo anual de faltantes
  puntoReorden: number;         // ROP = d × L - Punto de reorden (unidades)
  desglose: {
    demandaAnual: number;
    costoFijoOrden: number;
    costoHoldingUnitario: number;
    costoFaltantesUnitario: number; // B
    factorFaltantes: number;     // H / (H + B) - fracción del ciclo en déficit
    costoUnitario: number;
    diasLaborables: number;
    leadTime: number;
    demandaDiaria: number;      // d = D / diasLaborables
  };
}

// --- Servicio EOQ con Faltantes ---

export function calcularEOQFaltantes(input: EOQFaltantesInput): EOQFaltantesResult {
  // Validar inputs con Zod
  const validated = EOQFaltantesInputSchema.parse(input);

  const D = validated.demandaAnual;
  const S = validated.costoOrdenar;
  const H = validated.costoMantener;
  const B = validated.costoFaltantes;
  const C = validated.costoUnitario ?? 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // Q* = √( 2DS / H ) × √( (H + B) / B )
  // El factor (H+B)/B > 1 hace que el lote sea mayor que el EOQ puro:
  // ordenar lotes más grandes permite agotar el stock y pagar menos holding.
  // ═══════════════════════════════════════════════════════════════════════════
  const eoq = Math.sqrt((2 * D * S) / H);
  const factorFaltantes = H / (H + B);
  const cantidadOptima = Math.round(eoq * Math.sqrt((H + B) / B));

  // ═══════════════════════════════════════════════════════════════════════════
  // S* = Q* × (H / (H + B))  y  Imax = Q* - S*
  // ═══════════════════════════════════════════════════════════════════════════
  const faltanteMaximo = Math.round(cantidadOptima * factorFaltantes * 100) / 100;
  const inventarioMaximo =
    Math.round((cantidadOptima - faltanteMaximo) * 100) / 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // Costos anuales relevantes
  // Ch = Imax²/(2Q*)·H   Cf = S*²/(2Q*)·B   Co = (D/Q*)·S
  // ═══════════════════════════════════════════════════════════════════════════
  const costoMantenerAnual = (inventarioMaximo * inventarioMaximo) / (2 * cantidadOptima) * H;
  const costoFaltantesAnual = (faltanteMaximo * faltanteMaximo) / (2 * cantidadOptima) * B;
  const costoOrdenarAnual = (D / cantidadOptima) * S;

  // Costo de adquisición (informativo, no es un costo relevante)
  const costoAdquisicion = D * C;

  // TC = Co + Ch + Cf (costo relevante total, sin adquisición)
  const costoTotalAnual = costoOrdenarAnual + costoMantenerAnual + costoFaltantesAnual;

  // N = D / Q* (pedidos al año)
  const numeroPedidos = D / cantidadOptima;

  // T = diasLaborables / N (ciclo de reposición en días)
  const diasLaborables = validated.diasLaborables ?? 365;
  const cicloReposicion = diasLaborables / numeroPedidos;

  // d = D / diasLaborables  y  ROP = d × L
  const leadTime = validated.leadTime ?? 0;
  const demandaDiaria = D / diasLaborables;
  const puntoReorden = Math.round(demandaDiaria * leadTime);

  return {
    cantidadOptima,
    faltanteMaximo,
    inventarioMaximo,
    costoTotalAnual: Math.round(costoTotalAnual * 100) / 100,
    numeroPedidos: Math.round(numeroPedidos * 100) / 100,
    cicloReposicion: Math.round(cicloReposicion * 100) / 100,
    costoAdquisicion: Math.round(costoAdquisicion * 100) / 100,
    costoOrdenar: Math.round(costoOrdenarAnual * 100) / 100,
    costoMantener: Math.round(costoMantenerAnual * 100) / 100,
    costoFaltantes: Math.round(costoFaltantesAnual * 100) / 100,
    puntoReorden,
    desglose: {
      demandaAnual: D,
      costoFijoOrden: S,
      costoHoldingUnitario: H,
      costoFaltantesUnitario: B,
      factorFaltantes: Math.round(factorFaltantes * 10000) / 10000,
      costoUnitario: C,
      diasLaborables,
      leadTime,
      demandaDiaria: Math.round(demandaDiaria * 100) / 100,
    },
  };
}