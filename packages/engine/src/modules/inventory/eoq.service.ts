import { z } from 'zod';
import { validarModoCostoMantener, resolverCostoMantener } from './costoMantenerCondicional';

// ═══════════════════════════════════════════════════════════════════════════════
// EOQ (Economic Order Quantity) - Cantidad Económica de Pedido
// ═══════════════════════════════════════════════════════════════════════════════
//
// Modelo básico de inventario con demanda constante, sin faltantes.
// Asume:
//   - Demanda constante y conocida (D)
//   - Lead time constante
//   - Sin faltantes de stock
//   - Precio unitario constante (no hay descuentos)
//
// Fórmulas:
//
//   Q* = √(2DS / H)
//     Q* = Cantidad óptima de pedido (Economic Order Quantity)
//     D  = Demanda anual (unidades/año)
//     S  = Costo fijo por cada orden (costo de setup/pedido)
//     H  = Costo unitario de mantener inventario por año (costo de holding)
//
//   TC = (D/Q)S + (Q/2)H + DC
//     TC = Costo total anual
//     DC = Demanda × Costo unitario (costo de adquisición)
//
//   N  = D / Q*
//     N = Número de pedidos por año
//
//   T  = 365 / N
//     T = Ciclo de reposición (días entre pedidos)
//
//   d  = D / diasLaborables
//     d = Demanda diaria (unidades/día)
//
//   ROP = d × L
//     ROP = Punto de reorden (unidades)
//     L   = Tiempo de entrega en días (lead time)
//
// ═══════════════════════════════════════════════════════════════════════════════

// --- Schema de validación (Zod) ---

export const EOQInputSchema = z.object({
  demandaAnual: z.number()
    .positive({ message: 'La demanda anual debe ser un número positivo' })
    .describe('Demanda anual (D) en unidades/año'),
  costoOrdenar: z.number()
    .positive({ message: 'El costo de ordenar debe ser un número positivo' })
    .describe('Costo fijo por cada orden (S)'),
  costoMantener: z.number()
    .optional()
    .describe('Costo unitario de mantener inventario por año (H) - modo fijo'),
  costoUnitario: z.number()
    .optional()
    .describe('Costo unitario del producto (C) - opcional en modo fijo, obligatorio en modo porcentaje'),
  tipoCostoMantener: z.enum(['fijo', 'porcentaje'])
    .optional()
    .describe('Forma de expresar el costo de mantener: "fijo" (H) o "porcentaje" (I × C)'),
  costoMantenerPorcentaje: z.number()
    .optional()
    .describe('Porcentaje anual de manejo de inventario (I) aplicado al precio (modo porcentaje)'),
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
}).superRefine(validarModoCostoMantener);

export type EOQInput = z.infer<typeof EOQInputSchema>;

// --- Resultado ---

export interface EOQResult {
  cantidadOptima: number;       // Q* - Cantidad óptima de pedido
  costoTotalAnual: number;      // TC - Costo total anual
  numeroPedidos: number;        // N  - Número de pedidos por año
  cicloReposicion: number;      // T  - Días entre pedidos (ciclo)
  inventarioPromedio: number;   // Q*/2 - Inventario promedio
  costoAdquisicion: number;     // D × C - Costo de adquisición anual
  costoOrdenar: number;         // (D/Q) × S - Costo anual de ordenar
  costoMantener: number;        // (Q/2) × H - Costo anual de mantener
  puntoReorden: number;         // ROP = d × L - Punto de reorden (unidades)
  desglose: {
    demandaAnual: number;
    costoFijoOrden: number;
    costoHoldingUnitario: number;
    costoUnitario: number;
    diasLaborables: number;
    leadTime: number;
    demandaDiaria: number;      // d = D / diasLaborables
  };
}

// --- Servicio EOQ ---

