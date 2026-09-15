import { useState } from 'react';
import Formula from '@shared/components/Formula';
import type { InterseccionDescartadaPL, LineaEfectivaPL, MetodoGraficoResult, VerticePL } from '../services/api';
import { nombreRestriccion, traducirNombres } from './PlanoCartesianoChart';

const SIMBOLO_OPERADOR: Record<LineaEfectivaPL['operador'], string> = {
  '<=': '\\leq',
  '>=': '\\geq',
  '=': '=',
};

const fmtDecimal = (n: number, max = 6) => n.toLocaleString('en-US', { maximumFractionDigits: max });

/** Coeficiente en TeX: omite el 1 y el signo de −1 ("x_1", "-x_2", "2x_1", "-3x_2"). */
function fmtCoef(n: number): string {
  if (n === 1) return '';
  if (n === -1) return '-';
  return fmtDecimal(n);
}

/** Lado izquierdo de una recta como suma de términos, p. ej. "2x_1 - 3x_2". */
function texLado(a: number, b: number): string {
  const partes: string[] = [];
  if (a !== 0) partes.push(`${fmtCoef(a)}x_1`);
  if (b !== 0) partes.push(`${fmtCoef(b)}x_2`);
  if (partes.length === 0) return '0';
  return partes.map((p, i) => (i === 0 ? p : p.startsWith('-') ? p : `+ ${p}`)).join('\\;');
}

/** Fase 1: sistema de ecuaciones igualando el operador original a "=". */
function texSistema(l1: LineaEfectivaPL, l2: LineaEfectivaPL): string {
  return `\\begin{cases} ${texLado(l1.x1, l1.x2)} = ${fmtDecimal(l1.rhs)} \\\\ ${texLado(l2.x1, l2.x2)} = ${fmtDecimal(l2.rhs)} \\end{cases}`;
}

/** Fase 2: solución del sistema 2×2. */
function texSolucion(v: { x1: number; x2: number }): string {
  return `x_1 = ${fmtDecimal(v.x1)}, \\quad x_2 = ${fmtDecimal(v.x2)}`;
}

/** Filtro de factibilidad para un descarte: evalúa la restricción violada en el punto. */
function texFiltroDescarte(d: InterseccionDescartadaPL, linea: LineaEfectivaPL): string {
  const p = d.punto!;
  const lhs = linea.x1 * p.x1 + linea.x2 * p.x2;
  const op = SIMBOLO_OPERADOR[linea.operador];
  return `\\text{Falla en ${nombreRestriccion(linea.id)}:}\\; ` +
    `${texLado(linea.x1, linea.x2)}\\; ${op}\\; ${fmtDecimal(linea.rhs)} ` +
    `\\implies ${fmtDecimal(linea.x1)}({${fmtDecimal(p.x1)}}) + ${fmtDecimal(linea.x2)}({${fmtDecimal(p.x2)}}) ` +
    `${op}\\; ${fmtDecimal(linea.rhs)} \\implies ${fmtDecimal(lhs)} ${op} ${fmtDecimal(linea.rhs)} \\;\\text{(Falso)}`;
}

/** Evaluación enumerativa: Z = c1(x1) + c2(x2) = valor. */
function texEvaluacionZ(v: VerticePL, r: MetodoGraficoResult): string {
  const { c1, c2 } = r.funcionObjetivo;
  return `Z = ${fmtDecimal(c1)}({${fmtDecimal(v.x1)}}) + ${fmtDecimal(c2)}({${fmtDecimal(v.x2)}}) = ${fmtDecimal(v.z)}`;
}

