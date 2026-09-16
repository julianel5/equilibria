import { z } from 'zod';
import { validarModoCostoMantener } from './costoMantenerCondicional';
import {
  normalizarDemandaYH,
  UNIDADES_TIEMPO,
  type NormalizacionUnidades,
} from './unidadesTiempo';
import {
  fmtProceso,
  proceso,
  procesoCiclo,
  procesoDemandaDiaria,
  procesoMantenerPorcentaje,
  procesoROP,
  procesosDeConversion,
  type ProcesoCalculo,
} from './procesos';

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
  unidadDemanda: z.enum(UNIDADES_TIEMPO)
    .optional()
    .describe('Unidad de tiempo de la demanda (D). Por defecto "anual".'),
  unidadCostoMantener: z.enum(UNIDADES_TIEMPO)
    .optional()
    .describe('Unidad de tiempo del costo de mantener (H o I). Por defecto "anual".'),
});

// Validación de viabilidad: en el EPQ la producción debe cubrir la demanda.
// Si P ≤ D el lote no consigue reponerse y el modelo es inviable.
// También valida la forma condicional del costo de mantener (fijo o I × C).
export const EPQValidatedSchema = EPQInputSchema.superRefine((data, ctx) => {
  if (data.tasaProduccion <= data.demandaAnual) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tasaProduccion'],
      message:
        'La tasa de producción (P) debe ser estrictamente mayor que la demanda anual (D). Si P ≤ D el modelo EPQ es inviable.',
    });
  }

  validarModoCostoMantener(data, ctx);
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
  conversionUnidades: NormalizacionUnidades; // Fase 0 - pasos a base anual
  procesos: ProcesoCalculo[];   // Pestaña "Procesos": desglose paso a paso
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

  // Fase 0: estandarización de unidades (D, H/I). En el caso homogéneo D y H
  // quedan en la unidad compartida y los costos/pedidos se expresan en ese período.
  const { D, H, conversionUnidades } = normalizarDemandaYH(validated);
  const { factorBase } = conversionUnidades;
  const P = validated.tasaProduccion;
  const S = validated.costoOrdenar;
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

  // T = (días del período base) / N (días de operación entre corridas)
  const diasDelBase = diasLaborables / factorBase;
  const cicloProduccion = diasDelBase / numeroProducciones;

  // d = D / (días del período base)  y  ROP = d × L
  const demandaDiaria = D / diasDelBase;
  const puntoReorden = Math.round(demandaDiaria * leadTime);

  // Tasa I en modo porcentaje (anualizada por la Fase 0 si hizo falta).
  const pasoI = [...conversionUnidades.pasos].reverse().find((p) => p.variable === 'I');
  const tasaAnual = pasoI ? pasoI.valorAnual : (validated.costoMantenerPorcentaje ?? 0);

  // Procesos paso a paso (valores homogeneizados de D y H).
  const procesos = construirProcesosEPQ({
    conversionUnidades,
    D,
    H,
    S,
    C,
    P,
    esPorcentaje: validated.tipoCostoMantener === 'porcentaje',
    tasaAnual,
    factorProduccion,
    cantidadOptima,
    inventarioMaximo,
    numeroProducciones,
    diasDelBase,
    cicloProduccion,
    costoOrdenar: costoOrdenarAnual,
    costoMantener: costoMantenerAnual,
    costoAdquisicion,
    costoTotal: costoTotalAnual,
    demandaDiaria,
    leadTime,
    puntoReorden,
  });

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
    conversionUnidades,
    procesos,
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

const round2 = (n: number) => Math.round(n * 100) / 100;

interface DatosProcesosEPQ {
  conversionUnidades: NormalizacionUnidades;
  D: number;
  H: number;
  S: number;
  C: number;
  P: number;
  esPorcentaje: boolean;
  tasaAnual: number;
  factorProduccion: number;
  cantidadOptima: number;
  inventarioMaximo: number;
  numeroProducciones: number;
  diasDelBase: number;
  cicloProduccion: number;
  costoOrdenar: number;
  costoMantener: number;
  costoAdquisicion: number;
  costoTotal: number;
  demandaDiaria: number;
  leadTime: number;
  puntoReorden: number;
}

