import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  calcularSimplex,
  ApiError,
  type FraccionJSON,
  type IteracionRevisadaDTO,
  type MetodoSimplex,
  type ObjetivoSimplex,
  type RazonRevisadoDTO,
  type RazonTabularDTO,
  type SimplexResultado,
  type TablaTabularDTO,
} from '../services/api';
import SimplexTeoria from '../components/SimplexTeoria';
import Formula from '@shared/components/Formula';
import KpiCard from '@shared/components/KpiCard';
import TabsPanel from '@shared/components/TabsPanel';
import ProcesosView from '@shared/components/ProcesosView';

interface FilaRestriccion {
  id: string;
  operador: 'LE' | 'GE' | 'EQ';
  b: string;
  coeficientes: string[];
}

type Pestana = 'calculadora' | 'procesos' | 'teoria';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'procesos', etiqueta: 'Procesos' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

interface ProblemaTipico {
  id: string;
  nombre: string;
  descripcion: string;
  contexto: string;
  objetivo: ObjetivoSimplex;
  metodo: MetodoSimplex;
  variables: string[];
  coeficientesObjetivo: string[];
  restricciones: { coeficientes: string[]; operador: 'LE' | 'GE' | 'EQ'; b: string }[];
}

const PROBLEMAS_TIPICOS: ProblemaTipico[] = [
  {
    id: 'agro-tech',
    nombre: 'Agro-Tech (Fertilizantes)',
    descripcion: 'Planificación de producción de fertilizantes 5-5-10 y 5-10-5',
    contexto: `Tom Anderson, gerente de producción de la Agro-tech necesita planear la combinación de fertilizantes para el siguiente mes y no tiene claro cómo va a proceder para elaborar el plan. La Agro-Tech es una compañía pequeña de productos químicos que fabrica entre otros artículos dos tipos de fertilizante que se elaboran combinando ingredientes que se compran con proveedores externos. Cada mes, Tom tiene que planear la cantidad de cada fertilizante que debe producirse. Su plan debe tomar en consideración el costo de los ingredientes, el precio de venta de los fertilizantes, cualesquier pedido que deba surtirse y las restricciones impuestas al uso de los recursos de la compañía, mano de obra, materias primas o tiempo de máquina. El proceso de planeación para este mes es más difícil que lo normal. Por lo general la Agro-Tech fabrica fertilizantes de acuerdo con los pedidos de los clientes pero este mes los fertilizantes van a venderse a través de un mayorista. Esto complica las cosas porque Tom tiene que elaborar un programa de producción que conduzca a las mayores utilidades posibles para la Agro-Tech, al mismo tiempo que se utiliza sólo la cantidad de ingredientes que están disponibles para el mes.

Los dos fertilizantes que la Agro-Tech fabrica son las mezclas denominadas 5-5-10 y 5-10-5. En cada caso, el primer valor se refiere al porcentaje que el producto final tiene de nitrato químico, el segundo valor se refiere al porcentaje de fosfato que aparece en el producto final y el tercer valor da el porcentaje de potasio. El fertilizante se estabiliza con un material de relleno como podría ser barro. Por ejemplo, el 5-5-10 está elaborado con 5% de nitrato, 5% de fosfato y 10% de potasio y el 80% restante es barro. El mayorista comprará cualquier cantidad de ambos fertilizantes que la Agro-Tech pueda fabricar. Esta dispuesto a pagar $71.50 por tonelada del 5-5-10 y $69 por tonelada del 5-10-5. Este mes, la disponibilidad y costos de materias primas son 1100 toneladas de nitrato a $200 por tonelada, 1800 toneladas de fosfato a $80 cada una y 2000 toneladas de potasio a $160 cada una. El relleno esta disponible en cantidades ilimitadas al precio de $10 por tonelada, pero para los otros tres ingredientes sólo se dispone de las cantidades mencionadas antes. No hay restricciones para el uso de la mano de obra ni tampoco para el empleo de la maquinaria durante el mes, pero se tiene un costo de $15 por tonelada por concepto de mezclado de los fertilizantes. La pregunta que Tom debe resolver es ¿cómo utilizar los recursos escasos (nitrato, fosfato y potasio) de que dispone Agro-Tech, de manera que se obtengan las mayores utilidades para la compañía?`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2'],
    coeficientesObjetivo: ['18.5', '20'],
    restricciones: [
      { coeficientes: ['0.05', '0.05'], operador: 'LE', b: '1100' },
      { coeficientes: ['0.05', '0.1'], operador: 'LE', b: '1800' },
      { coeficientes: ['0.1', '0.05'], operador: 'LE', b: '2000' },
    ],
  },
];

