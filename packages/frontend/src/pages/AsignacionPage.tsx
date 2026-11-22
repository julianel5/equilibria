import { useState, type FormEvent } from 'react';
import Formula from '@shared/components/Formula';
import KpiCard from '@shared/components/KpiCard';
import TabsPanel from '@shared/components/TabsPanel';
import AsignacionProcesos from '../components/AsignacionProcesos';
import CabeceraConGlosario from '../components/CabeceraConGlosario';
import { VARIABLES_ASIGNACION } from '../data/glosarioPL';
import { ApiError, calcularAsignacion, type AsignacionInput, type AsignacionResultado } from '../services/api';

const PESTANAS = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'procesos', etiqueta: 'Procesos' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];
const DIMENSIONES = Array.from({ length: 10 }, (_, i) => i + 1);
const EJEMPLO = [['4', '1', '3'], ['2', '0', '5'], ['3', '2', '2']];
const TARJETA = 'min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5';
const CAMPO = 'rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900';
const CELDA = 'border border-slate-300 p-2 text-center dark:border-slate-500';
const BOTON_SECUNDARIO = 'rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-gray-600 dark:hover:bg-gray-700';

function aTexto(costos: string[][]): string {
  return costos.map(fila => fila.join(' ')).join('\n');
}

function desdeTexto(texto: string, m: number, n: number): string[][] {
  const filas = texto.trim().split(/\r?\n/).map(fila => fila.trim().split(/\s+/));
  if (!texto.trim() || filas.length !== m || filas.some(fila => fila.length !== n || !fila[0])) {
    throw new Error(`Escribe exactamente ${m} filas de ${n} valores separados por espacios.`);
  }
  return filas;
}

function TeoriaAsignacion() {
  return (
    <section className={`${TARJETA} space-y-4`} aria-labelledby="teoria-asignacion">
      <h2 id="teoria-asignacion" className="text-xl font-semibold">Teoría y Supuestos</h2>
      <p>El problema busca emparejar orígenes y destinos uno a uno para minimizar un costo o maximizar un beneficio. En la matriz cuadrada, cada fila y cada columna recibe exactamente una asignación.</p>
      <div className="overflow-x-auto">
        <Formula tex="\operatorname{opt}\; Z = \sum_{i=1}^N \sum_{j=1}^N c_{ij}x_{ij}" display />
        <Formula tex="\sum_j x_{ij}=1,\quad \sum_i x_{ij}=1,\quad x_{ij}\in\{0,1\}" display />
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
        <li>Para maximizar, resta cada beneficio real permitido de <Formula tex="C_{\max}" />, el mayor beneficio real permitido. Después, si hace falta, completa con filas o columnas ficticias de costo cero.</li>
        <li>Resta el mínimo permitido de cada fila y luego el mínimo permitido de cada columna. Estas reducciones preservan qué asignaciones son óptimas.</li>
        <li>Busca el máximo número de ceros independientes mediante emparejamiento bipartito. Por el teorema de König, ese número coincide con la menor cantidad de líneas que cubren todos los ceros.</li>
        <li>Si faltan líneas, resta el mínimo no cubierto a las celdas sin línea, súmalo en las intersecciones y conserva las demás celdas. Repite la prueba.</li>
        <li>Cuando haya <Formula tex="N" /> ceros independientes, suma los valores originales elegidos para obtener <Formula tex="Z^*" />. Las parejas ficticias representan elementos reales sin pareja y aportan cero.</li>
      </ol>
      <p className="text-sm text-slate-600 dark:text-slate-300">Las celdas prohibidas se tratan como infinito simbólico. Si no se puede emparejar por completo la matriz balanceada usando solo celdas permitidas, el modelo es infactible.</p>
    </section>
  );
}

