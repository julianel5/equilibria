import { z } from 'zod';
import { entradaExacta } from '../simplex/entradaExacta';
import { proceso, type ProcesoCalculo } from '../../procesos';
import { Frac } from '../simplex/fraction';
import type { FraccionJSON } from '../simplex/simplex.service';
import {
  resolverLemke,
  type ComplementariedadLemke,
  type EstadoLemke,
  type IteracionLemke,
  type RazonLemke,
} from './lemke';

export interface RazonLemkeDTO {
  fila: number;
  variable: string;
  valorBase: FraccionJSON;
  coeficiente: FraccionJSON;
  razon: FraccionJSON | null;
  descartada: boolean;
}

export interface IteracionLemkeDTO {
  iteracion: number;
  variables: string[];
  basica: string[];
  filas: FraccionJSON[][];
  rhs: FraccionJSON[];
  entra: number | null;
  sale: number | null;
  pivote: FraccionJSON | null;
  ratios: RazonLemkeDTO[] | null;
  paso: IteracionLemke['paso'];
  nota: string;
}

export interface ComplementariedadDTO {
  indice: number;
  z: FraccionJSON;
  w: FraccionJSON;
  producto: FraccionJSON;
}

export interface QPResumenDTO {
  n: number;
  m: number;
  x: FraccionJSON[];
  lambda: FraccionJSON[];
  /** s = A x - b (holgura de cada restricción). */
  holguras: FraccionJSON[];
  valorObjetivo: FraccionJSON;
}

export interface LemkeResultado {
  tipo: 'lcp' | 'qp';
  estado: EstadoLemke;
  mensaje: string;
  tamanoLCP: number;
  variables: string[];
  z: FraccionJSON[];
  w: FraccionJSON[];
  residuo: FraccionJSON[];
  complementariedad: ComplementariedadDTO[];
  verifica: boolean;
  iteraciones: IteracionLemkeDTO[];
  procesos: ProcesoCalculo[];
  lcp: { M: FraccionJSON[][]; q: FraccionJSON[] };
  qp: QPResumenDTO | null;
}

function ff(f: Frac): FraccionJSON {
  return { num: f.num.toString(), den: f.den.toString(), tex: f.toTex(), dec: f.toDec() };
}

function ffVec(v: Frac[]): FraccionJSON[] {
  return v.map(ff);
}

function ffMat(M: Frac[][]): FraccionJSON[][] {
  return M.map((fila) => fila.map(ff));
}

function razonDTO(r: RazonLemke): RazonLemkeDTO {
  return {
    fila: r.fila,
    variable: r.variable,
    valorBase: ff(r.valorBase),
    coeficiente: ff(r.coeficiente),
    razon: r.razon ? ff(r.razon) : null,
    descartada: r.descartada,
  };
}

function iteracionDTO(it: IteracionLemke): IteracionLemkeDTO {
  return {
    iteracion: it.iteracion,
    variables: [...it.variables],
    basica: [...it.basica],
    filas: ffMat(it.filas),
    rhs: ffVec(it.rhs),
    entra: it.entra,
    sale: it.sale,
    pivote: it.pivote ? ff(it.pivote) : null,
    ratios: it.ratios ? it.ratios.map(razonDTO) : null,
    paso: it.paso,
    nota: it.nota,
  };
}

function matTex(M: FraccionJSON[][]): string {
  const filas = M.map((fila) => fila.map((f) => f.tex).join(' & '));
  return `\\begin{bmatrix} ${filas.join(' \\\\ ')} \\end{bmatrix}`;
}

function vecTex(v: FraccionJSON[]): string {
  return `\\begin{bmatrix} ${v.map((f) => f.tex).join(' \\\\ ')} \\end{bmatrix}`;
}

function textoTableau(t: IteracionLemkeDTO): string {
  const cols = t.variables.length;
  const encabezado = [
    '',
    ...t.variables.map((v, j) => (t.entra === j ? `\\htmlClass{math-entrante}{${v}}` : v)),
    'b',
  ];
  const lineas: string[] = [encabezado.join(' & ')];
  t.filas.forEach((fila, i) => {
    const celdas = fila.map((f, j) =>
      i === t.sale && j === t.entra ? `\\htmlClass{math-pivote}{${f.tex}}` : f.tex
    );
    lineas.push(`${t.basica[i]} & ${celdas.join(' & ')} & ${t.rhs[i].tex}`);
  });
  return `\\text{Tableau}_{${t.iteracion}} = \\begin{array}{c|${'c'.repeat(cols)}|c} ${lineas.join(
    ' \\\\ \\hline '
  )} \\end{array}`;
}

