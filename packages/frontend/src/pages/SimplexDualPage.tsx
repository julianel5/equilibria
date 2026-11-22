import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  calcularSimplexDual,
  ApiError,
  type FraccionJSON,
  type IteracionDualDTO,
  type ObjetivoSimplex,
  type RazonDualDTO,
  type SimplexDualResultado,
} from '../services/api';
import Formula from '@shared/components/Formula';
import KpiCard from '@shared/components/KpiCard';
import ProcesosView from '@shared/components/ProcesosView';
import TabsPanel from '@shared/components/TabsPanel';
import SimplexDualTeoria from '../components/SimplexDualTeoria';
import CabeceraConGlosario from '../components/CabeceraConGlosario';
import { VARIABLES_SIMPLEX_DUAL } from '../data/glosarioPL';

type Operador = 'LE' | 'GE' | 'EQ';
type Pestana = 'calculadora' | 'teoria';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

interface Fila {
  id: string;
  operador: Operador;
  b: string;
  coeficientes: string[];
}

const ETIQUETA: Record<Operador, string> = { LE: '≤', GE: '≥', EQ: '=' };
const SIMBOLO: Record<Operador, string> = { LE: '\\le', GE: '\\ge', EQ: '=' };

const inputCoef =
  'w-16 rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-sm tabular-nums shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';
const inputSelect =
  'rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';
const inputOperador =
  'w-14 appearance-none rounded-md border border-slate-300 bg-white py-2 pl-1 pr-7 text-center text-sm font-semibold shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const num = (f: FraccionJSON): number => Number(f.num) / Number(f.den);

function texCombinacion(coefs: string[]): string {
  const t = coefs
    .map((c, j) => ({ v: Number(c), j }))
    .filter(({ v }) => v !== 0)
    .map(({ v, j }, k) => {
      const abs = Math.abs(v);
      const signo = v < 0 ? (k === 0 ? '-' : '- ') : k === 0 ? '' : '+ ';
      return `${signo}${abs === 1 ? '' : abs}X_{${j + 1}}`;
    });
  return t.length ? t.join(' ') : '0';
}

/** Ejemplo clásico de minimización con restricciones ≥ (base dual-factible). */
const EJEMPLO = {
  objetivo: 'min' as ObjetivoSimplex,
  n: 2,
  coefs: ['2', '3'],
  filas: [
    { id: 'r1', operador: 'GE' as Operador, b: '4', coeficientes: ['1', '1'] },
    { id: 'r2', operador: 'GE' as Operador, b: '6', coeficientes: ['1', '3'] },
  ],
};

function TablaDual({ it, objetivo }: { it: IteracionDualDTO; objetivo: ObjetivoSimplex }) {
  const { filaSaliente: sale, columnaEntrante: entra } = it;
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
                  j === entra ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-gray-300'
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
            <tr key={i} className={i === sale ? 'bg-amber-50 dark:bg-amber-500/10' : ''}>
              <td className="border border-slate-300 px-2 py-1.5 text-center dark:border-gray-600">
                <Formula tex={it.basica[i]} />
              </td>
              {fila.map((f, j) => {
                const esPivote = i === sale && j === entra;
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
                className={`border border-slate-300 px-2 py-1.5 text-center font-medium tabular-nums dark:border-gray-600 ${
                  num(it.rhs[i]) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-gray-100'
                }`}
              >
                <Formula tex={it.rhs[i].tex} />
              </td>
            </tr>
          ))}
          <tr>
            <td className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold text-slate-500 dark:border-gray-600 dark:text-gray-400">
              <Formula tex="Z_j - C_j" />
            </td>
            {it.reducidos.map((f, j) => (
              <td
                key={j}
                title={`${f.num}/${f.den}`}
                className={`border border-slate-300 px-2 py-1.5 text-center tabular-nums dark:border-gray-600 ${
                  j === entra ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-gray-200'
                }`}
              >
                <Formula tex={f.tex} />
              </td>
            ))}
            <td
              title={`${it.z.num}/${it.z.den}`}
              className="border border-slate-300 px-2 py-1.5 text-center font-bold tabular-nums text-slate-800 dark:border-gray-600 dark:text-gray-100"
            >
              <Formula tex={it.z.tex} />
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
        {it.factible ? (
          'Todos los valores básicos son ≥ 0.'
        ) : (
          <>
            Valor básico negativo:{' '}
            {it.rhs.map((f, i) => {
              if (num(f) >= 0) return null;
              const previos = it.rhs.slice(0, i).filter((g) => num(g) < 0).length;
              return (
                <span key={`${it.basica[i]}-${i}`}>
                  {previos > 0 ? ', ' : null}
                  <Formula tex={`${it.basica[i]} = ${f.tex}`} />
                </span>
              );
            })}
            .
          </>
        )}
        {objetivo === 'max' ? ' Tabla en la forma normalizada de minimización (Z′ = −Z).' : ''}
      </p>
    </div>
  );
}