function ResumenAsignacion({ resultado, verProcesos }: { resultado: AsignacionResultado; verProcesos: () => void }) {
  const { valorObjetivo, asignaciones, iteraciones, m, n } = resultado;
  return (
    <section className={`${TARJETA} space-y-4`} aria-labelledby="resumen-asignacion" aria-live="polite">
      <h2 id="resumen-asignacion" className="text-xl font-semibold">Resultados</h2>
      {valorObjetivo ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard
              title="Valor óptimo Z*"
              value={valorObjetivo.den === '1' ? valorObjetivo.num : `${valorObjetivo.num}/${valorObjetivo.den}`}
              formula={`Z^* = ${valorObjetivo.tex}`}
              tone="amber"
            />
            <KpiCard title="Iteraciones de ajuste" value={String(iteraciones)} formula="" description="Cantidad de ajustes del paso 4." />
          </div>
          <div>
            <h3 className="font-semibold">Asignaciones óptimas</h3>
            <ul className="mt-2 divide-y divide-slate-200 text-sm dark:divide-gray-700">
              {asignaciones.map(({ i, j, valor, ficticia }) => (
                <li key={i} className={`py-2 ${ficticia ? 'text-slate-500 dark:text-gray-400' : ''}`}>
                  Origen {i + 1}{i >= m ? ' (ficticio)' : ''} → Destino {j + 1}{j >= n ? ' (ficticio)' : ''} = <Formula tex={valor.tex} />
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300" role="status">
          <p className="font-semibold">Problema infactible</p>
          <p className="text-sm">Las celdas permitidas no admiten una asignación completa. Revisa las asignaciones prohibidas.</p>
        </div>
      )}
      <button type="button" className={BOTON_SECUNDARIO} onClick={verProcesos}>Ver procesos de cálculo</button>
    </section>
  );
}

export default function AsignacionPage() {
  const [pestana, setPestana] = useState('calculadora');
  const [costos, setCostos] = useState(EJEMPLO);
  const [objetivo, setObjetivo] = useState<AsignacionInput['objetivo']>('min');
  const [prohibidas, setProhibidas] = useState<AsignacionInput['prohibidas']>([]);
  const [origen, setOrigen] = useState(1);
  const [destino, setDestino] = useState(1);
  const [modoTexto, setModoTexto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<AsignacionResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const m = costos.length;
  const n = costos[0].length;

  function invalidarResultado() {
    setError(null);
    setResultado(null);
  }

  function redimensionar(filas: number, columnas: number) {
    const matriz = Array.from({ length: filas }, (_, i) =>
      Array.from({ length: columnas }, (_, j) => costos[i]?.[j] ?? '0')
    );
    setCostos(matriz);
    setProhibidas(prev => prev.filter(celda => celda.origen <= filas && celda.destino <= columnas));
    setOrigen(Math.min(origen, filas));
    setDestino(Math.min(destino, columnas));
    invalidarResultado();
  }

  function cambiarModo() {
    if (!modoTexto) {
      setTexto(aTexto(costos));
    } else {
      try {
        setCostos(desdeTexto(texto, m, n));
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        return;
      }
    }
    setModoTexto(!modoTexto);
    setError(null);
  }

  function cargarEjemplo() {
    setCostos(EJEMPLO);
    setTexto(aTexto(EJEMPLO));
    setObjetivo('min');
    setProhibidas([]);
    setOrigen(1);
    setDestino(1);
    invalidarResultado();
  }

  async function resolver(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    invalidarResultado();
    let matriz: string[][];
    try {
      matriz = (modoTexto ? desdeTexto(texto, m, n) : costos).map(fila => fila.map(valor => valor.trim()));
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      return;
    }

    setCargando(true);
    try {
      setResultado(await calcularAsignacion({ costos: matriz, objetivo, prohibidas }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo resolver el modelo. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  const bloqueada = (i: number, j: number) => prohibidas.some(p => p.origen === i && p.destino === j);

  return (
    <div className="space-y-6 py-4">
      <CabeceraConGlosario variables={VARIABLES_ASIGNACION}>
        <h1 className="text-3xl font-bold tracking-tight">Problema de Asignación</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Algoritmo húngaro paso a paso con fracciones exactas.</p>
      </CabeceraConGlosario>
      <TabsPanel pestanas={PESTANAS} activa={pestana} onCambio={setPestana} ariaLabel="Secciones del problema de asignación" />

      {pestana === 'calculadora' && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form className={TARJETA} onSubmit={resolver}>
            <h2 className="mb-4 text-xl font-semibold">Datos del problema</h2>
            <fieldset className="min-w-0 space-y-4" disabled={cargando}>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label>Orígenes (m) <select className={CAMPO} value={m} disabled={modoTexto} onChange={e => redimensionar(Number(e.target.value), n)}>
                  {DIMENSIONES.map(d => <option key={d}>{d}</option>)}
                </select></label>
                <label>Destinos (n) <select className={CAMPO} value={n} disabled={modoTexto} onChange={e => redimensionar(m, Number(e.target.value))}>
                  {DIMENSIONES.map(d => <option key={d}>{d}</option>)}
                </select></label>
                <label>Objetivo <select className={CAMPO} value={objetivo} onChange={e => { setObjetivo(e.target.value === 'max' ? 'max' : 'min'); invalidarResultado(); }}>
                  <option value="min">Minimizar costo</option>
                  <option value="max">Maximizar beneficio</option>
                </select></label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={modoTexto} onChange={cambiarModo} />
                Editar matriz como texto
              </label>
              <p className="text-sm text-slate-500 dark:text-slate-400">Introduce enteros, decimales o fracciones, por ejemplo 4, 0,25 o 1/3.</p>
              {modoTexto ? (
                <label className="block text-sm">
                  Matriz de valores (una fila por línea, separa los valores con espacios)
                  <textarea className={`${CAMPO} mt-1 block w-full font-mono`} rows={Math.max(4, m)} value={texto} onChange={e => { setTexto(e.target.value); invalidarResultado(); }} />
                  <span className="mt-1 block text-slate-500 dark:text-slate-400">Para cambiar las dimensiones, vuelve a la edición en tabla.</span>
                </label>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className={CELDA}>Origen / destino</th>
                        {costos[0].map((_, j) => <th key={j} scope="col" className={CELDA}><Formula tex={`D_{${j + 1}}`} /></th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {costos.map((fila, i) => (
                        <tr key={i}>
                          <th scope="row" className={CELDA}><Formula tex={`O_{${i + 1}}`} /></th>
                          {fila.map((valor, j) => {
                            const prohibida = bloqueada(i + 1, j + 1);
                            return (
                              <td key={j} className={`${CELDA} ${prohibida ? 'bg-amber-50 dark:bg-amber-500/10' : ''}`}>
                                <input type="text" className={`${CAMPO} w-20 text-center`}
                                  aria-label={`Valor de origen ${i + 1} a destino ${j + 1}${prohibida ? ' (prohibida)' : ''}`}
                                  value={valor} maxLength={80}
                                  onChange={e => {
                                    const nuevo = e.target.value;
                                    setCostos(prev => prev.map((f, r) => r === i ? f.map((v, c) => c === j ? nuevo : v) : f));
                                    invalidarResultado();
                                  }}
                                />
                                {prohibida && <span className="mt-1 block text-xs text-amber-800 dark:text-amber-300">Prohibida</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {m !== n && <p className="text-sm text-amber-700 dark:text-amber-300">Se añadirán {Math.abs(m - n)} {m < n ? 'filas ficticias' : 'columnas ficticias'} de costo cero.</p>}
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">Asignaciones prohibidas (opcional)</legend>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label>Origen <select className={CAMPO} value={origen} onChange={e => setOrigen(Number(e.target.value))}>
                    {DIMENSIONES.slice(0, m).map(d => <option key={d}>{d}</option>)}
                  </select></label>
                  <label>Destino <select className={CAMPO} value={destino} onChange={e => setDestino(Number(e.target.value))}>
                    {DIMENSIONES.slice(0, n).map(d => <option key={d}>{d}</option>)}
                  </select></label>
                  <button type="button" className={`${BOTON_SECUNDARIO} disabled:opacity-50`} disabled={bloqueada(origen, destino)}
                    onClick={() => { setProhibidas(prev => [...prev, { origen, destino }]); invalidarResultado(); }}>Prohibir celda</button>
                </div>
                {prohibidas.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {prohibidas.map(p => (
                      <li key={`${p.origen}:${p.destino}`}>
                        <button type="button" className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                          aria-label={`Quitar prohibición de origen ${p.origen} a destino ${p.destino}`}
                          onClick={() => { setProhibidas(prev => prev.filter(celda => celda !== p)); invalidarResultado(); }}>
                          O{p.origen} → D{p.destino} ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {cargando ? 'Resolviendo…' : 'Resolver'}
                </button>
                <button type="button" className={BOTON_SECUNDARIO} onClick={cargarEjemplo}>Cargar ejemplo</button>
              </div>
            </fieldset>
            {error && <p role="alert" className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
          </form>
          {resultado && <ResumenAsignacion resultado={resultado} verProcesos={() => setPestana('procesos')} />}
        </div>
      )}

      {pestana === 'procesos' && (resultado
        ? <AsignacionProcesos resultado={resultado} />
        : <p className={TARJETA}>Resuelve un problema en la Calculadora para ver sus procesos.</p>)}
      {pestana === 'teoria' && <TeoriaAsignacion />}
    </div>
  );
}
