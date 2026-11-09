import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  calcularSimplex,
  ApiError,
  type FraccionJSON,
  type ObjetivoSimplex,
  type SimplexResultado,
} from '../services/api';
import SensibilidadSimplex from '../components/SensibilidadSimplex';
import AvisoOptimosMultiples from '../components/AvisoOptimosMultiples';
import { EditorNombresVariables, InterpretacionSolucion, nombreConEtiqueta, tieneNombres } from '../components/NombresVariables';
import {
  ajustarEtiquetas,
  decodificarProblema,
  type FilaTransferida,
  type OperadorPL,
  type ProblemaTransferido,
} from '../data/transferenciaProblema';
import Formula from '@shared/components/Formula';
import KpiCard from '@shared/components/KpiCard';

type Operador = OperadorPL;
type Fila = FilaTransferida;

const SIMBOLO: Record<Operador, string> = { LE: '\\le', GE: '\\ge', EQ: '=' };
const ETIQUETA: Record<Operador, string> = { LE: '≤', GE: '≥', EQ: '=' };

const inputCoef =
  'w-16 rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-sm tabular-nums shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';
const inputSelect =
  'rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const valor = (f: FraccionJSON): number => Number(f.num) / Number(f.den);
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toLocaleString('es', { maximumFractionDigits: 6 }));

/** Ejemplo inicial: el problema clásico de la Wyndor Glass. */
const EJEMPLO: ProblemaTransferido = {
  objetivo: 'max',
  n: 2,
  coefsObj: ['3', '5'],
  etiquetas: ['Lotes del producto 1', 'Lotes del producto 2'],
  filas: [
    { id: 'r1', operador: 'LE', b: '4', coeficientes: ['1', '0'] },
    { id: 'r2', operador: 'LE', b: '12', coeficientes: ['0', '2'] },
    { id: 'r3', operador: 'LE', b: '18', coeficientes: ['3', '2'] },
  ],
};

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

// ---------------------------------------------------------------------------
// Simulador "¿Qué pasa si…?"
// ---------------------------------------------------------------------------

interface Simulacion {
  descripcion: string;
  dentroDelRango: boolean;
  prediccion: number | null;
  zActual: number;
  real: SimplexResultado | null;
  error: string | null;
  mismaBase: boolean | null;
}

