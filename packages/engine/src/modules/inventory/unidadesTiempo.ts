// ═══════════════════════════════════════════════════════════════════════════════
// Unidades de tiempo en modelos de inventario (Fase 0: Estandarización)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Los estudiantes suelen mezclar períodos (demanda semestral, costo de mantener
// mensual, etc.). La estandarización distingue dos escenarios:
//
//   Caso 1 · Unidades homogéneas (D y H/I en la MISMA unidad, p. ej. ambas
//   semestrales): no hay nada que corregir. Se calcula directamente sobre esa
//   unidad compartida (base = semestre, mes, etc.) y las etiquetas se adaptan
//   ("COSTO TOTAL SEMESTRAL", "Pedidos por semestre").
//
//   Caso 2 · Unidades mixtas (o ambas anuales): todos los valores dependientes
//   del tiempo se normalizan a una base única: el AÑO.
//
// Factores de conversión → año (fijos):
//   Anual: 1, Semestral: 2, Cuatrimestral: 3, Trimestral: 4,
//   Bimestral: 6, Mensual: 12, Semanal: 52
//
// La unidad DIARIA no tiene factor fijo: su multiplicador es exactamente el
// número de días laborables del año que declara el usuario en el formulario
// (payload `diasLaborables`; p. ej. 365, 250, 360). Si no se provee, se usa el
// valor por defecto DEFAULT_DIAS_LABORABLES.
// ═══════════════════════════════════════════════════════════════════════════════

export const UNIDADES_TIEMPO = [
  'anual',
  'semestral',
  'cuatrimestral',
  'trimestral',
  'bimestral',
  'mensual',
  'semanal',
  'diario',
] as const;

export type UnidadTiempo = (typeof UNIDADES_TIEMPO)[number];

/** Días laborables usados por defecto cuando la unidad es diaria. */
export const DEFAULT_DIAS_LABORABLES = 365;

/** Factores fijos (no diarios). El factor diario se resuelve con `diasLaborables`. */
export const FACTOR_UNIDADES_A_ANO: Record<UnidadTiempo, number> = {
  anual: 1,
  semestral: 2,
  cuatrimestral: 3,
  trimestral: 4,
  bimestral: 6,
  mensual: 12,
  semanal: 52,
  diario: DEFAULT_DIAS_LABORABLES, // valor por defecto; se sobreescribe con el payload
};

/** Etiqueta legible de cada unidad (para selects y textos). */
export const ETIQUETAS_UNIDAD_TIEMPO: Record<UnidadTiempo, string> = {
  anual: 'Anual',
  semestral: 'Semestral',
  cuatrimestral: 'Cuatrimestral',
  trimestral: 'Trimestral',
  bimestral: 'Bimestral',
  mensual: 'Mensual',
  semanal: 'Semanal',
  diario: 'Diario',
};

/** Nombre del período para sufijos como "unidades / mes" o "unidades / año". */
export const PERIODO_DE_UNIDAD: Record<UnidadTiempo, string> = {
  anual: 'año',
  semestral: 'semestre',
  cuatrimestral: 'cuatrimestre',
  trimestral: 'trimestre',
  bimestral: 'bimestre',
  mensual: 'mes',
  semanal: 'semana',
  diario: 'día',
};

/**
 * Resuelve el factor de conversión de `unidad` hacia el año.
 * La unidad diaria usa `diasLaborables` del formulario (no un valor fijo);
 * el resto usa FACTOR_UNIDADES_A_ANO.
 */
export function factorAAño(unidad: UnidadTiempo, diasLaborables?: number): number {
  return unidad === 'diario'
    ? diasLaborables ?? DEFAULT_DIAS_LABORABLES
    : FACTOR_UNIDADES_A_ANO[unidad];
}

/**
 * Normaliza un valor expresado en `unidad` hacia su equivalente anual.
 * Ej. D = 3200 unidades/semestre → 3200 × 2 = 6400 unidades/año.
 * Ej. D = 10 unidades/día con diasLaborables=365 → 10 × 365 = 3650 unidades/año.
 */
export function normalizarAAño(
  valor: number,
  unidad: UnidadTiempo,
  diasLaborables?: number
): number {
  return valor * factorAAño(unidad, diasLaborables);
}

/** Indica si al menos una de las unidades requiere conversión hacia el año. */
export function hayUnidadesMixtas(unidades: (UnidadTiempo | undefined)[]): boolean {
  return unidades.some((u) => u !== undefined && u !== 'anual');
}

// ─── Metadata pedagógica de la "Fase 0: Estandarización de Unidades" ───────────

export interface PasoNormalizacion {
  /** Símbolo matemático de la variable convertida. */
  variable: 'D' | 'H' | 'I';
  /** Nombre legible (p. ej. "Demanda"). */
  concepto: string;
  /** Valor tal como lo ingresó el estudiante (en su unidad original). */
  valorOrigen: number;
  /** Unidad con la que se ingresó el valor. */
  unidadOrigen: UnidadTiempo;
  /** Unidades originales por año (factor de conversión). */
  factor: number;
  /** Valor equivalente en base anual. */
  valorAnual: number;
}

