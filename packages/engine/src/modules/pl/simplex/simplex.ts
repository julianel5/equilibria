import { Frac } from './fraction';

export type ObjetivoSimplex = 'max' | 'min';

/**
 * Prueba de la razón mínima desglosada por fila: incluye el numerador (RHS de
 * la fila), el denominador (coeficiente en la columna entrante) y, cuando el
 * denominador es <= 0, el motivo por el que se descarta.
 */
export interface RazonSimplex {
  fila: number;
  variable: string;
  numerador: Frac;
  denominador: Frac;
  razon: Frac | null;
  descartada: boolean;
}

export interface IteracionTabular {
  iteracion: number;
  variables: string[];
  basica: string[];
  filas: Frac[][];
  rhs: Frac[];
  reducidos: Frac[];
  z: Frac;
  columnaEntrante: number | null;
  filaSaliente: number | null;
  pivote: Frac | null;
  ratios: RazonSimplex[] | null;
}

export interface CostoReducidoRevisado {
  variable: string;
  cj: Frac;
  cr: Frac;
  aj: Frac[];
}

export interface RazonRevisado {
  fila: number;
  variable: string;
  valorBase: Frac;
  d: Frac;
  razon: Frac | null;
  descartada: boolean;
}

export interface IteracionRevisada {
  iteracion: number;
  basica: string[];
  B: Frac[][];
  BInv: Frac[][];
  cB: Frac[];
  y: Frac[];
  bi: Frac[];
  costosReducidos: CostoReducidoRevisado[];
  columnaEntrante: number | null;
  variableEntrante: string | null;
  d: Frac[];
  ratios: RazonRevisado[] | null;
  filaSaliente: number | null;
  variableSaliente: string | null;
  z: Frac;
}

export interface ResultadoSimplexCore {
  estado: 'optimo' | 'no-acotado';
  variables: string[];
  solucion: Frac[];
  holguras: Frac[];
  basicaFinal: string[];
  valorObjetivo: Frac;
  tablas: IteracionTabular[];
  revisado: IteracionRevisada[];
}

const LIMITE_ITERACIONES = 200;

function nombresVariables(n: number, m: number): string[] {
  const vars: string[] = [];
  for (let j = 0; j < n; j++) vars.push(`x_{${j + 1}}`);
  for (let i = 0; i < m; i++) vars.push(`S_{${i + 1}}`);
  return vars;
}

function clonarMatriz(M: Frac[][]): Frac[][] {
  return M.map((fil) => fil.map((v) => v));
}

/** Inversa exacta por Gauss-Jordan (solo lectura, no modifica M). */
function inversa(M: Frac[][]): Frac[][] {
  const n = M.length;
  if (n === 0) return [];
  const A = M.map((fil) => [...fil]);
  const inv = Array.from({ length: n }, (_, i) => {
    const fil = new Array<Frac>(n).fill(Frac.CERO);
    fil[i] = Frac.UNO;
    return fil;
  });
  for (let col = 0; col < n; col++) {
    let piv = -1;
    for (let fil = col; fil < n; fil++) {
      if (!A[fil][col].esCero) {
        piv = fil;
        break;
      }
    }
    if (piv === -1) throw new Error('Matriz singular: no se puede invertir la base');
    if (piv !== col) {
      [A[piv], A[col]] = [A[col], A[piv]];
      [inv[piv], inv[col]] = [inv[col], inv[piv]];
    }
    const p = A[col][col];
    for (let j = 0; j < n; j++) {
      A[col][j] = A[col][j].div(p);
      inv[col][j] = inv[col][j].div(p);
    }
    for (let fil = 0; fil < n; fil++) {
      if (fil === col) continue;
      const factor = A[fil][col];
      if (factor.esCero) continue;
      for (let j = 0; j < n; j++) {
        A[fil][j] = A[fil][j].sub(factor.mul(A[col][j]));
        inv[fil][j] = inv[fil][j].sub(factor.mul(inv[col][j]));
      }
    }
  }
  return inv;
}

