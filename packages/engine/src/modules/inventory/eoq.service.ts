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
  unidadDemanda: z.enum(UNIDADES_TIEMPO)
    .optional()
    .describe('Unidad de tiempo de la demanda (D). Por defecto "anual".'),
  unidadCostoMantener: z.enum(UNIDADES_TIEMPO)
    .optional()
    .describe('Unidad de tiempo del costo de mantener (H o I). Por defecto "anual".'),
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
  conversionUnidades: NormalizacionUnidades; // Fase 0 - pasos a base anual
  procesos: ProcesoCalculo[];   // Pestaña "Procesos": desglose paso a paso
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

  // Fase 0: estandarización de unidades (D, H/I).
  // Caso mixto → base anual (con metadata pedagógica). Caso homogéneo → la
  // unidad compartida (semestral, mensual…): D y H quedan en ese período y los
  // costos y el número de pedidos se expresan respecto a esa base.
  const { D, H, conversionUnidades } = normalizarDemandaYH(validated);
  const { factorBase } = conversionUnidades;
  const S = validated.costoOrdenar;
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
  // T = (días del período) / N
  // Ciclo de reposición en días (período = año/factorBase de la unidad base)
  // ═══════════════════════════════════════════════════════════════════════════
  const diasLaborables = validated.diasLaborables ?? 365;
  const diasDelBase = diasLaborables / factorBase;
  const cicloReposicion = diasDelBase / numeroPedidos;

  // ═══════════════════════════════════════════════════════════════════════════
  // Costo de ordenar (período base) = (D / Q) × S
  // ═══════════════════════════════════════════════════════════════════════════
  const costoOrdenar = (D / cantidadOptima) * S;

  // ═══════════════════════════════════════════════════════════════════════════
  // Costo de mantener (período base) = (Q / 2) × H
  // ═══════════════════════════════════════════════════════════════════════════
  const costoMantenerAnual = (cantidadOptima / 2) * H;

  // ═══════════════════════════════════════════════════════════════════════════
  // Costo de adquisición (período base) = D × C
  // ═══════════════════════════════════════════════════════════════════════════
  const costoAdquisicion = D * C;

  // ═══════════════════════════════════════════════════════════════════════════
  // TC = (D/Q)S + (Q/2)H + DC
  // Costo total del período base
  // ═══════════════════════════════════════════════════════════════════════════
  const costoTotalAnual = costoOrdenar + costoMantenerAnual + costoAdquisicion;

  // Inventario promedio = Q* / 2
  const inventarioPromedio = cantidadOptima / 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // d = D / (días del período base)
  // Demanda diaria (días laborables por defecto = 365)
  // ═══════════════════════════════════════════════════════════════════════════
  const demandaDiaria = D / diasDelBase;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROP = d × L
  // Punto de reorden: nivel de inventario para emitir una nueva orden.
  // Con leadTime ausente (default 0), el ROP es 0 (no aplica).
  // ═══════════════════════════════════════════════════════════════════════════
  const leadTime = validated.leadTime ?? 0;
  const puntoReorden = Math.round(demandaDiaria * leadTime);

  // Tasa I en modo porcentaje (anualizada por la Fase 0 si hizo falta).
  const pasoI = [...conversionUnidades.pasos].reverse().find((p) => p.variable === 'I');
  const tasaAnual = pasoI ? pasoI.valorAnual : (validated.costoMantenerPorcentaje ?? 0);

  // Procesos paso a paso (valores homogeneizados de D y H).
  const procesos = construirProcesosEOQ({
    conversionUnidades,
    D,
    H,
    S,
    C,
    esPorcentaje: validated.tipoCostoMantener === 'porcentaje',
    tasaAnual,
    cantidadOptima,
    numeroPedidos,
    diasDelBase,
    cicloReposicion,
    costoOrdenar,
    costoMantener: costoMantenerAnual,
    costoAdquisicion,
    costoTotal: costoTotalAnual,
    demandaDiaria,
    leadTime,
    puntoReorden,
  });

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
    conversionUnidades,
    procesos,
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
// Procesos paso a paso calculados por `calcularEOQ`. Las sustituciones usan los
// valores de D y H ya homogeneizados (base única de la Fase 0).
// ═══════════════════════════════════════════════════════════════════════════════