const inputBase =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const inputCoef =
  'w-16 rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-sm tabular-nums shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const inputOperador =
  'w-14 appearance-none rounded-md border border-slate-300 bg-white py-2 pl-1 pr-7 text-center text-sm font-semibold shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

function filasIniciales(n: number): FilaRestriccion[] {
  const base: FilaRestriccion[] = [
    { id: 'r1', operador: 'LE', b: '36', coeficientes: ['1', '2'] },
    { id: 'r2', operador: 'LE', b: '60', coeficientes: ['5', '1'] },
  ];
  return base.map((r) => ({
    ...r,
    coeficientes: Array.from({ length: n }, (_, j) => r.coeficientes[j] ?? '1'),
  }));
}

/** Reconstruye cada fila al cambiar el número de variables, conservando valores. */
function reconciliarFilas(filas: FilaRestriccion[], n: number): FilaRestriccion[] {
  return filas.map((r) => ({
    ...r,
    coeficientes: Array.from({ length: n }, (_, j) => r.coeficientes[j] ?? '0'),
  }));
}

// ---------------------------------------------------------------------------
// Traza Tabular
// ---------------------------------------------------------------------------

function TablaTabular({ t }: { t: TablaTabularDTO }) {
  const entra = t.columnaEntrante;
  const sale = t.filaSaliente;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-slate-300 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400  dark:border-gray-600" />
            {t.variables.map((v, j) => (
              <th
                key={`${v}-${j}`}
                className={`border border-slate-300 px-2 py-1.5 text-center text-xs ${
                  j === entra ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-gray-300'
                }`}
              >
                <Formula tex={v} />
              </th>
            ))}
            <th className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold text-slate-600  dark:border-gray-600 dark:text-gray-300">
              b
            </th>
          </tr>
        </thead>
        <tbody>
          {t.filas.map((fila, i) => (
            <tr key={i} className={i === sale ? 'bg-amber-50 dark:bg-amber-500/10' : ''}>
              <td className="border border-slate-300 px-2 py-1.5 text-center">
                <Formula tex={t.basica[i]} />
              </td>
              {fila.map((f, j) => {
                const esPivote = i === sale && j === entra;
                return (
                  <td
                    key={j}
                    title={`${f.num}/${f.den}`}
                    className={`border border-slate-300 px-2 py-1.5 text-center tabular-nums ${
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
                title={`${t.rhs[i].num}/${t.rhs[i].den}`}
                className="border border-slate-300 px-2 py-1.5 text-center font-medium tabular-nums text-slate-800  dark:border-gray-600 dark:text-gray-100"
              >
                <Formula tex={t.rhs[i].tex} />
              </td>
            </tr>
          ))}
          <tr>
            <td className="border border-slate-300 px-2 py-1.5 text-center text-xs font-semibold text-slate-500  dark:border-gray-600 dark:text-gray-400">
              <Formula tex={'Z_j - C_j'} />
            </td>
            {t.reducidos.map((f, j) => (
              <td
                key={j}
                title={`${f.num}/${f.den}`}
                className={`border border-slate-300 px-2 py-1.5 text-center tabular-nums ${
                  j === entra ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-gray-200'
                }`}
              >
                <Formula tex={f.tex} />
              </td>
            ))}
            <td
              title={`${t.z.num}/${t.z.den}`}
              className="border border-slate-300 px-2 py-1.5 text-center font-bold tabular-nums text-slate-800  dark:border-gray-600 dark:text-gray-100"
            >
              <Formula tex={t.z.tex} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ratioTexto(r: RazonTabularDTO): React.ReactNode {
  if (r.descartada) {
    return r.denominador.dec.startsWith('-') ? 'denominador negativo → descarta' : 'denominador cero → descarta';
  }
  return (
    <>
      <Formula tex={r.numerador.tex} /> /
      <Formula tex={r.denominador.tex} /> =
      <Formula tex={r.razon!.tex} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Traza Revisada
// ---------------------------------------------------------------------------

function matrizTex(M: FraccionJSON[][]): string {
  return `\\begin{bmatrix} ${M.map((fil) => fil.map((f) => f.tex).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
}

function vectorTex(v: FraccionJSON[]): string {
  return `\\begin{bmatrix} ${v.map((f) => f.tex).join(' \\\\ ')} \\end{bmatrix}`;
}

function filaVectorTex(v: FraccionJSON[]): string {
  return `\\begin{bmatrix} ${v.map((f) => f.tex).join(' & ')} \\end{bmatrix}`;
}

const fmtFrac = (f: FraccionJSON): string => (f.den === '1' ? f.num : `${f.num}/${f.den}`);
const fracVal = (f: FraccionJSON): number => Number(f.num) / Number(f.den);

function razonRevisadoTexto(r: RazonRevisadoDTO): React.ReactNode {
  if (r.descartada) {
    return r.d.dec.startsWith('-') ? 'd negativo → descarta' : 'd cero → descarta';
  }
  return (
    <>
      <Formula tex={r.valorBase.tex} /> /
      <Formula tex={r.d.tex} /> =
      <Formula tex={r.razon!.tex} />
    </>
  );
}

function IteracionRevisada({ it, objetivo }: { it: IteracionRevisadaDTO; objetivo: ObjetivoSimplex }) {
  const entrante = it.variableEntrante;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm  dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-slate-700  dark:text-gray-100">
          Iteración {it.iteracion}
        </h4>
        {entrante ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600  dark:bg-blue-500/15 dark:text-blue-400">
            Entró {it.variableEntrante} · Salió {it.variableSaliente}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500  dark:bg-gray-700 dark:text-gray-400">
            Base inicial (holguras)
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-md bg-slate-50 px-3 py-2  dark:bg-gray-900">
            <p className="mb-1 text-xs font-medium text-slate-500  dark:text-gray-400">
              Inversa de la base <Formula tex="B^{-1}" />
            </p>
            <Formula tex={matrizTex(it.BInv)} />
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2  dark:bg-gray-900">
            <p className="mb-1 text-xs font-medium text-slate-500  dark:text-gray-400">
              Multiplicadores <Formula tex="y^T = c_B B^{-1}" />
            </p>
            <Formula tex={`${filaVectorTex(it.cB)} \\cdot ${matrizTex(it.BInv)} = ${filaVectorTex(it.y)}`} />
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2  dark:bg-gray-900">
            <p className="mb-1 text-xs font-medium text-slate-500  dark:text-gray-400">
              Lados básicos <Formula tex="b_B = B^{-1} b" /> y valor <Formula tex="Z" />
            </p>
            <Formula tex={`Z = ${filaVectorTex(it.cB)} \\cdot ${vectorTex(it.bi)} = ${it.z.tex}`} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-md bg-slate-50 px-3 py-2  dark:bg-gray-900">
            <p className="mb-2 text-xs font-medium text-slate-500  dark:text-gray-400">
              Costos reducidos <Formula tex={it.columnaEntrante === null ? '\\bar{c}_j' : ''} />
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-xs text-slate-400  dark:border-gray-600">
                    <th className="pr-3 py-1">Variable</th>
                    <th className="pr-3 py-1 text-right">c_j</th>
                    <th className="py-1 text-right">
                      <Formula tex={'\\bar c_j'} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {it.costosReducidos.map((c) => {
                    const esEntrante = c.variable === entrante;
                    return (
                      <tr key={c.variable} className="border-b border-slate-100 last:border-0  dark:border-gray-700">
                        <td className="pr-3 py-1 text-slate-700  dark:text-gray-200">
                          <Formula tex={c.variable} />
                          {esEntrante && fracVal(c.cr) > 0 ? ' ←' : ''}
                        </td>
                        <td className="pr-3 py-1 text-right tabular-nums text-slate-600  dark:text-gray-300">
                          <Formula tex={c.cj.tex} />
                        </td>
                        <td
                          className={`py-1 text-right tabular-nums ${
                            esEntrante ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-gray-200'
                          }`}
                        >
                          <Formula tex={c.cr.tex} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {it.ratios ? (
            <div className="rounded-md bg-slate-50 px-3 py-2  dark:bg-gray-900">
              <p className="mb-2 text-xs font-medium text-slate-500  dark:text-gray-400">
                Razón mínima con <Formula tex="d = B^{-1} a_e" />
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-xs text-slate-400  dark:border-gray-600">
                      <th className="pr-3 py-1">Fila</th>
                      <th className="pr-3 py-1 text-right">b_B</th>
                      <th className="pr-3 py-1 text-right">d</th>
                      <th className="py-1 text-right">b_B/d</th>
                    </tr>
                  </thead>
                  <tbody>
                    {it.ratios.map((r) => (
                      <tr
                        key={r.fila}
                        className={`border-b border-slate-100 last:border-0 dark:border-gray-700 ${
                          r.fila === it.filaSaliente ? 'bg-amber-50 dark:bg-amber-500/10' : ''
                        }`}
                      >
                        <td className="pr-3 py-1 text-slate-700  dark:text-gray-200">
                          <Formula tex={r.variable} />
                        </td>
                        <td className="pr-3 py-1 text-right tabular-nums text-slate-600  dark:text-gray-300">
                          <Formula tex={r.valorBase.tex} />
                        </td>
                        <td
                          className={`pr-3 py-1 text-right tabular-nums ${
                            fracVal(r.d) <= 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-gray-300'
                          }`}
                        >
                          <Formula tex={r.d.tex} />
                        </td>
                        <td
                          className={`py-1 text-right text-xs ${
                            r.descartada ? 'text-red-500 dark:text-red-400' : 'font-medium tabular-nums text-slate-700 dark:text-gray-200'
                          }`}
                        >
                          {razonRevisadoTexto(r)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400  dark:text-gray-500">
        Z = <Formula tex={it.z.tex} />
        {objetivo === 'max' ? ' · óptimo cuando ningún \\bar c_j > 0' : ' · óptimo cuando ningún \\bar c_j < 0'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function SimplexPage() {
  const [metodo, setMetodo] = useState<MetodoSimplex>('tabular');
  const [objetivo, setObjetivo] = useState<ObjetivoSimplex>('max');
  const [n, setN] = useState('2');
  const [coefsObj, setCoefsObj] = useState<string[]>(['10', '8']);
  const [filas, setFilas] = useState<FilaRestriccion[]>(() => filasIniciales(2));
  const [resultado, setResultado] = useState<SimplexResultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pestana, setPestana] = useState<Pestana>('calculadora');
  const [modalProblema, setModalProblema] = useState<ProblemaTipico | null>(null);
  const versionAuto = useRef(0);

  const numVariables = useMemo(() => {
    const v = Number.parseInt(n, 10);
    return Number.isFinite(v) ? Math.min(Math.max(v, 1), 12) : 1;
  }, [n]);

  const hayDobleFase = useMemo(
    () => filas.some((f) => f.operador !== 'LE'),
    [filas]
  );

  // Mantiene los arreglos sincronizados con el número de variables elegido.
  useEffect(() => {
    setCoefsObj((prev) =>
      Array.from({ length: numVariables }, (_, j) => prev[j] ?? '0')
    );
    setFilas((prev) => reconciliarFilas(prev, numVariables));
  }, [numVariables]);

  const actualizarCoefObj = (j: number, valor: string) =>
    setCoefsObj((prev) => prev.map((v, i) => (i === j ? valor : v)));

  const actualizarFila = (
    id: string,
    campo: 'operador' | 'b' | 'coeficientes',
    valor: string,
    j?: number
  ) =>
    setFilas((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (campo === 'coeficientes' && j !== undefined) {
          return { ...r, coeficientes: r.coeficientes.map((v, i) => (i === j ? valor : v)) };
        }
        return { ...r, [campo]: valor };
      })
    );

  const agregarFila = () =>
    setFilas((prev) => [
      ...prev,
      {
        id: `r${prev.length + 1}`,
        operador: 'LE',
        b: '1',
        coeficientes: Array.from({ length: numVariables }, () => '1'),
      },
    ]);

  const eliminarFila = (id: string) => setFilas((prev) => prev.filter((r) => r.id !== id));

  const aplicarProblemaTipico = (problema: ProblemaTipico) => {
    setMetodo(problema.metodo);
    setObjetivo(problema.objetivo);
    setN(problema.variables.length.toString());
    setCoefsObj(problema.coeficientesObjetivo);
    setFilas(
      problema.restricciones.map((r, idx) => ({
        id: `r${idx + 1}`,
        operador: r.operador,
        b: r.b,
        coeficientes: r.coeficientes,
      }))
    );
    setResultado(null);
    setErrors([]);
    setPestana('calculadora');
  };

  const construirPayload = useCallback(
    () => ({
      metodo,
      objetivo,
      funcionObjetivo: coefsObj.map((v) => Number(v)),
      restricciones: filas.map((r) => ({
        coeficientes: r.coeficientes.map((v) => Number(v)),
        tipo: r.operador,
        b: Number(r.b),
      })),
    }),
    [metodo, objetivo, coefsObj, filas]
  );

  const calcular = useCallback(async () => {
    setCargando(true);
    setErrors([]);
    versionAuto.current += 1;

    const hayVacio = [...coefsObj, ...filas.flatMap((r) => [...r.coeficientes, r.b])].some(
      (v) => v.trim() === ''
    );
    if (hayVacio) {
      setErrors(['Todos los coeficientes y lados derechos deben estar llenos.']);
      setCargando(false);
      return;
    }

    try {
      const res = await calcularSimplex(construirPayload());
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
      setErrors((prev) => (mensaje && !prev.includes(mensaje) ? [...prev, mensaje] : prev));
    } finally {
      setCargando(false);
    }
  }, [construirPayload, coefsObj, filas]);

  useEffect(() => {
    void calcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void calcular();
  };

  const cabecera = (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">Método Simplex</h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Programación Lineal en forma estándar: Simplex Tabular y Revisado con fracciones exactas.
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
          ariaLabel="Secciones del método simplex"
        />
        <SimplexTeoria />
      </div>
    );
  }

  if (pestana === 'procesos') {
    return (
      <div className="space-y-6">
        {cabecera}
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del método simplex"
        />
        {resultado ? (
          <ProcesosView
            procesos={resultado.procesos}
            encabezado="Procesos paso a paso"
            descripcion="Estandarización, tableaus (o bloques matriciales del revisado) y condición de óptimo de cada iteración."
          />
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-slate-500  dark:text-gray-400">
              Aún no hay procesos: resuelve un problema en la pestaña Calculadora.
            </p>
          </div>
        )}
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
        ariaLabel="Secciones del método simplex"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[460px_1fr]">
        {/* Formulario */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">Configuración del problema</h2>
              <p className="text-sm text-slate-400  dark:text-gray-500">
                Forma estándar: solo restricciones ≤ con b ≥ 0.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModalProblema(PROBLEMAS_TIPICOS[0])}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
              >
                Problemas típicos
              </button>
              <button
                type="button"
                onClick={() => aplicarProblemaTipico(PROBLEMAS_TIPICOS[0])}
                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              >
                Auto-rellenar Agro-Tech
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500  dark:text-gray-400">Método</span>
                <select
                  aria-label="Método"
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value as MetodoSimplex)}
                  className={inputBase}
                >
                  <option value="tabular">Tabular</option>
                  <option value="revisado">Revisado</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500  dark:text-gray-400">Optimización</span>
                <select
                  aria-label="Tipo de optimización"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value as ObjetivoSimplex)}
                  className={inputBase}
                >
                  <option value="max">MAX</option>
                  <option value="min">MIN</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500  dark:text-gray-400">Variables (n)</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  aria-label="Número de variables"
                  value={n}
                  onChange={(e) => setN(e.target.value)}
                  className={inputBase}
                />
              </label>
            </div>

            {/* Función objetivo */}
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Función objetivo <Formula tex={'Z = \\sum c_j x_j'} />
              </legend>
              <div className="flex flex-wrap items-center gap-2">
                {coefsObj.map((v, j) => (
                  <label key={j} className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      required
                      aria-label={`Coeficiente de x${j + 1}`}
                      value={v}
                      onChange={(e) => actualizarCoefObj(j, e.target.value)}
                      className={inputCoef}
                    />
                    <span className="text-sm font-medium text-slate-600  dark:text-gray-300">
                      <Formula tex={`x_${j + 1}`} />
                    </span>
                    {j < coefsObj.length - 1 ? <span className="text-sm text-slate-400">+</span> : null}
                  </label>
                ))}
              </div>
              <div className="mt-2 rounded-md bg-slate-50 px-3 py-2  dark:bg-gray-900">
                <Formula
                  tex={`${objetivo === 'max' ? '\\max' : '\\min'} \\; Z = ${coefsObj
                    .map((v, j) => `${v === '0' ? '0' : v} x_${j + 1}`)
                    .join(' + ')}`}
                />
              </div>
            </fieldset>

            {/* Restricciones */}
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Restricciones
              </legend>
              <div className="space-y-2">
                {filas.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-md border border-slate-200 bg-slate-50 p-2  dark:border-gray-700 dark:bg-gray-900"
                  >
                    {r.coeficientes.map((v, j) => (
                      <span key={j} className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="0"
                          aria-label={`Coeficiente x${j + 1} de ${r.id}`}
                          value={v}
                          onChange={(e) => actualizarFila(r.id, 'coeficientes', e.target.value, j)}
                          className={inputCoef}
                        />
                        <span className="whitespace-nowrap text-sm font-medium text-slate-500  dark:text-gray-400">
                          <Formula tex={`x_${j + 1}`} />
                        </span>
                        {j < r.coeficientes.length - 1 ? <span className="text-sm text-slate-400">+</span> : null}
                      </span>
                    ))}
                    <span className="relative inline-flex">
                      <select
                        aria-label={`Operador de ${r.id}`}
                        value={r.operador}
                        onChange={(e) => actualizarFila(r.id, 'operador', e.target.value as FilaRestriccion['operador'])}
                        className={inputOperador}
                      >
                        <option value="LE">≤</option>
                        <option value="GE">≥</option>
                        <option value="EQ">=</option>
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
                      value={r.b}
                      onChange={(e) => actualizarFila(r.id, 'b', e.target.value)}
                      className={inputCoef}
                    />
                    <button
                      type="button"
                      aria-label={`Eliminar restricción ${r.id}`}
                      onClick={() => eliminarFila(r.id)}
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
                ))}
              </div>
              <button
                type="button"
                onClick={agregarFila}
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

          {/* Alerta de restricciones ≥ / = */}
          {hayDobleFase ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm  dark:border-amber-800 dark:bg-amber-500/10"
            >
              <p className="font-bold text-amber-700  dark:text-amber-400">
                Restricciones ≥ o = → Dos Fases / Penalización
              </p>
              <p className="mt-1 text-amber-700  dark:text-amber-300">
                Este módulo resuelve la forma estándar (solo ≤ con b ≥ 0). Las restricciones de tipo
                ≥ o = requieren una base artificial, que se trata en el módulo{' '}
                <strong>Dos Fases / Penalización</strong>. Ajusta el operador para continuar.
              </p>
            </div>
          ) : null}

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
        </section>

        {/* Resultados */}
        <section>
          {!resultado && errors.length === 0 && !hayDobleFase ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
              <p className="text-sm text-slate-500  dark:text-gray-400">Resolviendo el problema…</p>
            </div>
          ) : null}

          {hayDobleFase ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-400 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
              <p className="text-3xl">🛠️</p>
              <p className="text-lg font-semibold text-slate-700  dark:text-gray-100">
                Dos Fases / Penalización
              </p>
              <p className="max-w-sm text-sm text-slate-500  dark:text-gray-400">
                El simplex en forma estándar no puede iniciar sin una base factible de holguras.
                Usa solo restricciones ≤ con b ≥ 0.
              </p>
            </div>
          ) : null}

          {resultado && !hayDobleFase ? (
            <>
              <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
                Resultados — {objetivo === 'max' ? 'maximización' : 'minimización'}
              </h2>

              {resultado.estado === 'no-acotado' ? (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm  dark:border-amber-800 dark:bg-amber-500/10"
                >
                  <p className="font-bold text-amber-700  dark:text-amber-400">Problema no acotado</p>
                  <p className="mt-1 text-amber-700  dark:text-amber-300">
                    La columna entrante no tiene denominadores positivos: la función objetivo crece
                    sin límite y el óptimo no es finito.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard
                  highlight
                  large
                  title="Valor óptimo Z*"
                  value={fmtFrac(resultado.valorObjetivo)}
                  formula={'Z^{*} = c_B x_B^{*}'}
                  tone="amber"
                  description="Mejor valor finito de la función objetivo, calculado con fracciones exactas."
                />
                <KpiCard
                  title="Solución óptima x*"
                  value={resultado.solucion.map(fmtFrac).join('  ·  ')}
                  formula={'x^{*} = (x_1, \\dots, x_n)'}
                  tone="emerald"
                  description="Valor de cada variable de decisión; las ausentes de la base valen 0."
                />
                <KpiCard
                  title="Base final"
                  value={resultado.basicaFinal.map((v) => v.replace(/[{}]/g, '')).join(', ')}
                  formula={'B = \\{ x_B \\}'}
                  tone="blue"
                  description="Conjunto de variables básicas en el vértice óptimo (holguras incluidas)."
                />
                <KpiCard
                  title="Iteraciones"
                  value={`${resultado.metodo === 'tabular' ? resultado.tablas.length - 1 : resultado.revisado.length - 1}`}
                  formula={metodo === 'tabular' ? 'T_k' : 'B^{-1}_k'}
                  tone="slate"
                  description="Número de pivotes necesarios para alcanzar el óptimo."
                />
              </div>

              {/* Traza */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
                      Traza del método {metodo === 'tabular' ? 'tabulares' : 'revisado'}
                    </h3>
                    <p className="text-sm text-slate-400  dark:text-gray-500">
                      {metodo === 'tabular'
                        ? 'Tableau de cada iteración. Azul = columna entrante, rojo = pivote, ámbar = fila saliente.'
                        : 'Base, B⁻¹, multiplicadores y prueba de la razón de cada iteración.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600  dark:bg-blue-500/15 dark:text-blue-400">
                    Aritmética exacta (fracciones)
                  </span>
                </div>

                {metodo === 'tabular'
                  ? resultado.tablas.map((t) => (
                      <div key={t.iteracion} className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600  dark:text-gray-300">
                          Tableau T<sub>{t.iteracion}</sub>
                        </p>
                        <TablaTabular t={t} />
                        {t.ratios ? (
                          <p className="text-xs text-slate-500  dark:text-gray-400">
                            Entra <Formula tex={t.variables[t.columnaEntrante!]} /> · Razones:{' '}
                            {t.ratios!.map((r, idx) => (
                              <React.Fragment key={idx}>
                                {ratioTexto(r)}
                                {idx < t.ratios!.length - 1 ? '  ·  ' : null}
                              </React.Fragment>
                            ))}
                            {' '}· Sale{' '}
                            <Formula tex={t.basica[t.filaSaliente!]} />
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500  dark:text-gray-400">
                            Base inicial de holguras: sin pivoteo.
                          </p>
                        )}
                      </div>
                    ))
                  : resultado.revisado.map((it) => (
                      <div key={it.iteracion} className="mt-4 space-y-2 first:mt-0">
                        <IteracionRevisada it={it} objetivo={objetivo} />
                      </div>
                    ))}

                {resultado.estado === 'optimo' ? (
                  <p
                    role="status"
                    className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700  dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    Óptimo: no existe ninguna columna que mejore la función objetivo. Z* ={' '}
                    {fmtFrac(resultado.valorObjetivo)}
                  </p>
                ) : null}
              </div>

              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                Todos los cálculos del tableau se realizan con aritmética entera (fracciones
                irreducibles); los decimales son solo una vista aproximada. Pasa el cursor sobre una
                celda para ver la fracción exacta.
              </p>
            </>
          ) : null}
        </section>
      </div>

      {modalProblema ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">{modalProblema.nombre}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{modalProblema.descripcion}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalProblema(null)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-gray-200">Modelo</h4>
                <div className="rounded-md bg-slate-50 p-3 dark:bg-gray-800">
                  <Formula tex={`\\max Z = ${modalProblema.coeficientesObjetivo.map((c, i) => `${c}X_${i + 1}`).join(' + ')}`} />
                  <div className="mt-2 space-y-1">
                    {modalProblema.restricciones.map((r, i) => (
                      <div key={i}>
                        <Formula tex={`${r.coeficientes.map((c, j) => `${c}X_${j + 1}`).join(' + ')} \\le ${r.b}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-gray-200">Contexto del problema</h4>
                <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  <p className="whitespace-pre-line">{modalProblema.contexto}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setModalProblema(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  aplicarProblemaTipico(modalProblema);
                  setModalProblema(null);
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Auto-rellenar en el formulario
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}