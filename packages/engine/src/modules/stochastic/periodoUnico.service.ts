import { z } from 'zod';
import { proceso, type ProcesoCalculo } from '../procesos';
import { inversaNormalEstandar } from './demandaProbabilistica.service';

// ═══════════════════════════════════════════════════════════════════════════════
// Periodo Único (Newsvendor / Single-Period Inventory)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Modelo de inventario para productos perecederos o de demanda única (periódico,
// temporada, moda). Se decide una cantidad Q* ANTES de conocer la demanda real.
//
//   C_u = p - c            Costo de subestimar la demanda (escasez): la utilidad
//                          que se pierde por cada unidad demandada que no se pudo
//                          satisfacer. Coincide con el margen de venta.
//   C_o = c - v            Costo de sobreestimar la demanda (exceso): la pérdida
//                          por cada unidad comprada y no vendida (valor de rescate).
//   CSL = P(D ≤ Q*) = C_u / (C_u + C_o)   Razón crítica / nivel de servicio:
//                          la política óptima ordena Q* tal que la probabilidad
//                          acumulada de la demanda no supere la razón crítica.
//
//   · Demanda Normal:   Q* = μ + Z·σ   con Z = Φ⁻¹(CSL)
//   · Demanda Uniforme: Q* = a + CSL·(b − a)
//
// ═══════════════════════════════════════════════════════════════════════════════

// --- Schema de validación (Zod) ---

export const PeriodoUnicoInputSchema = z
  .object({
    modoIngreso: z
      .enum(['bienes', 'servicios'])
      .default('bienes')
      .describe('Modo de ingreso de costos: bienes (p, c, v) o servicios (C_u, C_o directos)'),
    distribucion: z.enum(['normal', 'uniforme']).describe('Distribución de la demanda del período'),
    precioVenta: z.number()
      .positive({ message: 'El precio de venta (p) debe ser un número positivo' })
      .describe('Precio de venta unitario (p)')
      .optional(),
    costoCompra: z.number()
      .positive({ message: 'El costo de compra (c) debe ser un número positivo' })
      .describe('Costo de compra unitario (c)')
      .optional(),
    valorRescate: z.number()
      .nonnegative({ message: 'El valor de rescate (v) no puede ser negativo' })
      .describe('Valor de rescate/salvamento unitario (v)')
      .optional(),
    costoSubestimacion: z.number()
      .positive({ message: 'El costo de subestimación (C_u) debe ser un número positivo' })
      .describe('Costo de subestimación directo (C_u = penalización por faltante)')
      .optional(),
    costoSobreestimacion: z.number()
      .positive({ message: 'El costo de sobreestimación (C_o) debe ser un número positivo' })
      .describe('Costo de sobreestimación directo (C_o = penalización por exceso)')
      .optional(),
    demandaMedia: z.number()
      .positive({ message: 'La demanda media (μ) debe ser un número positivo' })
      .describe('Demanda media del período (μ)')
      .optional(),
    desviacionDemanda: z.number()
      .nonnegative({ message: 'La desviación estándar (σ) no puede ser negativa' })
      .describe('Desviación estándar de la demanda (σ)')
      .optional(),
    limiteInferior: z.number()
      .nonnegative({ message: 'El límite inferior (a) no puede ser negativo' })
      .describe('Límite inferior de la demanda uniforme (a)')
      .optional(),
    limiteSuperior: z.number()
      .positive({ message: 'El límite superior (b) debe ser un número positivo' })
      .describe('Límite superior de la demanda uniforme (b)')
      .optional(),
  })
  .refine(
    (d) =>
      d.modoIngreso === 'servicios' ||
      (d.precioVenta !== undefined && d.costoCompra !== undefined && d.valorRescate !== undefined),
    {
      message: 'Para el modo "bienes" se requieren precio de venta (p), costo de compra (c) y valor de rescate (v)',
      path: ['modoIngreso'],
    }
  )
  .refine(
    (d) =>
      d.modoIngreso === 'bienes' ||
      (d.costoSubestimacion !== undefined && d.costoSobreestimacion !== undefined),
    {
      message: 'Para el modo "servicios" se requieren los costos marginales C_u y C_o',
      path: ['modoIngreso'],
    }
  )
  .refine(
    (d) =>
      d.modoIngreso === 'servicios' ||
      (d.precioVenta ?? 0) > (d.costoCompra ?? 0),
    {
      message: 'El precio de venta (p) debe ser mayor que el costo de compra (c) para que exista utilidad',
      path: ['precioVenta'],
    }
  )
  .refine(
    (d) =>
      d.modoIngreso === 'servicios' ||
      (d.costoCompra ?? 0) > (d.valorRescate ?? 0),
    {
      message: 'El costo de compra (c) debe ser mayor que el valor de rescate (v) para que exista costo de exceso',
      path: ['valorRescate'],
    }
  )
  .refine(
    (d) =>
      d.distribucion === 'normal'
        ? d.demandaMedia !== undefined && d.desviacionDemanda !== undefined
        : d.limiteInferior !== undefined && d.limiteSuperior !== undefined,
    {
      message: 'Faltan los parámetros de la distribución de demanda seleccionada',
    }
  )
  .refine(
    (d) =>
      d.distribucion === 'uniforme'
        ? d.limiteInferior === undefined || d.limiteSuperior === undefined || d.limiteSuperior > d.limiteInferior
        : true,
    {
      message: 'El límite superior (b) debe ser mayor que el límite inferior (a)',
      path: ['limiteSuperior'],
    }
  );

