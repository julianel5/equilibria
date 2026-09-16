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
    .optional()
    .describe('Costo unitario de mantener inventario por año (H) - modo fijo'),
  costoFaltantes: z.number()
    .positive({ message: 'El costo de faltantes debe ser un número positivo' })
    .describe('Costo de faltantes/escasez por unidad-año (B)'),
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
}).superRefine(validarModoCostoMantener);

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
  conversionUnidades: NormalizacionUnidades; // Fase 0 - pasos a base anual
  procesos: ProcesoCalculo[];   // Pestaña "Procesos": desglose paso a paso
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

  // Fase 0: estandarización de unidades (D, H/I). En el caso homogéneo D y H
  // quedan en la unidad compartida y los costos/pedidos se expresan en ese período.
  const { D, H, conversionUnidades } = normalizarDemandaYH(validated);
  const { factorBase } = conversionUnidades;
  const S = validated.costoOrdenar;
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

  // T = (días del período base) / N (ciclo de reposición en días)
  const diasLaborables = validated.diasLaborables ?? 365;
  const diasDelBase = diasLaborables / factorBase;
  const cicloReposicion = diasDelBase / numeroPedidos;

  // d = D / (días del período base)  y  ROP = d × L
  const leadTime = validated.leadTime ?? 0;
  const demandaDiaria = D / diasDelBase;
  const puntoReorden = Math.round(demandaDiaria * leadTime);

  // Tasa I en modo porcentaje (anualizada por la Fase 0 si hizo falta).
  const pasoI = [...conversionUnidades.pasos].reverse().find((p) => p.variable === 'I');
  const tasaAnual = pasoI ? pasoI.valorAnual : (validated.costoMantenerPorcentaje ?? 0);

  // Procesos paso a paso (valores homogeneizados de D y H).
  const procesos = construirProcesosFaltantes({
    conversionUnidades,
    D,
    H,
    S,
    B,
    C,
    esPorcentaje: validated.tipoCostoMantener === 'porcentaje',
    tasaAnual,
    cantidadOptima,
    faltanteMaximo,
    inventarioMaximo,
    numeroPedidos,
    diasDelBase,
    cicloReposicion,
    costoOrdenar: costoOrdenarAnual,
    costoMantener: costoMantenerAnual,
    costoFaltantes: costoFaltantesAnual,
    costoAdquisicion,
    costoTotal: costoTotalAnual,
    demandaDiaria,
    leadTime,
    puntoReorden,
  });

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
    conversionUnidades,
    procesos,
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

const round2 = (n: number) => Math.round(n * 100) / 100;

interface DatosProcesosFaltantes {
  conversionUnidades: NormalizacionUnidades;
  D: number;
  H: number;
  S: number;
  B: number;
  C: number;
  esPorcentaje: boolean;
  tasaAnual: number;
  cantidadOptima: number;
  faltanteMaximo: number;
  inventarioMaximo: number;
  numeroPedidos: number;
  diasDelBase: number;
  cicloReposicion: number;
  costoOrdenar: number;
  costoMantener: number;
  costoFaltantes: number;
  costoAdquisicion: number;
  costoTotal: number;
  demandaDiaria: number;
  leadTime: number;
  puntoReorden: number;
}