function textoRatios(ratios: RazonLemkeDTO[]): string {
  return ratios
    .filter((r) => !r.descartada)
    .map((r) => `${r.valorBase.tex}/${r.coeficiente.tex}=${r.razon!.tex}`)
    .join(',\\;\\;');
}

/** LDLᵀ exacta: un pivote cero en una PSD exige fila y columna residuales nulas. */
function esSemidefinidaPositiva(Q: Frac[][]): boolean {
  const resto = Q.map(fila => [...fila]);
  for (let k = 0; k < resto.length; k++) {
    const pivote = resto[k][k];
    if (pivote.esNegativo) return false;
    if (pivote.esCero) {
      if (resto[k].slice(k + 1).some(v => !v.esCero)) return false;
      continue;
    }
    for (let i = k + 1; i < resto.length; i++) {
      for (let j = i; j < resto.length; j++) {
        const valor = resto[i][j].sub(resto[i][k].mul(resto[k][j]).div(pivote));
        resto[i][j] = resto[j][i] = valor;
      }
    }
  }
  return true;
}

export const LemkeInputSchema = z
  .object({
    tipo: z.enum(['lcp', 'qp']).default('lcp'),
    /** LCP: matriz M (n×n). */
    M: z.array(z.array(entradaExacta)).optional(),
    /** LCP: vector q (n). */
    q: z.array(entradaExacta).optional(),
    /** QP: matriz Q (n×n) de la forma cuadrática. */
    Q: z.array(z.array(entradaExacta)).optional(),
    /** QP: vector c (n). */
    c: z.array(entradaExacta).optional(),
    /** QP: matriz A (m×n) de restricciones A x ≥ b. */
    A: z.array(z.array(entradaExacta)).optional(),
    /** QP: vector b (m). */
    b: z.array(entradaExacta).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'lcp') {
      if (!data.M) {
        ctx.addIssue({ code: 'custom', path: ['M'], message: 'El LCP requiere la matriz M.' });
        return;
      }
      if (!data.q) {
        ctx.addIssue({ code: 'custom', path: ['q'], message: 'El LCP requiere el vector q.' });
        return;
      }
      const n = data.M.length;
      if (n < 1) {
        ctx.addIssue({ code: 'custom', path: ['M'], message: 'M debe tener al menos una fila.' });
      }
      if (n > 20) {
        ctx.addIssue({ code: 'custom', path: ['M'], message: 'El tamaño máximo del LCP es 20.' });
      }
      data.M.forEach((fila, i) => {
        if (fila.length !== n) {
          ctx.addIssue({
            code: 'custom',
            path: ['M', i],
            message: `La fila ${i + 1} de M debe tener ${n} coeficientes.`,
          });
        }
      });
      if (data.q.length !== n) {
        ctx.addIssue({
          code: 'custom',
          path: ['q'],
          message: `q debe tener ${n} componentes (una por fila de M).`,
        });
      }
      return;
    }

    // QP
    if (!data.Q) {
      ctx.addIssue({ code: 'custom', path: ['Q'], message: 'El QP requiere la matriz Q.' });
      return;
    }
    if (!data.c) {
      ctx.addIssue({ code: 'custom', path: ['c'], message: 'El QP requiere el vector c.' });
      return;
    }
    const n = data.Q.length;
    if (n < 1) {
      ctx.addIssue({ code: 'custom', path: ['Q'], message: 'Q debe tener al menos una fila.' });
    }
    if (n > 20) {
      ctx.addIssue({ code: 'custom', path: ['Q'], message: 'El número de variables máximo es 20.' });
    }
    data.Q.forEach((fila, i) => {
      if (fila.length !== n) {
        ctx.addIssue({
          code: 'custom',
          path: ['Q', i],
          message: `La fila ${i + 1} de Q debe tener ${n} coeficientes.`,
        });
      }
    });
    if (data.c.length !== n) {
      ctx.addIssue({
        code: 'custom',
        path: ['c'],
        message: `c debe tener ${n} componentes.`,
      });
    }
    if (n <= 20 && data.Q.every(fila => fila.length === n && fila.every(v => v instanceof Frac))) {
      const Q = data.Q;
      if (!Q.every((fila, i) => fila.every((v, j) => v.equals(Q[j][i])))) {
        ctx.addIssue({ code: 'custom', path: ['Q'], message: 'Q debe ser simétrica para construir las condiciones KKT.' });
      } else if (!esSemidefinidaPositiva(Q)) {
        ctx.addIssue({ code: 'custom', path: ['Q'], message: 'El problema es no convexo: Q debe ser semidefinida positiva.' });
      }
    }
    const A = data.A ?? [];
    const b = data.b ?? [];
    if (b.length > 0 && A.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['A'],
        message: 'Si se indica b, también se debe indicar A.',
      });
    }
    A.forEach((fila, i) => {
      if (fila.length !== n) {
        ctx.addIssue({
          code: 'custom',
          path: ['A', i],
          message: `La fila ${i + 1} de A debe tener ${n} coeficientes.`,
        });
      }
    });
    if (b.length !== A.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['b'],
        message: `b debe tener ${A.length} componentes (una por restricción).`,
      });
    }
  });

