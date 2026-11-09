import Formula from '@shared/components/Formula';
import type { FraccionJSON, ObjetivoSimplex, RangoDTO, SensibilidadDTO } from '../services/api';

const SIMBOLO: Record<'LE' | 'GE' | 'EQ', string> = { LE: '\\le', GE: '\\ge', EQ: '=' };

const th =
  'border border-slate-300 bg-slate-50 px-2 py-1.5 text-center text-xs font-semibold text-slate-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300';
const celda = 'border border-slate-300 px-2 py-1.5 dark:border-gray-600';
const td = `${celda} whitespace-nowrap text-center tabular-nums text-slate-700 dark:text-gray-200`;
const tdTexto = `${celda} min-w-[14rem] text-left text-xs text-slate-600 dark:text-gray-300`;

function rangoTex(r: RangoDTO): string {
  const min = r.min ? r.min.tex : '-\\infty';
  const max = r.max ? r.max.tex : '+\\infty';
  return `[\\,${min},\\; ${max}\\,]`;
}

/** Variable de decisión "x_{1}" → "X_{1}" como en el resto de la página. */
const nombreVar = (v: string) => v.replace(/^x_/, 'X_');

function Frac({ f }: { f: FraccionJSON }) {
  return <Formula tex={f.tex} />;
}

/** Interpretación en palabras del precio sombra de una restricción. */
function LecturaPrecio({ y, objetivo }: { y: FraccionJSON; objetivo: ObjetivoSimplex }) {
  if (y.num === '0') return <>Una unidad más de b no cambia Z*.</>;
  const sube = !y.num.startsWith('-');
  const magnitud = y.tex.replace(/^-/, '');
  const que = objetivo === 'max' ? (sube ? 'aumenta la utilidad' : 'reduce') : sube ? 'aumenta el costo' : 'reduce el costo';
  return (
    <>
      Cada unidad más de b {que} Z* en <Formula tex={magnitud} />.
    </>
  );
}

