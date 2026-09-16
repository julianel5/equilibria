// ═══════════════════════════════════════════════════════════════════════════════
// Tipo canónico de los procesos paso a paso (pestaña "Procesos").
// ═══════════════════════════════════════════════════════════════════════════════
//
// Cualquier módulo del motor (Inventarios, Colas, PL, Estocásticos,
// Decisiones, ...) implementa este tipo como superconjunto estructural del
// contrato global `PasoProceso` definido en `shared/types/procesos.ts`:
//
//   Fórmula      Q^* = sqrt( 2DS / H )
//   Sustitución  Q^* = sqrt( 2(9600)(20) / 40 )
//   Resultado    Q^* = 98 [unidad que coloca la UI según `tipoResultado`]
//
// La línea de "Sustitución" SIEMPRE usa los valores ya homogeneizados por la
// Fase 0 (base temporal única), de modo que la aritmética coincide con el
// resultado que muestra la calculadora. La UI es la responsable de componer el
// bloque \begin{aligned} y de añadir la unidad ({" "}prefs unidad/moneda) sobre
// el `resultado` numérico devuelto aquí.
// ═══════════════════════════════════════════════════════════════════════════════

/** Clasificación del resultado para que la UI elija la unidad a mostrar. */
export type TipoResultadoProceso =
  | 'cantidad' // se muestra con la unidad de medida (p. ej. "unidades")
  | 'cantidadDiaria' // se muestra como "<unidad>/día" (demanda diaria)
  | 'moneda' // se muestra con la moneda (p. ej. "USD")
  | 'tiempo' // se muestra en días
  | 'porcentaje' // se muestra como porcentaje (%)
  | 'texto'; // sin unidad (pasos cualitativos, p. ej. descartar nivel)

/**
 * Proceso paso a paso de un cálculo del motor.
 *
 * Implementa el contrato global `PasoProceso` (shared/types/procesos.ts):
 * cumple sus cuatro campos obligatorios (titulo, formula, sustitucion,
 * resultado) y añade los metadatos de presentación que usa la vista
 * `ProcesosView`.
 */
export interface ProcesoCalculo {
  /** Identificador estable del paso. */
  id: string;
  /** Título legible del paso (texto plano, sin LaTeX). */
  titulo: string;
  /** Símbolo de la variable en LaTeX (p. ej. "Q^*", "C_o"). */
  simbolo: string;
  /** Línea 1: ecuación base (LaTeX, ecuación completa). */
  formula: string;
  /** Línea 2: sustitución con los valores homogeneizados (LaTeX). */
  sustitucion: string;
  /** Línea 3: resultado (LaTeX, ecuación sin unidad). */
  resultado: string;
  /** Cómo debe mostrarse el resultado (unidad que añade la UI). */
  tipoResultado: TipoResultadoProceso;
  /** Unidad literal que reemplaza a la derivada de `tipoResultado` (opcional). */
  unidad?: string;
}

/** Formatea un número con hasta 2 decimales, sin ceros finales. */
export function fmtProceso(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Construye un proceso a partir de sus tres líneas. */
export function proceso(datos: ProcesoCalculo): ProcesoCalculo {
  return datos;
}