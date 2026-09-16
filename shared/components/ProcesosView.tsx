import Formula from './Formula';
import type { PasoProceso } from '../types/procesos';

interface ProcesosViewProps {
  procesos: PasoProceso[];
  /** Texto opcional del encabezado de la sección. */
  encabezado?: string;
  /** Texto opcional de la descripción bajo el encabezado. */
  descripcion?: string;
  unidad?: string;
  moneda?: string;
}

function unidadDeResultado(
  p: PasoProceso,
  unidad: string,
  moneda: string
): string {
  if (p.unidad) return p.unidad;
  switch (p.tipoResultado) {
    case 'moneda':
      return moneda;
    case 'tiempo':
      return 'días';
    case 'cantidadDiaria':
      return `${unidad}/día`;
    case 'porcentaje':
      return '%';
    case 'texto':
      return '';
    case undefined:
      return '';
    default:
      return unidad; // 'cantidad'
  }
}

/** Bloque KaTeX unificado: Fórmula / Sustitución / Resultado alineados. */
function bloqueKaTeX(p: PasoProceso, unidad: string, moneda: string): string {
  const uni = unidadDeResultado(p, unidad, moneda);
  const sufijo = uni.trim() ? ` \\;\\text{${uni}}` : '';
  return [
    '\\begin{aligned}',
    `\\text{Fórmula: } & ${p.formula} \\\\`,
    `\\text{Sustitución: } & ${p.sustitucion} \\\\`,
    `\\text{Resultado: } & ${p.resultado}${sufijo}`,
    '\\end{aligned}',
  ].join(' ');
}

/**
 * Vista global "Procesos paso a paso": desglosa cada cálculo del motor en
 * tarjetas con su ecuación base, la sustitución numérica y el resultado.
 * Consume el contrato global `PasoProceso` (shared/types/procesos.ts).
 */
export default function ProcesosView({
  procesos,
  encabezado = 'Procesos paso a paso',
  descripcion = 'Cada cálculo se desglosa en su ecuación base, la sustitución numérica y el resultado.',
  unidad = 'unidades',
  moneda = 'USD',
}: ProcesosViewProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 shadow-md  dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
          {encabezado}
        </h2>
        <p className="text-sm text-slate-500  dark:text-gray-400">{descripcion}</p>
      </div>

      {procesos.length === 0 ? (
        <p className="text-sm text-slate-500  dark:text-gray-400">
          No hay procesos que mostrar para estos parámetros.
        </p>
      ) : (
        procesos.map((p) => (
          <div
            key={p.id ?? `${p.titulo}|${p.formula}`}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500  dark:text-gray-400">
                {p.titulo}
              </span>
              {p.simbolo ? (
                <span>
                  <Formula tex={p.simbolo} />
                </span>
              ) : null}
            </div>
            <Formula display tex={bloqueKaTeX(p, unidad, moneda)} />
          </div>
        ))
      )}
    </section>
  );
}