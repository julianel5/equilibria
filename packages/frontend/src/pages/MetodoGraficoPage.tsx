import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  calcularMetodoGrafico,
  ApiError,
  type MetodoGraficoResult,
  type OperadorPL,
  type TipoOptimizacionPL,
  type VerticePL,
} from '../services/api';
import PlanoCartesianoChart, {
  type RectaRestriccionPL,
} from '../components/PlanoCartesianoChart';
import MetodoGraficoTeoria from '../components/MetodoGraficoTeoria';
import Formula from '@shared/components/Formula';
import KpiCard from '@shared/components/KpiCard';
import TabsPanel from '@shared/components/TabsPanel';

interface RestriccionFila {
  id: string;
  x1: string;
  x2: string;
  operador: OperadorPL;
  rhs: string;
}

const OPERADORES: OperadorPL[] = ['<=', '>=', '='];

const ETIQUETA_OPERADOR: Record<OperadorPL, string> = {
  '<=': '≤',
  '>=': '≥',
  '=': '=',
};

const inputBase =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

/** Coeficientes y lados derechos: numéricos, estrechos y centrados (layout algebraico). */
const inputCoef =
  'w-16 rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-sm tabular-nums shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

/** Selector de operador: sin estilos del navegador, idéntico visualmente a los inputs. */
const inputOperador =
  'w-14 appearance-none rounded-md border border-slate-300 bg-white py-2 pl-1 pr-7 text-center text-sm font-semibold shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const fmtDecimal = (n: number, max = 6) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

type AlertaEspecial = 'infactible' | 'noAcotada' | null;

type Pestana = 'calculadora' | 'teoria';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

function optimosDe(resultado: MetodoGraficoResult): VerticePL[] {
  return Array.isArray(resultado.verticeOptimo) ? resultado.verticeOptimo : [resultado.verticeOptimo];
}

