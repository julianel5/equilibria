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

function createEmptyMatrix(m: number, n: number): number[][] {
  return Array.from({ length: m }, () => new Array(n).fill(0));
}

function ensureMatrixSize(matrix: number[][], m: number, n: number): number[][] {
  const newMatrix = createEmptyMatrix(m, n);
  for (let i = 0; i < Math.min(m, matrix.length); i++) {
    for (let j = 0; j < Math.min(n, matrix[i]?.length ?? 0); j++) {
      newMatrix[i][j] = matrix[i][j];
    }
  }
  return newMatrix;
}

function parseMatrixInput(text: string, rows: number, cols: number): number[][] {
  const matrix = createEmptyMatrix(rows, cols);
  const lines = text.trim().split('\n');
  for (let i = 0; i < Math.min(rows, lines.length); i++) {
    const vals = lines[i].trim().split(/\s+/).map(v => parseFloat(v));
    for (let j = 0; j < Math.min(cols, vals.length); j++) {
      if (!isNaN(vals[j])) matrix[i][j] = vals[j];
    }
  }
  return matrix;
}

function matrixToText(matrix: number[][]): string {
  return matrix.map(row => row.join(' ')).join('\n');
}

export default function TransportePage() {
  const [m, setM] = useState(3);
  const [n, setN] = useState(3);
  const [costos, setCostos] = useState<number[][]>([[8, 6, 10], [9, 12, 13], [14, 9, 16]]);
  const [oferta, setOferta] = useState<number[]>([20, 30, 25]);
  const [demanda, setDemanda] = useState<number[]>([15, 25, 35]);
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
    setCostos(ensureMatrixSize(costos, m, n));
    setTextoCostos(matrixToText(costos));
  }, [m, n]);

  useEffect(() => {
    setOferta(Array.from({ length: m }, (_, i) => oferta[i] ?? 0));
  }, [m]);

  useEffect(() => {
    setDemanda(Array.from({ length: n }, (_, i) => demanda[i] ?? 0));
  }, [n]);

  useEffect(() => {
    if (modoTexto) {
      setCostos(parseMatrixInput(textoCostos, m, n));
    } else {
      setTextoCostos(matrixToText(costos));
    }
  }, [modoTexto, textoCostos, m, n]);

  const handleCostosChange = useCallback((i: number, j: number, value: number) => {
    setCostos(prev => {
      const next = prev.map((row, ri) => ri === i ? row.map((v, rj) => rj === j ? value : v) : row);
      if (!modoTexto) setTextoCostos(matrixToText(next));
      return next;
    });
  }, [modoTexto]);

  const handleOfertaChange = useCallback((i: number, value: number) => {
    setOferta(prev => prev.map((v, idx) => idx === i ? value : v));
  }, []);

  const handleDemandaChange = useCallback((j: number, value: number) => {
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
    costos,
    oferta,
    demanda,
    metodoInicial,
    objetivo,
    prohibidas,
  }), [costos, oferta, demanda, metodoInicial, objetivo, prohibidas]);

  const resolver = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setCargando(true);
    setError(null);
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
    setOferta(Array.from({ length: m }, () => 0));
    setDemanda(Array.from({ length: n }, () => 0));
    setProhibidas([]);
    setResultado(null);
    setError(null);
  }, [m, n]);

  const totalOferta = oferta.reduce((a, b) => a + b, 0);
  const totalDemanda = demanda.reduce((a, b) => a + b, 0);
  const balanceado = totalOferta === totalDemanda && totalOferta > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Modelo de Transporte</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Resuelve problemas de transporte con métodos iniciales (Noroeste, Costo Mínimo, Vogel) y optimización MODI/UV.
          </p>
        </header>

        <TabsPanel pestanas={PESTANAS} activa={pestanaActiva} onCambio={setPestanaActiva} />

        {pestanaActiva === 'calculadora' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="space-y-6" aria-labelledby="form-title">
              <h2 id="form-title" className="text-xl font-semibold text-slate-700 dark:text-gray-100">Datos del Problema</h2>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    Orígenes (m):
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={m}
                      onChange={e => setM(+e.target.value)}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    Destinos (n):
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={n}
                      onChange={e => setN(+e.target.value)}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm ml-auto">
                    <input type="checkbox" checked={modoTexto} onChange={e => setModoTexto(e.target.checked)} />
                    Editar matriz como texto
                  </label>
                </div>

                {modoTexto ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Matriz de costos (filas separadas por salto de línea, columnas por espacio):</label>
                    <textarea
                      value={textoCostos}
                      onChange={e => setTextoCostos(e.target.value)}
                      rows={Math.max(4, m)}
                      className="w-full font-mono text-sm rounded border border-slate-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                      placeholder="1 2 3\n4 5 6\n7 8 9"
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto mb-4">
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
                                  type="number"
                                  step="any"
                                  value={v}
                                  onChange={e => handleCostosChange(i, j, parseFloat(e.target.value) || 0)}
                                  className="w-20 rounded border border-slate-300 px-1 py-0.5 text-center text-sm dark:border-gray-600 dark:bg-gray-900"
                                />
                              </td>
                            ))}
                            <td className="border border-slate-300 px-2 py-1.5 text-center dark:border-gray-600">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={oferta[i] ?? 0}
                                onChange={e => handleOfertaChange(i, parseFloat(e.target.value) || 0)}
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
                                type="number"
                                step="any"
                                min="0"
                                value={v}
                                onChange={e => handleDemandaChange(j, parseFloat(e.target.value) || 0)}
                                className="w-20 rounded border border-slate-300 px-1 py-0.5 text-center text-sm font-medium dark:border-gray-600 dark:bg-gray-900"
                              />
                            </td>
                          ))}
                          <td className="border border-slate-300 px-2 py-1.5 text-center font-bold dark:border-gray-600">
                            ΣO={totalOferta} / ΣD={totalDemanda}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    Objetivo:
                    <select
                      value={objetivo}
                      onChange={e => setObjetivo(e.target.value as ObjetivoTransporte)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    >
                      <option value="min">Minimizar costo</option>
                      <option value="max">Maximizar beneficio</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    Método inicial:
                    <select
                      value={metodoInicial}
                      onChange={e => setMetodoInicial(e.target.value as MetodoInicial)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
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
                    disabled={cargando || !balanceado}
                    className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cargando ? 'Resolviendo…' : 'Resolver'}
                  </button>
                  <button
                    type="button"
                    onClick={limpiar}
                    className="rounded-md bg-slate-200 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    Limpiar
                  </button>
                  {!balanceado && totalOferta > 0 && totalDemanda > 0 && (
                    <span className="flex items-center text-sm text-amber-600 dark:text-amber-400">
                      ⚠ Modelo desbalanceado (ΣO≠ΣD). Se equilibrará automáticamente.
                    </span>
                  )}
                </div>

                {error && (
                  <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm dark:border-red-800 dark:bg-red-500/10">
                    <p className="font-bold text-red-700 dark:text-red-400">Error</p>
                    <p className="mt-1 text-amber-700 dark:text-amber-300">{error}</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4" ref={scrollRef}>
              {resultado && (
                <>
                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-100 mb-3">Resumen</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Estado</p>
                        <p className="mt-1 text-lg font-bold tabular-nums {resultado.estado === 'optimo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">{resultado.estado === 'optimo' ? 'Óptimo' : 'Infactible'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Objetivo</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-700 dark:text-slate-200">{resultado.objetivo === 'min' ? 'Minimizar' : 'Maximizar'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Método usado</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">{ETIQUETA_METODO[resultado.metodoUsado]}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Balanceado</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-700 dark:text-slate-200">{resultado.balanceado ? 'Sí' : 'No'}</p>
                      </div>

                      <KpiCard
                        title="Valor óptimo Z*"
                        value={resultado.valorObjetivo.tex}
                        formula={"Z^* = c^T x"}
                        tone="amber"
                        large
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-100 mb-3">Asignación Óptima</h3>
                    <div className="overflow-x-auto">
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
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-100 mb-3">Comparación de Métodos Iniciales</h3>
                    <div className="overflow-x-auto">
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

        {pestanaActiva === 'procesos' && resultado && (
          <section className="mt-6" aria-labelledby="procesos-title">
            <h2 id="procesos-title" className="text-xl font-semibold text-slate-700 dark:text-gray-100 mb-4">Procesos de Cálculo</h2>
            <ProcesosView procesos={resultado.procesos} />
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
                  <strong>Optimización MODI/UV:</strong> Calcula potenciales u_i, v_j para celdas básicas; costos reducidos d_ij=c_ij-u_i-v_j.
                  <br /> Si todos{' '}<Formula tex="d_{ij}\ge 0" />{' '}→ <strong>óptimo</strong>. Si hay{' '}<Formula tex="d_{ij}<0" />,{' '}
                  entra la más negativa, se forma ciclo, pivotea con{' '}<Formula tex="\theta=\text{mínimo}" /> en celdas (-).
                </li>
              </ol>

              <h3 className="text-lg font-semibold">Degeneración</h3>
              <p>Si la solución inicial tiene menos de m+n-1 celdas básicas, se completan con celdas de flujo 0 que no forman ciclos (Union-Find).</p>

              <h3 className="text-lg font-semibold">Maximización</h3>
              <p>Se transforma a minimización con c′_ij = -c_ij. El valor óptimo reportado es el original.</p>

              <h3 className="text-lg font-semibold">Rutas Prohibidas</h3>
              <p>Se marcan celdas que nunca pueden recibir flujo. Si el método inicial elegido no encuentra solución factible, se prueba otro automáticamente.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}