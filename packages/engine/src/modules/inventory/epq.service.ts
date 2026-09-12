import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// EPQ (Economic Production Quantity) - Lote Económico de Producción
// ═══════════════════════════════════════════════════════════════════════════════
//
// Modelo de inventario para lotes producidos internamente donde el
// reabastecimiento NO es instantáneo: el lote llega gradualmente a una
// tasa de producción finita P (unidades/año), mientras la demanda D se
// consume de forma continua. Como P > D, durante el ciclo se acumula
// inventario a una tasa neta (P - D).
//
// Fórmulas:
//
//   Q* = √( 2DS / ( H·(1 - D/P) ) )
//     Q* = Tamaño óptimo del lote de producción
//     D  = Demanda anual (unidades/año)
//     S  = Costo de preparación por corrida de producción
//     H  = Costo unitario de mantener inventario por año
//     P  = Tasa de producción anual (unidades/año)
//
//   Imax = Q*·(1 - D/P)
//     Imax = Inventario máximo alcanzado al finalizar la producción del lote
//
//   Ch = (Imax / 2)·H
//     Ch = Costo anual de mantener = (Q*/2)·H·(1 - D/P)
//
//   TC = (D/Q*)S + (Imax/2)H + DC
//     TC = Costo total anual (preparación + mantener + adquisición)
//
//   ROP = d × L, con d = D / diasLaborables
//     ROP = Punto de reorden (unidades)
//
// ═══════════════════════════════════════════════════════════════════════════════

// --- Schema de validación (Zod) ---

export const EPQInputSchema = z.object({
  demandaAnual: z.number()
    .positive({ message: 'La demanda anual debe ser un número positivo' })
    .describe('Demanda anual (D) en unidades/año'),
  tasaProduccion: z.number()
    .positive({ message: 'La tasa de producción debe ser un número positivo' })
    .describe('Tasa de producción anual (P) en unidades/año'),
  costoOrdenar: z.number()
    .positive({ message: 'El costo de preparación debe ser un número positivo' })
    .describe('Costo de preparación por corrida de producción (S)'),
  costoMantener: z.number()
    .positive({ message: 'El costo de mantener debe ser un número positivo' })
    .describe('Costo unitario de mantener inventario por año (H)'),
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

// Validación de viabilidad: en el EPQ la producción debe cubrir la demanda.
// Si P ≤ D el lote no consigue reponerse y el modelo es inviable.
export const EPQValidatedSchema = EPQInputSchema.superRefine((data, ctx) => {
  if (data.tasaProduccion <= data.demandaAnual) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tasaProduccion'],
      message:
        'La tasa de producción (P) debe ser estrictamente mayor que la demanda anual (D). Si P ≤ D el modelo EPQ es inviable.',
    });
  }
});

export type EPQInput = z.infer<typeof EPQValidatedSchema>;

// --- Resultado ---

export interface EPQResult {
  cantidadOptima: number;       // Q* - Tamaño óptimo del lote de producción
  inventarioMaximo: number;     // Imax - Inventario máximo alcanzado en el ciclo
  inventarioPromedio: number;   // Imax/2 - Inventario promedio
  costoTotalAnual: number;      // TC - Costo total anual
  numeroProducciones: number;   // N  - Corridas de producción por año (D/Q*)
  cicloProduccion: number;      // T  - Días de operación entre corridas
  costoAdquisicion: number;     // D × C - Costo de adquisición anual
  costoOrdenar: number;         // (D/Q*) × S - Costo anual de preparación
  costoMantener: number;        // (Imax/2) × H - Costo anual de mantener
  puntoReorden: number;         // ROP = d × L - Punto de reorden (unidades)
  desglose: {
    demandaAnual: number;
    tasaProduccion: number;
    factorProduccion: number;   // 1 - D/P (fracción del ciclo con acumulación)
    costoFijoOrden: number;
    costoHoldingUnitario: number;
    costoUnitario: number;
    diasLaborables: number;
    leadTime: number;
    demandaDiaria: number;      // d = D / diasLaborables
  };
}

// --- Servicio EPQ ---

export function calcularEPQ(input: EPQInput): EPQResult {
  // Validar inputs con Zod (incluye la regla P > D)
  const validated = EPQValidatedSchema.parse(input);

  const D = validated.demandaAnual;
  const P = validated.tasaProduccion;
  const S = validated.costoOrdenar;
  const H = validated.costoMantener;
  const C = validated.costoUnitario ?? 0;
  const diasLaborables = validated.diasLaborables ?? 365;
  const leadTime = validated.leadTime ?? 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // Imax = Q*·(1 - D/P) ⇒ Ch = (Q*/2)·H·(1 - D/P)
  // El inventario se acumula (P - D) durante la producción y se agota a D.
  // ═══════════════════════════════════════════════════════════════════════════
  const factorProduccion = 1 - D / P;

  // ═══════════════════════════════════════════════════════════════════════════
  // Q* = √( 2DS / ( H·(1 - D/P) ) )
  // Lote óptimo de producción
  // ═══════════════════════════════════════════════════════════════════════════
  const cantidadOptima = Math.round(Math.sqrt((2 * D * S) / (H * factorProduccion)));

  // Inventario máximo (redondeo a 2 decimales para casos fraccionarios)
  const inventarioMaximo =
    Math.round(cantidadOptima * factorProduccion * 100) / 100;

  // Costo de mantener = (Imax / 2) × H
  const costoMantenerAnual = (inventarioMaximo / 2) * H;

  // Costo de preparación = (D / Q*) × S
  const costoOrdenarAnual = (D / cantidadOptima) * S;

  // Costo de adquisición = D × C
  const costoAdquisicion = D * C;

  // TC = (D/Q*)S + (Imax/2)H + DC
  const costoTotalAnual = costoOrdenarAnual + costoMantenerAnual + costoAdquisicion;

  // N = D / Q* (corridas de producción por año)
  const numeroProducciones = D / cantidadOptima;

  // T = diasLaborables / N (días de operación entre corridas)
  const cicloProduccion = diasLaborables / numeroProducciones;

  // d = D / diasLaborables  y  ROP = d × L
  const demandaDiaria = D / diasLaborables;
  const puntoReorden = Math.round(demandaDiaria * leadTime);

  return {
    cantidadOptima,
    inventarioMaximo,
    inventarioPromedio: inventarioMaximo / 2,
    costoTotalAnual: Math.round(costoTotalAnual * 100) / 100,
    numeroProducciones: Math.round(numeroProducciones * 100) / 100,
    cicloProduccion: Math.round(cicloProduccion * 100) / 100,
    costoAdquisicion: Math.round(costoAdquisicion * 100) / 100,
    costoOrdenar: Math.round(costoOrdenarAnual * 100) / 100,
    costoMantener: Math.round(costoMantenerAnual * 100) / 100,
    puntoReorden,
    desglose: {
      demandaAnual: D,
      tasaProduccion: P,
      factorProduccion: Math.round(factorProduccion * 10000) / 10000,
      costoFijoOrden: S,
      costoHoldingUnitario: H,
      costoUnitario: C,
      diasLaborables,
      leadTime,
      demandaDiaria: Math.round(demandaDiaria * 100) / 100,
    },
  };
}