export type LemkeInput = z.input<typeof LemkeInputSchema>;

function construirLCPQp(
  Q: Frac[][],
  c: Frac[],
  A: Frac[][],
  b: Frac[]
): { M: Frac[][]; q: Frac[] } {
  const n = Q.length;
  const m = A.length;
  const N = n + m;
  const M: Frac[][] = Array.from({ length: N }, () => new Array<Frac>(N).fill(Frac.CERO));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) M[i][j] = Q[i][j];
  }
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) M[i][n + k] = A[k][i].neg();
  }
  for (let k = 0; k < m; k++) {
    for (let j = 0; j < n; j++) M[n + k][j] = A[k][j];
  }
  const q: Frac[] = [
    ...c,
    ...b.map((v) => v.neg()),
  ];
  return { M, q };
}

function objetivoQP(Q: Frac[][], c: Frac[], x: Frac[]): Frac {
  const medio = new Frac(1, 2);
  let z = Frac.CERO;
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < x.length; j++) {
      if (Q[i][j].esCero || x[i].esCero || x[j].esCero) continue;
      z = z.add(x[i].mul(Q[i][j]).mul(x[j]).mul(medio));
    }
  }
  for (let i = 0; i < x.length; i++) z = z.add(c[i].mul(x[i]));
  return z;
}