export function calcularEOQ(input: EOQInput): EOQResult {
  // Validar inputs con Zod (incluye la regla condicional del costo de mantener)
  const validated = EOQInputSchema.parse(input);

  const D = validated.demandaAnual;
  const S = validated.costoOrdenar;
  // H efectivo: fijo o derivado como (I/100) × C según el modo seleccionado.
  const H = resolverCostoMantener(validated);
  const C = validated.costoUnitario ?? 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // Q* = √(2DS / H)
  // Cantidad Económica de Pedido
  // ═══════════════════════════════════════════════════════════════════════════
  const cantidadOptima = Math.round(Math.sqrt((2 * D * S) / H));

  // ═══════════════════════════════════════════════════════════════════════════
  // N = D / Q*
  // Número de pedidos por año
  // ═══════════════════════════════════════════════════════════════════════════
  const numeroPedidos = D / cantidadOptima;

  // ═══════════════════════════════════════════════════════════════════════════
  // T = 365 / N
  // Ciclo de reposición en días
  // ═══════════════════════════════════════════════════════════════════════════
  const cicloReposicion = 365 / numeroPedidos;

  // ═══════════════════════════════════════════════════════════════════════════
  // Costo de ordenar anual = (D / Q) × S
  // ═══════════════════════════════════════════════════════════════════════════
  const costoOrdenar = (D / cantidadOptima) * S;

  // ═══════════════════════════════════════════════════════════════════════════
  // Costo de mantener anual = (Q / 2) × H
  // ═══════════════════════════════════════════════════════════════════════════
  const costoMantenerAnual = (cantidadOptima / 2) * H;

  // ═══════════════════════════════════════════════════════════════════════════
  // Costo de adquisición anual = D × C
  // ═══════════════════════════════════════════════════════════════════════════
  const costoAdquisicion = D * C;

  // ═══════════════════════════════════════════════════════════════════════════
  // TC = (D/Q)S + (Q/2)H + DC
  // Costo total anual
  // ═══════════════════════════════════════════════════════════════════════════
  const costoTotalAnual = costoOrdenar + costoMantenerAnual + costoAdquisicion;

  // Inventario promedio = Q* / 2
  const inventarioPromedio = cantidadOptima / 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // d = D / diasLaborables
  // Demanda diaria (días laborables por defecto = 365)
  // ═══════════════════════════════════════════════════════════════════════════
  const diasLaborables = validated.diasLaborables ?? 365;
  const demandaDiaria = D / diasLaborables;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROP = d × L
  // Punto de reorden: nivel de inventario para emitir una nueva orden.
  // Con leadTime ausente (default 0), el ROP es 0 (no aplica).
  // ═══════════════════════════════════════════════════════════════════════════
  const leadTime = validated.leadTime ?? 0;
  const puntoReorden = Math.round(demandaDiaria * leadTime);

  return {
    cantidadOptima,
    costoTotalAnual: Math.round(costoTotalAnual * 100) / 100,
    numeroPedidos: Math.round(numeroPedidos * 100) / 100,
    cicloReposicion: Math.round(cicloReposicion * 100) / 100,
    inventarioPromedio,
    costoAdquisicion: Math.round(costoAdquisicion * 100) / 100,
    costoOrdenar: Math.round(costoOrdenar * 100) / 100,
    costoMantener: Math.round(costoMantenerAnual * 100) / 100,
    puntoReorden,
    desglose: {
      demandaAnual: D,
      costoFijoOrden: S,
      costoHoldingUnitario: H,
      costoUnitario: C,
      diasLaborables,
      leadTime,
      demandaDiaria: Math.round(demandaDiaria * 100) / 100,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Análisis de sensibilidad: generar datos para graficar TC vs Q
// ═══════════════════════════════════════════════════════════════════════════════

export interface SensitivityDataPoint {
  cantidad: number;
  costoTotal: number;
  costoOrdenar: number;
  costoMantener: number;
}

export function generarCurvaTC(
  input: EOQInput,
  rangoPorcentaje: number = 50,
  puntos: number = 50
): SensitivityDataPoint[] {
  const validated = EOQInputSchema.parse(input);
  const D = validated.demandaAnual;
  const S = validated.costoOrdenar;
  // H efectivo (fijo o derivado de I × C), igual que en calcularEOQ.
  const H = resolverCostoMantener(validated);
  const C = validated.costoUnitario ?? 0;

  const Qopt = Math.sqrt((2 * D * S) / H);
  const Qmin = Math.max(1, Qopt * (1 - rangoPorcentaje / 100));
  const Qmax = Qopt * (1 + rangoPorcentaje / 100);
  const paso = (Qmax - Qmin) / puntos;

  const data: SensitivityDataPoint[] = [];

  for (let i = 0; i <= puntos; i++) {
    const Q = Qmin + paso * i;
    const costoOrden = (D / Q) * S;
    const costoHold = (Q / 2) * H;
    const costoTotal = costoOrden + costoHold + D * C;

    data.push({
      cantidad: Math.round(Q),
      costoTotal: Math.round(costoTotal * 100) / 100,
      costoOrdenar: Math.round(costoOrden * 100) / 100,
      costoMantener: Math.round(costoHold * 100) / 100,
    });
  }

  return data;
}
