import { z } from 'zod';
import {
  DEFAULT_DIAS_LABORABLES,
  normalizarAAño,
  construirNormalizacion,
  factorAAño,
  UNIDADES_TIEMPO,
  type NormalizacionUnidades,
  type PasoNormalizacion,
} from './unidadesTiempo';
import {
  fmtProceso,
  proceso,
  procesosDeConversion,
  type ProcesoCalculo,
} from './procesos';

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
  unidadDemanda: z.enum(UNIDADES_TIEMPO)
    .optional()
    .describe('Unidad de tiempo de la demanda (D). Por defecto "anual".'),
  unidadCostoMantener: z.enum(UNIDADES_TIEMPO)
    .optional()
    .describe('Unidad de tiempo del costo de mantener (H o I). Por defecto "anual".'),
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
  conversionUnidades: NormalizacionUnidades;
  procesos: ProcesoCalculo[];   // Pestaña "Procesos": desglose paso a paso
  desglose: {
    demandaAnual: number;
    costoFijoOrden: number;
  };
}

// --- Servicio EOQ con Descuentos ---

export function calcularEOQDescuentos(input: EOQDescuentosInput): EOQDescuentosResult {
  // Validar inputs con Zod
  const validated = EOQDescuentosInputSchema.parse(input);

  // Fase 0: estandarización de unidades (D, H/I).
  // Caso homogéneo (misma unidad en D y el costo de mantener): la unidad
  // compartida es la base, sin conversión (Fase 0 inactiva).
  // Caso mixto o ambas anuales: base anual forzada con metadata pedagógica.
  // Este modelo no declara días laborables, así que la unidad diaria usa el
  // valor por defecto (DEFAULT_DIAS_LABORABLES).
  const unidadD = validated.unidadDemanda ?? 'anual';
  const unidadH = validated.unidadCostoMantener ?? 'anual';

  let D: number;
  let Hfijo: number;
  let I: number;
  let conversionUnidades: NormalizacionUnidades;

  if (unidadD === unidadH) {
    const base = unidadD;
    D = validated.demandaAnual;
    Hfijo = validated.costoMantener ?? 0;
    I = validated.costoMantenerPorcentaje ?? 0;
    conversionUnidades = {
      activa: false,
      base,
      factorBase: factorAAño(base),
      diasLaborables: DEFAULT_DIAS_LABORABLES,
      pasos: [],
    };
  } else {
    D = normalizarAAño(validated.demandaAnual, unidadD);
    Hfijo = normalizarAAño(validated.costoMantener ?? 0, unidadH);
    I = normalizarAAño(validated.costoMantenerPorcentaje ?? 0, unidadH);

    const pasos: PasoNormalizacion[] = [];
    if (unidadD !== 'anual') {
      pasos.push({
        variable: 'D',
        concepto: 'Demanda',
        valorOrigen: validated.demandaAnual,
        unidadOrigen: unidadD,
        factor: factorAAño(unidadD),
        valorAnual: D,
      });
    }
    if (unidadH !== 'anual') {
      pasos.push(
        validated.tipoCostoMantener === 'fijo'
          ? {
              variable: 'H',
              concepto: 'Costo de mantener',
              valorOrigen: validated.costoMantener ?? 0,
              unidadOrigen: unidadH,
              factor: factorAAño(unidadH),
              valorAnual: Hfijo,
            }
          : {
              variable: 'I',
              concepto: 'Tasa de mantener (porcentaje)',
              valorOrigen: validated.costoMantenerPorcentaje ?? 0,
              unidadOrigen: unidadH,
              factor: factorAAño(unidadH),
              valorAnual: I,
            }
      );
    }
    conversionUnidades = construirNormalizacion(pasos);
  }

  const S = validated.costoOrdenar;
  const tipo = validated.tipoCostoMantener;

  const evaluados: RangoEvaluacion[] = validated.rangos.map((rango) => {
    const C_j = rango.costoUnitario;
    // Costo de mantener efectivo del nivel: fijo o porcentaje del precio (anual).
    const H_j = tipo === 'fijo' ? Hfijo : (I / 100) * C_j;

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
    costoMantener: tipo === 'fijo' ? round2(Hfijo) : null,
    costoMantenerPorcentaje: tipo === 'porcentaje' ? round2(I) : null,
    rangoGanador: {
      cantidadMinima: ganador.cantidadMinima,
      cantidadMaxima: ganador.cantidadMaxima,
      costoUnitario: ganador.costoUnitario,
    },
    rangos: evaluados,
    conversionUnidades,
    procesos: construirProcesosDescuentos({
      evaluados,
      conversionUnidades,
      D,
      S,
      tipo,
      Hfijo,
      I,
      loteOptimo: ganador.qAjustado as number,
    }),
    desglose: {
      demandaAnual: D,
      costoFijoOrden: S,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Procesos paso a paso de Descuentos por Cantidad: uno por nivel (H_j, Q*_j,
// ajuste, costos y TC_j) y la selección final del nivel ganador.
// ═══════════════════════════════════════════════════════════════════════════════

interface DatosProcesosDescuentos {
  evaluados: RangoEvaluacion[];
  conversionUnidades: NormalizacionUnidades;
  D: number;
  S: number;
  tipo: 'fijo' | 'porcentaje';
  Hfijo: number;
  I: number;
  loteOptimo: number;
}

function construirProcesosDescuentos(datos: DatosProcesosDescuentos): ProcesoCalculo[] {
  const procesos: ProcesoCalculo[] = procesosDeConversion(datos.conversionUnidades.pasos);
  const D = fmtProceso(datos.D);
  const S = fmtProceso(datos.S);

  datos.evaluados.forEach((r, idx) => {
    const nivel = idx + 1;
    const qMin = fmtProceso(r.cantidadMinima);
    const qMax = r.cantidadMaxima === null ? '\\infty' : fmtProceso(r.cantidadMaxima);
    const Cj = fmtProceso(r.costoUnitario);
    const Hj = fmtProceso(r.costoMantenerEfectivo);
    const qOrig = fmtProceso(r.qOriginal);

    procesos.push(
      proceso({
        id: `descuentos-n${nivel}-h`,
        titulo: `Nivel ${nivel} · Costo de mantener efectivo`,
        simbolo: 'H_j',
        formula: datos.tipo === 'fijo' ? 'H_j = H' : 'H_j = \\frac{I}{100} \\times C_j',
        sustitucion:
          datos.tipo === 'fijo'
            ? `H_j = ${fmtProceso(datos.Hfijo)}`
            : `H_j = \\frac{${fmtProceso(datos.I)}}{100} \\times ${Cj}`,
        resultado: `H_j = ${Hj}`,
        tipoResultado: 'moneda',
      }),
      proceso({
        id: `descuentos-n${nivel}-q`,
        titulo: `Nivel ${nivel} · Lote óptimo con este precio`,
        simbolo: 'Q^*_j',
        formula: 'Q^*_j = \\sqrt{\\frac{2DS}{H_j}}',
        sustitucion: `Q^*_j = \\sqrt{\\frac{2(${D})(${S})}{${Hj}}}`,
        resultado: `Q^*_j = ${qOrig}`,
        tipoResultado: 'cantidad',
      })
    );

    if (r.descartado) {
      procesos.push(
        proceso({
          id: `descuentos-n${nivel}-descartado`,
          titulo: `Nivel ${nivel} · Descarte del nivel`,
          simbolo: 'Q^*_j',
          formula: '\\text{Regla 3: si } Q^*_j > q_{max} \\Rightarrow \\text{el nivel se descarta}',
          sustitucion: `Q^*_j = ${qOrig} > q_{max} = ${qMax}`,
          resultado: '\\text{sin candidato}',
          tipoResultado: 'texto',
        })
      );
      return;
    }

    const Q = fmtProceso(r.qAjustado as number);
    const ajustado = r.qAjustado !== r.qOriginal;
    procesos.push(
      proceso({
        id: `descuentos-n${nivel}-ajuste`,
        titulo: `Nivel ${nivel} · ${ajustado ? 'Ajuste del candidato (Regla 1)' : 'Candidato válido'}`,
        simbolo: 'Q',
        formula: ajustado
          ? '\\text{Regla 1: si } Q^*_j < q_{min} \\Rightarrow Q = q_{min}'
          : '\\text{Regla 2: si } q_{min} \\le Q^*_j \\le q_{max} \\Rightarrow Q = Q^*_j',
        sustitucion: ajustado
          ? `Q^*_j = ${qOrig} < q_{min} = ${qMin} \\Rightarrow Q = ${qMin}`
          : `q_{min} = ${qMin} \\le Q^*_j = ${qOrig} \\le q_{max} = ${qMax}`,
        resultado: `Q = ${Q}`,
        tipoResultado: 'cantidad',
      })
    );

    const costoOrdenar = r.costoOrdenar as number;
    const costoMantener = r.costoMantener as number;
    const costoProducto = r.costoProducto as number;

    procesos.push(
      proceso({
        id: `descuentos-n${nivel}-co`,
        titulo: `Nivel ${nivel} · Costo de ordenar`,
        simbolo: 'C_{o,j}',
        formula: 'C_{o,j} = \\frac{D}{Q} \\cdot S',
        sustitucion: `C_{o,j} = \\frac{${D}}{${Q}} \\cdot ${S}`,
        resultado: `C_{o,j} = ${fmtProceso(costoOrdenar)}`,
        tipoResultado: 'moneda',
      }),
      proceso({
        id: `descuentos-n${nivel}-ch`,
        titulo: `Nivel ${nivel} · Costo de mantener`,
        simbolo: 'C_{h,j}',
        formula: 'C_{h,j} = \\frac{Q}{2} \\cdot H_j',
        sustitucion: `C_{h,j} = \\frac{${Q}}{2} \\cdot ${Hj}`,
        resultado: `C_{h,j} = ${fmtProceso(costoMantener)}`,
        tipoResultado: 'moneda',
      }),
      proceso({
        id: `descuentos-n${nivel}-cp`,
        titulo: `Nivel ${nivel} · Costo del producto`,
        simbolo: 'C_{p,j}',
        formula: 'C_{p,j} = D \\cdot C_j',
        sustitucion: `C_{p,j} = ${D} \\cdot ${Cj}`,
        resultado: `C_{p,j} = ${fmtProceso(costoProducto)}`,
        tipoResultado: 'moneda',
      }),
      proceso({
        id: `descuentos-n${nivel}-tc`,
        titulo: `Nivel ${nivel} · Costo total`,
        simbolo: 'TC_j',
        formula: 'TC_j = C_{o,j} + C_{h,j} + C_{p,j}',
        sustitucion: `TC_j = (${fmtProceso(costoOrdenar)}) + (${fmtProceso(costoMantener)}) + (${fmtProceso(
          costoProducto
        )})`,
        resultado: `TC_j = ${fmtProceso(r.costoTotal as number)}`,
        tipoResultado: 'moneda',
      })
    );
  });

  // Selección del ganador: el nivel válido con menor TC_j.
  const validos = datos.evaluados.filter((r) => !r.descartado && r.costoTotal !== null);
  const indices = validos.map((r) => datos.evaluados.indexOf(r) + 1);
  const idxGanador = datos.evaluados.findIndex((r) => r.esGanador) + 1;
  procesos.push(
    proceso({
      id: 'descuentos-seleccion',
      titulo: 'Selección del nivel ganador',
      simbolo: 'TC',
      formula: '\\text{Se elige el nivel con menor } TC_j',
      sustitucion: validos
        .map((r, k) => `TC_{${indices[k]}} = ${fmtProceso(r.costoTotal as number)}`)
        .join(';\\;\\;'),
      resultado: `\\text{ganador: nivel } ${idxGanador} \\text{ con } Q = ${fmtProceso(datos.loteOptimo)}`,
      tipoResultado: 'texto',
    })
  );

  return procesos;
}