export type PeriodoUnicoInput = z.infer<typeof PeriodoUnicoInputSchema>;

// --- Resultado ---

export interface PeriodoUnicoResult {
  modoIngreso: 'bienes' | 'servicios';
  distribucion: 'normal' | 'uniforme';
  costoSubestimacion: number;  // C_u = p - c (bienes) o dato directo (servicios)
  costoSobreestimacion: number; // C_o = c - v (bienes) o dato directo (servicios)
  nivelServicio: number;       // CSL = C_u / (C_u + C_o), en [0, 1]
  valorZ: number | null;       // Z = Φ⁻¹(CSL) solo para demanda normal
  cantidadOptima: number;      // Q*
  desglose: {
    precioVenta?: number;
    costoCompra?: number;
    valorRescate?: number;
    costoSubestimacion?: number;
    costoSobreestimacion?: number;
    valorZExacto: number | null;
    demandaMedia?: number;
    desviacionDemanda?: number;
    limiteInferior?: number;
    limiteSuperior?: number;
  };
  /** Puntos [{ demanda, densidad }] de la distribución para graficar. */
  puntos: PuntoDistribucion[];
  procesos: ProcesoCalculo[];
}

// --- Utilidades locales de formato ---

/** Números con hasta 2 decimales (costos y cantidades). */
const fmt2 = (n: number): string => String(Math.round(n * 100) / 100);

/** Números con hasta 4 decimales (razón crítica). */
const fmt4 = (n: number): string => String(Math.round(n * 10000) / 10000);

/** Z con hasta 3 decimales (estilo "1.036"). */
const fmt3 = (n: number): string => String(Math.round(n * 1000) / 1000);

// --- Puntos de la distribución de demanda (para la gráfica Newsvendor) ---

export interface PuntoDistribucion {
  demanda: number;
  densidad: number;
}

const PDF_NORMAL = (x: number, mu: number, sigma: number): number =>
  (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);

/**
 * Genera el arreglo [{ demanda, densidad }] que puebla la gráfica de la
 * distribución de la demanda del período.
 * - Normal: itera de μ − 4σ a μ + 4σ (paso σ/40 → 321 puntos).
 * - Uniforme: itera desde un 10% antes de a hasta un 10% después de b; la
 *   densidad es 1/(b − a) dentro de [a, b] y 0 fuera.
 */
export function generarPuntosDistribucion(
  distribucion: PeriodoUnicoInput['distribucion'],
  params: {
    demandaMedia?: number;
    desviacionDemanda?: number;
    limiteInferior?: number;
    limiteSuperior?: number;
  }
): PuntoDistribucion[] {
  const puntos: PuntoDistribucion[] = [];

  if (distribucion === 'normal') {
    const mu = params.demandaMedia as number;
    const sigma = params.desviacionDemanda as number;

    // Distribución degenerada (σ = 0): punto pico en μ.
    if (sigma === 0) {
      return [{ demanda: Math.round(mu * 100) / 100, densidad: 1 }];
    }

    const paso = sigma / 40;
    const xmin = mu - 4 * sigma;
    const xmax = mu + 4 * sigma;
    for (let x = xmin; x <= xmax + paso / 1e6; x += paso) {
      puntos.push({
        demanda: Math.round(x * 100) / 100,
        densidad: Math.round(PDF_NORMAL(x, mu, sigma) * 1e9) / 1e9,
      });
    }
  } else {
    const a = params.limiteInferior as number;
    const b = params.limiteSuperior as number;
    const rango = Math.abs(b - a);
    const margen = 0.1 * rango;
    const densidad = rango > 0 ? 1 / rango : 0;
    const paso = rango / 40;
    const xmin = Math.min(a, b) - margen;
    const xmax = Math.max(a, b) + margen;

    for (let x = xmin; x <= xmax + paso / 1e6; x += paso) {
      const dentro = rango > 0 && x >= Math.min(a, b) && x <= Math.max(a, b);
      puntos.push({
        demanda: Math.round(x * 100) / 100,
        densidad: dentro ? Math.round(densidad * 1e9) / 1e9 : 0,
      });
    }
  }

  return puntos;
}