function ChevronAbierto({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Fase({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{titulo}</h4>
      {children}
    </div>
  );
}

interface PropsAnalisis {
  resultado: MetodoGraficoResult;
}

export default function AnalisisAlgebraicoMetodoGrafico({ resultado }: PropsAnalisis) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const lineasPorId = new Map(resultado.lineasEfectivas.map((l) => [l.id, l]));

  const toggle = (clave: string) =>
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(clave)) siguiente.delete(clave);
      else siguiente.add(clave);
      return siguiente;
    });

  const nombres = (ids: [string, string]) => nombreRestriccion(ids[0]) + ' ∩ ' + nombreRestriccion(ids[1]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
          Análisis Algebraico y Método Enumerativo
        </h2>
        <p className="text-sm text-slate-500  dark:text-gray-400">
          Paso a paso de cada intersección: sistema igualado, solución y el filtro que decidió si el
          vértice entra a la región o se descarta.
        </p>
      </div>

      {/* Vértices factibles */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-600  dark:text-gray-300">
          Vértices Factibles ({resultado.verticesFactibles.length})
        </h3>
        {resultado.verticesFactibles.map((v) => {
          const clave = `v:${v.x1},${v.x2}`;
          const abierto = abiertos.has(clave);
          const l1 = lineasPorId.get(v.lineas[0]);
          const l2 = lineasPorId.get(v.lineas[1]);
          return (
            <div
              key={clave}
              className="overflow-hidden rounded-md border border-slate-200 bg-white  dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                type="button"
                aria-expanded={abierto}
                onClick={() => toggle(clave)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
              >
                <span className="font-medium text-slate-700  dark:text-gray-200">
                  {nombres(v.lineas)}
                  <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-600  dark:bg-blue-500/15 dark:text-blue-400">
                    Z = {fmtDecimal(v.z)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-slate-500  dark:text-gray-400">
                    ({fmtDecimal(v.x1)}; {fmtDecimal(v.x2)})
                  </span>
                  <ChevronAbierto abierto={abierto} />
                </span>
              </button>
              {abierto ? (
                <div className="space-y-4 border-t border-slate-700 bg-slate-800 p-4 text-gray-100  sm:p-5 dark:bg-slate-800">
                  <Fase titulo="Fase 1 · Sistema de ecuaciones (igualadas)">
                    {l1 && l2 ? (
                      <Formula tex={texSistema(l1, l2)} display />
                    ) : (
                      <p className="text-sm">Cruza las rectas {nombres(v.lineas)}.</p>
                    )}
                  </Fase>
                  <Fase titulo="Fase 2 · Solución del sistema 2×2">
                    <Formula tex={texSolucion(v)} display />
                  </Fase>
                  <Fase titulo="Fase 3 · Evaluación en la función objetivo (Método Enumerativo)">
                    <Formula tex={texEvaluacionZ(v, resultado)} display />
                  </Fase>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Intersecciones descartadas */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-600  dark:text-gray-300">
          Intersecciones Descartadas ({resultado.interseccionesDescartadas.length})
        </h3>
        {resultado.interseccionesDescartadas.map((d, i) => {
          const clave = `d:${i}`;
          const abierto = abiertos.has(clave);
          const l1 = lineasPorId.get(d.lineas[0]);
          const l2 = lineasPorId.get(d.lineas[1]);
          const violada = d.violada ? lineasPorId.get(d.violada) : undefined;
          return (
            <div
              key={clave}
              className="overflow-hidden rounded-md border border-slate-200 bg-white  dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                type="button"
                aria-expanded={abierto}
                onClick={() => toggle(clave)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
              >
                <span className="font-medium text-slate-700  dark:text-gray-200">{nombres(d.lineas)}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-slate-500  dark:text-gray-400">
                    {d.punto ? `(${fmtDecimal(d.punto.x1)}; ${fmtDecimal(d.punto.x2)})` : 'paralelas'}
                  </span>
                  <ChevronAbierto abierto={abierto} />
                </span>
              </button>
              {abierto ? (
                <div className="space-y-4 border-t border-slate-700 bg-slate-800 p-4 text-gray-100  sm:p-5 dark:bg-slate-800">
                  <Fase titulo="Fase 1 · Sistema de ecuaciones (igualadas)">
                    {l1 && l2 ? (
                      <Formula tex={texSistema(l1, l2)} display />
                    ) : (
                      <p className="text-sm">Cruza las rectas {nombres(d.lineas)}.</p>
                    )}
                  </Fase>
                  <Fase titulo="Fase 2 · Solución del sistema 2×2">
                    {d.punto ? (
                      <Formula tex={texSolucion(d.punto)} display />
                    ) : (
                      <p className="text-sm">
                        No existe intersección única: las rectas son paralelas o coincidentes.
                      </p>
                    )}
                  </Fase>
                  {d.violada && violada && d.punto ? (
                    <Fase titulo="Fase 3 · Filtro de factibilidad (restricción violada)">
                      <Formula tex={texFiltroDescarte(d, violada)} display />
                      <p className="text-sm text-gray-300">{traducirNombres(d.motivo)}</p>
                    </Fase>
                  ) : (
                    <Fase titulo="Fase 3 · Filtro de factibilidad">
                      <p className="text-sm text-gray-300">{traducirNombres(d.motivo)}</p>
                    </Fase>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}