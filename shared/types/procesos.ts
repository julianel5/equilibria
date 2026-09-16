/**
 * Contrato global de datos para la vista "Procesos paso a paso".
 *
 * Cualquier motor matemático de la aplicación (Inventarios, Programación
 * Lineal, Estocásticos, Decisiones, ...) debe devolver un arreglo de
 * PassoProceso para alimentar esta vista. Los cuatro campos base son
 * obligatorios; el resto son metadatos de presentación opcionales.
 */
export type TipoResultadoProceso =
  | 'cantidad'
  | 'cantidadDiaria'
  | 'moneda'
  | 'tiempo'
  | 'porcentaje'
  | 'texto';

export interface PasoProceso {
  /** Título legible del paso (texto plano, p. ej. "CANTIDAD ÓPTIMA DE PEDIDO"). */
  titulo: string;
  /** Cadena KaTeX cruda de la ecuación base (sin los $$). */
  formula: string;
  /** Cadena KaTeX con los números reemplazados (valores homogeneizados). */
  sustitucion: string;
  /** Cadena KaTeX con la respuesta final y sus unidades. */
  resultado: string;
  /** Identificador estable del paso (opcional). */
  id?: string;
  /** Símbolo de la variable en KaTeX (p. ej. "Q^*"), mostrado junto al título (opcional). */
  simbolo?: string;
  /** Clasificación del resultado para elegir la unidad a mostrar (opcional). */
  tipoResultado?: TipoResultadoProceso;
  /** Unidad literal que reemplaza a la derivada de `tipoResultado` (opcional). */
  unidad?: string;
}