function RatiosDual({ ratios }: { ratios: RazonDualDTO[] }) {
  const activos = ratios.filter((r) => !r.descartada);
  if (activos.length === 0) {
    return <p className="text-xs text-red-600 dark:text-red-400">No hay columnas con coeficiente &lt; 0.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {activos.map((r) => (
        <span
          key={r.columna}
          className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <Formula tex={`${r.variable}:\\; ${r.reducido.tex} / (${r.coeficiente.tex}) = ${r.razon!.tex}`} />
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explicaciones de cada tabla (¿factible?, ¿óptima?, entra, sale)
// ---------------------------------------------------------------------------

type TipoExplicacion = 'factible' | 'optima' | 'entra' | 'sale';

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

function ExplicacionFactibleDual({ it }: { it: IteracionDualDTO }) {
  const noBasicas = it.variables.filter((v) => !it.basica.includes(v));
  const negativas = it.rhs.flatMap((f, i) => (num(f) < 0 ? [i] : []));
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        Una solución básica es factible si todas las variables básicas toman valores{' '}
        <Formula tex="x_B = b \ge 0" />. Las variables no básicas valen 0.
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
      {noBasicas.length > 0 ? (
        <p className="text-xs">
          No básicas: <Formula tex={`${noBasicas.join(' = ')} = 0`} />
        </p>
      ) : null}
      <Veredicto ok={negativas.length === 0}>
        {negativas.length > 0
          ? `Hay ${negativas.length} valor(es) negativos en b → NO es factible.`
          : 'Todos los valores de b son ≥ 0 → SÍ es factible.'}
      </Veredicto>
    </div>
  );
}

function ExplicacionOptimaDual({ it, objetivo }: { it: IteracionDualDTO; objetivo: ObjetivoSimplex }) {
  // La tabla está en la forma normalizada de minimización, por lo que el
  // criterio de optimalidad dual es Z_j − C_j ≤ 0 para toda variable.
  const violan = it.reducidos.flatMap((f, j) => (num(f) > 0 ? [j] : []));
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-500/10">
        A diferencia del Simplex Primal, el Dual arranca siendo óptimo (dual-factible) pero
        infactible, y busca alcanzar la factibilidad sin perder esa optimalidad.
      </p>
      <p>
        El método trabaja en la forma normalizada de <strong>minimización</strong>. La base es
        óptima para el dual (dual-factible) si todos los costos reducidos cumplen{' '}
        <Formula tex="Z_j - C_j \le 0" />. Un valor positivo indica que la condición de
        optimalidad se rompe.
      </p>
      {objetivo === 'max' ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-gray-800">
          El modelo original es de maximización: la tabla muestra Z′ = −Z, de modo que la condición se
          aplica igualmente sobre la fila de costos reducidos normalizada.
        </p>
      ) : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-left`}>Variable</th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="Z_j - C_j" />
            </th>
            <th className={`${celdaModal} text-center`}>
              ¿<Formula tex="\le 0" />?
            </th>
          </tr>
        </thead>
        <tbody>
          {it.variables.map((v, j) => {
            const viola = violan.includes(j);
            const basica = it.basica.includes(v);
            return (
              <tr key={j} className={viola ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                <td className={celdaModal}>
                  <Formula tex={v} />
                  {basica ? <span className="ml-1 text-xs text-slate-400">(básica)</span> : null}
                </td>
                <td className={`${celdaModal} text-right tabular-nums`}>
                  <Formula tex={it.reducidos[j].tex} />
                </td>
                <td
                  className={`${celdaModal} text-center font-semibold ${
                    viola ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {viola ? '✗' : '✓'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs">
        Valor actual de la función objetivo:{' '}
        <Formula tex={objetivo === 'max' ? `Z' = ${it.z.tex} \\;\\;\\; Z = ${it.zOriginal.tex}` : `Z = ${it.z.tex}`} />
      </p>
      <Veredicto ok={violan.length === 0}>
        {violan.length === 0 ? (
          <>
            Ningún <Formula tex="Z_j - C_j" /> es positivo → SÍ es dual-factible (óptima para el dual).
          </>
        ) : (
          <>
            {violan.length} variable(s) tienen <Formula tex="Z_j - C_j > 0" /> → NO es dual-factible.
          </>
        )}
      </Veredicto>
    </div>
  );
}

function ExplicacionSaleDual({ it }: { it: IteracionDualDTO }) {
  const negativas = it.rhs.flatMap((f, i) => (num(f) < 0 ? [i] : []));
  let masNegativa: number | null = null;
  for (const i of negativas) {
    if (masNegativa === null || num(it.rhs[i]) < num(it.rhs[masNegativa])) masNegativa = i;
  }
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        El <strong>Simplex Dual</strong> elige como variable saliente la fila cuyo valor básico es
        el más negativo: es la que más incumple <Formula tex="x_B \ge 0" /> y debe abandonar la
        base para recuperar la factibilidad primal.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-left`}>Variable básica</th>
            <th className={`${celdaModal} text-right`}>Valor (b)</th>
            <th className={`${celdaModal} text-center`}>¿Sale?</th>
          </tr>
        </thead>
        <tbody>
          {it.basica.map((v, i) => {
            const elegida = i === masNegativa;
            return (
              <tr key={i} className={elegida ? 'bg-amber-50 dark:bg-amber-500/10' : ''}>
                <td className={celdaModal}>
                  <Formula tex={v} />
                </td>
                <td
                  className={`${celdaModal} text-right tabular-nums ${
                    num(it.rhs[i]) < 0 ? 'text-red-600 dark:text-red-400' : ''
                  }`}
                >
                  <Formula tex={it.rhs[i].tex} />
                </td>
                <td className={`${celdaModal} text-center font-semibold ${elegida ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                  {elegida ? '←' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {masNegativa === null ? (
        <Veredicto ok>
          Ningún valor básico es negativo → no hace falta que salga ninguna variable: la base ya es
          factible.
        </Veredicto>
      ) : (
        <Veredicto ok={false}>
          Sale <Formula tex={it.basica[masNegativa]} /> por tener el valor básico más negativo (
          <Formula tex={it.rhs[masNegativa].tex} />).
        </Veredicto>
      )}
    </div>
  );
}

function ExplicacionEntraDual({ it }: { it: IteracionDualDTO }) {
  const ratios = it.ratios ?? [];
  const activos = ratios.filter((r) => !r.descartada && r.razon);
  let elegida: RazonDualDTO | null = null;
  for (const r of activos) {
    if (elegida === null || num(r.razon!) < num(elegida.razon!)) elegida = r;
  }
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        Una vez fijada la fila saliente, se considera la <strong>prueba de la razón dual</strong>{' '}
        sobre las columnas con coeficiente <Formula tex="a_{rj} < 0" />:
      </p>
      <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-gray-800">
        <Formula
          display
          tex={'e = \\arg\\min_{j:\\, a_{rj} < 0} \\frac{Z_j - C_j}{a_{rj}}'}
        />
      </div>
      {activos.length === 0 ? (
        <Veredicto ok={false}>
          La fila saliente no tiene coeficientes negativos → no existe columna entrante y el problema
          es infactible.
        </Veredicto>
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                <th className={`${celdaModal} text-left`}>Variable</th>
                <th className={`${celdaModal} text-right`}>
                  <Formula tex="Z_j - C_j" />
                </th>
                <th className={`${celdaModal} text-right`}>
                  <Formula tex="a_{rj}" />
                </th>
                <th className={`${celdaModal} text-right`}>Razón</th>
                <th className={`${celdaModal} text-center`}>¿Entra?</th>
              </tr>
            </thead>
            <tbody>
              {activos.map((r) => {
                const esElegida = elegida?.columna === r.columna;
                return (
                  <tr key={r.columna} className={esElegida ? 'bg-blue-50 dark:bg-blue-500/10' : ''}>
                    <td className={celdaModal}>
                      <Formula tex={r.variable} />
                    </td>
                    <td className={`${celdaModal} text-right tabular-nums`}>
                      <Formula tex={r.reducido.tex} />
                    </td>
                    <td className={`${celdaModal} text-right tabular-nums`}>
                      <Formula tex={r.coeficiente.tex} />
                    </td>
                    <td className={`${celdaModal} text-right tabular-nums`}>
                      <Formula tex={r.razon!.tex} />
                    </td>
                    <td className={`${celdaModal} text-center font-semibold ${esElegida ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                      {esElegida ? '←' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {elegida ? (
            <Veredicto ok>
              Entra <Formula tex={elegida.variable} /> por tener la razón dual mínima (
              <Formula tex={elegida.razon!.tex} />
              ), conservando la dual-factibilidad de la nueva base.
            </Veredicto>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function SimplexDualPage() {
  const [pestana, setPestana] = useState<Pestana>('calculadora');
  const [objetivo, setObjetivo] = useState<ObjetivoSimplex>(EJEMPLO.objetivo);
  const [n, setN] = useState(String(EJEMPLO.n));
  const [coefs, setCoefs] = useState<string[]>(EJEMPLO.coefs);
  const [filas, setFilas] = useState<Fila[]>(EJEMPLO.filas);
  const [resultado, setResultado] = useState<SimplexDualResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [explicacion, setExplicacion] = useState<{ tipo: TipoExplicacion; indice: number } | null>(null);

  const numVariables = useMemo(() => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.min(Math.max(Math.trunc(v), 1), 12) : 1;
  }, [n]);

  useEffect(() => {
    setCoefs((prev) => Array.from({ length: numVariables }, (_, j) => prev[j] ?? '0'));
    setFilas((prev) =>
      prev.map((f) => ({
        ...f,
        coeficientes: Array.from({ length: numVariables }, (_, j) => f.coeficientes[j] ?? '0'),
      }))
    );
  }, [numVariables]);

  const resolver = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await calcularSimplexDual({
        objetivo,
        funcionObjetivo: coefs.map(Number),
        restricciones: filas.map((f) => ({
          coeficientes: f.coeficientes.map(Number),
          tipo: f.operador,
          b: Number(f.b),
        })),
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

  const actualizarFila = (id: string, cambio: Partial<Fila>) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambio } : f)));

  const agregarFila = () =>
    setFilas((prev) => [
      ...prev,
      {
        id: `r${Date.now()}`,
        operador: 'GE',
        b: '1',
        coeficientes: Array.from({ length: numVariables }, () => '1'),
      },
    ]);

  return (
    <div className="space-y-6">
      <CabeceraConGlosario variables={VARIABLES_SIMPLEX_DUAL}>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">Simplex Dual</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Optimización desde una base dual-factible (super-óptima) pero primal-infeasible, con pivoteo dual y
          fracciones exactas.
        </p>
      </CabeceraConGlosario>

      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones del Simplex Dual"
      />

      {pestana === 'teoria' ? (
        <SimplexDualTeoria />
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Formulario */}
        <form
          onSubmit={onSubmit}
          className="h-fit min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-100">Modelo</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              El Simplex Dual arranca desde holguras/excesos. Para que la base inicial sea dual-factible, en
              minimización todos los costos deben ser ≥ 0 (en maximización, ≤ 0).
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
              Optimización
              <select className={inputSelect} value={objetivo} onChange={(e) => setObjetivo(e.target.value as ObjetivoSimplex)}>
                <option value="min">MIN</option>
                <option value="max">MAX</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
              Variables (n)
              <input
                type="number"
                min={1}
                max={12}
                className={inputCoef}
                value={n}
                onChange={(e) => setN(e.target.value)}
                aria-label="Número de variables"
              />
            </label>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600 dark:text-gray-300">Función objetivo</p>
            <div className="flex flex-wrap items-center gap-1">
              {coefs.map((c, j) => (
                <span key={j} className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    className={inputCoef}
                    value={c}
                    aria-label={`Coeficiente de x${j + 1}`}
                    onChange={(e) => setCoefs((prev) => prev.map((v, k) => (k === j ? e.target.value : v)))}
                  />
                  <Formula tex={`x_{${j + 1}}`} />
                  {j < coefs.length - 1 ? <span className="text-slate-400">+</span> : null}
                </span>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
              Restricciones
            </legend>
            <div className="space-y-2">
              {filas.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-gray-700 dark:bg-gray-900"
                >
                  {f.coeficientes.map((c, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0"
                        aria-label={`Coeficiente x${j + 1} de ${f.id}`}
                        value={c}
                        onChange={(e) =>
                          actualizarFila(f.id, {
                            coeficientes: f.coeficientes.map((v, k) => (k === j ? e.target.value : v)),
                          })
                        }
                        className={inputCoef}
                      />
                      <span className="whitespace-nowrap text-sm font-medium text-slate-500 dark:text-gray-400">
                        <Formula tex={`x_${j + 1}`} />
                      </span>
                      {j < f.coeficientes.length - 1 ? <span className="text-sm text-slate-400">+</span> : null}
                    </span>
                  ))}
                  <span className="relative inline-flex">
                    <select
                      aria-label={`Operador de ${f.id}`}
                      value={f.operador}
                      onChange={(e) => actualizarFila(f.id, { operador: e.target.value as Operador })}
                      className={inputOperador}
                    >
                      {(['LE', 'GE', 'EQ'] as Operador[]).map((o) => (
                        <option key={o} value={o}>
                          {ETIQUETA[o]}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-gray-400"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    aria-label={`Lado derecho de ${f.id}`}
                    value={f.b}
                    onChange={(e) => actualizarFila(f.id, { b: e.target.value })}
                    className={inputCoef}
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar restricción ${f.id}`}
                    title="Eliminar restricción"
                    disabled={filas.length <= 1}
                    onClick={() => setFilas((prev) => prev.filter((x) => x.id !== f.id))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={agregarFila}
              className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              + Agregar restricción
            </button>
          </fieldset>

          <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-gray-900">
            <Formula tex={`\\${objetivo}\\; Z = ${texCombinacion(coefs)}`} />
            {filas.map((f) => (
              <div key={f.id}>
                <Formula tex={`${texCombinacion(f.coeficientes)} ${SIMBOLO[f.operador]} ${f.b || 0}`} />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? 'Calculando…' : 'Resolver con Simplex Dual'}
          </button>
        </form>

        {/* Resultados */}
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
                Escribe un modelo (por defecto, el clásico de minimización con restricciones ≥) y pulsa{' '}
                <strong>“Resolver con Simplex Dual”</strong>.
              </p>
            </div>
          ) : null}

          {resultado ? (
            <>
              {resultado.estado === 'optimo' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <KpiCard
                      highlight
                      title="Valor óptimo Z*"
                      value={
                        resultado.valorObjetivo.den === '1'
                          ? resultado.valorObjetivo.num
                          : `${resultado.valorObjetivo.num}/${resultado.valorObjetivo.den}`
                      }
                      formula="Z^{*} = c_B x_B^{*}"
                      tone="amber"
                      description={resultado.objetivo === 'max' ? 'Máximo de la función objetivo.' : 'Mínimo de la función objetivo.'}
                    />
                    <KpiCard
                      title="Solución óptima x*"
                      value={resultado.solucion
                        .map((f) => (f.den === '1' ? f.num : `${f.num}/${f.den}`))
                        .join('  ·  ')}
                      formula="x^{*} = (x_1, \dots, x_n)"
                      tone="emerald"
                      description="Variables de decisión en el óptimo."
                    />
                  </div>

                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-base font-semibold text-slate-700 dark:text-gray-100">Holguras / excesos</h3>
                    <ul className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2 dark:text-gray-300">
                      {resultado.holguras.map((f, i) => (
                        <li key={i}>
                          Restricción R{i + 1}:{' '}
                          <span className="font-semibold tabular-nums">
                            <Formula tex={f.tex} />
                          </span>
                        </li>
                      ))}
                    </ul>
                    {resultado.objetivo === 'max' ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                        Se resolvió la forma normalizada de minimización: max Z = −min(−Z).
                      </p>
                    ) : null}
                  </section>
                </>
              ) : (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  <p className="font-bold">
                    {resultado.estado === 'infactible'
                      ? 'Problema infactible'
                      : 'La base inicial no es dual-factible'}
                  </p>
                  <p className="mt-1">{resultado.mensaje}</p>
                </div>
              )}

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-700 dark:text-gray-100">Tablas del método</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-gray-700 dark:text-gray-300">
                    {resultado.iteraciones.length} tabla{resultado.iteraciones.length === 1 ? '' : 's'}
                  </span>
                </div>
                {resultado.iteraciones.map((it, k) => {
                  const dualFactible = it.reducidos.every((f) => num(f) <= 0);
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
                    <div
                      key={it.iteracion}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-100">
                          Iteración {it.iteracion}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            it.factible
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                          }`}
                        >
                          {it.factible ? 'Primal factible' : 'Primal infactible'}
                        </span>
                      </div>
                      <TablaDual it={it} objetivo={resultado.objetivo} />
                      {it.ratios ? (
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                            Prueba de la razón dual
                          </p>
                          <RatiosDual ratios={it.ratios} />
                        </div>
                      ) : null}
                      <p className="mt-3 text-sm text-slate-600 dark:text-gray-300">
                        {it.filaSaliente === null ? (
                          <>Todos los valores básicos son ≥ 0: solución {resultado.estado === 'optimo' ? 'óptima' : 'final'}.</>
                        ) : it.columnaEntrante === null ? (
                          <>Sale <Formula tex={it.variableSaliente ?? ''} /> y ninguna columna tiene coeficiente negativo: el primal es infactible.</>
                        ) : (
                          <>
                            Sale <Formula tex={it.variableSaliente ?? ''} /> (valor básico más negativo); entra{' '}
                            <Formula tex={it.variableEntrante ?? ''} /> con pivote <Formula tex={it.pivote?.tex ?? ''} />.
                          </>
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-gray-300">
                        <button
                          type="button"
                          onClick={() => setExplicacion({ tipo: 'factible', indice: k })}
                          className={botonClase}
                        >
                          ¿Es factible? {respuesta(it.factible)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExplicacion({ tipo: 'optima', indice: k })}
                          className={botonClase}
                        >
                          ¿Dual-factible? {respuesta(dualFactible)}
                        </button>
                        {it.variableSaliente ? (
                          <button
                            type="button"
                            onClick={() => setExplicacion({ tipo: 'sale', indice: k })}
                            className={botonClase}
                          >
                            Sale <Formula tex={it.variableSaliente} />
                          </button>
                        ) : null}
                        {it.variableEntrante ? (
                          <button
                            type="button"
                            onClick={() => setExplicacion({ tipo: 'entra', indice: k })}
                            className={botonClase}
                          >
                            Entra <Formula tex={it.variableEntrante} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </section>

              <ProcesosView
                procesos={resultado.procesos}
                encabezado="Procesos paso a paso — Simplex Dual"
                descripcion="Forma estándar, tablas del pivoteo dual y verificación de optimalidad."
                unidad="unidades"
              />
            </>
          ) : null}
        </div>
      </div>
      )}

      {explicacion && resultado?.iteraciones[explicacion.indice] ? (() => {
        const it = resultado.iteraciones[explicacion.indice];
        const titulos: Record<TipoExplicacion, string> = {
          factible: '¿Es factible?',
          optima: '¿Dual-factible?',
          entra: '¿Por qué entra esta variable?',
          sale: '¿Por qué sale esta variable?',
        };
        let contenido: ReactNode = null;
        if (explicacion.tipo === 'factible') contenido = <ExplicacionFactibleDual it={it} />;
        else if (explicacion.tipo === 'optima')
          contenido = <ExplicacionOptimaDual it={it} objetivo={resultado.objetivo} />;
        else if (explicacion.tipo === 'entra') contenido = <ExplicacionEntraDual it={it} />;
        else contenido = <ExplicacionSaleDual it={it} />;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            onClick={() => setExplicacion(null)}
          >
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
                    {titulos[explicacion.tipo]}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">ITERACIÓN {it.iteracion}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExplicacion(null)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Cerrar"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              <div className="p-5">{contenido}</div>
              <div className="flex justify-end border-t border-slate-200 p-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setExplicacion(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })() : null}
    </div>
  );
}
