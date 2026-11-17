import { z } from 'zod';
import { proceso, type ProcesoCalculo } from '../../procesos';
import { Frac } from './fraction';
import type { ObjetivoSimplex } from './simplex';
import type { FraccionJSON } from './simplex.service';
import {
  calcularSimplexDualCore,
  type IteracionDual,
  type RazonDual,
} from './simplexDual';

export interface RazonDualDTO {
  columna: number;
  variable: string;
  reducido: FraccionJSON;
  coeficiente: FraccionJSON;
  razon: FraccionJSON | null;
  descartada: boolean;
}

export interface IteracionDualDTO {
  iteracion: number;
  variables: string[];
  basica: string[];
  filas: FraccionJSON[][];
  rhs: FraccionJSON[];
  reducidos: FraccionJSON[];
  /** Z de la forma normalizada de minimización (la fila Z_j - C_j es la de esta forma). */
  z: FraccionJSON;
  /** El mismo valor expresado en la orientación original (max/min del usuario). */
  zOriginal: FraccionJSON;
  filaSaliente: number | null;
  variableSaliente: string | null;
  columnaEntrante: number | null;
  variableEntrante: string | null;
  pivote: FraccionJSON | null;
  ratios: RazonDualDTO[] | null;
  factible: boolean;
}

export interface SimplexDualResultado {
  objetivo: ObjetivoSimplex;
  n: number;
  m: number;
  estado: 'optimo' | 'infactible' | 'no-dual-factible';
  mensaje: string;
  variables: string[];
  basicaFinal: string[];
  solucion: FraccionJSON[];
  holguras: FraccionJSON[];
  valorObjetivo: FraccionJSON;
  iteraciones: IteracionDualDTO[];
  procesos: ProcesoCalculo[];
}

function ff(f: Frac): FraccionJSON {
  return { num: f.num.toString(), den: f.den.toString(), tex: f.toTex(), dec: f.toDec() };
}

function razonDTO(r: RazonDual): RazonDualDTO {
  return {
    columna: r.columna,
    variable: r.variable,
    reducido: ff(r.reducido),
    coeficiente: ff(r.coeficiente),
    razon: r.razon ? ff(r.razon) : null,
    descartada: r.descartada,
  };
}

function iteracionDTO(it: IteracionDual, esMin: boolean): IteracionDualDTO {
  return {
    iteracion: it.iteracion,
    variables: [...it.variables],
    basica: [...it.basica],
    filas: it.filas.map((fila) => fila.map(ff)),
    rhs: it.rhs.map(ff),
    reducidos: it.reducidos.map(ff),
    z: ff(it.z),
    zOriginal: ff(esMin ? it.z : it.z.neg()),
    filaSaliente: it.filaSaliente,
    variableSaliente: it.variableSaliente,
    columnaEntrante: it.columnaEntrante,
    variableEntrante: it.variableEntrante,
    pivote: it.pivote ? ff(it.pivote) : null,
    ratios: it.ratios ? it.ratios.map(razonDTO) : null,
    factible: it.factible,
  };
}

function textoTableau(t: IteracionDualDTO): string {
  const cols = t.variables.length;
  const encabezado = [
    '',
    ...t.variables.map((v, j) => (t.columnaEntrante === j ? `{\\color{blue} ${v}}` : v)),
    'b',
  ];
  const lineas: string[] = [encabezado.join(' & ')];
  t.filas.forEach((fila, i) => {
    const celdas = fila.map((f, j) =>
      i === t.filaSaliente && j === t.columnaEntrante ? `{\\color{red} ${f.tex}}` : f.tex
    );
    lineas.push(`${t.basica[i]} & ${celdas.join(' & ')} & ${t.rhs[i].tex}`);
  });
  lineas.push(`Z_j - C_j & ${t.reducidos.map((f) => f.tex).join(' & ')} & ${t.z.tex}`);
  return `\\text{Tableau}_{${t.iteracion}} = \\begin{array}{c|${'c'.repeat(cols)}|c} ${lineas.join(
    ' \\\\ \\hline '
  )} \\end{array}`;
}

function textoRatiosDual(ratios: RazonDualDTO[]): string {
  return ratios
    .filter((r) => !r.descartada)
    .map((r) => `${r.reducido.tex}/${r.coeficiente.tex}=${r.razon!.tex}`)
    .join(',\\;\\;');
}

export const SimplexDualInputSchema = z
  .object({
    objetivo: z.enum(['max', 'min']).default('min'),
    funcionObjetivo: z
      .array(
        z.number().finite({
          message: 'Los coeficientes de la función objetivo deben ser números finitos.',
        })
      )
      .min(1, { message: 'La función objetivo requiere al menos una variable.' }),
    restricciones: z
      .array(
        z.object({
          coeficientes: z.array(
            z.number().finite({
              message: 'Los coeficientes de la restricción deben ser números finitos.',
            })
          ),
          tipo: z.enum(['LE', 'GE', 'EQ']).default('LE'),
          b: z.number().finite({
            message: 'El término independiente (b) debe ser un número finito.',
          }),
        })
      )
      .min(1, { message: 'Se requiere al menos una restricción.' }),
  })
  .superRefine((data, ctx) => {
    const n = data.funcionObjetivo.length;
    data.restricciones.forEach((r, i) => {
      if (r.coeficientes.length !== n) {
        ctx.addIssue({
          code: 'custom',
          path: ['restricciones', i, 'coeficientes'],
          message: `La restricción ${i + 1} debe tener ${n} coeficientes (uno por variable).`,
        });
      }
    });
  });

export type SimplexDualInput = z.input<typeof SimplexDualInputSchema>;

