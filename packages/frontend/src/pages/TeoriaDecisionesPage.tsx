import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  calcularTeoriaDecisiones,
  ApiError,
  type TeoriaDecisionesInput,
  type TeoriaDecisionesResult,
} from '../services/api';
import TeoriaDecisionesTeoria from '../components/TeoriaDecisionesTeoria';
import TeoriaDecisionesResultados from '../components/TeoriaDecisionesResultados';
import { VARIABLES_TEORIADECISIONES } from '../data/glosario';
import Formula from '@shared/components/Formula';
import Glossary, { GlossaryButton } from '@shared/components/Glossary';
import TabsPanel from '@shared/components/TabsPanel';

type Pestana = 'calculadora' | 'teoria';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

interface MatrizEdit {
  alternativas: string[];   // nombres
  estados: string[];        // nombres
  pagos: string[][];        // [altIdx][estIdx]
  probabilidades: string[]; // por estado; '' = sin probabilidad
  alpha: string;
}

const CLASE_INPUT =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const CLASE_BTN_PELIGRO =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-sm font-bold text-red-500 hover:bg-red-100 hover:text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40';

const CLASE_BTN_AGREGAR =
  'inline-flex items-center justify-center rounded-md border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20';

export default function TeoriaDecisionesPage() {
  const [pestana, setPestana] = useState<Pestana>('calculadora');
  const [fase, setFase] = useState<'config' | 'edicion'>('config');
  const [dimAlt, setDimAlt] = useState('3');
  const [dimEst, setDimEst] = useState('3');
  const [tipoAnalisis, setTipoAnalisis] = useState<'maximizar' | 'minimizar'>('maximizar');
  const [matriz, setMatriz] = useState<MatrizEdit | null>(null);
  const [resultado, setResultado] = useState<TeoriaDecisionesResult | null>(null);
  const [resultadoNombres, setResultadoNombres] = useState<{
    alternativas: string[];
    estados: string[];
  } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [glosarioAbierto, setGlosarioAbierto] = useState(false);

  const patch = useCallback((updater: (prev: MatrizEdit) => MatrizEdit) => {
    setMatriz((prev) => (prev ? updater(prev) : prev));
  }, []);

  const generarMatriz = useCallback((e: FormEvent) => {
    e.preventDefault();
    const nAlt = Math.max(2, Math.floor(Number(dimAlt)) || 2);
    const nEst = Math.max(2, Math.floor(Number(dimEst)) || 2);
    setMatriz({
      alternativas: Array.from({ length: nAlt }, (_, i) => `Alt ${i + 1}`),
      estados: Array.from({ length: nEst }, (_, j) => `Estado ${j + 1}`),
      pagos: Array.from({ length: nAlt }, () => Array<string>(nEst).fill('')),
      probabilidades: Array<string>(nEst).fill(''),
      alpha: '0.5',
    });
    setFase('edicion');
    setResultado(null);
    setResultadoNombres(null);
    setErrors([]);
  }, [dimAlt, dimEst]);

  const actualizarAlt = (i: number) => (e: ChangeEvent<HTMLInputElement>) =>
    patch((prev) => {
      const alternativas = [...prev.alternativas];
      alternativas[i] = e.target.value;
      return { ...prev, alternativas };
    });

  const actualizarEst = (j: number) => (e: ChangeEvent<HTMLInputElement>) =>
    patch((prev) => {
      const estados = [...prev.estados];
      estados[j] = e.target.value;
      return { ...prev, estados };
    });

  const actualizarPago = (i: number, j: number) => (e: ChangeEvent<HTMLInputElement>) =>
    patch((prev) => {
      const pagos = prev.pagos.map((fila) => [...fila]);
      pagos[i][j] = e.target.value;
      return { ...prev, pagos };
    });

  const actualizarProb = (j: number) => (e: ChangeEvent<HTMLInputElement>) =>
    patch((prev) => {
      const probabilidades = [...prev.probabilidades];
      probabilidades[j] = e.target.value;
      return { ...prev, probabilidades };
    });

  const actualizarAlpha = (e: ChangeEvent<HTMLInputElement>) =>
    patch((prev) => ({ ...prev, alpha: e.target.value }));

  const agregarAlternativa = () =>
    patch((prev) => ({
      ...prev,
      alternativas: [...prev.alternativas, `Alt ${prev.alternativas.length + 1}`],
      pagos: [...prev.pagos, Array<string>(prev.estados.length).fill('')],
    }));

  const eliminarAlternativa = (i: number) =>
    patch((prev) => ({
      ...prev,
      alternativas: prev.alternativas.filter((_, idx) => idx !== i),
      pagos: prev.pagos.filter((_, idx) => idx !== i),
    }));

  const agregarEstado = () =>
    patch((prev) => ({
      ...prev,
      estados: [...prev.estados, `Estado ${prev.estados.length + 1}`],
      probabilidades: [...prev.probabilidades, ''],
      pagos: prev.pagos.map((fila) => [...fila, '']),
    }));

  const eliminarEstado = (j: number) =>
    patch((prev) => ({
      ...prev,
      estados: prev.estados.filter((_, idx) => idx !== j),
      probabilidades: prev.probabilidades.filter((_, idx) => idx !== j),
      pagos: prev.pagos.map((fila) => fila.filter((_, idx) => idx !== j)),
    }));

  const reiniciar = () => {
    setFase('config');
    setMatriz(null);
    setResultado(null);
    setResultadoNombres(null);
    setErrors([]);
  };

  const construirInput = (): TeoriaDecisionesInput | null => {
    if (!matriz) return null;
    const errores: string[] = [];
    const alternativas = matriz.alternativas.map((nombre, i) => ({
      nombre: nombre.trim() || `Alt ${i + 1}`,
      pagos: matriz.pagos[i].map((celda) => {
        if (celda.trim() === '' || Number.isNaN(Number(celda))) return Number.NaN;
        return Number(celda);
      }),
    }));

    const altConError = alternativas.find((a) => a.pagos.some((p) => Number.isNaN(p)));
    if (altConError) {
      errores.push(
        `La alternativa "${altConError.nombre}" tiene pagos vacíos o no numéricos. Cada celda de la matriz debe ser un número.`
      );
    }

    const estados = matriz.estados.map((nombre, j) => {
      const raw = matriz.probabilidades[j].trim();
      return { nombre: nombre.trim() || `Estado ${j + 1}`, probabilidad: raw === '' ? null : Number(raw) };
    });
    const rawProbs = matriz.probabilidades.map((p) => p.trim()).filter((p) => p !== '');
    const probMal = rawProbs.find((p) => Number.isNaN(Number(p)));
    if (probMal !== undefined) {
      errores.push(
        `La probabilidad "${probMal}" no es un número válido. Usa valores entre 0 y 1, por ejemplo 0.5.`
      );
    }
    if (rawProbs.length > 0 && rawProbs.length < matriz.estados.length) {
      errores.push(
        'Si defines probabilidades, debes definirlas para TODOS los estados de la naturaleza y deben sumar exactamente 1.'
      );
    }
    const sumaProbs = rawProbs.reduce((acc, p) => acc + Number(p), 0);
    if (rawProbs.length === matriz.estados.length && Math.abs(sumaProbs - 1) > 1e-6) {
      errores.push(
        `Las probabilidades deben sumar exactamente 1 y actualmente suman ${sumaProbs.toFixed(4)}.`
      );
    }

    const alphaNum = Number(matriz.alpha);
    if (Number.isNaN(alphaNum) || alphaNum < 0 || alphaNum > 1) {
      errores.push('El coeficiente de optimismo (α) de Hurwicz debe estar entre 0 y 1.');
    }

    if (errores.length > 0) {
      setErrors(errores);
      return null;
    }
    setErrors([]);
    return { alternativas, estados, tipoAnalisis, alpha: alphaNum };
  };

  const calcular = async () => {
    const input = construirInput();
    if (!input) return;
    setCargando(true);
    try {
      const res = await calcularTeoriaDecisiones(input);
      setResultado(res);
      setResultadoNombres({
        alternativas: input.alternativas.map((a) => a.nombre),
        estados: input.estados.map((e) => e.nombre),
      });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.issues.map((i) => i.message));
      } else {
        setErrors([e instanceof Error ? e.message : 'Error inesperado']);
      }
    } finally {
      setCargando(false);
    }
  };

  const sumaProbs =
    matriz?.probabilidades
      .filter((p) => p.trim() !== '')
      .reduce((acc, p) => acc + (Number(p) || 0), 0) ?? null;
  const probsIngresadas = matriz?.probabilidades.some((p) => p.trim() !== '') ?? false;
  const probOk = sumaProbs !== null ? Math.abs(sumaProbs - 1) < 1e-6 : true;

  if (pestana === 'teoria') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TeoriaDecisionesHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones de la matriz de pagos"
        />
        <TeoriaDecisionesTeoria />
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_TEORIADECISIONES}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TeoriaDecisionesHeader />
        <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
      </div>
      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones de la matriz de pagos"
      />

      {/* Fase 1: Configuración */}
      {fase === 'config' ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
            Configura la matriz
          </h2>
          <p className="mb-5 text-sm text-slate-400  dark:text-gray-500">
            Define cuántas alternativas (filas) y cuántos estados de la naturaleza (columnas)
            tendrá la matriz de pagos. Luego podrás editar los nombres, probabilidades y pagos.
          </p>
          <form onSubmit={generarMatriz} className="grid max-w-md items-end gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Número de Alternativas
              </span>
              <input
                type="number"
                min="2"
                step="1"
                required
                value={dimAlt}
                onChange={(e) => setDimAlt(e.target.value)}
                aria-label="Número de alternativas"
                className={CLASE_INPUT}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Número de Estados de la Naturaleza
              </span>
              <input
                type="number"
                min="2"
                step="1"
                required
                value={dimEst}
                onChange={(e) => setDimEst(e.target.value)}
                aria-label="Número de estados de la naturaleza"
                className={CLASE_INPUT}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Tipo de Análisis
              </legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { valor: 'maximizar', etiqueta: 'Maximizar (Beneficios / Ganancias)' },
                    { valor: 'minimizar', etiqueta: 'Minimizar (Costos / Pérdidas)' },
                  ] as const
                ).map((op) => (
                  <label
                    key={op.valor}
                    className={`inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      tipoAnalisis === op.valor
                        ? 'border-blue-500 bg-blue-50 text-blue-700  dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-300'
                        : 'border-slate-300 bg-white text-slate-500  hover:border-blue-300 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoAnalisis"
                      value={op.valor}
                      checked={tipoAnalisis === op.valor}
                      onChange={() => setTipoAnalisis(op.valor)}
                      className="sr-only"
                      aria-label={`Tipo de análisis ${op.valor}`}
                    />
                    {op.etiqueta}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400  dark:text-gray-500">
                Con Minimizar los criterios se invierten (p. ej. Minimin, Minimax y menor costo
                esperado) porque un costo menor siempre es mejor.
              </p>
            </fieldset>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-md  hover:bg-blue-700 sm:col-span-2"
            >
              Generar Matriz
            </button>
          </form>
        </section>
      ) : null}

      {/* Fase 2: Edición de la cuadrícula */}
      {fase === 'edicion' && matriz ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
                Matriz de Pagos
              </h2>
              <p className="text-sm text-slate-400  dark:text-gray-500">
                Nombres y pagos editables. Usa los botones + y − de los bordes para añadir o
                eliminar filas y columnas sin perder el resto de la información.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  tipoAnalisis === 'minimizar'
                    ? 'bg-rose-100 text-rose-700  dark:bg-rose-500/15 dark:text-rose-300'
                    : 'bg-blue-100 text-blue-700  dark:bg-blue-500/15 dark:text-blue-300'
                }`}
              >
                {tipoAnalisis === 'minimizar'
                  ? 'Modo: Minimizar (Costos)'
                  : 'Modo: Maximizar (Beneficios)'}
              </span>
              <button
                type="button"
                onClick={reiniciar}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600  hover:bg-slate-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Nueva matriz
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-1 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-400  dark:text-gray-500">
                    Alternativas
                  </th>
                  {matriz.estados.map((nombre, j) => (
                    <th key={j} className="px-1 pb-1 font-normal">
                      <div className="flex items-center gap-1">
                        <input
                          value={nombre}
                          onChange={actualizarEst(j)}
                          placeholder={`Estado ${j + 1}`}
                          aria-label={`Nombre del estado ${j + 1}`}
                          className={CLASE_INPUT}
                        />
                        <button
                          type="button"
                          onClick={() => eliminarEstado(j)}
                          disabled={matriz.estados.length <= 2}
                          aria-label={`Eliminar estado ${j + 1}`}
                          className={CLASE_BTN_PELIGRO}
                          title="Eliminar estado"
                        >
                          −
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="px-1 pb-1">
                    <button
                      type="button"
                      onClick={agregarEstado}
                      aria-label="Agregar estado"
                      className={CLASE_BTN_AGREGAR}
                      title="Agregar estado"
                    >
                      + Estado
                    </button>
                  </th>
                </tr>
                <tr>
                  <th className="whitespace-nowrap px-1 pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400  dark:text-gray-500">
                    Probabilidad (opcional)
                  </th>
                  {matriz.probabilidades.map((p, j) => (
                    <th key={j} className="px-1 pb-2 font-normal">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={p}
                        onChange={actualizarProb(j)}
                        placeholder="0.5"
                        aria-label={`Probabilidad del estado ${j + 1}`}
                        className={`${CLASE_INPUT} text-center`}
                      />
                    </th>
                  ))}
                  <th className="px-1 pb-2" />
                </tr>
              </thead>
              <tbody>
                {matriz.alternativas.map((nombre, i) => (
                  <tr key={i}>
                    <td className="px-1 py-0.5">
                      <div className="flex items-center gap-1">
                        <input
                          value={nombre}
                          onChange={actualizarAlt(i)}
                          placeholder={`Alt ${i + 1}`}
                          aria-label={`Nombre de la alternativa ${i + 1}`}
                          className={CLASE_INPUT}
                        />
                        <button
                          type="button"
                          onClick={() => eliminarAlternativa(i)}
                          disabled={matriz.alternativas.length <= 2}
                          aria-label={`Eliminar alternativa ${i + 1}`}
                          className={CLASE_BTN_PELIGRO}
                          title="Eliminar alternativa"
                        >
                          −
                        </button>
                      </div>
                    </td>
                    {matriz.pagos[i].map((val, j) => (
                      <td key={j} className="px-1 py-0.5">
                        <input
                          type="number"
                          step="any"
                          value={val}
                          onChange={actualizarPago(i, j)}
                          placeholder="0"
                          aria-label={`Pago ${i + 1} ${j + 1}`}
                          className={`${CLASE_INPUT} text-center`}
                        />
                      </td>
                    ))}
                    <td className="px-1 py-0.5" />
                  </tr>
                ))}
                <tr>
                  <td className="px-1 pt-2">
                    <button
                      type="button"
                      onClick={agregarAlternativa}
                      aria-label="Agregar alternativa"
                      className={CLASE_BTN_AGREGAR}
                      title="Agregar alternativa"
                    >
                      + Alternativa
                    </button>
                  </td>
                  {matriz.estados.map((_, j) => (
                    <td key={j} className="px-1 pt-2" />
                  ))}
                  <td className="px-1 pt-2" />
                </tr>
              </tbody>
            </table>
          </div>

          {probsIngresadas ? (
            <p className="mt-3 text-sm">
              Suma de probabilidades:{' '}
              <strong
                className={`tabular-nums ${
                  probOk
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {sumaProbs?.toFixed(4)}
              </strong>{' '}
              {probOk
                ? '✓ equivale a 1, VME habilitado.'
                : '— debe ser exactamente 1 para calcular el VME.'}
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-400  dark:text-gray-500">
              Sin probabilidades definidas: se evalúan Maximax, Maximin, Laplace, Hurwicz y Savage.
              Para habilitar el VME ingresa una probabilidad en cada estado (sumando 1).
            </p>
          )}

          {/* Parámetros y acción */}
          <div className="mt-4 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4  dark:border-gray-700 dark:bg-gray-900">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                Coeficiente de optimismo (Hurwicz)
                <span className="text-slate-400  dark:text-gray-500">
                  <Formula tex="\alpha" />
                </span>
              </span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={matriz.alpha}
                onChange={actualizarAlpha}
                aria-label="Coeficiente de optimismo alfa"
                className={`${CLASE_INPUT} w-32`}
              />
            </label>
            <button
              type="button"
              onClick={() => void calcular()}
              disabled={cargando}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md  hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Evaluando…' : 'Calcular criterios'}
            </button>
          </div>

          {errors.length > 0 ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm  dark:border-red-900 dark:bg-red-900/20"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600  dark:text-red-400"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
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
        </section>
      ) : null}

      {/* Resultados */}
      {resultado && resultadoNombres ? (
        <TeoriaDecisionesResultados
          resultado={resultado}
          alternativas={resultadoNombres.alternativas}
          estados={resultadoNombres.estados}
        />
      ) : null}

      <Glossary
        abierto={glosarioAbierto}
        onClose={() => setGlosarioAbierto(false)}
        variables={VARIABLES_TEORIADECISIONES}
      />
    </div>
  );
}

function TeoriaDecisionesHeader() {
  return (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">
        Matriz de Pagos — Teoría de Decisiones
      </h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Evaluación de alternativas bajo incertidumbre con seis criterios de decisión.
      </p>
    </header>
  );
}