// --- Procesos paso a paso (contrato global `PasoProceso` → `ProcesoCalculo`) ---

interface DatosProcesosPeriodoUnico {
  modoIngreso: 'bienes' | 'servicios';
  p?: number;
  c?: number;
  v?: number;
  cu: number;
  co: number;
  servicio: number;
  distribucion: 'normal' | 'uniforme';
  valorZ: number | null;
  cantidadOptima: number;
  demandaMedia?: number;
  desviacionDemanda?: number;
  limiteInferior?: number;
  limiteSuperior?: number;
}

export function construirProcesosPeriodoUnico(d: DatosProcesosPeriodoUnico): ProcesoCalculo[] {
  const procesos: ProcesoCalculo[] = [];

  // Modo "bienes": los costos marginales se derivan de p − c y c − v.
  if (d.modoIngreso === 'bienes') {
    // 1. C_u = p − c  (costo de subestimación / escasez).
    procesos.push(
      proceso({
        id: 'periodo-cu',
        titulo: 'Costo de subestimación (escasez)',
        simbolo: 'C_u',
        formula: 'C_u = p - c',
        sustitucion: `C_u = ${fmt2(d.p ?? 0)} - ${fmt2(d.c ?? 0)}`,
        resultado: `C_u = ${fmt2(d.cu)}`,
        tipoResultado: 'moneda',
      })
    );

    // 2. C_o = c − v  (costo de sobreestimación / exceso).
    procesos.push(
      proceso({
        id: 'periodo-co',
        titulo: 'Costo de sobreestimación (exceso)',
        simbolo: 'C_o',
        formula: 'C_o = c - v',
        sustitucion: `C_o = ${fmt2(d.c ?? 0)} - ${fmt2(d.v ?? 0)}`,
        resultado: `C_o = ${fmt2(d.co)}`,
        tipoResultado: 'moneda',
      })
    );
  }

  // 3. Razón crítica / nivel de servicio (primer paso en modo "servicios").
  procesos.push(
    proceso({
      id: 'periodo-razon',
      titulo: 'Nivel de servicio (razón crítica)',
      simbolo: 'P(D \\le Q^*)',
      formula: '\\mathrm{CSL} = P(D \\le Q^*) = \\frac{C_u}{C_u + C_o}',
      sustitucion: `\\mathrm{CSL} = \\frac{${fmt2(d.cu)}}{${fmt2(d.cu)} + ${fmt2(d.co)}}`,
      resultado: `\\mathrm{CSL} = P(D \\le Q^*) = ${fmt4(d.servicio)}`,
      tipoResultado: 'texto',
    })
  );

  if (d.distribucion === 'normal') {
    // 4. Z = Φ⁻¹(CSL)  (solo demanda normal).
    if (d.valorZ !== null) {
      procesos.push(
        proceso({
          id: 'periodo-z',
          titulo: 'Valor Z para el nivel de servicio',
          simbolo: 'Z',
          formula: 'Z = \\Phi^{-1}(\\mathrm{CSL})',
          sustitucion: `Z = \\Phi^{-1}(${fmt4(d.servicio)})`,
          resultado: `Z = ${fmt3(d.valorZ)}`,
          tipoResultado: 'texto',
        })
      );
    }

    // 5. Q* = μ + Z·σ  (demanda normal).
    procesos.push(
      proceso({
        id: 'periodo-q',
        titulo: 'Cantidad óptima de pedido',
        simbolo: 'Q^*',
        formula: 'Q^* = \\mu + Z\\,\\sigma',
        sustitucion: `Q^* = ${fmt2(d.demandaMedia ?? 0)} + (${fmt3(d.valorZ ?? 0)})\\,\\cdot\\,${fmt2(d.desviacionDemanda ?? 0)}`,
        resultado: `Q^* = ${fmt2(d.cantidadOptima)}`,
        tipoResultado: 'cantidad',
      })
    );
  } else {
    // 5'. Q* = a + CSL·(b − a)  (demanda uniforme).
    procesos.push(
      proceso({
        id: 'periodo-q',
        titulo: 'Cantidad óptima de pedido',
        simbolo: 'Q^*',
        formula: 'Q^* = a + \\mathrm{CSL}\\,(b - a)',
        sustitucion: `Q^* = ${fmt2(d.limiteInferior ?? 0)} + (${fmt4(d.servicio)})\\,(${fmt2(d.limiteSuperior ?? 0)} - ${fmt2(d.limiteInferior ?? 0)})`,
        resultado: `Q^* = ${fmt2(d.cantidadOptima)}`,
        tipoResultado: 'cantidad',
      })
    );
  }

  return procesos;
}

