import { z } from 'zod';
import { proceso, type ProcesoCalculo } from '../../procesos';
import { Frac } from './fraction';
import {
  calcularSimplexCore,
  type ObjetivoSimplex,
  type IteracionTabular,
  type IteracionRevisada,
  type RazonSimplex,
  type RazonRevisado,
} from './simplex';

export const SimplexInputSchema = z
  .object({
    metodo: z.enum(['tabular', 'revisado']).default('tabular'),
    objetivo: z.enum(['max', 'min']).default('max'),
    funcionObjetivo: z
      .array(z.number().finite({ message: 'Los coeficientes de la función objetivo deben ser números finitos.' }))
      .min(1, { message: 'La función objetivo requiere al menos una variable.' }),
    restricciones: z
      .array(
        z.object({
          coeficientes: z.array(
            z.number().finite({ message: 'Los coeficientes de la restricción deben ser números finitos.' })
          ),
          tipo: z.enum(['LE', 'GE', 'EQ']).default('LE'),
          b: z.number().finite({ message: 'El término independiente (b) debe ser un número finito.' }),
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
      if (r.b < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['restricciones', i, 'b'],
          message: `El término independiente b de la restricción ${i + 1} debe ser ≥ 0.`,
        });
      }
      if (r.tipo !== 'LE') {
        ctx.addIssue({
          code: 'custom',
          path: ['restricciones', i, 'tipo'],
          message: `Las restricciones de tipo ≥ o = requieren el módulo "Dos Fases / Penalización". Este módulo solo admite restricciones ≤ con b ≥ 0.`,
        });
      }
    });
  });

export type SimplexInput = z.input<typeof SimplexInputSchema>;

/** Fracción exacta serializable como JSON (BigInt -> string). */
export interface FraccionJSON {
  num: string;
  den: string;
  tex: string;
  dec: string;
}

export interface RazonDTO {
  fila: number;
  variable: string;
  numerador: FraccionJSON;
  denominador: FraccionJSON;
  razon: FraccionJSON | null;
  descartada: boolean;
}

export interface TablaTabularDTO {
  iteracion: number;
  variables: string[];
  basica: string[];
  filas: FraccionJSON[][];
  rhs: FraccionJSON[];
  reducidos: FraccionJSON[];
  z: FraccionJSON;
  columnaEntrante: number | null;
  filaSaliente: number | null;
  pivote: FraccionJSON | null;
  ratios: RazonDTO[] | null;
}

export interface CostoReducidoDTO {
  variable: string;
  cj: FraccionJSON;
  cr: FraccionJSON;
  aj: FraccionJSON[];
}

export interface RazonRevisadoDTO {
  fila: number;
  variable: string;
  valorBase: FraccionJSON;
  d: FraccionJSON;
  razon: FraccionJSON | null;
  descartada: boolean;
}

export interface IteracionRevisadaDTO {
  iteracion: number;
  basica: string[];
  B: FraccionJSON[][];
  BInv: FraccionJSON[][];
  cB: FraccionJSON[];
  y: FraccionJSON[];
  bi: FraccionJSON[];
  costosReducidos: CostoReducidoDTO[];
  columnaEntrante: number | null;
  variableEntrante: string | null;
  d: FraccionJSON[];
  ratios: RazonRevisadoDTO[] | null;
  filaSaliente: number | null;
  variableSaliente: string | null;
  z: FraccionJSON;
}

export interface SimplexResultado {
  metodo: 'tabular' | 'revisado';
  objetivo: ObjetivoSimplex;
  n: number;
  m: number;
  estado: 'optimo' | 'no-acotado';
  variables: string[];
  basicaFinal: string[];
  solucion: FraccionJSON[];
  holguras: FraccionJSON[];
  valorObjetivo: FraccionJSON;
  tablas: TablaTabularDTO[];
  revisado: IteracionRevisadaDTO[];
  procesos: ProcesoCalculo[];
}

function ff(f: Frac): FraccionJSON {
  return { num: f.num.toString(), den: f.den.toString(), tex: f.toTex(), dec: f.toDec() };
}

function razonDTO(r: RazonSimplex): RazonDTO {
  return {
    fila: r.fila,
    variable: r.variable,
    numerador: ff(r.numerador),
    denominador: ff(r.denominador),
    razon: r.razon ? ff(r.razon) : null,
    descartada: r.descartada,
  };
}

function razonRevisadoDTO(r: RazonRevisado): RazonRevisadoDTO {
  return {
    fila: r.fila,
    variable: r.variable,
    valorBase: ff(r.valorBase),
    d: ff(r.d),
    razon: r.razon ? ff(r.razon) : null,
    descartada: r.descartada,
  };
}

