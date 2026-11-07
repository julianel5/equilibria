import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  calcularSimplex,
  ApiError,
  type FraccionJSON,
  type TerminoMDTO,
  type IteracionRevisadaDTO,
  type MetodoSimplex,
  type ObjetivoSimplex,
  type RazonRevisadoDTO,
  type RazonTabularDTO,
  type SimplexResultado,
  type TablaTabularDTO,
} from '../services/api';
import SimplexTeoria from '../components/SimplexTeoria';
import GranMTeoria from '../components/GranMTeoria';
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
  {
    id: 'mc-camisetas',
    nombre: 'MC (Camisetas)',
    descripcion: 'Producción de camisetas colegiales y empresariales con restricciones de tiempo, pedido especial y producción mínima.',
    contexto: `MC confecciona dos tipos de camisetas en cada período de producción: Colegiales y Empresariales. El costo de producción de cada camiseta colegial es de $2 y de cada camiseta empresarial es de $3. Para confeccionar las camisetas hay disponibles 600 horas durante el período de producción, advirtiendo que el procesamiento de cada camiseta colegial es 2 horas y cada camiseta empresarial una hora. Se debe cumplir con un pedido especial para un cliente durante el período de producción de al menos 125 camisetas colegiales y la producción total de ambos tipos de camisetas debe ser como mínimo de 350 unidades.`,
    objetivo: 'min',
    metodo: 'tabular',
    variables: ['X1', 'X2'],
    coeficientesObjetivo: ['2', '3'],
    restricciones: [
      { coeficientes: ['2', '1'], operador: 'LE', b: '600' },
      { coeficientes: ['1', '0'], operador: 'GE', b: '125' },
      { coeficientes: ['1', '1'], operador: 'GE', b: '350' },
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

/**
 * `entra`/`sale` marcan la decisión que se toma SOBRE esta tabla (columna
 * entrante y fila pivote), que el motor guarda en la tabla siguiente.
 */
function TablaTabular({ t, entra, sale, algebraico = false }: { t: TablaTabularDTO; entra: number | null; sale: number | null; algebraico?: boolean }) {
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
                <Formula tex={algebraico ? formatearM(f, t.reducidosM?.[j]) : f.tex} />
              </td>
            ))}
            <td
              title={`${t.z.num}/${t.z.den}`}
              className="border border-slate-300 px-2 py-1.5 text-center font-bold tabular-nums text-slate-800  dark:border-gray-600 dark:text-gray-100"
            >
              <Formula tex={algebraico ? formatearM(t.z, t.zM) : t.z.tex} />
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
// Explicaciones de cada tabla (¿factible?, ¿óptima?, entra, sale)
// ---------------------------------------------------------------------------

type TipoExplicacion = 'factible' | 'optima' | 'entra' | 'sale';

const esArtificial = (v: string): boolean => v.startsWith('R_');
/**
 * Muestra un valor de Gran M como a + bM con fracciones exactas, usando la
 * descomposición simbólica que calcula el motor. Si no está disponible,
 * muestra el valor exacto original.
 */
function formatearM(original: FraccionJSON, termino: TerminoMDTO | null | undefined): string {
  if (!termino) return original.tex;
  const { a, b } = termino;
  const aCero = a.num === '0';
  const bCero = b.num === '0';
  if (aCero && bCero) return '0';
  let mTex = '';
  if (!bCero) {
    if (b.num === '1' && b.den === '1') mTex = 'M';
    else if (b.num === '-1' && b.den === '1') mTex = '-M';
    else mTex = `${b.tex}M`;
  }
  if (bCero) return a.tex;
  if (aCero) return mTex;
  return mTex.startsWith('-') ? `${a.tex} ${mTex}` : `${a.tex} + ${mTex}`;
}
const signoFrac = (f: FraccionJSON): number => Math.sign(fracVal(f));

interface AnalisisFactibilidad {
  negativas: number[];
  artificialesPositivas: number[];
  factible: boolean;
}

