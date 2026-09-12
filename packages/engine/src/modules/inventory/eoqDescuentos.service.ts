import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// EOQ con Descuentos por Cantidad
// ═══════════════════════════════════════════════════════════════════════════════
//
// Modelo de inventario donde el precio unitario C varía según el tamaño del
// lote (descuentos por cantidad). Cada nivel de precio j define un intervalo
// [q_min_j, q_max_j] con su costo unitario C_j. Para encontrar el lote que
// minimiza el costo total se evalúa cada nivel y se aplican reglas de ajuste:
//
//   Q*_j = √( 2DS / H_j )
//     Q*_j = Lote óptimo calculado con el nivel de precio j
//     D     = Demanda anual
//     S     = Costo fijo por cada orden
//     H_j   = Costo de mantener efectivo del nivel j
//
// El costo de mantener H puede ingresarse de dos formas:
//   - Modo "fijo": H es un costo constante (USD/unidad-año).
//   - Modo "porcentaje": H_j = I × C_j, donde I es el nivel anual de manejo
//     de inventario expresado como porcentaje del precio del producto.
//
// Reglas de ajuste del candidato por nivel:
//   1. Si Q*_j < q_min_j  →  el candidato se ajusta a Q = q_min_j.
//   2. Si q_min_j ≤ Q*_j ≤ q_max_j  →  el candidato es Q = Q*_j (válido).
//   3. Si Q*_j > q_max_j  →  el nivel se descarta (el óptimo está en niveles
//      superiores). El último nivel (q_max = ∞) nunca se descarta.
//
// Para cada candidato válido se evalúa el costo total anual:
//
//   TC_j = (D/Q)S + (Q/2)H_j + D·C_j
//
// El lote óptimo final es el candidato con el TC_j más bajo.
//
// ═══════════════════════════════════════════════════════════════════════════════

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Schema de un nivel de precio ---

export const RangoPrecioSchema = z.object({
  cantidadMinima: z.number()
    .min(0, { message: 'La cantidad mínima no puede ser negativa' })
    .describe('Cantidad mínima del nivel de precio (q_min)'),
  cantidadMaxima: z.number()
    .min(0, { message: 'La cantidad máxima no puede ser negativa' })
    .optional()
    .describe('Cantidad máxima del nivel de precio (q_max). Sin valor = infinito (último nivel)'),
  costoUnitario: z.number()
    .positive({ message: 'El precio unitario debe ser un número positivo' })
    .describe('Precio unitario del producto en este nivel (C)'),
});

// --- Schema de validación (Zod) ---

export const EOQDescuentosInputSchema = z.object({
  demandaAnual: z.number()
    .positive({ message: 'La demanda anual debe ser un número positivo' })
    .describe('Demanda anual (D) en unidades/año'),
  costoOrdenar: z.number()
    .positive({ message: 'El costo de ordenar debe ser un número positivo' })
    .describe('Costo fijo por cada orden (S)'),
  tipoCostoMantener: z.enum(['fijo', 'porcentaje'])
    .describe('Forma de expresar el costo de mantener: "fijo" (H) o "porcentaje" (I)'),
  costoMantener: z.number()
    .positive({ message: 'El costo de mantener debe ser un número positivo' })
    .optional()
    .describe('Costo de mantener fijo (H) en USD/unidad-año (modo fijo)'),
  costoMantenerPorcentaje: z.number()
    .positive({ message: 'El porcentaje (I) del costo de mantener debe ser un número positivo' })
    .optional()
    .describe('Porcentaje anual de manejo de inventario (I) aplicado al precio (modo porcentaje)'),
  rangos: z.array(RangoPrecioSchema)
    .min(2, { message: 'Debe definir al menos dos niveles de precio.' })
    .describe('Niveles de precio ordenados de menor a mayor cantidad'),
}).superRefine((data, ctx) => {
  // El costo de mantener debe estar presente según el modo elegido.
  if (data.tipoCostoMantener === 'fijo' && data.costoMantener === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['costoMantener'],
      message: 'En modo costo fijo debes ingresar el costo de mantener (H) o cambiar a modo porcentaje.',
    });
  }
  if (data.tipoCostoMantener === 'porcentaje' && data.costoMantenerPorcentaje === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['costoMantenerPorcentaje'],
      message: 'En modo porcentaje debes ingresar el porcentaje (I) del costo de mantener o cambiar a modo costo fijo.',
    });
  }

  // Estructura de los niveles: sin solapamiento, ordenados y solo el último sin máximo.
  for (let i = 0; i < data.rangos.length; i++) {
    const rango = data.rangos[i];

    if (rango.cantidadMaxima !== undefined && rango.cantidadMaxima < rango.cantidadMinima) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rangos', i, 'cantidadMaxima'],
        message: 'La cantidad máxima no puede ser menor que la mínima de este nivel.',
      });
    }

    if (rango.cantidadMaxima === undefined && i < data.rangos.length - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rangos', i, 'cantidadMaxima'],
        message: 'Solo el último nivel puede dejar la cantidad máxima en blanco (infinito).',
      });
    }

    if (i > 0) {
      const maxPrevio = data.rangos[i - 1].cantidadMaxima;
      if (maxPrevio !== undefined && rango.cantidadMinima <= maxPrevio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rangos', i, 'cantidadMinima'],
          message: `La cantidad mínima (${rango.cantidadMinima}) debe ser mayor que el máximo del nivel anterior (${maxPrevio}).`,
        });
      }
    }
  }
});