function Simulador({
  resultado,
  objetivo,
  coefsObj,
  filas,
  etiquetas,
}: {
  resultado: SimplexResultado;
  objetivo: ObjetivoSimplex;
  coefsObj: string[];
  filas: Fila[];
  etiquetas: string[];
}) {
  const s = resultado.sensibilidad!;
  const [objetoSim, setObjetoSim] = useState('b:0');
  const [nuevoValor, setNuevoValor] = useState('');
  const [sim, setSim] = useState<Simulacion | null>(null);
  const [cargando, setCargando] = useState(false);

  const [tipo, idxStr] = objetoSim.split(':');
  const idx = Number(idxStr);
  const actual = tipo === 'b' ? valor(s.restricciones[idx].b) : valor(s.variables[idx].c);

  const simular = async () => {
    const v = Number(nuevoValor);
    if (nuevoValor.trim() === '' || !Number.isFinite(v)) return;
    const zActual = valor(resultado.valorObjetivo);
    const delta = v - actual;
    const rango = tipo === 'b' ? s.restricciones[idx].rangoB : s.variables[idx].rangoC;
    const dentro = (rango.min === null || v >= valor(rango.min) - 1e-12) && (rango.max === null || v <= valor(rango.max) + 1e-12);
    const prediccion = !dentro
      ? null
      : tipo === 'b'
        ? zActual + valor(s.restricciones[idx].precioSombra) * delta
        : zActual + valor(s.variables[idx].valor) * delta;
    const descripcion =
      tipo === 'b'
        ? `b de la restricción R${idx + 1}: ${fmt(actual)} → ${fmt(v)}`
        : `c de ${nombreConEtiqueta(idx, etiquetas)}: ${fmt(actual)} → ${fmt(v)}`;

    setCargando(true);
    try {
      const real = await calcularSimplex({
        metodo: 'tabular',
        objetivo,
        funcionObjetivo: coefsObj.map((c, j) => (tipo === 'c' && j === idx ? v : Number(c))),
        restricciones: filas.map((f, i) => ({
          coeficientes: f.coeficientes.map(Number),
          tipo: f.operador,
          b: tipo === 'b' && i === idx ? v : Number(f.b),
        })),
      });
      const mismaBase =
        real.estado === 'optimo' &&
        [...real.basicaFinal].sort().join() === [...resultado.basicaFinal].sort().join();
      setSim({ descripcion, dentroDelRango: dentro, prediccion, zActual, real, error: null, mismaBase });
    } catch (e) {
      setSim({
        descripcion,
        dentroDelRango: dentro,
        prediccion,
        zActual,
        real: null,
        error: e instanceof ApiError ? e.message : 'No se pudo resolver el problema modificado.',
        mismaBase: null,
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-base font-semibold text-slate-700 dark:text-gray-100">¿Qué pasa si…? (simulador)</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
        Cambia un dato y compara lo que predice el análisis de sensibilidad con el resultado de volver a resolver el
        problema.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
          Dato a cambiar
          <select
            className={inputSelect}
            value={objetoSim}
            onChange={(e) => {
              setObjetoSim(e.target.value);
              setSim(null);
            }}
          >
            {s.restricciones.map((r) => (
              <option key={`b${r.indice}`} value={`b:${r.indice}`}>
                b de R{r.indice + 1} (actual {fmt(valor(r.b))})
              </option>
            ))}
            {s.variables.map((v) => (
              <option key={`c${v.indice}`} value={`c:${v.indice}`}>
                c de {nombreConEtiqueta(v.indice, etiquetas)} (actual {fmt(valor(v.c))})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
          Nuevo valor
          <input
            type="number"
            step="any"
            className={`${inputCoef} w-28`}
            value={nuevoValor}
            placeholder={fmt(actual)}
            onChange={(e) => setNuevoValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void simular();
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => void simular()}
          disabled={cargando || nuevoValor.trim() === ''}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {cargando ? 'Simulando…' : 'Simular'}
        </button>
      </div>

      {sim ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
              Predicción con sensibilidad
            </p>
            <p className="mt-1 text-slate-600 dark:text-gray-300">{sim.descripcion}</p>
            {sim.dentroDelRango && sim.prediccion !== null ? (
              <>
                <p className="mt-2 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  Z* ≈ {fmt(sim.prediccion)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  {tipo === 'b'
                    ? `Dentro del rango: Z* cambia precio sombra × Δb = ${fmt(sim.prediccion - sim.zActual)}.`
                    : `Dentro del rango: la solución no cambia; Z* cambia X${idx + 1} × Δc = ${fmt(sim.prediccion - sim.zActual)}.`}
                </p>
              </>
            ) : (
              <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                El nuevo valor está fuera del rango: cambia la base óptima y la sensibilidad ya no permite predecir Z*.
                Hay que volver a resolver.
              </p>
            )}
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
              Resolviendo de nuevo
            </p>
            {sim.error ? (
              <p className="mt-2 text-red-600 dark:text-red-400">{sim.error}</p>
            ) : sim.real && sim.real.estado === 'optimo' ? (
              <>
                <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  Z* = <Formula tex={sim.real.valorObjetivo.tex} />
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-gray-300">
                  {sim.real.solucion.map((f, j) => (
                    <li key={j}>
                      {nombreConEtiqueta(j, etiquetas)} = {fmt(valor(f))}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  {sim.mismaBase ? 'La base óptima es la misma.' : 'La base óptima cambió.'}
                </p>
              </>
            ) : sim.real ? (
              <p className="mt-2 font-semibold text-red-600 dark:text-red-400">
                {sim.real.estado === 'infactible' ? 'El problema modificado es infactible.' : 'El problema modificado es no acotado.'}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function SensibilidadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [objetivo, setObjetivo] = useState<ObjetivoSimplex>(EJEMPLO.objetivo);
  const [n, setN] = useState(String(EJEMPLO.n));
  const [coefsObj, setCoefsObj] = useState<string[]>(EJEMPLO.coefsObj);
  const [filas, setFilas] = useState<Fila[]>(EJEMPLO.filas);
  const [etiquetas, setEtiquetas] = useState<string[]>(ajustarEtiquetas(EJEMPLO.etiquetas, EJEMPLO.coefsObj.length));
  const [resultado, setResultado] = useState<SimplexResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [desdeOtraPagina, setDesdeOtraPagina] = useState(false);
  /** Problema exactamente como se resolvió (el simulador parte de él, no del formulario editado). */
  const [resuelto, setResuelto] = useState<{ coefsObj: string[]; filas: Fila[]; etiquetas: string[]; version: number } | null>(
    null
  );

  const numVariables = useMemo(() => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.min(Math.max(Math.trunc(v), 1), 12) : 1;
  }, [n]);

  // Mantiene coeficientes alineados con el número de variables.
  useEffect(() => {
    setCoefsObj((prev) => Array.from({ length: numVariables }, (_, j) => prev[j] ?? '0'));
    setFilas((prev) => prev.map((f) => ({ ...f, coeficientes: Array.from({ length: numVariables }, (_, j) => f.coeficientes[j] ?? '0') })));
    setEtiquetas((prev) => ajustarEtiquetas(prev, numVariables));
  }, [numVariables]);

  const resolver = async (p: { objetivo: ObjetivoSimplex; coefsObj: string[]; filas: Fila[]; etiquetas: string[] }) => {
    setCargando(true);
    setError(null);
    try {
      const r = await calcularSimplex({
        metodo: 'tabular',
        objetivo: p.objetivo,
        funcionObjetivo: p.coefsObj.map(Number),
        restricciones: p.filas.map((f) => ({ coeficientes: f.coeficientes.map(Number), tipo: f.operador, b: Number(f.b) })),
      });
      setResultado(r);
      setResuelto((prev) => ({ coefsObj: p.coefsObj, filas: p.filas, etiquetas: p.etiquetas, version: (prev?.version ?? 0) + 1 }));
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

  // Problema enviado desde Simplex o Gran M (?data=…): se carga y se resuelve.
  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) return;
    try {
      const p = decodificarProblema(data);
      const nVars = Number(p.n) || p.coefsObj.length;
      const nombres = ajustarEtiquetas(p.etiquetas, nVars);
      setObjetivo(p.objetivo);
      setN(String(nVars));
      setCoefsObj(p.coefsObj);
      setFilas(p.filas);
      setEtiquetas(nombres);
      setDesdeOtraPagina(true);
      void resolver({ objetivo: p.objetivo, coefsObj: p.coefsObj, filas: p.filas, etiquetas: nombres });
    } catch {
      setError('No se pudo leer el problema enviado.');
    }
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDesdeOtraPagina(false);
    void resolver({ objetivo, coefsObj, filas, etiquetas });
  };

  const actualizarFila = (id: string, cambio: Partial<Fila>) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambio } : f)));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">Análisis de Sensibilidad</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Precios sombra, holguras y rangos de optimalidad a partir de la solución óptima de un modelo de Programación
          Lineal, con fracciones exactas.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Formulario */}
        <form
          onSubmit={onSubmit}
          className="h-fit min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-100">Modelo</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Escríbelo aquí o envíalo desde Simplex o Gran M con el botón “Análisis de sensibilidad”.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-gray-300">
              Optimización
              <select className={inputSelect} value={objetivo} onChange={(e) => setObjetivo(e.target.value as ObjetivoSimplex)}>
                <option value="max">MAX</option>
                <option value="min">MIN</option>
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
              {coefsObj.map((c, j) => (
                <span key={j} className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    className={inputCoef}
                    value={c}
                    aria-label={`Coeficiente de x${j + 1}`}
                    onChange={(e) => setCoefsObj((prev) => prev.map((v, k) => (k === j ? e.target.value : v)))}
                  />
                  <Formula tex={`x_{${j + 1}}`} />
                  {j < coefsObj.length - 1 ? <span className="text-slate-400">+</span> : null}
                </span>
              ))}
            </div>
            <div className="mt-2">
              <EditorNombresVariables etiquetas={etiquetas} onCambio={setEtiquetas} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 dark:text-gray-300">Restricciones</p>
            {filas.map((f, i) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 p-2 dark:border-gray-700"
              >
                <span className="mr-1 text-xs font-semibold text-slate-500 dark:text-gray-400">R{i + 1}</span>
                {f.coeficientes.map((c, j) => (
                  <input
                    key={j}
                    type="number"
                    step="any"
                    className={`${inputCoef} w-14`}
                    value={c}
                    aria-label={`Coeficiente x${j + 1} de r${i + 1}`}
                    onChange={(e) =>
                      actualizarFila(f.id, { coeficientes: f.coeficientes.map((v, k) => (k === j ? e.target.value : v)) })
                    }
                  />
                ))}
                <select
                  className={inputSelect}
                  value={f.operador}
                  aria-label={`Operador de r${i + 1}`}
                  onChange={(e) => actualizarFila(f.id, { operador: e.target.value as Operador })}
                >
                  {(['LE', 'GE', 'EQ'] as Operador[]).map((o) => (
                    <option key={o} value={o}>
                      {ETIQUETA[o]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="any"
                  className={`${inputCoef} w-20`}
                  value={f.b}
                  aria-label={`Lado derecho de r${i + 1}`}
                  onChange={(e) => actualizarFila(f.id, { b: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setFilas((prev) => prev.filter((x) => x.id !== f.id))}
                  disabled={filas.length <= 1}
                  className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded text-red-500 sm:h-7 sm:w-7 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-500/10"
                  aria-label={`Eliminar restricción r${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setFilas((prev) => [
                  ...prev,
                  { id: `r${Date.now()}`, operador: 'LE', b: '1', coeficientes: Array.from({ length: numVariables }, () => '1') },
                ])
              }
              className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-300"
            >
              + Agregar restricción
            </button>
          </div>

          <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-gray-900">
            <Formula tex={`\\${objetivo}\\; Z = ${texCombinacion(coefsObj)}`} />
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
            {cargando ? 'Calculando…' : 'Analizar sensibilidad'}
          </button>
        </form>

        {/* Resultados */}
        <div className="min-w-0">
          {error ? (
            <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {!resultado && !error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-lg font-semibold text-slate-700 dark:text-gray-100">Sin análisis todavía</p>
              <p className="max-w-md text-sm text-slate-500 dark:text-gray-400">
                Resuelve un problema en <strong>Simplex</strong> o <strong>Gran M</strong> y pulsa{' '}
                <strong>“Análisis de sensibilidad”</strong> para traerlo aquí, o escribe el modelo y pulsa{' '}
                <strong>“Analizar sensibilidad”</strong>.
              </p>
            </div>
          ) : null}

          {resultado ? (
            <>
              {desdeOtraPagina ? (
                <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300">
                  Problema traído desde la calculadora. Puedes modificarlo a la izquierda y volver a analizarlo.
                </p>
              ) : null}

              {resultado.estado !== 'optimo' ? (
                <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  <p className="font-bold">
                    {resultado.estado === 'infactible' ? 'Problema infactible' : 'Problema no acotado'}
                  </p>
                  <p className="mt-1">
                    El análisis de sensibilidad parte de una solución óptima finita; este problema no la tiene.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <KpiCard
                      highlight
                      title="Valor óptimo Z*"
                      value={resultado.valorObjetivo.den === '1' ? resultado.valorObjetivo.num : `${resultado.valorObjetivo.num}/${resultado.valorObjetivo.den}`}
                      formula={'Z^{*} = c_B x_B^{*}'}
                      tone="amber"
                      description={objetivo === 'max' ? 'Máximo de la función objetivo.' : 'Mínimo de la función objetivo.'}
                    />
                    <KpiCard
                      title="Solución óptima x*"
                      value={resultado.solucion.map((f) => (f.den === '1' ? f.num : `${f.num}/${f.den}`)).join('  ·  ')}
                      formula={'x^{*} = (x_1, \\dots, x_n)'}
                      tone="emerald"
                      description="Valor de cada variable de decisión en el óptimo."
                    />
                  </div>
                  {resultado.optimosMultiples && resuelto ? (
                    <AvisoOptimosMultiples
                      om={resultado.optimosMultiples}
                      solucion={resultado.solucion}
                      valorObjetivo={resultado.valorObjetivo}
                      etiquetas={resuelto.etiquetas}
                    />
                  ) : null}
                  {resuelto && tieneNombres(resuelto.etiquetas) ? (
                    <InterpretacionSolucion
                      solucion={resultado.solucion}
                      valorObjetivo={resultado.valorObjetivo}
                      etiquetas={resuelto.etiquetas}
                      objetivo={resultado.objetivo}
                    />
                  ) : null}
                  {resultado.sensibilidad && resuelto ? (
                    <>
                      <SensibilidadSimplex
                        s={resultado.sensibilidad}
                        objetivo={resultado.objetivo}
                        etiquetas={resuelto.etiquetas}
                      />
                      <Simulador
                        key={resuelto.version}
                        resultado={resultado}
                        objetivo={resultado.objetivo}
                        coefsObj={resuelto.coefsObj}
                        filas={resuelto.filas}
                        etiquetas={resuelto.etiquetas}
                      />
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
