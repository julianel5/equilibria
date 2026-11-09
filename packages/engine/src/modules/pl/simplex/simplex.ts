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

/** Valor de la forma a + b·M con a, b fracciones exactas. */
export interface TerminoM {
  a: Frac;
  b: Frac;
}

export interface IteracionTabular {
  iteracion: number;
  variables: string[];
  basica: string[];
  filas: Frac[][];
  rhs: Frac[];
  reducidos: Frac[];
  z: Frac;
  /** Gran M: costos reducidos y Z separados exactamente como a + b·M (null si no hay artificiales). */
  reducidosM?: TerminoM[] | null;
  zM?: TerminoM | null;
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
  /** 'infactible': el óptimo de Gran M conserva una artificial con valor > 0. */
  estado: 'optimo' | 'no-acotado' | 'infactible';
  variables: string[];
  solucion: Frac[];
  holguras: Frac[];
  basicaFinal: string[];
  valorObjetivo: Frac;
  tablas: IteracionTabular[];
  revisado: IteracionRevisada[];
}

const LIMITE_ITERACIONES = 200;

export function nombresVariables(
  n: number,
  m: number,
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): string[] {
  const vars: string[] = [];
  for (let j = 0; j < n; j++) vars.push(`x_{${j + 1}}`);
  if (tipos && tipos.length === m) {
    for (let i = 0; i < m; i++) {
      const t = tipos[i];
      if (t === 'LE') {
        vars.push(`S_{${i + 1}}`);
      } else if (t === 'GE') {
        vars.push(`E_{${i + 1}}`);
        vars.push(`R_{${i + 1}}`);
      } else if (t === 'EQ') {
        vars.push(`R_{${i + 1}}`);
      }
    }
  } else {
    for (let i = 0; i < m; i++) vars.push(`S_{${i + 1}}`);
  }
  return vars;
}

function clonarMatriz(M: Frac[][]): Frac[][] {
  return M.map((fil) => fil.map((v) => v));
}