export function calcularLemke(input: LemkeInput): LemkeResultado {
  const validado = LemkeInputSchema.parse(input);
  const tipo = validado.tipo;

  let M: Frac[][];
  let q: Frac[];
  let QF: Frac[][] = [];
  let cF: Frac[] = [];
  let AF: Frac[][] = [];
  let bF: Frac[] = [];

  if (tipo === 'lcp') {
    M = validado.M!;
    q = validado.q!;
  } else {
    QF = validado.Q!;
    cF = validado.c!;
    AF = validado.A ?? [];
    bF = validado.b ?? [];
    const lcp = construirLCPQp(QF, cF, AF, bF);
    M = lcp.M;
    q = lcp.q;
  }

  const core = resolverLemke(M, q);
  const iteraciones = core.iteraciones.map(iteracionDTO);
  const procesos: ProcesoCalculo[] = [];

  if (tipo === 'qp') {
    const n = validado.Q!.length;
    const m = (validado.A ?? []).length;
    procesos.push(
      proceso({
        id: 'lemke-qp-lcp',
        titulo: 'Condiciones KKT → LCP',
        simbolo: 'w = Mz + q',
        formula:
          '\\min\\; \\tfrac{1}{2}x^{T}Qx + c^{T}x \\quad \\text{s.a.}\\; Ax \\ge b,\\; x \\ge 0',
        sustitucion:
          `z = \\begin{bmatrix} x \\\\ \\lambda \\end{bmatrix},\\quad ` +
          `w = \\begin{bmatrix} Qx + c - A^{T}\\lambda \\\\ Ax - b \\end{bmatrix},\\quad ` +
          `M = \\begin{bmatrix} Q & -A^{T} \\\\ A & 0 \\end{bmatrix},\\; q = \\begin{bmatrix} c \\\\ -b \\end{bmatrix}.`,
        resultado: `M = ${matTex(ffMat(M))},\\quad q = ${vecTex(ffVec(q))}.`,
        tipoResultado: 'texto',
      })
    );
  }

  iteraciones.forEach((it) => {
    const ratios = it.ratios ? textoRatios(it.ratios) : '';
    let sustitucion: string;
    if (it.entra === null) {
      sustitucion = '\\text{Fin del pivoteo complementario.}';
    } else if (it.sale === null) {
      sustitucion = `\\text{Entra } ${it.variables[it.entra]}:\\; \\text{no hay coeficientes positivos.}`;
    } else {
      sustitucion = `\\text{Entra } ${it.variables[it.entra]},\\; \\text{sale } ${it.basica[it.sale]}.\\; \\text{Razones: } ${ratios}.`;
    }
    procesos.push(
      proceso({
        id: `lemke-iteracion-${it.iteracion}`,
        titulo: `Lemke — Iteración ${it.iteracion}`,
        simbolo: 'z_0',
        formula: textoTableau(it),
        sustitucion,
        resultado: it.nota,
        tipoResultado: 'texto',
      })
    );
  });

  let qp: QPResumenDTO | null = null;
  if (tipo === 'qp') {
    const n = validado.Q!.length;
    const m = (validado.A ?? []).length;
    const x = core.z.slice(0, n);
    const lambda = core.z.slice(n, n + m);
    const holguras = core.w.slice(n, n + m);
    const valor = objetivoQP(QF, cF, x);
    qp = {
      n,
      m,
      x: ffVec(x),
      lambda: ffVec(lambda),
      holguras: ffVec(holguras),
      valorObjetivo: ff(valor),
    };

    // Verificación de la estacionariedad: Qx + c - A^T λ - μ = 0.
    const mu = core.w.slice(0, n);
    const gradiente: Frac[] = [];
    for (let i = 0; i < n; i++) {
      let g = cF[i];
      for (let j = 0; j < n; j++) g = g.add(QF[i][j].mul(x[j]));
      for (let k = 0; k < m; k++) g = g.sub(AF[k][i].mul(lambda[k]));
      gradiente.push(g.sub(mu[i]));
    }
    procesos.push(
      proceso({
        id: 'lemke-qp-verificacion',
        titulo: 'Verificación de las condiciones KKT',
        simbolo: '\\mu',
        formula:
          '\\mu = Qx + c - A^{T}\\lambda \\ge 0,\\quad s = Ax - b \\ge 0,\\quad ' +
          '\\mu^{T}x = 0,\\quad \\lambda^{T}s = 0.',
        sustitucion:
          `x = ${vecTex(qp.x)},\\; \\lambda = ${vecTex(qp.lambda)},\\; ` +
          `\\mu = ${vecTex(ffVec(mu))},\\; s = ${vecTex(qp.holguras)}.`,
        resultado:
          `\\text{Estacionariedad } Qx + c - A^{T}\\lambda - \\mu = 0:\\; ` +
          `${vecTex(ffVec(gradiente))}.\\quad Z^* = ${qp.valorObjetivo.tex}.`,
        tipoResultado: 'texto',
      })
    );
  }

  const complementariedad: ComplementariedadDTO[] = core.complementariedad.map(
    (c: ComplementariedadLemke) => ({
      indice: c.indice,
      z: ff(c.z),
      w: ff(c.w),
      producto: ff(c.producto),
    })
  );

  if (core.estado === 'solucion') {
    procesos.push(
      proceso({
        id: 'lemke-verificacion',
        titulo: 'Solución complementaria',
        simbolo: 'w^{T}z = 0',
        formula: `z = ${vecTex(ffVec(core.z))},\\quad w = ${vecTex(ffVec(core.w))}`,
        sustitucion: `w - (Mz + q) = ${vecTex(ffVec(core.residuo))}`,
        resultado: core.verifica
          ? '\\text{Se verifican } w = Mz + q,\\; w,z \\ge 0 \\text{ y } w^{T}z = 0.'
          : '\\text{La solución no verifica todas las condiciones; revisa los datos.}',
        tipoResultado: 'texto',
      })
    );
  } else if (core.estado === 'rayo-inconcluso') {
    procesos.push(
      proceso({
        id: 'lemke-sin-solucion',
        titulo: 'Terminación por rayo (inconcluso)',
        simbolo: '\\infty',
        formula: '\\text{La columna entrante no tiene coeficientes positivos.}',
        sustitucion: '\\text{No se puede continuar el pivoteo complementario.}',
        resultado:
          '\\text{Esta trayectoria no encontró una solución; no demuestra que no exista.}',
        tipoResultado: 'texto',
      })
    );
  } else {
    procesos.push(proceso({
      id: 'lemke-limite-iteraciones',
      titulo: 'Límite de iteraciones (inconcluso)',
      simbolo: '',
      formula: '\\text{Se agotaron los pivotes permitidos.}',
      sustitucion: `\\text{Iteraciones registradas: } ${core.iteraciones.length}.`,
      resultado: '\\text{No se certificó una solución complementaria.}',
      tipoResultado: 'texto',
    }));
  }

  return {
    tipo,
    estado: core.estado,
    mensaje: core.mensaje,
    tamanoLCP: core.n,
    variables: core.variables,
    z: ffVec(core.z),
    w: ffVec(core.w),
    residuo: ffVec(core.residuo),
    complementariedad,
    verifica: core.verifica,
    iteraciones,
    procesos,
    lcp: { M: ffMat(M), q: ffVec(q) },
    qp,
  };
}
