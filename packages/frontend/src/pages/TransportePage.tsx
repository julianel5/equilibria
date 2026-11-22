import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import {
  calcularTransporte,
  ApiError,
  type TransporteInput,
  type TransporteResultado,
} from '../services/api';
import Formula from '@shared/components/Formula';
import KpiCard from '@shared/components/KpiCard';
import TabsPanel from '@shared/components/TabsPanel';
import ProcesosView from '@shared/components/ProcesosView';
import CabeceraConGlosario from '../components/CabeceraConGlosario';
import { VARIABLES_TRANSPORTE } from '../data/glosarioPL';

type MetodoInicial = 'noroeste' | 'costo-minimo' | 'vogel';
type ObjetivoTransporte = 'min' | 'max';

interface Prohibida {
  origen: number;
  destino: number;
}

type Pestana = string;

const PESTANAS: readonly { clave: string; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'procesos', etiqueta: 'Procesos' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

const ETIQUETA_METODO: Record<MetodoInicial, string> = {
  'noroeste': 'Esquina Noroeste',
  'costo-minimo': 'Costo Mínimo',
  'vogel': 'Aproximación de Vogel',
};

const MAX_DIMENSION = 15;

function normalizarDimension(texto: string): number {
  const valor = Math.floor(Number(texto));
  return Number.isFinite(valor) ? Math.min(MAX_DIMENSION, Math.max(1, valor)) : 1;
}

function createEmptyMatrix(m: number, n: number): string[][] {
  return Array.from({ length: m }, () => Array<string>(n).fill('0'));
}

function ensureMatrixSize(matrix: string[][], m: number, n: number): string[][] {
  const newMatrix = createEmptyMatrix(m, n);
  for (let i = 0; i < Math.min(m, matrix.length); i++) {
    for (let j = 0; j < Math.min(n, matrix[i]?.length ?? 0); j++) {
      newMatrix[i][j] = matrix[i][j];
    }
  }
  return newMatrix;
}

function parseMatrixInput(text: string): string[][] {
  // La API valida dimensiones y tokens. Nunca rellenar con ceros ni truncar 1/3.
  return text.trim().split(/\r?\n/).map(fila => fila.trim().split(/\s+/));
}

function matrixToText(matrix: string[][]): string {
  return matrix.map(row => row.join(' ')).join('\n');
}

export default function TransportePage() {
  const [filas, setFilas] = useState('3');
  const [columnas, setColumnas] = useState('3');
  const m = normalizarDimension(filas);
  const n = normalizarDimension(columnas);
  const [costos, setCostos] = useState([['8', '6', '10'], ['9', '12', '13'], ['14', '9', '16']]);
  const [oferta, setOferta] = useState(['20', '30', '25']);
  const [demanda, setDemanda] = useState(['15', '25', '35']);
  const [metodoInicial, setMetodoInicial] = useState<MetodoInicial>('vogel');
  const [objetivo, setObjetivo] = useState<ObjetivoTransporte>('min');
  const [prohibidas, setProhibidas] = useState<Prohibida[]>([]);
  const [prohibidaOrigen, setProhibidaOrigen] = useState('');
  const [prohibidaDestino, setProhibidaDestino] = useState('');

  const [resultado, setResultado] = useState<TransporteResultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pestanaActiva, setPestanaActiva] = useState<Pestana>('calculadora');
  const [modoTexto, setModoTexto] = useState(false);
  const [textoCostos, setTextoCostos] = useState('8 6 10\n9 12 13\n14 9 16');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCostos(prev => ensureMatrixSize(prev, m, n));
    setProhibidas(prev => prev.filter(p => p.origen <= m && p.destino <= n));
  }, [m, n]);

  useEffect(() => {
    setOferta(prev => Array.from({ length: m }, (_, i) => prev[i] ?? '0'));
  }, [m]);

  useEffect(() => {
    setDemanda(prev => Array.from({ length: n }, (_, i) => prev[i] ?? '0'));
  }, [n]);

  const handleCostosChange = useCallback((i: number, j: number, value: string) => {
    setCostos(prev => prev.map((row, ri) => ri === i ? row.map((v, rj) => rj === j ? value : v) : row));
  }, []);

  const handleOfertaChange = useCallback((i: number, value: string) => {
    setOferta(prev => prev.map((v, idx) => idx === i ? value : v));
  }, []);

  const handleDemandaChange = useCallback((j: number, value: string) => {
    setDemanda(prev => prev.map((v, idx) => idx === j ? value : v));
  }, []);

  const agregarProhibida = useCallback(() => {
    const o = parseInt(prohibidaOrigen, 10);
    const d = parseInt(prohibidaDestino, 10);
    if (isNaN(o) || isNaN(d) || o < 1 || o > m || d < 1 || d > n) return;
    if (prohibidas.some(p => p.origen === o && p.destino === d)) return;
    setProhibidas(prev => [...prev, { origen: o, destino: d }]);
    setProhibidaOrigen('');
    setProhibidaDestino('');
  }, [prohibidaOrigen, prohibidaDestino, prohibidas, m, n]);

  const quitarProhibida = useCallback((idx: number) => {
    setProhibidas(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const construirPayload = useCallback((): TransporteInput => ({
    costos: modoTexto ? parseMatrixInput(textoCostos) : costos,
    oferta,
    demanda,
    metodoInicial,
    objetivo,
    prohibidas,
  }), [costos, oferta, demanda, metodoInicial, objetivo, prohibidas, modoTexto, textoCostos]);

  const resolver = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await calcularTransporte(construirPayload());
      setResultado(res);
      setPestanaActiva('calculadora');
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Error inesperado al resolver el modelo.');
    } finally {
      setCargando(false);
    }
  }, [construirPayload]);

  const limpiar = useCallback(() => {
    setCostos(createEmptyMatrix(m, n));
    setTextoCostos(matrixToText(createEmptyMatrix(m, n)));
    setOferta(Array<string>(m).fill('0'));
    setDemanda(Array<string>(n).fill('0'));
    setProhibidas([]);
    setResultado(null);
    setError(null);
  }, [m, n]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl py-8 sm:px-4">
        <CabeceraConGlosario className="mb-6" variables={VARIABLES_TRANSPORTE}>
          <h1 className="text-3xl font-bold tracking-tight">Modelo de Transporte</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Resuelve problemas de transporte con métodos iniciales (Noroeste, Costo Mínimo, Vogel) y optimización MODI/UV.
          </p>
        </CabeceraConGlosario>

        <TabsPanel pestanas={PESTANAS} activa={pestanaActiva} onCambio={setPestanaActiva} />

        {pestanaActiva === 'calculadora' && (
          <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="min-w-0 space-y-6" aria-labelledby="form-title">
              <h2 id="form-title" className="text-xl font-semibold text-slate-700 dark:text-gray-100">Datos del Problema</h2>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    Orígenes (m):
                    <input
                      type="number"
                      min="1"
                      max={MAX_DIMENSION}
                      value={filas}
                      disabled={modoTexto}
                      onChange={e => setFilas(e.target.value)}
                      onBlur={() => setFilas(String(m))}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    Destinos (n):
                    <input
                      type="number"
                      min="1"
                      max={MAX_DIMENSION}
                      value={columnas}
                      disabled={modoTexto}
                      onChange={e => setColumnas(e.target.value)}
                      onBlur={() => setColumnas(String(n))}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm ml-auto">
                    <input type="checkbox" checked={modoTexto} onChange={e => {
                      if (e.target.checked) setTextoCostos(matrixToText(costos));
                      else {
                        const matriz = parseMatrixInput(textoCostos);
                        if (matriz.length !== m || matriz.some(fila => fila.length !== n)) {
                          setError(`La matriz debe tener ${m} filas de ${n} valores.`);
                          return;
                        }
                        setCostos(matriz);
                      }
                      setError(null);
                      setModoTexto(e.target.checked);
                    }} />
                    Editar matriz como texto
                  </label>
                </div>

                {modoTexto ? (
                  <div className="mb-4">
                    <label htmlFor="transporte-matriz-texto" className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Matriz de costos (una fila por línea; separa con espacios, por ejemplo 1/3 0 2):</label>
                    <textarea
                      id="transporte-matriz-texto"
                      value={textoCostos}
                      onChange={e => setTextoCostos(e.target.value)}
                      rows={Math.max(4, m)}
                      className="w-full font-mono text-sm rounded border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                      placeholder="1 2 3\n4 5 6\n7 8 9"
                    />
                  </div>
                ) : (
                   <div className="mb-4 max-w-full overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border border-slate-300 px-2 py-1.5 text-left text-xs font-semibold dark:border-gray-600" />
                          {Array.from({ length: n }, (_, j) => (
                            <th key={j} className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold dark:border-gray-600">
                              <Formula tex={`D_{${j + 1}}`} />
                            </th>
                          ))}
                          <th className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold dark:border-gray-600">Oferta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costos.map((fila, i) => (
                          <tr key={i}>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-medium dark:border-gray-600">
                              <Formula tex={`O_{${i + 1}}`} />
                            </td>
                            {fila.map((v, j) => (
                              <td key={j} className="border border-slate-300 px-1 py-1 dark:border-gray-600">
                                <input
                                   type="text"
                                   aria-label={`Costo de origen ${i + 1} a destino ${j + 1}`}
                                  value={v}
                                   onChange={e => handleCostosChange(i, j, e.target.value)}
                                  className="w-20 rounded border border-slate-300 px-1 py-0.5 text-center text-sm dark:border-gray-600 dark:bg-gray-900"
                                />
                              </td>
                            ))}
                            <td className="border border-slate-300 px-2 py-1.5 text-center dark:border-gray-600">
                              <input
                                 type="text"
                                 aria-label={`Oferta de origen ${i + 1}`}
                                 value={oferta[i] ?? '0'}
                                 onChange={e => handleOfertaChange(i, e.target.value)}
                                className="w-20 rounded border border-slate-300 px-1 py-0.5 text-center text-sm font-medium dark:border-gray-600 dark:bg-gray-900"
                              />
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border border-slate-300 px-2 py-1.5 text-center font-medium dark:border-gray-600">Demanda</td>
                          {demanda.map((v, j) => (
                            <td key={j} className="border border-slate-300 px-2 py-1.5 text-center dark:border-gray-600">
                              <input
                                 type="text"
                                 aria-label={`Demanda de destino ${j + 1}`}
                                 value={v}
                                 onChange={e => handleDemandaChange(j, e.target.value)}
                                className="w-20 rounded border border-slate-300 px-1 py-0.5 text-center text-sm font-medium dark:border-gray-600 dark:bg-gray-900"
                              />
                            </td>
                          ))}
                           <td className="border border-slate-300 px-2 py-1.5 text-center dark:border-gray-600" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-1 text-sm">
                    Objetivo:
                    <select
                      value={objetivo}
                      onChange={e => setObjetivo(e.target.value as ObjetivoTransporte)}
                      className="w-full min-w-0 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    >
                      <option value="min">Minimizar costo</option>
                      <option value="max">Maximizar beneficio</option>
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm">
                    Método inicial:
                    <select
                      value={metodoInicial}
                      onChange={e => setMetodoInicial(e.target.value as MetodoInicial)}
                      className="w-full min-w-0 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    >
                      <option value="vogel">Aproximación de Vogel (recomendado)</option>
                      <option value="costo-minimo">Costo Mínimo</option>
                      <option value="noroeste">Esquina Noroeste</option>
                    </select>
                  </label>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Rutas prohibidas (opcional):</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <input
                      type="number"
                      min="1"
                      max={m}
                      placeholder={`Origen (1–${m})`}
                      value={prohibidaOrigen}
                      onChange={e => setProhibidaOrigen(e.target.value)}
                      className="w-28 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                    <input
                      type="number"
                      min="1"
                      max={n}
                      placeholder={`Destino (1–${n})`}
                      value={prohibidaDestino}
                      onChange={e => setProhibidaDestino(e.target.value)}
                      className="w-28 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={agregarProhibida}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Agregar
                    </button>
                  </div>
                  {prohibidas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {prohibidas.map((p, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs dark:bg-amber-900/30"
                        >
                          O{p.origen}→D{p.destino}
                          <button
                            type="button"
                            onClick={() => quitarProhibida(idx)}
                            className="ml-1 text-amber-700 hover:text-amber-900 dark:text-amber-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={resolver}
                    disabled={cargando}
                    className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cargando ? 'Resolviendo…' : 'Resolver'}
                  </button>
                  <button
                    type="button"
                    onClick={limpiar}
                     className="rounded-md bg-slate-200 px-6 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:focus-visible:outline-sky-300"
                  >
                    Limpiar
                  </button>
                  <p className="self-center text-sm text-slate-600 dark:text-slate-300">
                    Si el modelo está desbalanceado, el motor lo equilibrará automáticamente.
                  </p>
                </div>

                {error && (
                  <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm dark:border-red-800 dark:bg-red-500/10">
                    <p className="font-bold text-red-700 dark:text-red-400">Error</p>
                    <p className="mt-1 text-amber-700 dark:text-amber-300">{error}</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="min-w-0 space-y-4" ref={scrollRef}>
              {resultado && (
                <>
                  {resultado.estado === 'infactible' && (
                    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                      <p className="font-bold">Transporte infactible</p>
                      <p>{resultado.mensaje}</p>
                    </div>
                  )}
                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-100 mb-3">Resumen</h3>
                    {resultado.estado !== 'infactible' && <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{resultado.mensaje}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Estado</p>
                         <p className={`mt-1 text-lg font-bold ${resultado.estado === 'optimo'
                           ? 'text-emerald-700 dark:text-emerald-300'
                           : resultado.estado === 'infactible' ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
                          {resultado.estado === 'optimo' ? 'Óptimo' : resultado.estado === 'infactible' ? 'Infactible' : 'Inconcluso'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Objetivo</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-700 dark:text-slate-200">{resultado.objetivo === 'min' ? 'Minimizar' : 'Maximizar'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Método usado</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                          {resultado.fasePenalizada ? 'Base penalizada (Gran M)' : ETIQUETA_METODO[resultado.metodoUsado]}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Balanceado</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-700 dark:text-slate-200">{resultado.balanceado ? 'Sí' : 'No'}</p>
                      </div>

                       {resultado.estado === 'optimo' && resultado.valorObjetivo && <KpiCard
                        title="Valor óptimo Z*"
                         value={{ tex: resultado.valorObjetivo.tex }}
                        formula={`Z^* = ${resultado.valorObjetivo.tex}`}
                        tone="amber"
                        large
                      />}
                    </div>
                  </div>

                  {resultado.estado === 'optimo' && <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-100 mb-3">Asignación Óptima</h3>
                     <div className="max-w-full overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className="border border-slate-300 px-2 py-1.5 text-left text-xs font-semibold dark:border-gray-600" />
                            {resultado.etiquetasDestino.map((d, j) => (
                              <th key={j} className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold dark:border-gray-600">
                                <Formula tex={d} />
                              </th>
                            ))}
                            <th className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold dark:border-gray-600">Oferta</th>
                          </tr>
                        </thead>
                      <tbody>
                          {resultado.asignacion.map((fila, i) => (
                            <tr key={i}>
                              <td className="border border-slate-300 px-2 py-1.5 text-center font-medium dark:border-gray-600">
                                <Formula tex={resultado.etiquetasOrigen[i]} />
                              </td>
                              {fila.map((v, j) => (
                                <td
                                  key={j}
                                  className={`border border-slate-300 px-2 py-1.5 text-center tabular-nums ${
                                    v.num !== '0' ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                                  }`}
                                >
                                  <Formula tex={v.tex} />
                                </td>
                              ))}
                              <td className="border border-slate-300 px-2 py-1.5 text-center font-medium dark:border-gray-600">
                                <Formula tex={resultado.oferta[i].tex} />
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-medium dark:border-gray-600">Demanda</td>
                            {resultado.demanda.map((v, j) => (
                              <td key={j} className="border border-slate-300 px-2 py-1.5 text-center font-medium dark:border-gray-600">
                                <Formula tex={v.tex} />
                              </td>
                            ))}
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-bold dark:border-gray-600" />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>}

                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-100 mb-3">Comparación de Métodos Iniciales</h3>
                     <div className="max-w-full overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className="border border-slate-300 px-2 py-1.5 text-left text-xs font-semibold dark:border-gray-600">Método</th>
                            <th className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold dark:border-gray-600">Factible</th>
                            <th className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold dark:border-gray-600">Costo Inicial</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.comparacionInicial.map((c, idx) => (
                            <tr key={idx} className={c.metodo === resultado.metodoUsado ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                              <td className="border border-slate-300 px-2 py-1.5 font-medium dark:border-gray-600">{c.etiqueta}</td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center dark:border-gray-600">
                                {c.factible ? '✓' : '✗'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums dark:border-gray-600">
                                {c.costo ? <Formula tex={c.costo.tex} /> : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        )}

        {pestanaActiva === 'procesos' && (
          <section className="mt-6" aria-labelledby="procesos-title">
            <h2 id="procesos-title" className="text-xl font-semibold text-slate-700 dark:text-gray-100 mb-4">Procesos de Cálculo</h2>
            {resultado ? <ProcesosView procesos={resultado.procesos} /> : (
              <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Resuelve un problema en la Calculadora. Aquí verás el balanceo de oferta y demanda, la comparación de las bases iniciales, los pivotes MODI y el estado final.
              </p>
            )}
          </section>
        )}

        {pestanaActiva === 'teoria' && (
          <section className="mt-6 space-y-6" aria-labelledby="teoria-title">
            <h2 id="teoria-title" className="text-xl font-semibold text-slate-700 dark:text-gray-100">Teoría y Supuestos</h2>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-600 dark:bg-gray-800 space-y-4 text-slate-700 dark:text-slate-300">
              <h3 className="text-lg font-semibold">Modelo de Transporte</h3>
              <p>El problema de transporte clásico busca minimizar (o maximizar) el costo total de enviar mercancía desde m orígenes a n destinos, satisfaciendo ofertas y demandas:</p>
              <Formula tex={`\\min\\; Z = \\sum_{i=1}^{m}\\sum_{j=1}^{n} c_{ij}x_{ij}`} display />
              <Formula tex={`\\text{s.a.}\\; \\sum_{j=1}^{n} x_{ij} = O_i,\\; \\sum_{i=1}^{m} x_{ij} = D_j,\\; x_{ij} \\ge 0`} display />

              <h3 className="text-lg font-semibold">Etapas del Algoritmo</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Equilibrado:</strong> Si ΣO≠ΣD, se añade un origen o destino ficticio con costo 0.</li>
                <li><strong>Solución inicial factible:</strong> Tres métodos disponibles:
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><strong>Esquina Noroeste:</strong> Recorrido fila-columna asignando el máximo posible.</li>
                    <li><strong>Costo Mínimo:</strong> Siempre elige la celda permitida de menor costo.</li>
                    <li><strong>Aproximación de Vogel:</strong> Penaliza por la diferencia entre los dos menores costos; más próximo al óptimo.</li>
                  </ul>
                </li>
                <li>
                   <strong>Optimización MODI/UV:</strong> Calcula los potenciales <Formula tex="u_i" /> y <Formula tex="v_j" /> para las celdas básicas, y los costos reducidos <Formula tex="d_{ij}=c_{ij}-u_i-v_j" />.
                  <br /> Si todos{' '}<Formula tex="d_{ij}\ge 0" />{' '}→ <strong>óptimo</strong>. Si hay{' '}<Formula tex="d_{ij}<0" />,{' '}
                   entra la primera que mejora (regla de Bland), se forma el ciclo y se pivotea con{' '}<Formula tex="\theta=\text{mínimo}" /> en celdas (-).
                </li>
              </ol>

              <h3 className="text-lg font-semibold">Degeneración</h3>
              <p>Si la solución inicial tiene menos de m+n-1 celdas básicas, se completan con celdas de flujo 0 que no forman ciclos (Union-Find).</p>

              <h3 className="text-lg font-semibold">Maximización</h3>
               <p>Se transforma a minimización con <Formula tex="c'_{ij} = -c_{ij}" />. El valor óptimo reportado es el original.</p>

              <h3 className="text-lg font-semibold">Rutas Prohibidas</h3>
              <p>Si ningún método inicial encuentra una base con rutas permitidas, se habilitan provisionalmente las prohibidas con costo adicional <Formula tex="M" />. Solo se certifica infactibilidad si el flujo prohibido mínimo sigue siendo positivo.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