// --- Servicio ---

export function calcularPeriodoUnico(input: PeriodoUnicoInput): PeriodoUnicoResult {
  const validated = PeriodoUnicoInputSchema.parse(input);

  const modoIngreso = validated.modoIngreso;
  const p = validated.precioVenta;
  const c = validated.costoCompra;
  const v = validated.valorRescate;

  // Costos marginales: derivados de p − c / c − v (bienes) o dato directo (servicios).
  const cu = modoIngreso === 'bienes' ? (p as number) - (c as number) : (validated.costoSubestimacion as number);
  const co = modoIngreso === 'bienes' ? (c as number) - (v as number) : (validated.costoSobreestimacion as number);

  // Razón crítica: probabilidad de que la demanda no supere la cantidad óptima.
  const servicio = cu / (cu + co);

  let valorZ: number | null = null;
  let cantidadOptima = 0;
  const distribucion = validated.distribucion;

  if (distribucion === 'normal') {
    const mu = validated.demandaMedia as number;
    const sigma = validated.desviacionDemanda as number;
    valorZ = inversaNormalEstandar(servicio);
    cantidadOptima = sigma === 0 ? mu : mu + valorZ * sigma;
  } else {
    const a = validated.limiteInferior as number;
    const b = validated.limiteSuperior as number;
    cantidadOptima = a + servicio * (b - a);
  }

  const esNormal = distribucion === 'normal';

  return {
    modoIngreso,
    distribucion: validated.distribucion,
    costoSubestimacion: Math.round(cu * 100) / 100,
    costoSobreestimacion: Math.round(co * 100) / 100,
    nivelServicio: servicio,
    valorZ: valorZ !== null ? Math.round(valorZ * 10000) / 10000 : null,
    cantidadOptima: Math.round(cantidadOptima * 100) / 100,
    desglose: {
      ...(modoIngreso === 'bienes'
        ? { precioVenta: p, costoCompra: c, valorRescate: v }
        : { costoSubestimacion: cu, costoSobreestimacion: co }),
      valorZExacto: valorZ,
      ...(esNormal
        ? {
            demandaMedia: validated.demandaMedia as number,
            desviacionDemanda: validated.desviacionDemanda as number,
          }
        : {
            limiteInferior: validated.limiteInferior as number,
            limiteSuperior: validated.limiteSuperior as number,
          }),
    },
    puntos: generarPuntosDistribucion(distribucion, {
      demandaMedia: distribucion === 'normal' ? (validated.demandaMedia as number) : undefined,
      desviacionDemanda: distribucion === 'normal' ? (validated.desviacionDemanda as number) : undefined,
      limiteInferior: distribucion === 'uniforme' ? (validated.limiteInferior as number) : undefined,
      limiteSuperior: distribucion === 'uniforme' ? (validated.limiteSuperior as number) : undefined,
    }),
    procesos: construirProcesosPeriodoUnico({
      modoIngreso,
      p,
      c,
      v,
      cu,
      co,
      servicio,
      distribucion,
      valorZ,
      cantidadOptima,
      demandaMedia: distribucion === 'normal' ? (validated.demandaMedia as number) : undefined,
      desviacionDemanda: distribucion === 'normal' ? (validated.desviacionDemanda as number) : undefined,
      limiteInferior: distribucion === 'uniforme' ? (validated.limiteInferior as number) : undefined,
      limiteSuperior: distribucion === 'uniforme' ? (validated.limiteSuperior as number) : undefined,
    }),
  };
}