function construirProcesosEPQ(datos: DatosProcesosEPQ): ProcesoCalculo[] {
  const procesos: ProcesoCalculo[] = procesosDeConversion(datos.conversionUnidades.pasos);

  if (datos.esPorcentaje) {
    procesos.push(procesoMantenerPorcentaje(datos.tasaAnual, datos.C, datos.H, 'epq'));
  }

  const D = fmtProceso(datos.D);
  const S = fmtProceso(datos.S);
  const H = fmtProceso(datos.H);
  const P = fmtProceso(datos.P);
  const Q = fmtProceso(datos.cantidadOptima);
  const Imax = fmtProceso(datos.inventarioMaximo);
  const factor = fmtProceso(datos.factorProduccion);
  const N = fmtProceso(round2(datos.numeroProducciones));

  procesos.push(
    proceso({
      id: 'epq-q-optimo',
      titulo: 'Lote óptimo de producción',
      simbolo: 'Q^*',
      formula: 'Q^* = \\sqrt{ \\frac{2DS}{H \\cdot (1 - \\frac{D}{P})} }',
      sustitucion: `Q^* = \\sqrt{ \\frac{2(${D})(${S})}{${H} \\cdot (1 - \\frac{${D}}{${P}})} }`,
      resultado: `Q^* = ${Q}`,
      tipoResultado: 'cantidad',
    }),
    proceso({
      id: 'epq-inventario-maximo',
      titulo: 'Inventario máximo',
      simbolo: 'I_{max}',
      formula: 'I_{max} = Q^* \\cdot (1 - \\frac{D}{P})',
      sustitucion: `I_{max} = ${Q} \\cdot ${factor}`,
      resultado: `I_{max} = ${Imax}`,
      tipoResultado: 'cantidad',
    }),
    proceso({
      id: 'epq-inventario-promedio',
      titulo: 'Inventario promedio',
      simbolo: 'I_{media}',
      formula: 'I_{media} = \\frac{I_{max}}{2}',
      sustitucion: `I_{media} = \\frac{${Imax}}{2}`,
      resultado: `I_{media} = ${fmtProceso(round2(datos.inventarioMaximo / 2))}`,
      tipoResultado: 'cantidad',
    }),
    proceso({
      id: 'epq-numero-producciones',
      titulo: 'Número de corridas de producción',
      simbolo: 'N',
      formula: 'N = \\frac{D}{Q^*}',
      sustitucion: `N = \\frac{${D}}{${Q}}`,
      resultado: `N = ${N}`,
      tipoResultado: 'cantidad',
      unidad: 'corridas de producción',
    }),
    procesoCiclo(datos.diasDelBase, round2(datos.numeroProducciones), datos.cicloProduccion, 'produccion'),
    procesoDemandaDiaria(datos.D, datos.diasDelBase, round2(datos.demandaDiaria))
  );

  const costoOrdenar = round2(datos.costoOrdenar);
  const costoMantener = round2(datos.costoMantener);
  const costoAdquisicion = round2(datos.costoAdquisicion);
  const costoTotal = round2(datos.costoTotal);

  procesos.push(
    proceso({
      id: 'epq-costo-mantener',
      titulo: 'Costo de mantener',
      simbolo: 'C_h',
      formula: 'C_h = \\frac{I_{max}}{2} \\cdot H',
      sustitucion: `C_h = \\frac{${Imax}}{2} \\cdot ${H}`,
      resultado: `C_h = ${fmtProceso(costoMantener)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'epq-costo-preparacion',
      titulo: 'Costo de preparación',
      simbolo: 'C_o',
      formula: 'C_o = \\frac{D}{Q^*} \\cdot S',
      sustitucion: `C_o = \\frac{${D}}{${Q}} \\cdot ${S}`,
      resultado: `C_o = ${fmtProceso(costoOrdenar)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'epq-costo-adquisicion',
      titulo: 'Costo de adquisición',
      simbolo: 'C_c',
      formula: 'C_c = D \\cdot C',
      sustitucion: `C_c = ${D} \\cdot ${fmtProceso(datos.C)}`,
      resultado: `C_c = ${fmtProceso(costoAdquisicion)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'epq-costo-total',
      titulo: 'Costo total',
      simbolo: 'TC',
      formula: 'TC = C_o + C_h + C_c',
      sustitucion: `TC = (${fmtProceso(costoOrdenar)}) + (${fmtProceso(costoMantener)}) + (${fmtProceso(
        costoAdquisicion
      )})`,
      resultado: `TC = ${fmtProceso(costoTotal)}`,
      tipoResultado: 'moneda',
    })
  );

  if (datos.leadTime > 0) {
    procesos.push(procesoROP(datos.demandaDiaria, datos.leadTime, datos.puntoReorden));
  }

  return procesos;
}