export function calcularSimplexDual(input: SimplexDualInput): SimplexDualResultado {
  const validado = SimplexDualInputSchema.parse(input);
  const n = validado.funcionObjetivo.length;
  const m = validado.restricciones.length;
  const tipos = validado.restricciones.map((r) => r.tipo);
  const A = validado.restricciones.map((r) => r.coeficientes);
  const b = validado.restricciones.map((r) => r.b);
  const objetivo = validado.objetivo as ObjetivoSimplex;
  const esMin = objetivo === 'min';

  const core = calcularSimplexDualCore(validado.funcionObjetivo, A, b, objetivo, tipos);
  const iteraciones = core.iteraciones.map((it) => iteracionDTO(it, esMin));

  const procesos: ProcesoCalculo[] = [];

  // 1) Forma estándar dual.
  const filasEstandar = tipos.map((t, i) => {
    if (t === 'LE') {
      return `\\sum_j a_{${i + 1}j} x_j + S_{${i + 1}} = ${b[i]}`;
    }
    if (t === 'GE') {
      return `-\\sum_j a_{${i + 1}j} x_j + E_{${i + 1}} = ${-b[i]}`;
    }
    return `-\\sum_j a_{${i + 1}j} x_j + E_{${i + 1}} = ${-b[i]},\\quad \\sum_j a_{${i + 1}j} x_j + S_{${i + 1}} = ${b[i]}`;
  });
  procesos.push(
    proceso({
      id: `dual-estandar-${n}-${m}`,
      titulo: 'Forma estándar para el Simplex Dual',
      simbolo: 'B^{-1}b \\le 0',
      formula: filasEstandar.join('\\\\ '),
      sustitucion:
        '\\text{Las restricciones } \\le \\text{ usan holguras } S_i;\\; \\ge \\text{ usan excesos } E_i;\\; = \\text{ se desdobla en } \\ge \\text{ y } \\le.',
      resultado: `\\text{Base inicial: } ${core.basicaFinal.length ? core.iteraciones[0].basica.join(', ') : ''}.`,
      tipoResultado: 'texto',
    })
  );

  if (core.estado === 'no-dual-factible') {
    procesos.push(
      proceso({
        id: 'dual-no-factible',
        titulo: 'Base inicial no dual-factible',
        simbolo: 'Z_j - C_j',
        formula:
          esMin
            ? '\\text{Para minimizar se requiere } c_j \\ge 0 \\;\\forall j \\text{ (con la base de holguras).}'
            : '\\text{Para maximizar se requiere } c_j \\le 0 \\;\\forall j \\text{ (con la base de holguras).}',
        sustitucion: `\\text{Costos normalizados: } c' = (${(esMin ? validado.funcionObjetivo : validado.funcionObjetivo.map((v) => -v)).join(', ')}).`,
        resultado: '\\text{El Simplex Dual no puede arrancar: la base inicial no es óptima para el dual.}',
        tipoResultado: 'texto',
      })
    );
  } else {
    iteraciones.forEach((it) => {
      const ratioTexto = it.ratios ? textoRatiosDual(it.ratios) : '';
      let sustitucion: string;
      let resultado: string;
      if (it.filaSaliente === null) {
        sustitucion = '\\text{Todos los valores básicos son } \\ge 0.';
        resultado = `\\text{Óptimo: } Z^* = ${it.zOriginal.tex}.`;
      } else if (it.columnaEntrante === null) {
        sustitucion = `\\text{Sale } ${it.variableSaliente} \\text{ (valor básico negativo) y no hay columnas con coeficiente } < 0.`;
        resultado = '\\text{El primal es infactible: el dual es no acotado.}';
      } else {
        sustitucion = `\\text{Sale } ${it.variableSaliente} \\text{ (b más negativo). Prueba dual: } ${ratioTexto}.`;
        resultado = `\\text{Entra } ${it.variableEntrante} \\text{ con pivote } ${it.pivote?.tex}.\\; Z = ${it.zOriginal.tex}.`;
      }
      procesos.push(
        proceso({
          id: `dual-iteracion-${it.iteracion}`,
          titulo: `Simplex Dual — Iteración ${it.iteracion}`,
          simbolo: 'x_B',
          formula: textoTableau(it),
          sustitucion,
          resultado,
          tipoResultado: 'texto',
        })
      );
    });

    procesos.push(
      proceso({
        id: 'dual-verificacion',
        titulo:
          core.estado === 'optimo'
            ? 'Verificación de factibilidad y optimalidad'
            : 'Diagnóstico de infactibilidad',
        simbolo: core.estado === 'optimo' ? 'Z^*' : '\\emptyset',
        formula:
          core.estado === 'optimo'
            ? `x^* = (${core.solucion.map((f) => f.toTex()).join(',\\; ')})`
            : '\\text{Fila saliente sin coeficientes negativos.}',
        sustitucion:
          core.estado === 'optimo'
            ? `Z^* = ${core.valorObjetivo.toTex()} \\quad (\\text{orientación original})`
            : '\\text{No se puede restaurar } x_B \\ge 0.',
        resultado:
          core.estado === 'optimo'
            ? '\\text{Todos los } b_i \\ge 0 \\text{ y todos los } Z_j - C_j \\le 0: \\text{ óptimo verificado.}'
            : '\\text{Problema infactible.}',
        tipoResultado: 'texto',
      })
    );
  }

  return {
    objetivo,
    n,
    m,
    estado: core.estado,
    mensaje: core.mensaje,
    variables: core.variables.slice(0, n),
    basicaFinal: core.basicaFinal,
    solucion: core.solucion.map(ff),
    holguras: core.holguras.map(ff),
    valorObjetivo: ff(core.valorObjetivo),
    iteraciones,
    procesos,
  };
}