function matrizDTO(M: Frac[][]): FraccionJSON[][] {
  return M.map((fil) => fil.map(ff));
}

function tablaDTO(t: IteracionTabular): TablaTabularDTO {
  return {
    iteracion: t.iteracion,
    variables: [...t.variables],
    basica: [...t.basica],
    filas: matrizDTO(t.filas),
    rhs: t.rhs.map(ff),
    reducidos: t.reducidos.map(ff),
    z: ff(t.z),
    columnaEntrante: t.columnaEntrante,
    filaSaliente: t.filaSaliente,
    pivote: t.pivote ? ff(t.pivote) : null,
    ratios: t.ratios ? t.ratios.map(razonDTO) : null,
  };
}

function revisadoDTO(it: IteracionRevisada): IteracionRevisadaDTO {
  return {
    iteracion: it.iteracion,
    basica: [...it.basica],
    B: matrizDTO(it.B),
    BInv: matrizDTO(it.BInv),
    cB: it.cB.map(ff),
    y: it.y.map(ff),
    bi: it.bi.map(ff),
    costosReducidos: it.costosReducidos.map((cr) => ({
      variable: cr.variable,
      cj: ff(cr.cj),
      cr: ff(cr.cr),
      aj: cr.aj.map(ff),
    })),
    columnaEntrante: it.columnaEntrante,
    variableEntrante: it.variableEntrante,
    d: it.d.map(ff),
    ratios: it.ratios ? it.ratios.map(razonRevisadoDTO) : null,
    filaSaliente: it.filaSaliente,
    variableSaliente: it.variableSaliente,
    z: ff(it.z),
  };
}

function celda(f: FraccionJSON, destacar: boolean): string {
  return destacar ? `{\\color{red} ${f.tex}}` : f.tex;
}

function textoTableau(t: TablaTabularDTO): string {
  const cols = t.variables.length;
  const encabezado = [
    '',
    ...t.variables.map((v, j) =>
      t.columnaEntrante === j ? `{\\color{blue} ${v}}` : v
    ),
    'b',
  ];
  const lineas: string[] = [encabezado.join(' & ')];
  t.filas.forEach((fila, i) => {
    const celdas = fila.map((f, j) => celda(f, i === t.filaSaliente && j === t.columnaEntrante));
    lineas.push(`${t.basica[i]} & ${celdas.join(' & ')} & ${t.rhs[i].tex}`);
  });
  const reducida = t.reducidos.map((f) => f.tex).join(' & ');
  lineas.push(`Z_j - C_j & ${reducida} & ${t.z.tex}`);
  return `\\text{Tableau}_{${t.iteracion}} = \\begin{array}{c|${'c'.repeat(cols)}|c} ${lineas.join(
    ' \\\\ \\hline '
  )} \\end{array}`;
}

function textoRatios(ratios: RazonDTO[]): string {
  return ratios
    .map((r) => {
      if (r.descartada) {
        const motivo = r.denominador.tex.startsWith('-')
          ? `${r.variable}: \\text{den. negativo}\\to\\text{descarta}`
          : `${r.variable}: \\text{den. cero}\\to\\text{descarta}`;
        return motivo;
      }
      return `${r.numerador.tex}/${r.denominador.tex}=${r.razon!.tex}`;
    })
    .join(',\\;\\;');
}

function matTex(M: FraccionJSON[][]): string {
  const filas = M.map((fil) => fil.map((f) => f.tex).join(' & '));
  return `\\begin{bmatrix} ${filas.join(' \\\\ ')} \\end{bmatrix}`;
}

function vecTex(v: FraccionJSON[]): string {
  return `\\begin{bmatrix} ${v.map((f) => f.tex).join(' \\\\ ')} \\end{bmatrix}`;
}

function procsEstadizacion(n: number, m: number): ProcesoCalculo[] {
  const lineas: string[] = [];
  for (let i = 0; i < m; i++) {
    lineas.push(`\\sum_{j=1}^{n} a_{${i + 1}j}\\,x_j + S_{${i + 1}} = b_{${i + 1}}`);
  }
  return [
    proceso({
      id: `simplex-estandarizacion-${n}-${m}`,
      titulo: 'Estandarización',
      simbolo: 'S_i',
      formula: lineas.join('\\\\ '),
      sustitucion: `\\text{Como } b_i \\ge 0 \\text{ y todas las restricciones son } \\le, \\text{ se agregan } ${m} \\text{ variables de holgura } S_1,\\ldots,S_{${m}}.`,
      resultado: `\\text{Base inicial: } ${Array.from({ length: m }, (_, i) => `S_{${i + 1}}`).join(', ')}.`,
      tipoResultado: 'texto',
    }),
  ];
}