export default function SensibilidadSimplex({
  s,
  objetivo,
  etiquetas = [],
}: {
  s: SensibilidadDTO;
  objetivo: ObjetivoSimplex;
  /** Nombre de cada variable de decisión, para mostrarlo junto a X_j. */
  etiquetas?: string[];
}) {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-base font-semibold text-slate-700 dark:text-gray-100">Análisis de sensibilidad</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
        Calculado con la base óptima final: <Formula tex={'y^{T} = c_B\\,B^{-1}'} />. Los valores son válidos mientras
        el dato que cambia se mantenga dentro de su rango; fuera de él cambia la base óptima y hay que volver a resolver.
      </p>

      {s.degenerada ? (
        <p
          role="note"
          className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
        >
          La solución óptima es degenerada (una variable básica vale 0). Los precios sombra pueden ser distintos al
          aumentar o al disminuir b; cada uno es válido solo dentro de su rango.
        </p>
      ) : null}

      <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-600 dark:text-gray-300">Restricciones · precios sombra</h4>
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>Restricción</th>
              <th className={th}>Holgura / excedente</th>
              <th className={th}>Estado</th>
              <th className={th}>
                Precio sombra <Formula tex={'y_i'} />
              </th>
              <th className={th}>
                Rango de <Formula tex={'b_i'} />
              </th>
              <th className={`${th} text-left`}>Lectura</th>
            </tr>
          </thead>
          <tbody>
            {s.restricciones.map((r) => (
              <tr key={r.indice}>
                <td className={td}>
                  <Formula tex={`R_{${r.indice + 1}}:\\; ${SIMBOLO[r.tipo]}\\; ${r.b.tex}`} />
                </td>
                <td className={td}>
                  <Frac f={r.holgura} />
                </td>
                <td className={td}>
                  {r.activa ? (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      Activa
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-gray-400">No activa</span>
                  )}
                </td>
                <td className={`${td} font-semibold`}>
                  <Frac f={r.precioSombra} />
                </td>
                <td className={td}>
                  <Formula tex={rangoTex(r.rangoB)} />
                </td>
                <td className={tdTexto}>
                  <LecturaPrecio y={r.precioSombra} objetivo={objetivo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Celulares: una tarjeta por restricción */}
      <ul className="space-y-2 sm:hidden">
        {s.restricciones.map((r) => (
          <li key={r.indice} className="rounded-md border border-slate-200 p-3 text-sm dark:border-gray-700">
            <div className="flex items-center justify-between gap-2">
              <Formula tex={`R_{${r.indice + 1}}:\\; ${SIMBOLO[r.tipo]}\\; ${r.b.tex}`} />
              {r.activa ? (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  Activa
                </span>
              ) : (
                <span className="text-xs text-slate-500 dark:text-gray-400">No activa</span>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700 dark:text-gray-200">
              <dt className="text-xs text-slate-500 dark:text-gray-400">Precio sombra</dt>
              <dd className="text-right font-semibold">
                <Frac f={r.precioSombra} />
              </dd>
              <dt className="text-xs text-slate-500 dark:text-gray-400">Holgura / excedente</dt>
              <dd className="text-right">
                <Frac f={r.holgura} />
              </dd>
              <dt className="text-xs text-slate-500 dark:text-gray-400">Rango de b</dt>
              <dd className="text-right">
                <Formula tex={rangoTex(r.rangoB)} />
              </dd>
            </dl>
            <p className="mt-2 text-xs text-slate-600 dark:text-gray-300">
              <LecturaPrecio y={r.precioSombra} objetivo={objetivo} />
            </p>
          </li>
        ))}
      </ul>

      <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-600 dark:text-gray-300">
        Variables de decisión · rangos de optimalidad
      </h4>
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>Variable</th>
              <th className={th}>Valor óptimo</th>
              <th className={th}>
                Coeficiente <Formula tex={'c_j'} />
              </th>
              <th className={th}>
                Costo reducido <Formula tex={'\\bar c_j'} />
              </th>
              <th className={th}>
                Rango de <Formula tex={'c_j'} />
              </th>
            </tr>
          </thead>
          <tbody>
            {s.variables.map((v) => (
              <tr key={v.indice}>
                <td className={`${td} text-left`}>
                  <Formula tex={nombreVar(v.variable)} />
                  {etiquetas[v.indice]?.trim() ? (
                    <span className="ml-2 text-xs text-slate-600 dark:text-gray-300">{etiquetas[v.indice].trim()}</span>
                  ) : null}
                  {v.basica ? null : <span className="ml-1 text-xs text-slate-400 dark:text-gray-500">(no básica)</span>}
                </td>
                <td className={td}>
                  <Frac f={v.valor} />
                </td>
                <td className={td}>
                  <Frac f={v.c} />
                </td>
                <td className={td}>
                  <Frac f={v.costoReducido} />
                </td>
                <td className={td}>
                  <Formula tex={rangoTex(v.rangoC)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Celulares: una tarjeta por variable */}
      <ul className="space-y-2 sm:hidden">
        {s.variables.map((v) => (
          <li key={v.indice} className="rounded-md border border-slate-200 p-3 text-sm dark:border-gray-700">
            <p className="text-slate-700 dark:text-gray-200">
              <Formula tex={nombreVar(v.variable)} />
              {etiquetas[v.indice]?.trim() ? <span className="ml-2 text-xs">{etiquetas[v.indice].trim()}</span> : null}
              {v.basica ? null : <span className="ml-1 text-xs text-slate-400 dark:text-gray-500">(no básica)</span>}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700 dark:text-gray-200">
              <dt className="text-xs text-slate-500 dark:text-gray-400">Valor óptimo</dt>
              <dd className="text-right font-semibold">
                <Frac f={v.valor} />
              </dd>
              <dt className="text-xs text-slate-500 dark:text-gray-400">Coeficiente c</dt>
              <dd className="text-right">
                <Frac f={v.c} />
              </dd>
              <dt className="text-xs text-slate-500 dark:text-gray-400">Costo reducido</dt>
              <dd className="text-right">
                <Frac f={v.costoReducido} />
              </dd>
              <dt className="text-xs text-slate-500 dark:text-gray-400">Rango de c</dt>
              <dd className="text-right">
                <Formula tex={rangoTex(v.rangoC)} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-500 dark:text-gray-400">
        <li>
          <strong>Precio sombra</strong>: cuánto cambia <Formula tex={'Z^{*}'} /> si el lado derecho{' '}
          <Formula tex={'b_i'} /> aumenta en una unidad. Una restricción no activa (con holgura) tiene precio sombra 0.
        </li>
        <li>
          <strong>Rango de b</strong>: valores de <Formula tex={'b_i'} /> para los que la base óptima sigue siendo
          factible y el precio sombra sigue valiendo.
        </li>
        <li>
          <strong>Rango de c</strong>: valores del coeficiente <Formula tex={'c_j'} /> para los que la solución óptima
          actual no cambia (sí cambia el valor de <Formula tex={'Z^{*}'} />).
        </li>
        <li>
          <strong>Costo reducido</strong> <Formula tex={'\\bar c_j = c_j - y^{T}a_j'} />: cuánto debe mejorar{' '}
          <Formula tex={'c_j'} /> para que una variable no básica convenga entrar a la solución.
        </li>
      </ul>
    </section>
  );
}
