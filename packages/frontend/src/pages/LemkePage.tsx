import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  calcularLemke,
  ApiError,
  type ComplementariedadDTO,
  type FraccionJSON,
  type IteracionLemkeDTO,
  type LemkeResultado,
  type RazonLemkeDTO,
} from '../services/api';
import Formula from '@shared/components/Formula';
import { conSubindices } from '@shared/components/Subindices';
import KpiCard from '@shared/components/KpiCard';
import ProcesosView from '@shared/components/ProcesosView';
import TabsPanel from '@shared/components/TabsPanel';
import LemkeTeoria from '../components/LemkeTeoria';
import CabeceraConGlosario from '../components/CabeceraConGlosario';
import { VARIABLES_LEMKE } from '../data/glosarioPL';

type Tipo = 'lcp' | 'qp';
type Pestana = 'calculadora' | 'teoria';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

const inputCoef =
  'w-16 rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-sm tabular-nums shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';
const inputNum =
  'w-20 rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-sm tabular-nums shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const valorTex = (f: FraccionJSON): string => (f.den === '1' ? f.num : `${f.num}/${f.den}`);
const num = (f: FraccionJSON): number => Number(f.num) / Number(f.den);
const esNegativo = (f: FraccionJSON): boolean => num(f) < 0;

function redimensionar(M: string[][], rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => M[i]?.[j] ?? '0')
  );
}