export default function MetodoGraficoPage() {
  const [tipo, setTipo] = useState<TipoOptimizacionPL>('MAX');
  const [c1, setC1] = useState('5');
  const [c2, setC2] = useState('7');
  const [restricciones, setRestricciones] = useState<RestriccionFila[]>([
    { id: 'r1', x1: '1', x2: '1', operador: '<=', rhs: '4' },
    { id: 'r2', x1: '1', x2: '3', operador: '<=', rhs: '6' },
  ]);
  const [mostrarDescartes, setMostrarDescartes] = useState(true);
  const [mostrarPoligono, setMostrarPoligono] = useState(true);
  const [resultado, setResultado] = useState<MetodoGraficoResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [alertaEspecial, setAlertaEspecial] = useState<AlertaEspecial>(null);
  const [pestana, setPestana] = useState<Pestana>('calculadora');

  const construirPayload = useCallback(() => {
    const obj: {
      funcionObjetivo: { tipo: TipoOptimizacionPL; c1: number; c2: number };
      restricciones: { id: string; x1: number; x2: number; operador: OperadorPL; rhs: number }[];
    } = {
      funcionObjetivo: { tipo, c1: Number(c1), c2: Number(c2) },
      restricciones: restricciones.map((r) => ({
        id: r.id,
        x1: Number(r.x1),
        x2: Number(r.x2),
        operador: r.operador,
        rhs: Number(r.rhs),
      })),
    };
    return obj;
  }, [tipo, c1, c2, restricciones]);

  const calcular = useCallback(async () => {
    setCargando(true);
    setErrors([]);
    setAlertaEspecial(null);

    const hayVacio = [c1, c2, ...restricciones.flatMap((r) => [r.x1, r.x2, r.rhs])].some(
      (v) => v.trim() === ''
    );
    if (hayVacio) {
      setErrors(['Todos los coeficientes y lados derechos deben estar llenos.']);
      setCargando(false);
      return;
    }
    if (restricciones.length === 0) {
      setErrors(['Agrega al menos una restricción para resolver el problema.']);
      setCargando(false);
      return;
    }

    try {
      const res = await calcularMetodoGrafico(construirPayload());
      setResultado(res);
    } catch (e) {
      setResultado(null);
      let mensaje = '';
      if (e instanceof ApiError) {
        const issues = e.issues.map((i) => i.message);
        mensaje = issues.length > 0 ? issues.join(' · ') : e.message;
      } else {
        mensaje = e instanceof Error ? e.message : 'Error inesperado al resolver el problema.';
      }
      if (mensaje.toLowerCase().includes('infactible')) {
        setAlertaEspecial('infactible');
      } else if (mensaje.toLowerCase().includes('no acotada')) {
        setAlertaEspecial('noAcotada');
      } else {
        setErrors((prev) => (mensaje && !prev.includes(mensaje) ? [...prev, mensaje] : prev));
      }
    } finally {
      setCargando(false);
    }
  }, [construirPayload, c1, c2, restricciones]);

  useEffect(() => {
    void calcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void calcular();
  };

  const actualizarFila = (id: string, campo: keyof Omit<RestriccionFila, 'id'>, valor: string) =>
    setRestricciones((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));

  const agregarRestriccion = () => {
    setRestricciones((prev) => {
      const maxId = prev.reduce((acc, r) => {
        const n = Number(r.id.replace(/\D+/g, ''));
        return Number.isFinite(n) ? Math.max(acc, n) : acc;
      }, 0);
      const nuevo = `r${maxId + 1}`;
      return [...prev, { id: nuevo, x1: '1', x2: '1', operador: '<=', rhs: '1' }];
    });
  };

  const eliminarRestriccion = (id: string) =>
    setRestricciones((prev) => prev.filter((r) => r.id !== id));

  const zOptima = resultado?.valorZ;

  // Rectas efectivas para la gráfica: solo las restricciones del usuario (no la caja límite).
  const restriccionesGraficas: RectaRestriccionPL[] = useMemo(
    () =>
      restricciones.map((r) => ({
        id: r.id,
        a: Number(r.x1),
        b: Number(r.x2),
        rhs: Number(r.rhs),
        operador: r.operador,
      })),
    [restricciones]
  );

  const cabecera = (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">Método Gráfico</h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Programación Lineal en dos variables: región factible, vértices y evaluación enumerativa
        de la función objetivo.
      </p>
    </header>
  );

  if (pestana === 'teoria') {
    return (
      <div className="space-y-6">
        {cabecera}
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del método gráfico"
        />
        <MetodoGraficoTeoria />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cabecera}

      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones del método gráfico"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[430px_1fr]">
        {/* Formulario */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">Configuración del problema</h2>
          <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
            Define la función objetivo y el sistema de restricciones lineales.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Función objetivo */}
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Función objetivo
              </legend>
              <div className="grid grid-cols-[92px_1fr_1fr] items-center gap-2">
                <select
                  aria-label="Tipo de optimización"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoOptimizacionPL)}
                  className={inputBase}
                >
                  <option value="MAX">MAX</option>
                  <option value="MIN">MIN</option>
                </select>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs text-slate-500  dark:text-gray-400">
                    Coeficiente <Formula tex="c_1" />
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    aria-label="Coeficiente c1 de x1"
                    value={c1}
                    onChange={(e) => setC1(e.target.value)}
                    className={inputBase}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs text-slate-500  dark:text-gray-400">
                    Coeficiente <Formula tex="c_2" />
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    aria-label="Coeficiente c2 de x2"
                    value={c2}
                    onChange={(e) => setC2(e.target.value)}
                    className={inputBase}
                  />
                </label>
              </div>
              <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 dark:bg-gray-900">
                <Formula tex={tipo === 'MAX' ? '\\max Z = c_1 x_1 + c_2 x_2' : '\\min Z = c_1 x_1 + c_2 x_2'} />
              </div>
            </fieldset>

            {/* Restricciones */}
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Restricciones
              </legend>
              <div className="space-y-2">
                {restricciones.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-2.5 rounded-md border border-slate-200 bg-slate-50 p-2  dark:border-gray-700 dark:bg-gray-900"
                  >
                    {/* Lado izquierdo de la inecuación: a₁·x₁ + a₂·x₂ */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0"
                        aria-label={`Coeficiente x1 de ${r.id}`}
                        value={r.x1}
                        onChange={(e) => actualizarFila(r.id, 'x1', e.target.value)}
                        className={inputCoef}
                      />
                      <span className="whitespace-nowrap text-sm font-medium text-slate-600  dark:text-gray-300">
                        x₁ +
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0"
                        aria-label={`Coeficiente x2 de ${r.id}`}
                        value={r.x2}
                        onChange={(e) => actualizarFila(r.id, 'x2', e.target.value)}
                        className={inputCoef}
                      />
                      <span className="whitespace-nowrap text-sm font-medium text-slate-600  dark:text-gray-300">
                        x₂
                      </span>
                    </div>

                    {/* Lado derecho: operador + RHS + eliminar */}
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex">
                        <select
                          aria-label={`Operador de ${r.id}`}
                          value={r.operador}
                          onChange={(e) => actualizarFila(r.id, 'operador', e.target.value as OperadorPL)}
                          className={inputOperador}
                        >
                          {OPERADORES.map((op) => (
                            <option key={op} value={op}>
                              {ETIQUETA_OPERADOR[op]}
                            </option>
                          ))}
                        </select>
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                          className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500  dark:text-gray-400"
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
                        aria-label={`Lado derecho de ${r.id}`}
                        value={r.rhs}
                        onChange={(e) => actualizarFila(r.id, 'rhs', e.target.value)}
                        className={inputCoef}
                      />
                      <button
                        type="button"
                        aria-label={`Eliminar restricción ${r.id}`}
                        onClick={() => eliminarRestriccion(r.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500  hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        title="Eliminar restricción"
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
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={agregarRestriccion}
                className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600  hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              >
                + Agregar restricción
              </button>
            </fieldset>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-md  hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Resolviendo…' : 'Resolver Problema'}
            </button>
          </form>

          {errors.length > 0 ? (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm  dark:border-red-900 dark:bg-red-900/20"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600  dark:text-red-400"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <ul className="mt-0.5 list-disc space-y-1 pl-5 font-semibold text-red-600  dark:text-red-400">
                {errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Alertas semánticas del motor (infactible / no acotada) */}
          {alertaEspecial === 'infactible' ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm  dark:border-red-900 dark:bg-red-900/20"
            >
              <p className="font-bold text-red-700  dark:text-red-400">Problema Infactible</p>
              <p className="mt-1 text-red-600  dark:text-red-300">
                El problema es infactible (no tiene área de solución). Las restricciones se
                contraponen y no existe ningún punto (x₁, x₂) que las satisfaga todas a la vez.
              </p>
            </div>
          ) : null}
          {alertaEspecial === 'noAcotada' ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm  dark:border-amber-800 dark:bg-amber-500/10"
            >
              <p className="font-bold text-amber-700  dark:text-amber-400">Solución No Acotada</p>
              <p className="mt-1 text-amber-700  dark:text-amber-300">
                El problema es no acotado: la función objetivo crece (o decrece) sin límite dentro
                de la región factible y el óptimo no es finito.
              </p>
            </div>
          ) : null}
        </section>

        {/* Resultados */}
        <section>
          {!resultado && !alertaEspecial && errors.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
              <p className="text-sm text-slate-500  dark:text-gray-400">Resolviendo el problema…</p>
            </div>
          ) : null}

          {alertaEspecial ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
              <p className="text-3xl">
                {alertaEspecial === 'infactible' ? '🚫' : '↗️'}
              </p>
              <p className="text-lg font-semibold text-slate-700  dark:text-gray-100">
                {alertaEspecial === 'infactible'
                  ? 'No hay región factible que graficar'
                  : 'La región factible es no acotada'}
              </p>
              <p className="max-w-sm text-sm text-slate-500  dark:text-gray-400">
                {alertaEspecial === 'infactible'
                  ? 'Ajusta las restricciones para que exista al menos un punto que las satisfaga.'
                  : 'El óptimo no se alcanza con valor finito: la función objetivo se puede llevar a ±∞.'}
              </p>
            </div>
          ) : null}

          {resultado ? (
            <>
              <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
                Resultados — {tipo === 'MAX' ? 'maximización' : 'minimización'}
              </h2>

              <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3  dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-slate-500  dark:text-gray-400">Problema resuelto</p>
                <div className="mt-1">
                  <Formula
                    tex={`${tipo === 'MAX' ? '\\max' : '\\min'} \\; Z = ${fmtDecimal(resultado.funcionObjetivo.c1)} x_1 + ${fmtDecimal(resultado.funcionObjetivo.c2)} x_2`}
                  />
                </div>
              </div>

              {resultado.multiplesOptimos ? (
                <div
                  className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm  dark:border-amber-800 dark:bg-amber-500/10"
                  role="status"
                >
                  <p className="font-bold text-amber-700  dark:text-amber-400">Múltiples óptimos</p>
                  <p className="mt-1 text-amber-700  dark:text-amber-300">
                    El mismo valor óptimo de Z se alcanza en más de un vértice; en realidad existen
                    infinitas soluciones a lo largo del segmento que los une.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard
                  highlight
                  large
                  title="Valor óptimo Z*"
                  value={fmtDecimal(zOptima ?? 0)}
                  formula={'Z^{*} = c_1 x_1^{*} + c_2 x_2^{*}'}
                  tone="amber"
                  description="Mejor valor de la función objetivo evaluada en el vértice ganador de la región factible."
                />
                <KpiCard
                  title="Vértice óptimo"
                  value={
                    resultado.multiplesOptimos || Array.isArray(resultado.verticeOptimo)
                      ? optimosDe(resultado).map((o) => `(${fmtDecimal(o.x1)}; ${fmtDecimal(o.x2)})`).join('  ·  ')
                      : `(${fmtDecimal((resultado.verticeOptimo as VerticePL).x1)}; ${fmtDecimal((resultado.verticeOptimo as VerticePL).x2)})`
                  }
                  formula={'X^{*} = (x_1, x_2)'}
                  tone="emerald"
                  description={
                    resultado.multiplesOptimos
                      ? 'Vértices entre los que se reparte el óptimo (todos sobre el segmento ganador).'
                      : 'Coordenadas del punto extremo de la región factible que optimiza Z.'
                  }
                />
                <KpiCard
                  title="Vértices factibles"
                  value={`${resultado.verticesFactibles.length}`}
                  formula={'V = \\{ P_1, P_2, \\dots, P_k \\}'}
                  tone="blue"
                  description="Número de vértices del polígono convexo que forman la región factible."
                />
                <KpiCard
                  title="Intersecciones descartadas"
                  value={`${resultado.interseccionesDescartadas.length}`}
                  formula={'L_i \\cap L_j : \\text{ no factible}'}
                  tone="slate"
                  description="Cruces de pares de restricciones que quedaron descartados por no pertenecer a la región."
                />
                {resultado.multiplesOptimos ? (
                  <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/60 p-5  dark:border-amber-600 dark:bg-amber-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700  dark:text-amber-400">
                      Tolerancia del motor
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-amber-800  dark:text-amber-300">
                      Dos vértices se consideran empatados cuando sus Z difieren en menos de 1×10⁻⁶.
                      La gráfica resalta en ámbar todos los vértices ganadores.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Plano cartesiano */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
                      Región factible
                    </h2>
                    <p className="text-sm text-slate-400  dark:text-gray-500">
                      Polígono convexo ordenado trigonométricamente; ámbar = óptimo.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600  dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={mostrarPoligono}
                        onChange={(e) => setMostrarPoligono(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Mostrar región factible
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600  dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={mostrarDescartes}
                        onChange={(e) => setMostrarDescartes(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Mostrar puntos descartados
                    </label>
                  </div>
                </div>
                <PlanoCartesianoChart
                  verticesFactibles={resultado.verticesFactibles}
                  optimos={optimosDe(resultado)}
                  descartes={resultado.interseccionesDescartadas}
                  mostrarDescartes={mostrarDescartes}
                  mostrarPoligono={mostrarPoligono}
                  restricciones={restriccionesGraficas}
                />
              </div>

              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                El motor inyecta el perímetro <strong>x₁ ≥ 0, x₂ ≥ 0</strong> con una caja límite de{' '}
                <strong className="tabular-nums">10 000</strong>. Si el óptimo toca la caja, el
                problema se reporta como no acotado; los cruces contra la caja pueden aparecer como
                puntos descartados lejanos, que la gráfica omite para conservar la escala.
              </p>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}