function matMul(A: Frac[][], B: Frac[][]): Frac[][] {
  const filas = A.length;
  const comunes = B.length;
  const cols = B[0]?.length ?? 0;
  const C: Frac[][] = [];
  for (let i = 0; i < filas; i++) {
    const fil = new Array<Frac>(cols).fill(Frac.CERO);
    for (let k = 0; k < comunes; k++) {
      if (A[i][k].esCero) continue;
      for (let j = 0; j < cols; j++) {
        fil[j] = fil[j].add(A[i][k].mul(B[k][j]));
      }
    }
    C.push(fil);
  }
  return C;
}

function matVec(A: Frac[][], v: Frac[]): Frac[] {
  return A.map((fil) =>
    fil.reduce((acc, f, j) => (f.esCero ? acc : acc.add(f.mul(v[j]))), Frac.CERO)
  );
}

function columnaDe(A: Frac[][], j: number): Frac[] {
  return A.map((fil) => fil[j]);
}

/** Selecciona la columna entrante según el criterio de optimalidad Z_j - C_j. */
function columnaEntrante(reducidos: Frac[], objetivo: ObjetivoSimplex): number | null {
  let mejor = -1;
  let mejorValor: Frac | null = null;
  for (let j = 0; j < reducidos.length; j++) {
    const v = reducidos[j];
    if (v.esCero) continue;
    if (objetivo === 'max' ? v.esNegativo : v.esPositivo) {
      const mejorQueMejor =
        mejor === -1 ||
        (objetivo === 'max' ? v.cmp(mejorValor!) < 0 : v.cmp(mejorValor!) > 0);
      if (mejorQueMejor) {
        mejor = j;
        mejorValor = v;
      }
    }
  }
  return mejor === -1 ? null : mejor;
}

function pruebaRazon(
  filas: Frac[][],
  rhs: Frac[],
  basica: string[],
  col: number
): { ratios: RazonSimplex[]; saliente: number | null } {
  const ratios: RazonSimplex[] = filas.map((fila, i) => {
    const den = fila[col];
    const base = rhs[i];
    if (den.signo <= 0) {
      return {
        fila: i,
        variable: basica[i],
        numerador: base,
        denominador: den,
        razon: null,
        descartada: true,
      };
    }
    return {
      fila: i,
      variable: basica[i],
      numerador: base,
      denominador: den,
      razon: base.div(den),
      descartada: false,
    };
  });
  const activos = ratios.filter((r) => !r.descartada);
  if (activos.length === 0) return { ratios, saliente: null };
  let saliente = activos[0].fila;
  for (let k = 1; k < activos.length; k++) {
    const cmp = activos[k].razon!.cmp(ratios[saliente].razon!);
    if (cmp < 0 || (cmp === 0 && activos[k].fila < saliente)) saliente = activos[k].fila;
  }
  return { ratios, saliente };
}

