// ═══════════════════════════════════════════════════════════════════════════════
// Procesos paso a paso (pestaña "Procesos") de los modelos de inventario.
// ═══════════════════════════════════════════════════════════════════════════════
//
// El tipo canónico `ProcesoCalculo` y sus utilidades básicas (fmtProceso,
// proceso) viven en `modules/procesos.ts` y se re-exportan aquí, junto con los
// helpers específicos de inventario que construyen los pasos de la Fase 0.
// ═══════════════════════════════════════════════════════════════════════════════

import { fmtProceso, proceso, type ProcesoCalculo } from '../procesos';

import type { PasoNormalizacion } from './unidadesTiempo';

// Re-export del tipo canónico del motor para los módulos de inventario.
export { fmtProceso, proceso } from '../procesos';
export type { ProcesoCalculo, TipoResultadoProceso } from '../procesos';

/**
 * Convierte los pasos de la Fase 0 (estandarización de unidades) en procesos.
 * Se anteponen al resto de procesos cuando la conversión fue necesaria.
 */
export function procesosDeConversion(pasos: PasoNormalizacion[]): ProcesoCalculo[] {
  return pasos.map((paso, i) => {
    const base = `${paso.variable}_{\\mathrm{base}}`;
    const origen = `${paso.variable}_{\\mathrm{${paso.unidadOrigen}}}`;
    if (paso.variable === 'H') {
      return proceso({
        id: `fase0-${i}-${paso.variable}`,
        titulo: `Estandarización · ${paso.concepto.toLowerCase()}`,
        simbolo: 'H',
        formula: `${base} = ${origen} \\times k`,
        sustitucion: `${base} = ${fmtProceso(paso.valorOrigen)} \\times ${fmtProceso(paso.factor)}`,
        resultado: `${base} = ${fmtProceso(paso.valorAnual)}`,
        tipoResultado: 'moneda',
      });
    }
    if (paso.variable === 'I') {
      return proceso({
        id: `fase0-${i}-${paso.variable}`,
        titulo: `Estandarización · ${paso.concepto.toLowerCase()}`,
        simbolo: 'I',
        formula: `${base} = ${origen} \\times k`,
        sustitucion: `${base} = ${fmtProceso(paso.valorOrigen)} \\times ${fmtProceso(paso.factor)}`,
        resultado: `${base} = ${fmtProceso(paso.valorAnual)}`,
        tipoResultado: 'porcentaje',
      });
    }
    return proceso({
      id: `fase0-${i}-${paso.variable}`,
      titulo: `Estandarización · ${paso.concepto.toLowerCase()}`,
      simbolo: 'D',
      formula: `${base} = ${origen} \\times k`,
      sustitucion: `${base} = ${fmtProceso(paso.valorOrigen)} \\times ${fmtProceso(paso.factor)}`,
      resultado: `${base} = ${fmtProceso(paso.valorAnual)}`,
      tipoResultado: 'cantidad',
    });
  });
}

/** Proceso "H = I × C" en modo porcentaje (H efectivo antes de Q*). */
export function procesoMantenerPorcentaje(
  tasaAnual: number,
  costoUnitario: number,
  H: number,
  idPrefijo: string
): ProcesoCalculo {
  return proceso({
    id: `${idPrefijo}-h-efectivo`,
    titulo: 'Costo de mantener efectivo',
    simbolo: 'H',
    formula: `H = \\frac{I}{100} \\times C`,
    sustitucion: `H = \\frac{${fmtProceso(tasaAnual)}}{100} \\times ${fmtProceso(costoUnitario)}`,
    resultado: `H = ${fmtProceso(H)}`,
    tipoResultado: 'moneda',
  });
}

/** Proceso del punto de reorden (solo si hay lead time). */
export function procesoROP(
  demandaDiaria: number,
  leadTime: number,
  resultado: number
): ProcesoCalculo {
  return proceso({
    id: 'puntoReorden',
    titulo: 'Punto de reorden',
    simbolo: 'ROP',
    formula: `ROP = d \\cdot L`,
    sustitucion: `ROP = ${fmtProceso(demandaDiaria)} \\cdot ${fmtProceso(leadTime)}`,
    resultado: `ROP = ${fmtProceso(resultado)}`,
    tipoResultado: 'cantidad',
  });
}

/** Proceso de la demanda diaria (d = D / días del período base). */
export function procesoDemandaDiaria(
  D: number,
  diasDelBase: number,
  resultado: number
): ProcesoCalculo {
  return proceso({
    id: 'demandaDiaria',
    titulo: 'Demanda diaria',
    simbolo: 'd',
    formula: `d = \\frac{D}{\\text{días del período}}`,
    sustitucion: `d = \\frac{${fmtProceso(D)}}{${fmtProceso(diasDelBase)}}`,
    resultado: `d = ${fmtProceso(resultado)}`,
    tipoResultado: 'cantidadDiaria',
  });
}

/** Proceso del ciclo (T = días del período / N), común a los modelos. */
export function procesoCiclo(
  diasDelBase: number,
  numero: number,
  resultado: number,
  variante: 'reposicion' | 'produccion'
): ProcesoCalculo {
  return proceso({
    id: variante === 'reposicion' ? 'cicloReposicion' : 'cicloProduccion',
    titulo: variante === 'reposicion' ? 'Ciclo de reposición' : 'Ciclo de producción',
    simbolo: 'T',
    formula: `T = \\frac{\\text{días del período}}{N}`,
    sustitucion: `T = \\frac{${fmtProceso(diasDelBase)}}{${fmtProceso(numero)}}`,
    resultado: `T = ${fmtProceso(resultado)}`,
    tipoResultado: 'tiempo',
  });
}