export type EOQDescuentosInput = z.infer<typeof EOQDescuentosInputSchema>;

// --- Resultado ---

export interface RangoEvaluacion {
  cantidadMinima: number;
  cantidadMaxima: number | null;  // null => infinito (último nivel abierto)
  costoUnitario: number;          // C_j
  costoMantenerEfectivo: number;  // H_j aplicado (fijo o I × C_j)
  qOriginal: number;              // Q* calculado con H_j (antes de ajustar)
  qAjustado: number | null;       // Q candidato después de la regla de ajuste (null si descartado)
  descartado: boolean;            // true si Q* > q_max (nivel sin candidato)
  costoOrdenar: number | null;    // (D/Q)S del candidato
  costoMantener: number | null;   // (Q/2)H_j del candidato
  costoProducto: number | null;   // D × C_j
  costoTotal: number | null;      // TC_j (null si descartado)
  esGanador: boolean;             // true en el nivel con menor TC
}

export interface EOQDescuentosResult {
  loteOptimo: number;             // Q ganador
  costoTotalOptimo: number;       // TC del ganador
  tipoCostoMantener: 'fijo' | 'porcentaje';
  costoMantener: number | null;   // H (modo fijo) o null
  costoMantenerPorcentaje: number | null; // I (modo porcentaje) o null
  rangoGanador: {
    cantidadMinima: number;
    cantidadMaxima: number | null;
    costoUnitario: number;
  };
  rangos: RangoEvaluacion[];
  desglose: {
    demandaAnual: number;
    costoFijoOrden: number;
  };
}

// --- Servicio EOQ con Descuentos ---

export function calcularEOQDescuentos(input: EOQDescuentosInput): EOQDescuentosResult {
  // Validar inputs con Zod
  const validated = EOQDescuentosInputSchema.parse(input);

  const D = validated.demandaAnual;
  const S = validated.costoOrdenar;
  const tipo = validated.tipoCostoMantener;
  const H = validated.costoMantener;
  const I = validated.costoMantenerPorcentaje;

  const evaluados: RangoEvaluacion[] = validated.rangos.map((rango) => {
    const C_j = rango.costoUnitario;
    // Costo de mantener efectivo del nivel: fijo o porcentaje del precio.
    const H_j = tipo === 'fijo' ? (H as number) : ((I as number) / 100) * C_j;

    // Q* = √(2DS / H_j) redondeado a 2 decimales.
    const qOriginal = Math.round(Math.sqrt((2 * D * S) / H_j) * 100) / 100;

    const qMax = rango.cantidadMaxima ?? Infinity;

    // Regla 3: si Q* supera el máximo, el óptimo vive en niveles superiores → descartar.
    if (qOriginal > qMax) {
      return {
        cantidadMinima: rango.cantidadMinima,
        cantidadMaxima: rango.cantidadMaxima ?? null,
        costoUnitario: C_j,
        costoMantenerEfectivo: round2(H_j),
        qOriginal,
        qAjustado: null,
        descartado: true,
        costoOrdenar: null,
        costoMantener: null,
        costoProducto: null,
        costoTotal: null,
        esGanador: false,
      };
    }

    // Regla 1: si Q* < q_min, el candidato se ajusta a q_min.
    // Regla 2: si q_min ≤ Q* ≤ q_max, el candidato es Q*.
    const Q = qOriginal < rango.cantidadMinima ? rango.cantidadMinima : qOriginal;

    const costoOrdenar = round2((D / Q) * S);
    const costoMantenerAnual = round2((Q / 2) * H_j);
    const costoProducto = round2(D * C_j);
    const costoTotal = round2(costoOrdenar + costoMantenerAnual + costoProducto);

    return {
      cantidadMinima: rango.cantidadMinima,
      cantidadMaxima: rango.cantidadMaxima ?? null,
      costoUnitario: C_j,
      costoMantenerEfectivo: round2(H_j),
      qOriginal,
      qAjustado: Q,
      descartado: false,
      costoOrdenar,
      costoMantener: costoMantenerAnual,
      costoProducto,
      costoTotal,
      esGanador: false,
    };
  });

  // Seleccionar el candidato válido con el menor TC_j.
  const validos = evaluados.filter((r) => !r.descartado);
  const ganador = validos.reduce(
    (min, r) => (r.costoTotal! < min.costoTotal! ? r : min),
    validos[0]!
  );

  for (const r of evaluados) {
    if (!r.descartado && r.costoTotal === ganador.costoTotal) {
      r.esGanador = true;
    }
  }

  return {
    loteOptimo: ganador.qAjustado as number,
    costoTotalOptimo: ganador.costoTotal as number,
    tipoCostoMantener: tipo,
    costoMantener: tipo === 'fijo' ? round2(H as number) : null,
    costoMantenerPorcentaje: tipo === 'porcentaje' ? (I as number) : null,
    rangoGanador: {
      cantidadMinima: ganador.cantidadMinima,
      cantidadMaxima: ganador.cantidadMaxima,
      costoUnitario: ganador.costoUnitario,
    },
    rangos: evaluados,
    desglose: {
      demandaAnual: D,
      costoFijoOrden: S,
    },
  };
}