function analizarFactibilidad(t: TablaTabularDTO, esFinal: boolean): AnalisisFactibilidad {
  const negativas = t.rhs.flatMap((f, i) => (signoFrac(f) < 0 ? [i] : []));
  const artificialesPositivas = t.rhs.flatMap((f, i) =>
    esArtificial(t.basica[i]) && signoFrac(f) > 0 ? [i] : []
  );
  // Una artificial positiva en la tabla final significa que el problema original no tiene solución factible.
  const factible = negativas.length === 0 && !(esFinal && artificialesPositivas.length > 0);
  return { negativas, artificialesPositivas, factible };
}

interface AnalisisOptimalidad {
  violan: number[];
  mejor: number | null;
  optima: boolean;
}

/** Mismo criterio que el motor: MAX → óptimo si todo Z_j − C_j ≥ 0; MIN → si todo Z_j − C_j ≤ 0. */
function analizarOptimalidad(t: TablaTabularDTO, objetivo: ObjetivoSimplex): AnalisisOptimalidad {
  const usarMax = objetivo === 'max';
  const violan = t.reducidos.flatMap((f, j) => {
    const s = signoFrac(f);
    return (usarMax ? s < 0 : s > 0) ? [j] : [];
  });
  let mejor: number | null = null;
  for (const j of violan) {
    const v = fracVal(t.reducidos[j]);
    if (mejor === null || (usarMax ? v < fracVal(t.reducidos[mejor]) : v > fracVal(t.reducidos[mejor]))) {
      mejor = j;
    }
  }
  return { violan, mejor, optima: violan.length === 0 };
}

const celdaModal = 'border border-slate-200 px-2 py-1 dark:border-gray-700';