export interface NormalizacionUnidades {
  /** true solo si hubo unidades mixtas que forzaron conversión hacia el año. */
  activa: boolean;
  /** Base única de cálculo: "anual" en el caso mixto; la unidad compartida en el homogéneo. */
  base: UnidadTiempo;
  /** Períodos base por año (2 semestral, 12 mensual, diasLaborables en diario, 1 anual). */
  factorBase: number;
  /** Días laborables/año usados al convertir unidades diarias (payload del formulario). */
  diasLaborables: number;
  /** Pasos de conversión aplicados (solo unidades ≠ anual y caso mixto). */
  pasos: PasoNormalizacion[];
}

/**
 * Construye la metadata de la Fase 0. Cada paso describe la conversión de un
 * valor hacia el año; solo se incluyen los pasos con unidad distinta de "anual".
 */
export function construirNormalizacion(
  pasos: PasoNormalizacion[],
  diasLaborables?: number
): NormalizacionUnidades {
  const efectivos = pasos.filter((p) => p.unidadOrigen !== 'anual');
  return {
    activa: efectivos.length > 0,
    base: 'anual',
    factorBase: 1,
    diasLaborables: diasLaborables ?? DEFAULT_DIAS_LABORABLES,
    pasos: efectivos.map((p) => ({
      ...p,
      valorOrigen: Math.round(p.valorOrigen * 100) / 100,
      valorAnual: Math.round(p.valorAnual * 100) / 100,
    })),
  };
}

// ─── Normalización conjunta de D y H/I ─────────────────────────────────────────

export interface DatosTiempoNormalizables {
  demandaAnual: number;
  unidadDemanda?: UnidadTiempo;
  tipoCostoMantener?: 'fijo' | 'porcentaje';
  costoMantener?: number;           // H (modo fijo)
  costoMantenerPorcentaje?: number; // I (modo porcentaje)
  costoUnitario?: number;           // C (necesario en modo porcentaje)
  unidadCostoMantener?: UnidadTiempo;
  /** Días laborables del año (payload del formulario). Se usa solo si la unidad es diaria. */
  diasLaborables?: number;
}

/**
 * Fase 0 del cálculo: normaliza la demanda (D) y el costo de mantener (H)
 * —o la tasa I en modo porcentaje— hacia la base única de cálculo.
 *
 * Caso homogéneo (unidadDemanda === unidadCostoMantener): no hay mezcla que
 * corregir. Se devuelven los valores tal cual y la base es la unidad
 * compartida (semestral, mensual, diario…), con la Fase 0 inactiva.
 *
 * Caso mixto (o ambas anuales): se homogeneiza hacia el año y se devuelve la
 * metadata pedagógica de la conversión.
 */
export function normalizarDemandaYH(
  datos: DatosTiempoNormalizables
): { D: number; H: number; conversionUnidades: NormalizacionUnidades } {
  const dias = datos.diasLaborables ?? DEFAULT_DIAS_LABORABLES;
  const unidadD = datos.unidadDemanda ?? 'anual';
  const unidadH = datos.unidadCostoMantener ?? 'anual';
  const esPorcentaje = datos.tipoCostoMantener === 'porcentaje';

  // ── Caso 1 · Unidades homogéneas ──────────────────────────────────────────
  // Ambas variables de tiempo en la misma unidad: se calcula sobre esa base.
  if (unidadD === unidadH) {
    const base = unidadD;
    const H =
      esPorcentaje
        ? ((datos.costoMantenerPorcentaje ?? 0) / 100) * (datos.costoUnitario ?? 0)
        : datos.costoMantener ?? 0;
    return {
      D: datos.demandaAnual,
      H,
      conversionUnidades: {
        activa: false,
        base,
        factorBase: factorAAño(base, dias),
        diasLaborables: dias,
        pasos: [],
      },
    };
  }

  // ── Caso 2 · Unidades mixtas o ambas anuales: base anual ──────────────────
  const D = normalizarAAño(datos.demandaAnual, unidadD, dias);

  const pasos: PasoNormalizacion[] = [];
  if (unidadD !== 'anual') {
    pasos.push({
      variable: 'D',
      concepto: 'Demanda',
      valorOrigen: datos.demandaAnual,
      unidadOrigen: unidadD,
      factor: factorAAño(unidadD, dias),
      valorAnual: D,
    });
  }

  let H: number;
  if (esPorcentaje) {
    const I = normalizarAAño(datos.costoMantenerPorcentaje ?? 0, unidadH, dias);
    H = (I / 100) * (datos.costoUnitario ?? 0);
    if (unidadH !== 'anual') {
      pasos.push({
        variable: 'I',
        concepto: 'Tasa de mantener (porcentaje)',
        valorOrigen: datos.costoMantenerPorcentaje ?? 0,
        unidadOrigen: unidadH,
        factor: factorAAño(unidadH, dias),
        valorAnual: I,
      });
    }
  } else {
    H = normalizarAAño(datos.costoMantener ?? 0, unidadH, dias);
    if (unidadH !== 'anual') {
      pasos.push({
        variable: 'H',
        concepto: 'Costo de mantener',
        valorOrigen: datos.costoMantener ?? 0,
        unidadOrigen: unidadH,
        factor: factorAAño(unidadH, dias),
        valorAnual: H,
      });
    }
  }

  return { D, H, conversionUnidades: construirNormalizacion(pasos, dias) };
}