const round2 = (n: number) => Math.round(n * 100) / 100;

interface DatosProcesosEOQ {
  conversionUnidades: NormalizacionUnidades;
  D: number;
  H: number;
  S: number;
  C: number;
  esPorcentaje: boolean;
  tasaAnual: number;
  cantidadOptima: number;
  numeroPedidos: number;
  diasDelBase: number;
  cicloReposicion: number;
  costoOrdenar: number;
  costoMantener: number;
  costoAdquisicion: number;
  costoTotal: number;
  demandaDiaria: number;
  leadTime: number;
  puntoReorden: number;
}

function construirProcesosEOQ(datos: DatosProcesosEOQ): ProcesoCalculo[] {
  const procesos: ProcesoCalculo[] = procesosDeConversion(datos.conversionUnidades.pasos);

  if (datos.esPorcentaje) {
    procesos.push(procesoMantenerPorcentaje(datos.tasaAnual, datos.C, datos.H, 'eoq'));
  }

  const D = fmtProceso(datos.D);
  const S = fmtProceso(datos.S);
  const H = fmtProceso(datos.H);
  const Q = fmtProceso(datos.cantidadOptima);
  const N = fmtProceso(round2(datos.numeroPedidos));

  procesos.push(
    proceso({
      id: 'eoq-q-optimo',
      titulo: 'Cantidad óptima de pedido',
      simbolo: 'Q^*',
      formula: 'Q^* = \\sqrt{\\frac{2DS}{H}}',
      sustitucion: `Q^* = \\sqrt{\\frac{2(${D})(${S})}{${H}}}`,
      resultado: `Q^* = ${Q}`,
      tipoResultado: 'cantidad',
    }),
    proceso({
      id: 'eoq-numero-pedidos',
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
  const costoAdquisicion = round2(datos.costoAdquisicion);
  const costoTotal = round2(datos.costoTotal);

  procesos.push(
    proceso({
      id: 'eoq-costo-ordenar',
      titulo: 'Costo de ordenar',
      simbolo: 'C_o',
      formula: 'C_o = \\frac{D}{Q^*} \\cdot S',
      sustitucion: `C_o = \\frac{${D}}{${Q}} \\cdot ${S}`,
      resultado: `C_o = ${fmtProceso(costoOrdenar)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'eoq-costo-mantener',
      titulo: 'Costo de mantener',
      simbolo: 'C_h',
      formula: 'C_h = \\frac{Q^*}{2} \\cdot H',
      sustitucion: `C_h = \\frac{${Q}}{2} \\cdot ${H}`,
      resultado: `C_h = ${fmtProceso(costoMantener)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'eoq-costo-adquisicion',
      titulo: 'Costo de adquisición',
      simbolo: 'C_c',
      formula: 'C_c = D \\cdot C',
      sustitucion: `C_c = ${D} \\cdot ${fmtProceso(datos.C)}`,
      resultado: `C_c = ${fmtProceso(costoAdquisicion)}`,
      tipoResultado: 'moneda',
    }),
    proceso({
      id: 'eoq-costo-total',
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
  // Fase 0: normalizar a base anual (misma lógica que calcularEOQ).
  const { D, H } = normalizarDemandaYH(validated);
  const S = validated.costoOrdenar;
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

  // Inyección explícita del punto Q*: el arreglo debe contener la cantidad
  // óptima exacta (redondeada a entero) con sus costos evaluados en el Q*
  // continuo, donde se cumple el equilibrio D/Q·S = Q/2·H.
  const qOptimo = Math.round(Qopt);
  const ordenarOpt = (D / Qopt) * S;
  const mantenerOpt = (Qopt / 2) * H;
  const sinDuplicado = data.filter((p) => p.cantidad !== qOptimo);
  sinDuplicado.push({
    cantidad: qOptimo,
    costoTotal: Math.round((ordenarOpt + mantenerOpt + D * C) * 100) / 100,
    costoOrdenar: Math.round(ordenarOpt * 100) / 100,
    costoMantener: Math.round(mantenerOpt * 100) / 100,
  });
  sinDuplicado.sort((a, b) => a.cantidad - b.cantidad);

  return sinDuplicado;
}