function construirProcesosFaltantes(datos: DatosProcesosFaltantes): ProcesoCalculo[] {
  const procesos: ProcesoCalculo[] = procesosDeConversion(datos.conversionUnidades.pasos);

  if (datos.esPorcentaje) {
    procesos.push(procesoMantenerPorcentaje(datos.tasaAnual, datos.C, datos.H, 'faltantes'));
  }

  const D = fmtProceso(datos.D);
  const S = fmtProceso(datos.S);
  const H = fmtProceso(datos.H);
  const B = fmtProceso(datos.B);
  const Q = fmtProceso(datos.cantidadOptima);
  const Sstar = fmtProceso(datos.faltanteMaximo);
  const Imax = fmtProceso(datos.inventarioMaximo);
  const N = fmtProceso(round2(datos.numeroPedidos));

  procesos.push(
    proceso({
      id: 'faltantes-q-optimo',
      titulo: 'Cantidad óptima de pedido con faltantes',
      simbolo: 'Q^*',
      formula: 'Q^* = \\sqrt{ \\frac{2DS}{H} \\cdot \\frac{H+B}{B} }',
      sustitucion: `Q^* = \\sqrt{ \\frac{2(${D})(${S})}{${H}} \\cdot \\frac{${H}+${B}}{${B}} }`,
      resultado: `Q^* = ${Q}`,
      tipoResultado: 'cantidad',
    }),
    proceso({
      id: 'faltantes-faltante-maximo',
      titulo: 'Faltante máximo (déficit óptimo)',
      simbolo: 'S^*',
      formula: 'S^* = Q^* \\cdot \\frac{H}{H+B}',
      sustitucion: `S^* = ${Q} \\cdot \\frac{${H}}{${H}+${B}}`,
      resultado: `S^* = ${Sstar}`,
      tipoResultado: 'cantidad',
    }),
    proceso({
      id: 'faltantes-inventario-maximo',
      titulo: 'Inventario máximo en mano',
      simbolo: 'I_{max}',
      formula: 'I_{max} = Q^* - S^*',
      sustitucion: `I_{max} = ${Q} - ${Sstar}`,
      resultado: `I_{max} = ${Imax}`,
      tipoResultado: 'cantidad',
    }),
    proceso({
      id: 'faltantes-numero-pedidos',
      titulo: 'Número de pedidos',
      simbolo: 'N',
      formula: 'N = \\frac{D}{Q^*}',
      sustitucion: `N = \\frac{${D}}{${Q}}`,
      resultado: `N = ${N}`,
      tipoResultado: 'cantidad',
      unidad: 'pedidos',
    }),
    procesoCiclo(datos.diasDelBase, round2(datos.numeroPedidos), datos.cicloReposicion, 'reposicion'),
    procesoDemandaDiaria(datos.D, datos.diasDelBase, round2(datos.demandaDiaria))
  );

  const costoOrdenar = round2(datos.costoOrdenar);
  const costoMantener = round2(datos.costoMantener);
  const costoFaltantes = round2(datos.costoFaltantes);
  const costoAdquisicion = round2(datos.costoAdquisicion);
  const costoTotal = round2(datos.costoTotal);

  procesos.push(
    proceso({
      id: 'faltantes-costo-mantener',
      titulo: 'Costo de mantener',
      simbolo: 'C_h',
      formula: 'C_h = \\frac{I_{max}^2}{2 \\cdot Q^*} \\cdot H',
      sustitucion: `C_h = \\frac{${Imax}^2}{2 \\cdot ${Q}} \\cdot ${H}`,
      resultado: `C_h = ${fmtProceso(costoMantener)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'faltantes-costo-faltantes',
      titulo: 'Costo de faltantes',
      simbolo: 'C_f',
      formula: 'C_f = \\frac{(S^*)^2}{2 \\cdot Q^*} \\cdot B',
      sustitucion: `C_f = \\frac{${Sstar}^2}{2 \\cdot ${Q}} \\cdot ${B}`,
      resultado: `C_f = ${fmtProceso(costoFaltantes)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'faltantes-costo-ordenar',
      titulo: 'Costo de ordenar',
      simbolo: 'C_o',
      formula: 'C_o = \\frac{D}{Q^*} \\cdot S',
      sustitucion: `C_o = \\frac{${D}}{${Q}} \\cdot ${S}`,
      resultado: `C_o = ${fmtProceso(costoOrdenar)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'faltantes-costo-adquisicion',
      titulo: 'Costo de adquisición (informativo)',
      simbolo: 'C_c',
      formula: 'C_c = D \\cdot C',
      sustitucion: `C_c = ${D} \\cdot ${fmtProceso(datos.C)}`,
      resultado: `C_c = ${fmtProceso(costoAdquisicion)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'faltantes-costo-total',
      titulo: 'Costo total relevante',
      simbolo: 'TC',
      formula: 'TC = C_o + C_h + C_f',
      sustitucion: `TC = (${fmtProceso(costoOrdenar)}) + (${fmtProceso(costoMantener)}) + (${fmtProceso(
        costoFaltantes
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