function resolverTabular(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex
): { estado: 'optimo' | 'no-acotado'; tablas: IteracionTabular[]; basicaFinal: string[]; indices: number[]; solucion: Frac[]; z: Frac } {
  const n = c.length;
  const m = A.length;
  const tot = n + m;
  const variables = nombresVariables(n, m);

  let filas = A.map((fila, i) => {
    const fil: Frac[] = new Array(tot).fill(Frac.CERO);
    for (let j = 0; j < n; j++) fil[j] = Frac.deDecimal(fila[j]);
    fil[n + i] = Frac.UNO;
    return fil;
  });

  let rhs = b.map((v) => Frac.deDecimal(v));
  let reducidos = new Array<Frac>(tot).fill(Frac.CERO);
  for (let j = 0; j < n; j++) reducidos[j] = Frac.deDecimal(c[j]).neg();
  let z = Frac.CERO;

  const basica = variables.slice(n);
  const indices: number[] = [];
  for (let i = 0; i < m; i++) indices.push(n + i);

  const tablas: IteracionTabular[] = [];
  const snap = (iter: number, extra: { e: number; sal: number; pivote: Frac; ratios: RazonSimplex[] } | null): IteracionTabular => ({
    iteracion: iter,
    variables: [...variables],
    basica: [...basica],
    filas: clonarMatriz(filas),
    rhs: [...rhs],
    reducidos: [...reducidos],
    z,
    columnaEntrante: extra ? extra.e : null,
    filaSaliente: extra ? extra.sal : null,
    pivote: extra ? extra.pivote : null,
    ratios: extra ? extra.ratios : null,
  });
  tablas.push(snap(0, null));

  let estado: 'optimo' | 'no-acotado' = 'optimo';
  for (let iter = 1; iter <= LIMITE_ITERACIONES; iter++) {
    const e = columnaEntrante(reducidos, objetivo);
    if (e === null) break;

    const { ratios, saliente } = pruebaRazon(filas, rhs, basica, e);
    if (saliente === null) {
      estado = 'no-acotado';
      tablas.push(snap(iter, { e, sal: -1, pivote: Frac.CERO, ratios }));
      break;
    }

    const r = saliente;
    const p = filas[r][e];
    const np = filas[r].map((v) => v.div(p));
    const npRhs = rhs[r].div(p);
    const coefObj = reducidos[e];

    const filasViejas = filas;
    filas = filasViejas.map((fila, k) =>
      k === r ? np : fila.map((v, j) => v.sub(np[j].mul(filasViejas[k][e])))
    );
    const rhsViejos = rhs;
    rhs = rhsViejos.map((bb, k) =>
      k === r ? npRhs : bb.sub(npRhs.mul(filasViejas[k][e]))
    );
    reducidos = reducidos.map((v, j) => v.sub(np[j].mul(coefObj)));
    z = z.sub(npRhs.mul(coefObj));

    basica[r] = variables[e];
    indices[r] = e;
    tablas.push(snap(iter, { e, sal: r, pivote: p, ratios }));
  }

  const solucion = new Array<Frac>(tot).fill(Frac.CERO);
  for (let i = 0; i < m; i++) solucion[indices[i]] = rhs[i];

  return { estado, tablas, basicaFinal: [...basica], indices, solucion, z };
}