export function calcularSimplex(input: SimplexInput): SimplexResultado {
  const validado = SimplexInputSchema.parse(input);
  const n = validado.funcionObjetivo.length;
  const m = validado.restricciones.length;
  const A = validado.restricciones.map((r) => r.coeficientes);
  const b = validado.restricciones.map((r) => r.b);

  const core = calcularSimplexCore(
    validado.funcionObjetivo,
    A,
    b,
    validado.objetivo as ObjetivoSimplex,
    validado.metodo
  );

  const tablas = core.tablas.map(tablaDTO);
  const revisado = core.revisado.map(revisadoDTO);

  const procesos: ProcesoCalculo[] = [...procsEstadizacion(n, m)];

  if (validado.metodo === 'tabular') {
    tablas.forEach((t, idx) => {
      const entrante = t.variables[t.columnaEntrante!] ? t.variables[t.columnaEntrante!] : null;
      procesos.push(
        proceso({
          id: `simplex-tabular-${t.iteracion}`,
          titulo: `Tableau — Iteración ${t.iteracion}`,
          simbolo: `T_{${t.iteracion}}`,
          formula: textoTableau(t),
          sustitucion: t.ratios
            ? `\\text{Entra } ${entrante ?? '\\text{—'}}\\; (\\text{criterio } Z_j - C_j). \\text{Razones: } ${textoRatios(t.ratios)}`
            : `\\text{Tableau inicial (sin pivoteo).}`,
          resultado:
            t.iteracion === tablas.length - 1 && core.estado === 'optimo'
              ? `\\text{Óptimo encontrado: } Z^* = ${t.z.tex}.`
              : `Z = ${t.z.tex}.`,
          tipoResultado: 'texto',
        })
      );
    });
  } else {
    revisado.forEach((it) => {
      const yTex = `\\begin{bmatrix} ${it.cB.map((f) => f.tex).join(' & ')} \\end{bmatrix} \\cdot ${matTex(
      it.BInv
    )} = ${vecTex(it.y)}`;
      const cr = it.costosReducidos
        .filter((c) => !it.basica.includes(c.variable))
        .map((c) => `${c.variable}: ${c.cr.tex}`)
        .join(',\\;\\;');
      const ratios = it.ratios
        ? textoRatios(
            it.ratios.map((r) => ({
              fila: r.fila,
              variable: r.variable,
              numerador: r.valorBase,
              denominador: r.d,
              razon: r.razon,
              descartada: r.descartada,
            }))
          )
        : '';
      procesos.push(
        proceso({
          id: `simplex-revisado-${it.iteracion}`,
          titulo: `Revisado — Iteración ${it.iteracion}`,
          simbolo: 'B^{-1}',
          formula: `y^T = c_B B^{-1} = ${yTex}`,
          sustitucion: `\\bar{c}_j = c_j - y^T A_j:\\; ${cr}.`,
          resultado:
            it.columnaEntrante === null
              ? `\\text{Óptimo (sin costos reducidos que mejorar): } Z^* = ${it.z.tex}.`
              : `\\text{Entra } ${it.variableEntrante};\\; d = B^{-1}A_e = ${vecTex(it.d)}.\\; ${ratios}.\\; \\text{Sale } ${it.variableSaliente};\\; Z = ${it.z.tex}.`,
          tipoResultado: 'texto',
        })
      );
    });
  }

  if (core.estado === 'no-acotado') {
    procesos.push(
      proceso({
        id: 'simplex-no-acotado',
        titulo: 'Problema no acotado',
        simbolo: '\\infty',
        formula: `\\text{Sin razones válidas: todos los } a_{ie} \\le 0 \\Rightarrow Z \\to \\infty.`,
        sustitucion: '\\text{La columna entrante no tiene denominadores positivos.}',
        resultado: '\\text{El problema no está acotado.}',
        tipoResultado: 'texto',
      })
    );
  }

  return {
    metodo: validado.metodo,
    objetivo: validado.objetivo as ObjetivoSimplex,
    n,
    m,
    estado: core.estado,
    variables: core.variables.slice(0, n),
    basicaFinal: core.basicaFinal,
    solucion: core.solucion.map(ff),
    holguras: core.holguras.map(ff),
    valorObjetivo: ff(core.valorObjetivo),
    tablas,
    revisado,
    procesos,
  };
}