/** Inversa exacta por Gauss-Jordan (solo lectura, no modifica M). */
export function inversa(M: Frac[][]): Frac[][] {
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
  objetivo: ObjetivoSimplex,
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): { estado: 'optimo' | 'no-acotado'; tablas: IteracionTabular[]; basicaFinal: string[]; indices: number[]; solucion: Frac[]; z: Frac } {
  const n = c.length;
  const m = A.length;
  const tList = tipos || Array.from({ length: m }, () => 'LE' as const);
  const tieneArtificial = tList.some((t) => t === 'GE' || t === 'EQ');
  const esMin = objetivo === 'min';
  const variables = nombresVariables(n, m, tList);
  const tot = variables.length;

  let filas: Frac[][] = Array.from({ length: m }, () => Array.from({ length: tot }, () => Frac.CERO));
  const basica: string[] = [];
  const indices: number[] = [];

  for (let i = 0; i < m; i++) {
    const t = tList[i];
    for (let j = 0; j < n; j++) filas[i][j] = Frac.deDecimal(A[i][j]);
    if (t === 'LE') {
      const name = "S_{" + (i + 1) + "}";
      const idx = variables.indexOf(name);
      filas[i][idx] = Frac.UNO;
      basica.push(variables[idx]);
      indices.push(idx);
    } else if (t === 'GE') {
      const nameE = "E_{" + (i + 1) + "}";
      const nameR = "R_{" + (i + 1) + "}";
      const idxE = variables.indexOf(nameE);
      const idxR = variables.indexOf(nameR);
      filas[i][idxE] = Frac.UNO.neg();
      filas[i][idxR] = Frac.UNO;
      basica.push(variables[idxR]);
      indices.push(idxR);
    } else if (t === 'EQ') {
      const nameR = "R_{" + (i + 1) + "}";
      const idxR = variables.indexOf(nameR);
      filas[i][idxR] = Frac.UNO;
      basica.push(variables[idxR]);
      indices.push(idxR);
    }
  }

  let rhs = b.map((v) => Frac.deDecimal(v));
  const M = Frac.deDecimal(1000000);
  // Costos de variables basicas: artificiales +/-M, slacks/exceso 0
  const costoBasica = (name: string): Frac =>
    name.startsWith("R_") ? (esMin ? M : M.neg()) : Frac.CERO;
  // Costo en funcion objetivo original de cada variable (decisiones c_j; artificiales +/-M; holguras 0)
  const costoVar = (j: number): Frac => {
    if (j < n) return Frac.deDecimal(c[j]);
    const name = variables[j];
    if (name.startsWith("R_")) return esMin ? M : M.neg();
    return Frac.CERO;
  };
  let reducidos = new Array<Frac>(tot).fill(Frac.CERO);
  for (let j = 0; j < tot; j++) {
    let zj = Frac.CERO;
    for (let i = 0; i < m; i++) {
      zj = zj.add(costoBasica(basica[i]).mul(filas[i][j]));
    }
    reducidos[j] = zj.sub(costoVar(j));
  }

  // Version simbolica (a + b·M) de los costos reducidos y Z, exacta.
  const signoM = esMin ? Frac.UNO : Frac.UNO.neg();
  const costoM = (name: string, j: number | null): TerminoM => {
    if (name.startsWith("R_")) return { a: Frac.CERO, b: signoM };
    if (j !== null && j < n) return { a: Frac.deDecimal(c[j]), b: Frac.CERO };
    return { a: Frac.CERO, b: Frac.CERO };
  };
  let reducidosM: TerminoM[] = [];
  for (let j = 0; j < tot; j++) {
    let a = Frac.CERO;
    let bm = Frac.CERO;
    for (let i = 0; i < m; i++) {
      const cb = costoM(basica[i], null);
      a = a.add(cb.a.mul(filas[i][j]));
      bm = bm.add(cb.b.mul(filas[i][j]));
    }
    const cj = costoM(variables[j], j);
    reducidosM.push({ a: a.sub(cj.a), b: bm.sub(cj.b) });
  }
  let zM: TerminoM = { a: Frac.CERO, b: Frac.CERO };
  for (let i = 0; i < m; i++) {
    const cb = costoM(basica[i], null);
    zM = { a: zM.a.add(cb.a.mul(rhs[i])), b: zM.b.add(cb.b.mul(rhs[i])) };
  }

  // Z inicial
  let z = Frac.CERO;
  for (let i = 0; i < m; i++) {
    const ci = basica[i].startsWith("R_") ? (esMin ? M : M.neg()) : Frac.CERO;
    // costos de variables basicas: artificiales +/-M, otras 0 (slacks/exceso) o c_j (decisiones no basicas no entran)
    z = z.add(ci.mul(rhs[i]));
  }

  const tablas: IteracionTabular[] = [];
  const snap = (iter: number, extra: { e: number; sal: number; pivote: Frac; ratios: RazonSimplex[] } | null): IteracionTabular => ({
    iteracion: iter,
    variables: [...variables],
    basica: [...basica],
    filas: clonarMatriz(filas),
    rhs: [...rhs],
    reducidos: [...reducidos],
    z,
    reducidosM: tieneArtificial ? reducidosM.map((t) => ({ ...t })) : null,
    zM: tieneArtificial ? { ...zM } : null,
    columnaEntrante: extra ? extra.e : null,
    filaSaliente: extra ? extra.sal : null,
    pivote: extra ? extra.pivote : null,
    ratios: extra ? extra.ratios : null,
  });
  tablas.push(snap(0, null));

  let estado: 'optimo' | 'no-acotado' = 'optimo';
  for (let iter = 1; iter <= LIMITE_ITERACIONES; iter++) {
    // Criterio de entrada: MAX -> mas negativo; MIN -> mas positivo
    const e = columnaEntranteDirigida(reducidos, esMin, variables);
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
    const coefM = reducidosM[e];
    reducidosM = reducidosM.map((t, j) => ({ a: t.a.sub(np[j].mul(coefM.a)), b: t.b.sub(np[j].mul(coefM.b)) }));
    zM = { a: zM.a.sub(npRhs.mul(coefM.a)), b: zM.b.sub(npRhs.mul(coefM.b)) };

    basica[r] = variables[e];
    indices[r] = e;
    tablas.push(snap(iter, { e, sal: r, pivote: p, ratios }));
  }

  const solucion = new Array<Frac>(tot).fill(Frac.CERO);
  for (let i = 0; i < m; i++) solucion[indices[i]] = rhs[i];

  // Para MIN, z ya esta en terminos de Z_min (no conversion)
  return { estado, tablas, basicaFinal: [...basica], indices, solucion, z };
}


