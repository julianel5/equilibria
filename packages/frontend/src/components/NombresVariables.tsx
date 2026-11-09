import Formula from '@shared/components/Formula';
import type { FraccionJSON, ObjetivoSimplex } from '../services/api';

const inputNombre =
  'w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

export const tieneNombres = (etiquetas: string[]): boolean => etiquetas.some((e) => e.trim() !== '');

/** "X1 · Bolsas estándar" o solo "X1" si no tiene nombre — texto plano para selects. */
export const nombreConEtiqueta = (j: number, etiquetas: string[]): string =>
  etiquetas[j]?.trim() ? `X${j + 1} · ${etiquetas[j].trim()}` : `X${j + 1}`;

/** Editor desplegable y opcional de los nombres de las variables de decisión. */
export function EditorNombresVariables({
  etiquetas,
  onCambio,
}: {
  etiquetas: string[];
  onCambio: (etiquetas: string[]) => void;
}) {
  const conNombre = etiquetas.filter((e) => e.trim() !== '').length;
  return (
    <details className="rounded-md border border-slate-200 dark:border-gray-700">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-600 dark:text-gray-300">
        Nombres de las variables{' '}
        <span className="font-normal text-slate-400 dark:text-gray-500">
          ({conNombre > 0 ? `${conNombre} de ${etiquetas.length}` : 'opcional'})
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-200 p-3 dark:border-gray-700">
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Indica qué representa cada variable para leer la solución con sus nombres.
        </p>
        {etiquetas.map((e, j) => (
          <label key={j} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-sm text-slate-600 dark:text-gray-300">
              <Formula tex={`X_{${j + 1}}`} />
            </span>
            <input
              type="text"
              value={e}
              maxLength={60}
              placeholder="p. ej. Bolsas estándar"
              aria-label={`Nombre de la variable x${j + 1}`}
              onChange={(ev) => onCambio(etiquetas.map((v, k) => (k === j ? ev.target.value : v)))}
              className={inputNombre}
            />
          </label>
        ))}
        {conNombre > 0 ? (
          <button
            type="button"
            onClick={() => onCambio(etiquetas.map(() => ''))}
            className="py-2 text-xs font-medium text-slate-500 underline sm:py-0 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Borrar nombres
          </button>
        ) : null}
      </div>
    </details>
  );
}

const decimal = (f: FraccionJSON): string => {
  const v = Number(f.num) / Number(f.den);
  return v.toLocaleString('es', { maximumFractionDigits: 4 });
};

/** Tarjeta que lee la solución óptima con los nombres de las variables. */
export function InterpretacionSolucion({
  solucion,
  valorObjetivo,
  etiquetas,
  objetivo,
}: {
  solucion: FraccionJSON[];
  valorObjetivo: FraccionJSON;
  etiquetas: string[];
  objetivo: ObjetivoSimplex;
}) {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-base font-semibold text-slate-700 dark:text-gray-100">Interpretación de la solución</h3>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-gray-700">
        {solucion.map((f, j) => {
          const nombre = etiquetas[j]?.trim();
          const cero = f.num === '0';
          return (
            <li key={j} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
              <span className={cero ? 'text-slate-400 dark:text-gray-500' : 'text-slate-700 dark:text-gray-200'}>
                <Formula tex={`X_{${j + 1}}`} />
                {nombre ? <span className="ml-2">{nombre}</span> : null}
              </span>
              <span className={`tabular-nums ${cero ? 'text-slate-400 dark:text-gray-500' : 'font-semibold text-slate-800 dark:text-gray-100'}`}>
                <Formula tex={f.tex} />
                {f.den !== '1' ? <span className="ml-1 text-xs font-normal text-slate-500 dark:text-gray-400">≈ {decimal(f)}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-gray-900 dark:text-gray-200">
        {objetivo === 'max' ? 'Valor máximo' : 'Valor mínimo'} de la función objetivo: <Formula tex={`Z^{*} = ${valorObjetivo.tex}`} />
        {valorObjetivo.den !== '1' ? <span className="ml-1 text-xs text-slate-500 dark:text-gray-400">≈ {decimal(valorObjetivo)}</span> : null}
      </p>
      {solucion.some((f) => f.num === '0') ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
          Las variables que valen 0 quedan fuera de la solución óptima.
        </p>
      ) : null}
    </section>
  );
}