function Veredicto({ ok, children }: { ok: boolean; children: React.ReactNode }) {
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

function ExplicacionFactible({ t, esFinal }: { t: TablaTabularDTO; esFinal: boolean }) {
  const { negativas, artificialesPositivas, factible } = analizarFactibilidad(t, esFinal);
  const noBasicas = t.variables.filter((v) => !t.basica.includes(v));
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
          {t.basica.map((v, i) => {
            const negativa = negativas.includes(i);
            return (
              <tr key={i} className={negativa ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                <td className={celdaModal}>
                  <Formula tex={v} />
                </td>
                <td className={`${celdaModal} text-right tabular-nums`}>
                  <Formula tex={`${t.rhs[i].tex}${t.rhs[i].den !== '1' ? ` \\approx ${t.rhs[i].dec}` : ''}`} />
                </td>
                <td className={`${celdaModal} text-center font-semibold ${negativa ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
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
      {artificialesPositivas.length > 0 ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-gray-800">
          Gran M: {artificialesPositivas.map((i) => (
            <React.Fragment key={i}>
              <Formula tex={`${t.basica[i]} = ${t.rhs[i].tex}`} />{' '}
            </React.Fragment>
          ))}
          {esFinal
            ? 'sigue en la base con valor positivo en la tabla final: el problema original no tiene solución factible.'
            : 'todavía es positiva. La solución es factible para el problema ampliado, y el método la irá expulsando de la base (penalización M).'}
        </p>
      ) : null}
      <Veredicto ok={factible}>
        {negativas.length > 0
          ? `Hay ${negativas.length} valor(es) negativos en b → NO es factible.`
          : factible
            ? 'Todos los valores de b son ≥ 0 → SÍ es factible.'
            : 'b ≥ 0 pero quedan artificiales positivas en la tabla final → NO es factible para el problema original.'}
      </Veredicto>
    </div>
  );
}

function ExplicacionOptima({
  t,
  objetivo,
  noAcotado,
}: {
  t: TablaTabularDTO;
  objetivo: ObjetivoSimplex;
  noAcotado: boolean;
}) {
  const { violan, mejor, optima } = analizarOptimalidad(t, objetivo);
  const condicion = objetivo === 'max' ? 'Z_j - C_j \\ge 0' : 'Z_j - C_j \\le 0';
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        Criterio de optimalidad ({objetivo === 'max' ? 'maximización' : 'minimización'}): la tabla es óptima si para
        toda variable <Formula tex={condicion} />. Un valor{' '}
        {objetivo === 'max' ? 'negativo' : 'positivo'} indica que esa variable, al entrar, todavía mejora Z.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-left`}>Variable</th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="Z_j - C_j" />
            </th>
            <th className={`${celdaModal} text-center`}>
              ¿<Formula tex={objetivo === 'max' ? '\\ge 0' : '\\le 0'} />?
            </th>
          </tr>
        </thead>
        <tbody>
          {t.variables.map((v, j) => {
            const viola = violan.includes(j);
            const basica = t.basica.includes(v);
            return (
              <tr key={j} className={j === mejor ? 'bg-blue-50 dark:bg-blue-500/10' : ''}>
                <td className={celdaModal}>
                  <Formula tex={v} />
                  {basica ? <span className="ml-1 text-xs text-slate-400">(básica)</span> : null}
                </td>
                <td className={`${celdaModal} text-right tabular-nums`}>
                  <Formula tex={t.reducidos[j].tex} />
                </td>
                <td className={`${celdaModal} text-center font-semibold ${viola ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {viola ? '✗' : '✓'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs">
        Valor actual de la función objetivo: <Formula tex={`Z = ${t.z.tex}`} />
      </p>
      <Veredicto ok={optima}>
        {optima ? (
          <>Ningún <Formula tex="Z_j - C_j" /> viola la condición → SÍ es óptima. Z* = <Formula tex={t.z.tex} /></>
        ) : (
          <>
            {violan.length} variable(s) violan la condición → NO es óptima.{' '}
            {mejor !== null ? (
              <>
                Candidata a entrar: <Formula tex={t.variables[mejor]} /> (
                <Formula tex={`Z_j - C_j = ${t.reducidos[mejor].tex}`} />, el {objetivo === 'max' ? 'más negativo' : 'más positivo'}).
              </>
            ) : null}
            {noAcotado ? ' Sin embargo, su columna no tiene ningún coeficiente positivo: el problema es no acotado.' : ''}
          </>
        )}
      </Veredicto>
    </div>
  );
}

function ExplicacionEntra({ t, decision, objetivo }: { t: TablaTabularDTO; decision: TablaTabularDTO; objetivo: ObjetivoSimplex }) {
  const { violan } = analizarOptimalidad(t, objetivo);
  const e = decision.columnaEntrante!;
  const fn = objetivo === 'max' ? '\\min' : '\\max';
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        Entre las variables que violan el criterio de optimalidad se elige la que más mejora Z por unidad:{' '}
        {objetivo === 'max' ? 'el Z_j − C_j más negativo' : 'el Z_j − C_j más positivo'}.
      </p>
      <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-gray-800">
        <Formula
          display
          tex={`${fn}\\{ ${violan.map((j) => `\\underbrace{${t.reducidos[j].tex}}_{${t.variables[j]}}`).join(',\\; ')} \\} = ${t.reducidos[e].tex}`}
        />
      </div>
      <Veredicto ok>
        Entra <Formula tex={t.variables[e]} /> (columna pivote, en azul en la tabla).
      </Veredicto>
    </div>
  );
}

function ExplicacionSale({ t, decision }: { t: TablaTabularDTO; decision: TablaTabularDTO }) {
  const e = decision.columnaEntrante!;
  const sal = decision.filaSaliente!;
  const ratios = decision.ratios ?? [];
  const noAcotado = sal < 0;
  return (
    <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
      <p>
        Prueba de la razón mínima con la columna de <Formula tex={t.variables[e]} />: para cada fila con{' '}
        <Formula tex="a_{ie} > 0" /> se calcula <Formula tex="b_i / a_{ie}" />. Sale la variable de la fila con la
        menor razón, porque es la primera que llega a 0 y así ninguna variable básica se vuelve negativa (se mantiene la
        factibilidad).
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
            <th className={`${celdaModal} text-left`}>Básica</th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="b_i" />
            </th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="a_{ie}" />
            </th>
            <th className={`${celdaModal} text-right`}>
              <Formula tex="b_i / a_{ie}" />
            </th>
          </tr>
        </thead>
        <tbody>
          {ratios.map((r) => (
            <tr key={r.fila} className={r.fila === sal ? 'bg-amber-50 dark:bg-amber-500/10' : ''}>
              <td className={celdaModal}>
                <Formula tex={r.variable} />
              </td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={r.numerador.tex} />
              </td>
              <td className={`${celdaModal} text-right tabular-nums`}>
                <Formula tex={r.denominador.tex} />
              </td>
              <td className={`${celdaModal} text-right tabular-nums ${r.descartada ? 'text-xs text-red-500 dark:text-red-400' : ''}`}>
                {r.descartada ? (
                  signoFrac(r.denominador) < 0 ? 'a < 0 → no se considera' : 'a = 0 → no se considera'
                ) : (
                  <Formula tex={`${r.numerador.tex} / ${r.denominador.tex} = ${r.razon!.tex}${r.razon!.den !== '1' ? ` \\approx ${r.razon!.dec}` : ''}`} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {noAcotado ? (
        <Veredicto ok={false}>
          Ningún <Formula tex="a_{ie}" /> es positivo: <Formula tex={t.variables[e]} /> puede crecer sin límite → el
          problema es no acotado.
        </Veredicto>
      ) : (
        <Veredicto ok>
          Razón mínima = <Formula tex={ratios[sal].razon!.tex} /> en la fila de <Formula tex={ratios[sal].variable} /> →
          sale <Formula tex={ratios[sal].variable} />. Pivote = <Formula tex={t.filas[sal][e].tex} />.
        </Veredicto>
      )}
    </div>
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
            {it.basica.some(esArtificial) ? 'Base inicial (holguras y artificiales)' : 'Base inicial (holguras)'}
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
                    <th className="pr-3 py-1 text-right"><Formula tex="c_j" /></th>
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
                      <th className="pr-3 py-1 text-right"><Formula tex="b_B" /></th>
                      <th className="pr-3 py-1 text-right">d</th>
                      <th className="py-1 text-right"><Formula tex="b_B / d" /></th>
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
        {' · óptimo cuando ningún '}
        <Formula tex={objetivo === 'max' ? '\\bar c_j > 0' : '\\bar c_j < 0'} />
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
  const [explicacionModal, setExplicacionModal] = useState<{ tipo: TipoExplicacion; indice: number } | null>(null);
  const [vistaAlgebraica, setVistaAlgebraica] = useState(false);
  const versionAuto = useRef(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transferredRef = useRef(false);
  const location = useLocation();

  const numVariables = useMemo(() => {
    const v = Number.parseInt(n, 10);
    return Number.isFinite(v) ? Math.min(Math.max(v, 1), 12) : 1;
  }, [n]);

  const esGranM = location.pathname === '/pl/penalizacion';
  const hayDobleFase = useMemo(
    () => !esGranM && filas.some((r) => r.operador === 'GE' || r.operador === 'EQ'),
    [filas, esGranM]
  );

  // Transfiere datos del formulario si vienen por query param (al saltar de Simplex a Gran M).
  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const parsed = JSON.parse(atob(data));
        if (parsed.metodo) setMetodo(parsed.metodo);
        if (parsed.objetivo) setObjetivo(parsed.objetivo);
        if (parsed.n) setN(String(parsed.n));
        if (parsed.coefsObj) setCoefsObj(parsed.coefsObj);
        if (parsed.filas) setFilas(parsed.filas);
        transferredRef.current = true;
        // Limpia el query param de la URL para no mostrar datos en la barra.
        navigate(location.pathname, { replace: true });
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantiene los arreglos sincronizados con el número de variables elegido.
  useEffect(() => {
    if (transferredRef.current) {
      transferredRef.current = false;
      return;
    }
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
    versionAuto.current += 1;
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
    if (hayDobleFase) {
      setResultado(null);
      setErrors([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setErrors([]);
    setExplicacionModal(null);
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
  }, [construirPayload, coefsObj, filas, hayDobleFase]);

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
      <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">{location.pathname === '/pl/penalizacion' ? 'Método de Penalización (Gran M)' : 'Método Simplex'}</h1>
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
        {location.pathname === '/pl/penalizacion' ? <GranMTeoria /> : <SimplexTeoria />}
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
              <p className="text-sm text-slate-400 dark:text-gray-500">
                {location.pathname === '/pl/penalizacion' ? 'Método de Gran M para restricciones ≥, = con variables artificiales.' : 'Soporta ≤, ≥, = con b ≥ 0 (Gran M / Penalización).'}
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
                Restricciones ≥ o = → No resoluble con Simplex estándar
              </p>
              <p className="mt-1 text-amber-700  dark:text-amber-300">
                El método Simplex estándar resuelve únicamente restricciones de tipo ≤ con b ≥ 0. Las
                restricciones de tipo ≥ o = requieren variables artificiales (base artificial), que se
                tratan con el método de <strong>Penalización (Gran M)</strong>. Para resolver este
                problema, ve a la sección{' '}
                <button
                  type="button"
                  onClick={() => {
                    const data = btoa(
                      JSON.stringify({
                        metodo,
                        objetivo,
                        n,
                        coefsObj,
                        filas,
                      })
                    );
                    navigate(`/pl/penalizacion?data=${encodeURIComponent(data)}`);
                  }}
                  className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100"
                >
                  Ir al Método de Penalización (Gran M)
                </button>{' '}
                donde puedes introducir el mismo modelo y obtener la solución.
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
          {cargando && !resultado && errors.length === 0 && !hayDobleFase ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
              <p className="text-sm text-slate-500  dark:text-gray-400">Resolviendo el problema…</p>
            </div>
          ) : null}

          {hayDobleFase ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-400 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
              <p className="text-3xl">🛠️</p>
              <p className="text-lg font-semibold text-slate-700 dark:text-gray-100">
                Gran M / Penalización
              </p>
              <p className="max-w-sm text-sm text-slate-500 dark:text-gray-400">
                Para restricciones ≥ o = con b ≥ 0 se añaden variables artificiales (Gran M). Asegúrate de tener una base factible.
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
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Base final</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {resultado.basicaFinal.map((v, i) => {
                      const limpio = v.replace(/[{}]/g, '').replace(/([A-Za-z]+)(\d+)/g, '$1_$2');
                      return (
                        <span key={i}>
                          <Formula tex={limpio} />
                          {i < resultado.basicaFinal.length - 1 ? ', ' : ''}
                        </span>
                      );
                    })}
                  </p>
                  <div className="mt-3 rounded-md border border-transparent bg-gray-100 px-3 py-2 text-gray-800 dark:border dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <Formula tex={'B = \\{ x_B \\}'} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400 dark:text-gray-500">
                    Conjunto de variables básicas en el vértice óptimo (holguras incluidas).
                  </p>
                </div>
                <KpiCard
                  title="Iteraciones"
                  value={`${resultado.metodo === 'tabular' ? resultado.tablas.length - 1 : resultado.revisado.length - 1}`}
                  formula={metodo === 'tabular' ? 'T_k' : 'B^{-1}_k'}
                  tone="slate"
                  description="Número de pivotes necesarios para alcanzar el óptimo."
                />
              </div>

              {/* Traza */}
              {esGranM ? (
                <div className="mb-3 mt-6 flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-gray-300">
                    Vista:
                  </label>
                  <button
                    type="button"
                    onClick={() => setVistaAlgebraica((v) => !v)}
                    className={`rounded-md border px-3 py-1 text-sm font-medium ${
                      vistaAlgebraica
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                        : 'border-slate-300 bg-white text-slate-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {vistaAlgebraica ? 'Algebraica (M)' : 'Numerica (M=1.000.000)'}
                  </button>
                </div>
              ) : null}
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
                      Traza del método {metodo === 'tabular' ? 'tabular' : 'revisado'}
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
                  ? resultado.tablas.map((t, k) => {
                      // El motor repite la última tabla (sin pivotear) al detectar no acotamiento.
                      if (t.filaSaliente === -1) return null;
                      // La decisión tomada sobre esta tabla (entra/sale) viaja en la tabla siguiente.
                      const decision = resultado.tablas[k + 1] ?? null;
                      const noAcotado = decision?.filaSaliente === -1;
                      const esFinal = decision === null;
                      const factible = analizarFactibilidad(t, esFinal).factible;
                      const optima = analizarOptimalidad(t, resultado.objetivo).optima;
                      const botonClase =
                        'rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800';
                      const respuesta = (ok: boolean) => (
                        <span className={`font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {ok ? 'SÍ' : 'NO'}
                        </span>
                      );
                      return (
                        <div key={t.iteracion} className="mt-6 space-y-2 first:mt-0">
                          <p className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                            TABLA {t.iteracion}
                          </p>
                          <TablaTabular
                            t={t}
                            entra={decision?.columnaEntrante ?? null}
                            sale={decision && !noAcotado ? decision.filaSaliente : null}
                            algebraico={esGranM && vistaAlgebraica}
                          />
                          {decision?.ratios ? (
                            <p className="text-xs text-slate-500 dark:text-gray-400">
                              Entra <Formula tex={t.variables[decision.columnaEntrante!]} /> · Razones:{' '}
                              {decision.ratios.map((r, idx) => (
                                <React.Fragment key={idx}>
                                  {ratioTexto(r)}
                                  {idx < decision.ratios!.length - 1 ? '  ·  ' : null}
                                </React.Fragment>
                              ))}
                              {noAcotado ? (
                                ' · Ninguna razón válida: no acotado'
                              ) : (
                                <>
                                  {' '}· Sale <Formula tex={t.basica[decision.filaSaliente!]} />
                                </>
                              )}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-gray-300">
                            <button type="button" onClick={() => setExplicacionModal({ tipo: 'factible', indice: k })} className={botonClase}>
                              ¿Es factible? {respuesta(factible)}
                            </button>
                            <button type="button" onClick={() => setExplicacionModal({ tipo: 'optima', indice: k })} className={botonClase}>
                              ¿Es óptima? {respuesta(optima)}
                            </button>
                            {decision ? (
                              <>
                                <button type="button" onClick={() => setExplicacionModal({ tipo: 'entra', indice: k })} className={botonClase}>
                                  Entra <Formula tex={t.variables[decision.columnaEntrante!]} />
                                </button>
                                <button type="button" onClick={() => setExplicacionModal({ tipo: 'sale', indice: k })} className={botonClase}>
                                  {noAcotado ? 'Sale: ninguna (no acotado)' : (
                                    <>
                                      Sale <Formula tex={t.basica[decision.filaSaliente!]} />
                                    </>
                                  )}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
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
          {(() => {
            const esGranM = filas.some((r) => r.operador === 'GE' || r.operador === 'EQ');
            if (!esGranM) return null;
            return (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-100">
                  Problema estandarizado (forma canónica con Gran M)
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  Restricciones ≤ suman holgura Sᵢ; restricciones ≥ restan exceso Eᵢ y suman artificial Rᵢ;
                  restricciones = suman artificial Rᵢ. Las artificiales llevan penalización ∓M en Z.
                </p>
                <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-gray-200">
                  <div>
                    <Formula
                      tex={`${objetivo === 'max' ? '\\max' : '\\min'} Z = ${coefsObj
                        .map((c, j) => `${c}X_${j + 1}`)
                        .join(' + ')}${filas
                        .map((r, i) => {
                          if (r.operador === 'LE') return ` + 0S_${i + 1}`;
                          if (r.operador === 'GE') return ` + 0E_${i + 1} ${objetivo === 'max' ? '-' : '+'} M R_${i + 1}`;
                          return ` ${objetivo === 'max' ? '-' : '+'} M R_${i + 1}`;
                        })
                        .join('')}`}
                    />
                  </div>
                  {filas.map((r, i) => {
                    const coefStr = r.coeficientes.map((c, j) => `${c}X_${j + 1}`).join(' + ');
                    if (r.operador === 'LE') {
                      return (
                        <div key={i}>
                          <Formula tex={`${coefStr} + S_${i + 1} = ${r.b}`} />
                        </div>
                      );
                    }
                    if (r.operador === 'GE') {
                      return (
                        <div key={i}>
                          <Formula tex={`${coefStr} - E_${i + 1} + R_${i + 1} = ${r.b}`} />
                        </div>
                      );
                    }
                    return (
                      <div key={i}>
                        <Formula tex={`${coefStr} + R_${i + 1} = ${r.b}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {(() => {
            const esMax = objetivo === 'max';
            const todasLE = filas.length > 0 && filas.every((f) => f.operador === 'LE');
            if (!esMax || !todasLE) return null;
            const m = filas.length;
            const holguras = Array.from({ length: m }, (_, i) => `S_${i + 1}`);
            return (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-100">
                  Problema estandarizado (forma canónica)
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  Al convertir restricciones ≤ con b ≥ 0 se suman variables de holgura{' '}
                  {holguras.join(', ')} con coeficiente 0 en Z.
                </p>
                <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-gray-200">
                  <div>
                    <Formula
                      tex={`\\max Z = ${coefsObj
                        .map((c, j) => `${c}X_${j + 1}`)
                        .join(' + ')} + ${holguras
                        .map((h) => `0${h}`)
                        .join(' + ')}`}
                    />
                  </div>
                  {filas.map((r, i) => (
                    <div key={i} className="mt-1">
                      <Formula
                        tex={`${r.coeficientes
                          .map((c, j) => `${c}X_${j + 1}`)
                          .join(' + ')} + ${holguras
                          .map((h, k) => (k === i ? h : `0${h}`))
                          .join(' + ')} = ${r.b}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </section>
      </div>

      {explicacionModal && resultado?.tablas[explicacionModal.indice] ? (() => {
        const k = explicacionModal.indice;
        const t = resultado.tablas[k];
        const decision = resultado.tablas[k + 1] ?? null;
        const titulos: Record<TipoExplicacion, string> = {
          factible: '¿Es factible?',
          optima: '¿Es óptima?',
          entra: '¿Por qué entra esta variable?',
          sale: '¿Por qué sale esta variable?',
        };
        let contenido: React.ReactNode = null;
        if (explicacionModal.tipo === 'factible') contenido = <ExplicacionFactible t={t} esFinal={decision === null} />;
        else if (explicacionModal.tipo === 'optima')
          contenido = <ExplicacionOptima t={t} objetivo={resultado.objetivo} noAcotado={decision?.filaSaliente === -1} />;
        else if (decision && explicacionModal.tipo === 'entra')
          contenido = <ExplicacionEntra t={t} decision={decision} objetivo={resultado.objetivo} />;
        else if (decision) contenido = <ExplicacionSale t={t} decision={decision} />;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            onClick={() => setExplicacionModal(null)}
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
                    {titulos[explicacionModal.tipo]}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">TABLA {t.iteracion}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExplicacionModal(null)}
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
                  onClick={() => setExplicacionModal(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })() : null}

      {modalProblema ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">{modalProblema.nombre}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{modalProblema.descripcion}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = PROBLEMAS_TIPICOS.findIndex((p) => p.id === modalProblema.id);
                    const prev = PROBLEMAS_TIPICOS[(idx - 1 + PROBLEMAS_TIPICOS.length) % PROBLEMAS_TIPICOS.length];
                    setModalProblema(prev);
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label="Problema anterior"
                >
                  ←
                </button>
                <span className="text-xs text-slate-400 dark:text-gray-500">
                  {PROBLEMAS_TIPICOS.findIndex((p) => p.id === modalProblema.id) + 1}/{PROBLEMAS_TIPICOS.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const idx = PROBLEMAS_TIPICOS.findIndex((p) => p.id === modalProblema.id);
                    const next = PROBLEMAS_TIPICOS[(idx + 1) % PROBLEMAS_TIPICOS.length];
                    setModalProblema(next);
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label="Problema siguiente"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setModalProblema(null)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Cerrar"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M6.28 5.22a.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75 0 001.06 1.06L10 11.06l3.72 3.72a.75 0 001.06-1.06L11.06 10l3.72-3.72a.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
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