/** Selecciona columna entrante segun direccion: MAX -> mas negativo; MIN -> mas positivo. */
function columnaEntranteDirigida(reducidos: Frac[], esMin: boolean, variables: string[]): number | null {
  let mejor = -1;
  let mejorValor: Frac | null = null;
  for (let j = 0; j < reducidos.length; j++) {
    if (variables[j] && variables[j].startsWith('R_')) continue;
    const v = reducidos[j];
    if (v.esCero) continue;
    const entra = esMin ? v.esPositivo : v.esNegativo;
    if (!entra) continue;
    const mejorQueMejor =
      mejor === -1 ||
      (esMin ? v.cmp(mejorValor!) > 0 : v.cmp(mejorValor!) < 0);
    if (mejorQueMejor) {
      mejor = j;
      mejorValor = v;
    }
  }
  return mejor === -1 ? null : mejor;
}

function resolverRevisado(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex,
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): { estado: 'optimo' | 'no-acotado'; revisado: IteracionRevisada[]; basicaFinal: string[]; solucion: Frac[]; z: Frac; indices: number[] } {
  const n = c.length;
  const m = A.length;
  const tList = tipos || Array.from({ length: m }, () => 'LE' as const);
  const variables = nombresVariables(n, m, tList);
  const tot = variables.length;

  // Misma forma estándar que el tabular: ≤ suma holgura S_i; ≥ resta exceso
  // E_i y suma artificial R_i; = suma artificial R_i. Las artificiales llevan
  // costo -M (MAX) o +M (MIN) y forman la base inicial junto a las holguras.
  const M = Frac.deDecimal(1000000);
  const costoArtificial = objetivo === 'min' ? M : M.neg();
  const cFrac: Frac[] = variables.map((name, j) => {
    if (j < n) return Frac.deDecimal(c[j]);
    return name.startsWith('R_') ? costoArtificial : Frac.CERO;
  });
  const ACompleta: Frac[][] = Array.from({ length: m }, () => new Array<Frac>(tot).fill(Frac.CERO));
  const indices: number[] = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) ACompleta[i][j] = Frac.deDecimal(A[i][j]);
    const t = tList[i];
    if (t === 'LE') {
      const idx = variables.indexOf('S_{' + (i + 1) + '}');
      ACompleta[i][idx] = Frac.UNO;
      indices.push(idx);
    } else {
      if (t === 'GE') ACompleta[i][variables.indexOf('E_{' + (i + 1) + '}')] = Frac.UNO.neg();
      const idxR = variables.indexOf('R_{' + (i + 1) + '}');
      ACompleta[i][idxR] = Frac.UNO;
      indices.push(idxR);
    }
  }
  const bFrac = b.map((v) => Frac.deDecimal(v));
  const basica = indices.map((j) => variables[j]);

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
      // Una artificial que salió de la base no vuelve a entrar (igual que en el tabular).
      if (variables[j].startsWith('R_')) continue;
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
  metodo: 'tabular' | 'revisado',
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): ResultadoSimplexCore {
  const n = c.length;
  const m = A.length;
  const variables = nombresVariables(n, m, tipos);

  const tabular = resolverTabular(c, A, b, objetivo, tipos);
  const revisado = resolverRevisado(c, A, b, objetivo, tipos);

  // Tabular y revisado deben coincidir (misma base final y mismo Z).
  const solucion = metodo === 'revisado' ? revisado.solucion : tabular.solucion;
  let estado: ResultadoSimplexCore['estado'] = metodo === 'revisado' ? revisado.estado : tabular.estado;
  // Gran M: si al terminar queda una artificial con valor positivo, ninguna
  // solución cumple todas las restricciones (el "óptimo" solo minimiza la
  // penalización M). Se reporta como infactible.
  if (estado === 'optimo' && variables.some((v, j) => v.startsWith('R_') && solucion[j].esPositivo)) {
    estado = 'infactible';
  }
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