function MatrizEditor({
  titulo,
  M,
  onCelda,
  filaEtiqueta,
  colEtiqueta,
}: {
  titulo: string;
  M: string[][];
  onCelda: (i: number, j: number, v: string) => void;
  filaEtiqueta: (i: number) => string;
  colEtiqueta: (j: number) => string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">{titulo}</legend>
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-gray-700 dark:bg-gray-900">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th />
              {M[0]?.map((_, j) => (
                <th key={j} className="px-1 text-center text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                  <Formula tex={colEtiqueta(j)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {M.map((fila, i) => (
              <tr key={i}>
                <td className="pr-1 text-right text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                  <Formula tex={filaEtiqueta(i)} />
                </td>
                {fila.map((v, j) => (
                  <td key={j}>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0"
                      className={`${inputCoef} w-14`}
                      value={v}
                      aria-label={`${titulo} fila ${i + 1} columna ${j + 1}`}
                      onChange={(e) => onCelda(i, j, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}

function VectorEditor({
  titulo,
  v,
  onValor,
  etiqueta,
}: {
  titulo: string;
  v: string[];
  onValor: (i: number, valor: string) => void;
  etiqueta: (i: number) => string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">{titulo}</legend>
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-gray-700 dark:bg-gray-900">
        {v.map((valor, i) => (
          <label key={i} className="flex flex-col items-center gap-0.5 text-[11px] text-slate-500 dark:text-gray-400">
            <span>
              <Formula tex={etiqueta(i)} />
            </span>
            <input
              type="number"
              step="any"
              required
              placeholder="0"
              className={inputCoef}
              value={valor}
              aria-label={`${titulo} ${i + 1}`}
              onChange={(e) => onValor(i, e.target.value)}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TablaLemke({ it }: { it: IteracionLemkeDTO }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-slate-300 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-gray-600" />
            {it.variables.map((v, j) => (
              <th
                key={`${v}-${j}`}
                className={`border border-slate-300 px-2 py-1.5 text-center text-xs dark:border-gray-600 ${
                  j === it.entra ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-gray-300'
                }`}
              >
                <Formula tex={v} />
              </th>
            ))}
            <th className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold text-slate-600 dark:border-gray-600 dark:text-gray-300">
              b
            </th>
          </tr>
        </thead>
        <tbody>
          {it.filas.map((fila, i) => (
            <tr key={i} className={i === it.sale ? 'bg-amber-50 dark:bg-amber-500/10' : ''}>
              <td className="border border-slate-300 px-2 py-1.5 text-center dark:border-gray-600">
                <Formula tex={it.basica[i]} />
              </td>
              {fila.map((f, j) => {
                const esPivote = i === it.sale && j === it.entra;
                return (
                  <td
                    key={j}
                    title={`${f.num}/${f.den}`}
                    className={`border border-slate-300 px-2 py-1.5 text-center tabular-nums dark:border-gray-600 ${
                      esPivote
                        ? 'bg-red-100 text-base font-bold text-red-600 dark:bg-red-900/40 dark:text-red-400'
                        : 'text-slate-700 dark:text-gray-200'
                    }`}
                  >
                    <Formula tex={f.tex} />
                  </td>
                );
              })}
              <td
                title={`${it.rhs[i].num}/${it.rhs[i].den}`}
                className="border border-slate-300 px-2 py-1.5 text-center font-medium tabular-nums text-slate-800 dark:border-gray-600 dark:text-gray-100"
              >
                <Formula tex={it.rhs[i].tex} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explicaciones de cada tabla (factible, complementaria, entra, sale, verifica)
// ---------------------------------------------------------------------------

type TipoExplicacion = 'factible' | 'complementaria' | 'entra' | 'sale' | 'verifica' | 'residuo';

const celdaModal = 'border border-slate-200 px-2 py-1 dark:border-gray-700';

function Veredicto({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      className={`mt-3 rounded-md border px-3 py-2 text-sm font-semibold ${
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-400'
      }`}
    >
      {children}
    </p>
  );
}

/** Valor que toma una variable en la solución básica actual (0 si no es básica). */
function valorDeBase(it: IteracionLemkeDTO, nombre: string): FraccionJSON | null {
  const i = it.basica.indexOf(nombre);
  return i >= 0 ? it.rhs[i] : null;
}

function ExplicacionFactibleLemke({ it }: { it: IteracionLemkeDTO }) {
  const negativas = it.rhs.flatMap((f, i) => (esNegativo(f) ? [i] : []));
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        Una solución básica es factible si todas las variables básicas toman valores{' '}
        <Formula tex="w_B = b \ge 0" />. Las variables no básicas valen 0.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-left`}>Variable básica</th>
            <th className={`${celdaModal} text-right`}>Valor (b)</th>
            <th className={`${celdaModal} text-center`}>¿≥ 0?</th>
          </tr>
        </thead>
        <tbody>
          {it.basica.map((v, i) => {
            const negativa = negativas.includes(i);
            return (
              <tr key={i} className={negativa ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                <td className={celdaModal}>
                  <Formula tex={v} />
                </td>
                <td className={`${celdaModal} text-right tabular-nums`}>
                  <Formula
                    tex={`${it.rhs[i].tex}${it.rhs[i].den !== '1' ? ` \\approx ${it.rhs[i].dec}` : ''}`}
                  />
                </td>
                <td
                  className={`${celdaModal} text-center font-semibold ${
                    negativa ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {negativa ? '✗' : '✓'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Veredicto ok={negativas.length === 0}>
        {negativas.length > 0
          ? `Hay ${negativas.length} valor(es) negativos en b → NO es factible.`
          : 'Todos los valores de b son ≥ 0 → SÍ es factible.'}
      </Veredicto>
    </div>
  );
}

function ExplicacionComplementariaLemke({ it }: { it: IteracionLemkeDTO }) {
  const nPares = (it.variables.length - 1) / 2;
  const z0 = it.variables[it.variables.length - 1];
  const z0Basica = it.basica.includes(z0);
  const factible = it.rhs.every((f) => !esNegativo(f));
  const pares = Array.from({ length: nPares }, (_, i) => {
    const z = valorDeBase(it, it.variables[i]);
    const w = valorDeBase(it, it.variables[nPares + i]);
    const producto = (z ? num(z) : 0) * (w ? num(w) : 0);
    return { i, z, w, producto };
  });
  const productosCero = pares.every((p) => p.producto === 0);
  const esComplementaria = productosCero && !z0Basica && factible;
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        El pivoteo de Lemke es <strong>complementario</strong>: de cada pareja (w<sub>i</sub>, z
        <sub>i</sub>) exactamente una variable es básica, de modo que{' '}
        <Formula tex="w_i z_i = 0" />. La artificial <Formula tex="z_0" /> permite arrancar; la
        solución solo es complementaria cuando ya no está en la base.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-center`}>i</th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="z_i" />
            </th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="w_i" />
            </th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="w_i z_i" />
            </th>
            <th className={`${celdaModal} text-center`}>¿= 0?</th>
          </tr>
        </thead>
        <tbody>
          {pares.map(({ i, z, w, producto }) => (
            <tr key={i} className={producto !== 0 ? 'bg-red-50 dark:bg-red-900/20' : ''}>
              <td className={`${celdaModal} text-center text-slate-500 dark:text-gray-400`}>{i + 1}</td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={z?.tex ?? '0'} />
              </td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={w?.tex ?? '0'} />
              </td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={z && w ? `${z.tex} \\cdot ${w.tex}` : '0'} />
              </td>
              <td
                className={`${celdaModal} text-center font-semibold ${
                  producto === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {producto === 0 ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {z0Basica ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-gray-800">
          La artificial <Formula tex="z_0" /> sigue en la base: la solución es{' '}
          <strong>casi-complementaria</strong>, todavía no complementaria.
        </p>
      ) : null}
      <Veredicto ok={esComplementaria}>
        {!productosCero
          ? 'Alguna pareja tiene w_i z_i ≠ 0 → NO es complementaria.'
          : z0Basica
            ? 'w_i z_i = 0 en todas las parejas, pero z_0 sigue en la base → todavía NO es una solución complementaria.'
            : !factible
              ? 'w_i z_i = 0 en todas las parejas, pero hay valores básicos negativos → todavía NO es una solución factible ni complementaria.'
              : 'z_0 fuera de la base, w_i z_i = 0 y valores ≥ 0 → SÍ es una solución complementaria.'}
      </Veredicto>
    </div>
  );
}

function ExplicacionSaleLemke({ it }: { it: IteracionLemkeDTO }) {
  if (it.paso === 'inicio') {
    let filaMin = 0;
    it.rhs.forEach((f, i) => {
      if (num(f) < num(it.rhs[filaMin])) filaMin = i;
    });
    return (
      <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
        <p>
          Para arrancar se introduce la variable artificial <Formula tex="z_0" /> en la fila con el
          valor <Formula tex="q_i" /> más negativo. Con{' '}
          <Formula tex="z_0 = -\min_i q_i" /> todos los valores básicos quedan{' '}
          <Formula tex="w = q + e z_0 \ge 0" />.
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
              <th className={`${celdaModal} text-left`}>Variable básica</th>
              <th className={`${celdaModal} text-right`}>Valor (q)</th>
              <th className={`${celdaModal} text-center`}>¿Fila pivote?</th>
            </tr>
          </thead>
          <tbody>
            {it.rhs.map((f, i) => (
              <tr key={i} className={i === filaMin ? 'bg-amber-50 dark:bg-amber-500/10' : ''}>
                <td className={celdaModal}>
                  <Formula tex={it.basica[i]} />
                </td>
                <td
                  className={`${celdaModal} text-right tabular-nums ${
                    esNegativo(f) ? 'text-red-600 dark:text-red-400' : ''
                  }`}
                >
                  <Formula tex={f.tex} />
                </td>
                <td
                  className={`${celdaModal} text-center font-semibold ${
                    i === filaMin ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {i === filaMin ? '←' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Veredicto ok={false}>
          Sale <Formula tex={it.basica[filaMin]} /> de la fila {filaMin + 1}: entra la artificial{' '}
          <Formula tex="z_0" /> porque <Formula tex={`q_{${filaMin + 1}}`} /> es el más negativo.
        </Veredicto>
      </div>
    );
  }

  const ratios = it.ratios ?? [];
  const activos = ratios.filter((r) => !r.descartada && r.razon);
  let elegida: RazonLemkeDTO | null = null;
  for (const r of activos) {
    if (elegida === null || num(r.razon!) < num(elegida.razon!)) elegida = r;
  }
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        La fila saliente se decide con la <strong>prueba de la razón mínima</strong>: para cada fila
        se calcula <Formula tex="b_i / a_{ie}" /> y se descartan los coeficientes{' '}
        <Formula tex="a_{ie} \le 0" />. En caso de empate decide la regla lexicográfica.
      </p>
      {activos.length === 0 ? (
        <Veredicto ok={false}>
          La columna entrante no tiene coeficientes positivos → rayo terminal: no se encuentra
          solución complementaria por este camino.
        </Veredicto>
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                <th className={`${celdaModal} text-left`}>Variable</th>
                <th className={`${celdaModal} text-right`}>
                  <Formula tex="b_i" />
                </th>
                <th className={`${celdaModal} text-right`}>
                  <Formula tex="a_{ie}" />
                </th>
                <th className={`${celdaModal} text-right`}>Razón</th>
                <th className={`${celdaModal} text-center`}>¿Sale?</th>
              </tr>
            </thead>
            <tbody>
              {activos.map((r, idx) => {
                const esElegida = r.fila === it.sale;
                return (
                  <tr key={idx} className={esElegida ? 'bg-amber-50 dark:bg-amber-500/10' : ''}>
                    <td className={celdaModal}>
                      <Formula tex={r.variable} />
                    </td>
                    <td className={`${celdaModal} text-right tabular-nums`}>
                      <Formula tex={r.valorBase.tex} />
                    </td>
                    <td className={`${celdaModal} text-right tabular-nums`}>
                      <Formula tex={r.coeficiente.tex} />
                    </td>
                    <td className={`${celdaModal} text-right tabular-nums`}>
                      <Formula tex={r.razon!.tex} />
                    </td>
                    <td
                      className={`${celdaModal} text-center font-semibold ${
                        esElegida ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {esElegida ? '←' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {elegida ? (
            <Veredicto ok={false}>
              Sale <Formula tex={elegida.variable} /> con la razón mínima{' '}
              <Formula tex={elegida.razon!.tex} />.
            </Veredicto>
          ) : null}
        </>
      )}
    </div>
  );
}

function ExplicacionEntraLemke({ it }: { it: IteracionLemkeDTO }) {
  const nPares = (it.variables.length - 1) / 2;
  const e = it.entra!;

  if (it.paso === 'inicio' || e >= 2 * nPares) {
    return (
      <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
        <p>
          El algoritmo añade la columna de unos de la variable artificial{' '}
          <Formula tex="z_0" /> y la deja entrar con el mayor valor que mantiene{' '}
          <Formula tex="w \ge 0" />:
        </p>
        <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-gray-800">
          <Formula display tex="w = q + Mz + e\,z_0, \qquad z_0 = -\min_i q_i" />
        </div>
        <Veredicto ok>
          Entra <Formula tex="z_0" /> para hacer factible el sistema aumentado.
        </Veredicto>
      </div>
    );
  }

  const compIdx = e < nPares ? e + nPares : e - nPares;
  const entraNombre = it.variables[e];
  const complNombre = it.variables[compIdx];
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        El pivoteo complementario impone que la variable entrante sea el{' '}
        <strong>complemento de la que acaba de salir</strong>:
      </p>
      <div className="rounded-md bg-slate-50 px-4 py-3 text-center dark:bg-gray-800">
        <Formula display tex="w_i \text{ sale} \;\Rightarrow\; z_i \text{ entra}, \qquad z_i \text{ sale} \;\Rightarrow\; w_i \text{ entra}" />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-left`}>Pareja</th>
            <th className={`${celdaModal} text-center`}>Variable entrante</th>
            <th className={`${celdaModal} text-center`}>Su complemento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={celdaModal}>i = {compIdx < nPares ? compIdx + 1 : compIdx - nPares + 1}</td>
            <td className={`${celdaModal} text-center`}>
              <Formula tex={entraNombre} />
            </td>
            <td className={`${celdaModal} text-center`}>
              <Formula tex={complNombre} />
            </td>
          </tr>
        </tbody>
      </table>
      {it.sale === null ? (
        <Veredicto ok={false}>
          Entra <Formula tex={entraNombre} />, pero su columna no tiene coeficientes positivos: rayo
          terminal, sin solución complementaria por este camino.
        </Veredicto>
      ) : (
        <Veredicto ok>
          Entra <Formula tex={entraNombre} />, complemento de <Formula tex={complNombre} />.
        </Veredicto>
      )}
    </div>
  );
}

function ExplicacionVerificaComplementariedad({ resultado }: { resultado: LemkeResultado }) {
  const filas = resultado.complementariedad.map((c) => {
    const noNegativos = !esNegativo(c.z) && !esNegativo(c.w);
    const productoNulo = num(c.producto) === 0;
    return { c, ok: noNegativos && productoNulo };
  });
  const ok = filas.every((f) => f.ok);
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        Una solución del LCP es <strong>complementaria</strong> si cada pareja cumple{' '}
        <Formula tex="w_i z_i = 0" /> con ambos valores no negativos. Basta con que uno de los dos
        sea cero.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-center`}>i</th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="z_i" />
            </th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="w_i" />
            </th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="w_i z_i" />
            </th>
            <th className={`${celdaModal} text-center`}>¿Cumple?</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ c, ok: cumple }) => (
            <tr key={c.indice} className={cumple ? '' : 'bg-red-50 dark:bg-red-900/20'}>
              <td className={`${celdaModal} text-center text-slate-500 dark:text-gray-400`}>{c.indice + 1}</td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={c.z.tex} />
              </td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={c.w.tex} />
              </td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={c.producto.tex} />
              </td>
              <td
                className={`${celdaModal} text-center font-semibold ${
                  cumple ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {cumple ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Veredicto ok={ok}>
        {ok
          ? 'Todas las parejas tienen w_i z_i = 0 con valores ≥ 0 → SÍ cumple la complementariedad.'
          : 'Alguna pareja no cumple w_i z_i = 0 o tiene un valor negativo → NO cumple la complementariedad.'}
      </Veredicto>
    </div>
  );
}

function ExplicacionResiduo({ resultado }: { resultado: LemkeResultado }) {
  const filas: ComplementariedadDTO[] = resultado.complementariedad;
  const ok = resultado.residuo.every((f) => num(f) === 0);
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        El residuo comprueba que la solución satisface las ecuaciones del LCP{' '}
        <Formula tex="w = Mz + q" />. Debe ser el vector cero:
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-center`}>i</th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="w_i - (Mz + q)_i" />
            </th>
            <th className={`${celdaModal} text-center`}>¿= 0?</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((c, i) => {
            const r = resultado.residuo[i];
            const cero = r ? num(r) === 0 : true;
            return (
              <tr key={c.indice} className={cero ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                <td className={`${celdaModal} text-center text-slate-500 dark:text-gray-400`}>{c.indice + 1}</td>
                <td className={`${celdaModal} text-right tabular-nums`}>
                  <Formula tex={r?.tex ?? '0'} />
                </td>
                <td
                  className={`${celdaModal} text-center font-semibold ${
                    cero ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {cero ? '✓' : '✗'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Veredicto ok={ok}>
        {ok
          ? 'El residuo es el vector cero → SÍ satisface w = Mz + q.'
          : 'El residuo no es cero → NO satisface w = Mz + q.'}
      </Veredicto>
    </div>
  );
}

function ModalExplicacion({
  titulo,
  subtitulo,
  onCerrar,
  children,
}: {
  titulo: string;
  subtitulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="explicacion-titulo"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-gray-700">
          <div>
            <h3 id="explicacion-titulo" className="text-lg font-semibold text-slate-800 dark:text-gray-100">
              {titulo}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{subtitulo}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
        <div className="flex justify-end border-t border-slate-200 p-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LemkePage() {
  const [pestana, setPestana] = useState<Pestana>('calculadora');
  const [tipo, setTipo] = useState<Tipo>('lcp');
  const [resultado, setResultado] = useState<LemkeResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [explicacion, setExplicacion] = useState<{ tipo: TipoExplicacion; indice?: number } | null>(null);

  // LCP
  const [nLcp, setNLcp] = useState('2');
  const [M, setM] = useState<string[][]>([
    ['2', '1'],
    ['1', '2'],
  ]);
  const [qLcp, setQLcp] = useState<string[]>(['-5', '-6']);

  const ajustarLcp = (nuevo: number) => {
    setM((prev) => redimensionar(prev, nuevo, nuevo));
    setQLcp((prev) => Array.from({ length: nuevo }, (_, i) => prev[i] ?? '0'));
  };

  // QP
  const [nQp, setNQp] = useState('2');
  const [mQp, setMQp] = useState('1');
  const [Q, setQ] = useState<string[][]>([
    ['1', '0'],
    ['0', '1'],
  ]);
  const [c, setC] = useState<string[]>(['-2', '-2']);
  const [A, setA] = useState<string[][]>([['1', '1']]);
  const [b, setB] = useState<string[]>(['6']);

  const tamQp = useMemo(() => {
    const v = Number(nQp);
    return Number.isFinite(v) ? Math.min(Math.max(Math.trunc(v), 1), 8) : 1;
  }, [nQp]);

  const numRestricciones = useMemo(() => {
    const v = Number(mQp);
    return Number.isFinite(v) ? Math.min(Math.max(Math.trunc(v), 0), 8) : 0;
  }, [mQp]);

  const ajustarQp = (nuevoN: number, nuevoM: number) => {
    setQ((prev) => redimensionar(prev, nuevoN, nuevoN));
    setC((prev) => Array.from({ length: nuevoN }, (_, i) => prev[i] ?? '0'));
    setA((prev) => redimensionar(prev, nuevoM, nuevoN));
    setB((prev) => Array.from({ length: nuevoM }, (_, i) => prev[i] ?? '0'));
  };

  const resolver = async () => {
    setCargando(true);
    setError(null);
    try {
      const r =
        tipo === 'lcp'
          ? await calcularLemke({
              tipo: 'lcp',
              M: M.map((fila) => fila.map(Number)),
              q: qLcp.map(Number),
            })
          : await calcularLemke({
              tipo: 'qp',
              Q: Q.map((fila) => fila.map(Number)),
              c: c.map(Number),
              A: A.map((fila) => fila.map(Number)),
              b: b.map(Number),
            });
      setResultado(r);
    } catch (e) {
      setResultado(null);
      setError(
        e instanceof ApiError
          ? [e.message, ...e.issues.map((i) => i.message)].join(' · ')
          : 'No se pudo conectar con el servidor de cálculo.'
      );
    } finally {
      setCargando(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void resolver();
  };

  const respuesta = (ok: boolean) => (
    <span
      className={`font-semibold ${
        ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
      }`}
    >
      {ok ? 'SÍ' : 'NO'}
    </span>
  );
  const botonClase =
    'rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800';

  return (
    <div className="space-y-6">
      <CabeceraConGlosario variables={VARIABLES_LEMKE}>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">Algoritmo de Lemke</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Pivoteo complementario para resolver un LCP y, vía las condiciones KKT, un problema de programación
          cuadrática. Todas las operaciones usan fracciones exactas.
        </p>
      </CabeceraConGlosario>

      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones del algoritmo de Lemke"
      />

      {pestana === 'teoria' ? (
        <LemkeTeoria />
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <form
          onSubmit={onSubmit}
          className="h-fit min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-100">Problema</h2>
            <div className="mt-2 inline-flex rounded-md border border-slate-200 p-1 dark:border-gray-700">
              {(['lcp', 'qp'] as Tipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTipo(t);
                    setResultado(null);
                    setError(null);
                  }}
                  className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                    tipo === t
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {t === 'lcp' ? 'LCP' : 'QP (KKT)'}
                </button>
              ))}
            </div>
          </div>

          {tipo === 'lcp' ? (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
                Tamaño (n)
                <input
                  type="number"
                  min={1}
                  max={8}
                  className={inputNum}
                  value={nLcp}
                  onChange={(e) => {
                    setNLcp(e.target.value);
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 1 && v <= 8) ajustarLcp(Math.trunc(v));
                  }}
                />
              </label>

              <MatrizEditor
                titulo="Matriz M"
                M={M}
                onCelda={(i, j, v) => setM((prev) => prev.map((fila, k) => (k === i ? fila.map((x, l) => (l === j ? v : x)) : fila)))}
                filaEtiqueta={(i) => `z_{${i + 1}}`}
                colEtiqueta={(j) => `z_{${j + 1}}`}
              />
              <VectorEditor
                titulo="Vector q"
                v={qLcp}
                onValor={(i, valor) => setQLcp((prev) => prev.map((x, k) => (k === i ? valor : x)))}
                etiqueta={(i) => `q_{${i + 1}}`}
              />
              <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-gray-900">
                <Formula tex="w = Mz + q,\quad w,z \ge 0,\quad w^{T}z = 0" />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
                  Variables (n)
                  <input
                    type="number"
                    min={1}
                    max={8}
                    className={inputNum}
                    value={nQp}
                    onChange={(e) => {
                      setNQp(e.target.value);
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 1 && v <= 8) ajustarQp(Math.trunc(v), numRestricciones);
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
                  Restricciones (m)
                  <input
                    type="number"
                    min={0}
                    max={8}
                    className={inputNum}
                    value={mQp}
                    onChange={(e) => {
                      setMQp(e.target.value);
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 0 && v <= 8) ajustarQp(tamQp, Math.trunc(v));
                    }}
                  />
                </label>
              </div>

              <MatrizEditor
                titulo="Matriz Q (simétrica)"
                M={Q}
                onCelda={(i, j, v) => setQ((prev) => prev.map((fila, k) => (k === i ? fila.map((x, l) => (l === j ? v : x)) : fila)))}
                filaEtiqueta={(i) => `x_{${i + 1}}`}
                colEtiqueta={(j) => `x_{${j + 1}}`}
              />
              <VectorEditor
                titulo="Vector c"
                v={c}
                onValor={(i, valor) => setC((prev) => prev.map((x, k) => (k === i ? valor : x)))}
                etiqueta={(i) => `c_{${i + 1}}`}
              />
              {numRestricciones > 0 ? (
                <>
                  <MatrizEditor
                    titulo="Matriz A (A x ≥ b)"
                    M={A}
                    onCelda={(i, j, v) => setA((prev) => prev.map((fila, k) => (k === i ? fila.map((x, l) => (l === j ? v : x)) : fila)))}
                    filaEtiqueta={(i) => `R_{${i + 1}}`}
                    colEtiqueta={(j) => `x_{${j + 1}}`}
                  />
                  <VectorEditor
                    titulo="Vector b"
                    v={b}
                    onValor={(i, valor) => setB((prev) => prev.map((x, k) => (k === i ? valor : x)))}
                    etiqueta={(i) => `b_{${i + 1}}`}
                  />
                </>
              ) : null}
              <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-gray-900">
                <Formula tex="\min\; \tfrac{1}{2}x^{T}Qx + c^{T}x \quad \text{s.a. } Ax \ge b,\; x \ge 0" />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? 'Calculando…' : 'Resolver con Lemke'}
          </button>
        </form>

        <div className="min-w-0 space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}

          {!resultado && !error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-lg font-semibold text-slate-700 dark:text-gray-100">Sin resultados todavía</p>
              <p className="max-w-md text-sm text-slate-500 dark:text-gray-400">
                Elige <strong>LCP</strong> o <strong>QP</strong>, escribe los datos y pulsa{' '}
                <strong>“Resolver con Lemke”</strong>.
              </p>
            </div>
          ) : null}

          {resultado ? (
            <>
              {resultado.estado === 'sin-solucion' ? (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  <p className="font-bold">Sin solución complementaria</p>
                  <p className="mt-1">{resultado.mensaje}</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {resultado.qp ? (
                      <>
                        <KpiCard
                          highlight
                          title="Valor óptimo Z*"
                          value={valorTex(resultado.qp.valorObjetivo)}
                          formula="Z^{*} = \tfrac{1}{2}x^{T}Qx + c^{T}x"
                          tone="amber"
                          description="Valor de la función objetivo cuadrática."
                        />
                        <KpiCard
                          title="Solución óptima x*"
                          value={resultado.qp.x.map(valorTex).join('  ·  ')}
                          formula="x^{*} = (x_1, \dots, x_n)"
                          tone="emerald"
                          description={
                            resultado.qp.lambda.length
                              ? `Multiplicadores λ = (${resultado.qp.lambda.map(valorTex).join(', ')})`
                              : 'Sin restricciones activas.'
                          }
                        />
                      </>
                    ) : (
                      <KpiCard
                        highlight
                        title="Solución complementaria z*"
                        value={resultado.z.map(valorTex).join('  ·  ')}
                        formula="w = Mz + q,\quad w^{T}z = 0"
                        tone="amber"
                        description="Variables z del LCP."
                      />
                    )}
                  </div>

                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-slate-700 dark:text-gray-100">
                        Verificación de complementariedad
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          resultado.verifica
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                        }`}
                      >
                        {resultado.verifica ? 'Verifica' : 'No verifica'}
                      </span>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className="border border-slate-300 px-2 py-1.5 text-xs text-slate-500 dark:border-gray-600 dark:text-gray-400">
                              i
                            </th>
                            <th className="border border-slate-300 px-2 py-1.5 text-xs text-slate-500 dark:border-gray-600 dark:text-gray-400">
                              <Formula tex="z_i" />
                            </th>
                            <th className="border border-slate-300 px-2 py-1.5 text-xs text-slate-500 dark:border-gray-600 dark:text-gray-400">
                              <Formula tex="w_i" />
                            </th>
                            <th className="border border-slate-300 px-2 py-1.5 text-xs text-slate-500 dark:border-gray-600 dark:text-gray-400">
                              <Formula tex="z_i \, w_i" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.complementariedad.map((c) => {
                            const cumple =
                              !esNegativo(c.z) && !esNegativo(c.w) && num(c.producto) === 0;
                            return (
                              <tr key={c.indice} className={cumple ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                                <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500 dark:border-gray-600 dark:text-gray-400">
                                  {c.indice + 1}
                                </td>
                                <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums dark:border-gray-600">
                                  <Formula tex={c.z.tex} />
                                </td>
                                <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums dark:border-gray-600">
                                  <Formula tex={c.w.tex} />
                                </td>
                                <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums dark:border-gray-600">
                                  <Formula tex={c.producto.tex} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                      Residuo{' '}
                      <Formula
                        tex={`w - (Mz + q) = (${resultado.residuo.map((f) => f.tex).join(',\\; ')})`}
                      />
                      .{resultado.qp ? ' En el QP, z = (x, λ) y w = (μ, s), con s = Ax − b.' : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-gray-300">
                      <button
                        type="button"
                        onClick={() => setExplicacion({ tipo: 'verifica' })}
                        className={botonClase}
                      >
                        ¿Cumple complementariedad? {respuesta(resultado.verifica)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExplicacion({ tipo: 'residuo' })}
                        className={botonClase}
                      >
                        ¿Satisface w = Mz + q?{' '}
                        {respuesta(resultado.residuo.every((f) => num(f) === 0))}
                      </button>
                    </div>
                  </section>

                  {resultado.qp ? (
                    <section className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Multiplicadores λ
                        </p>
                        <ul className="mt-2 space-y-1 text-slate-600 dark:text-gray-300">
                          {resultado.qp.lambda.map((f, i) => (
                            <li key={i}>
                              <Formula tex={`\\lambda_{${i + 1}} = ${f.tex}`} />
                            </li>
                          ))}
                          {resultado.qp.lambda.length === 0 ? <li>Sin restricciones.</li> : null}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Holguras s = Ax − b
                        </p>
                        <ul className="mt-2 space-y-1 text-slate-600 dark:text-gray-300">
                          {resultado.qp.holguras.map((f, i) => (
                            <li key={i}>
                              <Formula tex={`s_{${i + 1}} = ${f.tex}`} />
                            </li>
                          ))}
                          {resultado.qp.holguras.length === 0 ? <li>Sin restricciones.</li> : null}
                        </ul>
                      </div>
                    </section>
                  ) : null}
                </>
              )}

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-700 dark:text-gray-100">Tablas del pivoteo</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-gray-700 dark:text-gray-300">
                    {resultado.iteraciones.length} tabla{resultado.iteraciones.length === 1 ? '' : 's'}
                  </span>
                </div>
                {resultado.iteraciones.map((it, k) => {
                  const factible = it.rhs.every((f) => !esNegativo(f));
                  const z0 = it.variables[it.variables.length - 1];
                  const z0Basica = it.basica.includes(z0);
                  const complementaria = factible && !z0Basica;
                  const ratiosActivos = (it.ratios ?? []).filter((r) => !r.descartada && r.razon);
                  return (
                    <div
                      key={it.iteracion}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-100">
                          Iteración {it.iteracion}
                        </h4>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-gray-700 dark:text-gray-300">
                          {it.paso}
                        </span>
                      </div>
                      <TablaLemke it={it} />
                      <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">{conSubindices(it.nota)}</p>
                      {ratiosActivos.length ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                          <span>Razones:</span>
                          {ratiosActivos.map((r, idx) => (
                            <span
                              key={idx}
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 dark:border-gray-700 dark:bg-gray-900"
                            >
                              <Formula
                                tex={`${r.variable} = \\frac{${r.valorBase.tex}}{${r.coeficiente.tex}} = ${r.razon!.tex}`}
                              />
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-gray-300">
                        <button
                          type="button"
                          onClick={() => setExplicacion({ tipo: 'factible', indice: k })}
                          className={botonClase}
                        >
                          ¿Es factible? {respuesta(factible)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExplicacion({ tipo: 'complementaria', indice: k })}
                          className={botonClase}
                        >
                          ¿Complementaria? {respuesta(complementaria)}
                        </button>
                        {it.entra !== null ? (
                          <button
                            type="button"
                            onClick={() => setExplicacion({ tipo: 'entra', indice: k })}
                            className={botonClase}
                          >
                            Entra <Formula tex={it.variables[it.entra]} />
                          </button>
                        ) : null}
                        {it.sale !== null ? (
                          <button
                            type="button"
                            onClick={() => setExplicacion({ tipo: 'sale', indice: k })}
                            className={botonClase}
                          >
                            Sale <Formula tex={it.basica[it.sale]} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </section>

              <ProcesosView
                procesos={resultado.procesos}
                encabezado="Procesos paso a paso — Lemke"
                descripcion="Construcción del LCP (si es QP), pivoteo complementario y verificación de KKT."
                unidad="unidades"
              />
            </>
          ) : null}
        </div>
      </div>
      )}

      {explicacion ? (() => {
        const titulos: Record<TipoExplicacion, string> = {
          factible: '¿Es factible?',
          complementaria: '¿Es una solución complementaria?',
          entra: '¿Por qué entra esta variable?',
          sale: '¿Por qué sale esta variable?',
          verifica: '¿Cumple la complementariedad?',
          residuo: '¿Satisface w = Mz + q?',
        };
        let subtitulo = 'Solución final';
        let contenido: ReactNode = null;
        if (explicacion.tipo === 'verifica' && resultado) {
          contenido = <ExplicacionVerificaComplementariedad resultado={resultado} />;
        } else if (explicacion.tipo === 'residuo' && resultado) {
          contenido = <ExplicacionResiduo resultado={resultado} />;
        } else {
          const it = resultado?.iteraciones[explicacion.indice ?? -1];
          if (!it) return null;
          subtitulo = `ITERACIÓN ${it.iteracion}`;
          if (explicacion.tipo === 'factible') contenido = <ExplicacionFactibleLemke it={it} />;
          else if (explicacion.tipo === 'complementaria')
            contenido = <ExplicacionComplementariaLemke it={it} />;
          else if (explicacion.tipo === 'entra') contenido = <ExplicacionEntraLemke it={it} />;
          else contenido = <ExplicacionSaleLemke it={it} />;
        }
        return (
          <ModalExplicacion
            titulo={titulos[explicacion.tipo]}
            subtitulo={subtitulo}
            onCerrar={() => setExplicacion(null)}
          >
            {contenido}
          </ModalExplicacion>
        );
      })() : null}
    </div>
  );
}