function resolverRevisado(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex
): { estado: 'optimo' | 'no-acotado'; revisado: IteracionRevisada[]; basicaFinal: string[]; solucion: Frac[]; z: Frac; indices: number[] } {
  const n = c.length;
  const m = A.length;
  const tot = n + m;
  const variables = nombresVariables(n, m);

  const cFrac = [...c.map((v) => Frac.deDecimal(v)), ...new Array<Frac>(m).fill(Frac.CERO)];
  const ACompleta: Frac[][] = Array.from({ length: m }, (_, i) => {
    const fil = new Array<Frac>(tot).fill(Frac.CERO);
    for (let j = 0; j < n; j++) fil[j] = Frac.deDecimal(A[i][j]);
    fil[n + i] = Frac.UNO;
    return fil;
  });
  const bFrac = b.map((v) => Frac.deDecimal(v));

  const indices: number[] = [];
  for (let i = 0; i < m; i++) indices.push(n + i);
  const basica = variables.slice(n);

  const revisado: IteracionRevisada[] = [];

  const estadoBase = (iter: number): IteracionRevisada => {
    const B = Array.from({ length: m }, (_, i) => indices.map((col) => ACompleta[i][col]));
    const BInv = inversa(B);
    const cB = indices.map((col) => cFrac[col]);
    const y = matMul([cB], BInv)[0];
    const bi = matVec(BInv, bFrac);
    const zAct = cB.reduce((acc, cb, i) => (cb.esCero ? acc : acc.add(cb.mul(bi[i]))), Frac.CERO);
    const costosReducidos: CostoReducidoRevisado[] = cFrac.map((cj, j) => {
      const aj = columnaDe(ACompleta, j);
      const zj = y.reduce((acc, yi, i) => (yi.esCero ? acc : acc.add(yi.mul(aj[i]))), Frac.CERO);
      return { variable: variables[j], cj, cr: cj.sub(zj), aj };
    });
    return {
      iteracion: iter,
      basica: [...basica],
      B,
      BInv,
      cB: [...cB],
      y,
      bi,
      costosReducidos,
      columnaEntrante: null,
      variableEntrante: null,
      d: [],
      ratios: null,
      filaSaliente: null,
      variableSaliente: null,
      z: zAct,
    };
  };

  revisado.push(estadoBase(0));

  let estado: 'optimo' | 'no-acotado' = 'optimo';
  let zFinal = Frac.CERO;

  for (let iter = 1; iter <= LIMITE_ITERACIONES; iter++) {
    const prev = revisado[revisado.length - 1];
    // Costo reducido \bar c_j = c_j - y^T a_j. En maximización entra el de
    // \bar c_j MÁS POSITIVO (en la fila Z_j-C_j del tabular sería el más
    // negativo); el óptimo se alcanza cuando no queda ningún \bar c_j > 0.
    let e = -1;
    let mejorValor: Frac | null = null;
    for (let j = 0; j < tot; j++) {
      if (indices.includes(j)) continue;
      const cr = prev.costosReducidos[j].cr;
      if (cr.esCero) continue;
      if (objetivo === 'max' ? cr.esPositivo : cr.esNegativo) {
        if (e === -1 || (objetivo === 'max' ? cr.cmp(mejorValor!) > 0 : cr.cmp(mejorValor!) < 0)) {
          e = j;
          mejorValor = cr;
        }
      }
    }
    if (e === -1) {
      zFinal = prev.z;
      break;
    }

    const d = matVec(prev.BInv, columnaDe(ACompleta, e));
    const ratios: RazonRevisado[] = prev.bi.map((bi, i) => {
      const den = d[i];
      if (den.signo <= 0) {
        return { fila: i, variable: basica[i], valorBase: bi, d: den, razon: null, descartada: true };
      }
      return { fila: i, variable: basica[i], valorBase: bi, d: den, razon: bi.div(den), descartada: false };
    });
    const activos = ratios.filter((r) => !r.descartada);
    if (activos.length === 0) {
      const snapNoAcotado: IteracionRevisada = {
        ...prev,
        iteracion: iter,
        columnaEntrante: e,
        variableEntrante: variables[e],
        d,
        ratios,
        filaSaliente: null,
        variableSaliente: null,
      };
      revisado.push(snapNoAcotado);
      estado = 'no-acotado';
      break;
    }
    let sal = activos[0].fila;
    for (let k = 1; k < activos.length; k++) {
      const cmp = activos[k].razon!.cmp(ratios[sal].razon!);
      if (cmp < 0 || (cmp === 0 && activos[k].fila < sal)) sal = activos[k].fila;
    }

    const salienteNombre = basica[sal];
    indices[sal] = e;
    basica[sal] = variables[e];

    const sig = estadoBase(iter);
    sig.columnaEntrante = e;
    sig.variableEntrante = variables[e];
    sig.d = d;
    sig.ratios = ratios;
    sig.filaSaliente = sal;
    sig.variableSaliente = salienteNombre;
    revisado.push(sig);
  }

  const solucion = new Array<Frac>(tot).fill(Frac.CERO);
  const ultimo = revisado[revisado.length - 1];
  for (let i = 0; i < m; i++) solucion[indices[i]] = ultimo.bi[i];
  if (estado === 'optimo') zFinal = ultimo.z;

  return { estado, revisado, basicaFinal: [...basica], solucion, z: zFinal, indices };
}

/**
 * Núcleo del motor Simplex. Devuelve SOLO fracciones exactas; las matrices de
 * trabajo nunca usan punto flotante.
 */
export function calcularSimplexCore(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex,
  metodo: 'tabular' | 'revisado'
): ResultadoSimplexCore {
  const n = c.length;
  const m = A.length;
  const variables = nombresVariables(n, m);

  const tabular = resolverTabular(c, A, b, objetivo);
  const revisado = resolverRevisado(c, A, b, objetivo);

  // Tabular y revisado deben coincidir (misma base final y mismo Z).
  const solucion = metodo === 'revisado' ? revisado.solucion : tabular.solucion;
  const estado = metodo === 'revisado' ? revisado.estado : tabular.estado;
  const basicaFinal = metodo === 'revisado' ? revisado.basicaFinal : tabular.basicaFinal;
  const valorObjetivo = metodo === 'revisado' ? revisado.z : tabular.z;

  return {
    estado,
    variables,
    solucion: solucion.slice(0, n),
    holguras: solucion.slice(n),
    basicaFinal,
    valorObjetivo,
    tablas: tabular.tablas,
    revisado: revisado.revisado,
  };
}