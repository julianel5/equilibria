import Formula from './Formula';
import { PERIODO_DE_UNIDAD, PERIODO_PLURAL, type UnidadTiempo } from './SelectorUnidadTiempo';

export interface PasoNormalizacion {
  /** Símbolo matemático de la variable convertida (D, H o I). */
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

/** Frase del período cuando se expresa el flujo "X <período>/año" de la conversión. */
function periodoPlural(paso: PasoNormalizacion): string {
  // La unidad diaria usa los días laborables/año que declaró el usuario: el
  // factor ya es ese número (ej. 365), y el período se nombra como tal.
  return paso.unidadOrigen === 'diario' ? 'días laborables' : PERIODO_PLURAL[paso.unidadOrigen];
}

/** Construye la línea LaTeX de un paso de conversión hacia el año. */
function latexDePaso(paso: PasoNormalizacion): string {
  const texto = (
    simbolo: string,
    valor: string,
    numerador: string,
    denominador: string
  ) => `${simbolo} = ${valor} \\;\\text{${numerador}/${denominador}}`;

  if (paso.variable === 'D') {
    return (
      texto('D', String(paso.valorOrigen), 'unidades', PERIODO_DE_UNIDAD[paso.unidadOrigen]) +
      ` \\times ${paso.factor} \\;\\text{${periodoPlural(paso)}/año}` +
      ` = ${paso.valorAnual} \\;\\text{unidades/año}`
    );
  }
  if (paso.variable === 'H') {
    return (
      texto('H', String(paso.valorOrigen), 'USD/unidad', PERIODO_DE_UNIDAD[paso.unidadOrigen]) +
      ` \\times ${paso.factor} \\;\\text{${periodoPlural(paso)}/año}` +
      ` = ${paso.valorAnual} \\;\\text{USD/unidad-año}`
    );
  }
  // variable === 'I' (tasa porcentual de mantener)
  return (
    `I = ${paso.valorOrigen}\\%/${
      PERIODO_DE_UNIDAD[paso.unidadOrigen]
    } \\times ${paso.factor} \\;\\text{${periodoPlural(paso)}/año}` +
    ` = ${paso.valorAnual}\\%/año`
  );
}

interface Fase0UnidadesProps {
  normalizacion: NormalizacionUnidades;
  /** Fórmula LaTeX (con valores anuales ya aplicados) del cálculo de Q*. */
  aplicacion?: string;
}

/**
 * Tarjeta "Desarrollo Matemático · Fase 0: Estandarización de Unidades".
 * Se muestra cuando el motor detecta unidades de tiempo distintas de "anual":
 * renderiza en KaTeX el paso de conversión hacia el año ANTES de la fórmula Q*,
 * que ya usa los valores homogeneizados.
 */
export default function Fase0Unidades({ normalizacion, aplicacion }: Fase0UnidadesProps) {
  if (!normalizacion.activa || normalizacion.pasos.length === 0) return null;

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 shadow-md  dark:border-blue-900/50 dark:bg-blue-950/20">
      <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
        Desarrollo Matemático · Fase 0: Estandarización de Unidades
      </h2>
      <p className="mb-4 text-sm text-slate-500  dark:text-gray-400">
        Se detectaron unidades de tiempo mezcladas. Todos los valores se convierten a la base única
        de {normalizacion.base} antes de aplicar las fórmulas:
      </p>
      <div className="space-y-2">
        {normalizacion.pasos.map((paso, idx) => (
          <p
            key={idx}
            className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 shadow-sm  dark:bg-gray-900 dark:text-gray-200"
          >
            <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-blue-600  dark:text-blue-400">
              {paso.concepto}
            </span>
            <Formula tex={latexDePaso(paso)} />
          </p>
        ))}
      </div>
      {aplicacion ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500  dark:text-gray-400">
            Aplicación con valores homogeneizados
          </p>
          <Formula tex={aplicacion} />
        </div>
      ) : null}
    </section>
  );
}