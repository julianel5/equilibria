import { Frac } from './fraction';
import { escalarM, productoM, restarM, signoM, terminoM, type TerminoM } from './granM';
export type { TerminoM } from './granM';

export type ObjetivoSimplex = 'max' | 'min';
export type EstadoSimplex = 'optimo' | 'no-acotado' | 'infactible' | 'limite-iteraciones';
type EstadoPivoteo = Exclude<EstadoSimplex, 'infactible'>;

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
  cjM: TerminoM;
  crM: TerminoM;
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
  cBM: TerminoM[];
  yM: TerminoM[];
  bi: Frac[];
  costosReducidos: CostoReducidoRevisado[];
  columnaEntrante: number | null;
  variableEntrante: string | null;
  d: Frac[];
  ratios: RazonRevisado[] | null;
  filaSaliente: number | null;
  variableSaliente: string | null;
  z: Frac;
  zM: TerminoM;
}

export interface ResultadoSimplexCore {
  /** 'infactible': el óptimo de Gran M conserva una artificial con valor > 0. */
  estado: EstadoSimplex;
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

function matVec(A: Frac[][], v: Frac[]): Frac[] {
  return A.map((fil) =>
    fil.reduce((acc, f, j) => (f.esCero ? acc : acc.add(f.mul(v[j]))), Frac.CERO)
  );
}

function columnaDe(A: Frac[][], j: number): Frac[] {
  return A.map((fil) => fil[j]);
}

function pruebaRazon(
  filas: Frac[][],
  rhs: Frac[],
  basica: string[],
  indices: number[],
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
    if (cmp < 0 || (cmp === 0 && indices[activos[k].fila] < indices[saliente])) saliente = activos[k].fila;
  }
  return { ratios, saliente };
}

function resolverTabular(
  c: Frac[],
  A: Frac[][],
  b: Frac[],
  objetivo: ObjetivoSimplex,
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): { estado: EstadoPivoteo; tablas: IteracionTabular[]; basicaFinal: string[]; solucion: Frac[]; z: Frac } {
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
    for (let j = 0; j < n; j++) filas[i][j] = A[i][j];
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

  let rhs = [...b];
  const costos = costosGranM(c, variables, objetivo);
  const cb = indices.map(j => costos[j]);
  let reducidosM = costos.map((cj, j) => restarM(productoM(cb, columnaDe(filas, j)), cj));
  let zM = productoM(cb, rhs);

  const tablas: IteracionTabular[] = [];
  const snap = (iter: number, extra: { e: number; sal: number; pivote: Frac; ratios: RazonSimplex[] } | null): IteracionTabular => ({
    iteracion: iter,
    variables: [...variables],
    basica: [...basica],
    filas: clonarMatriz(filas),
    rhs: [...rhs],
    reducidos: reducidosM.map(x => x.a),
    z: zM.a,
    reducidosM: tieneArtificial ? reducidosM.map((t) => ({ ...t })) : null,
    zM: tieneArtificial ? { ...zM } : null,
    columnaEntrante: extra ? extra.e : null,
    filaSaliente: extra ? extra.sal : null,
    pivote: extra ? extra.pivote : null,
    ratios: extra ? extra.ratios : null,
  });
  tablas.push(snap(0, null));

  let estado: EstadoPivoteo = 'limite-iteraciones';
  for (let iter = 1; iter <= LIMITE_ITERACIONES + 1; iter++) {
    // Bland: la primera columna que mejora, no necesariamente la más negativa/positiva.
    const e = elegirBland(reducidosM, variables, indices, esMin ? 1 : -1, !zM.b.esCero);
    if (e === -1) { estado = 'optimo'; break; }
    if (iter > LIMITE_ITERACIONES) break;

    const { ratios, saliente } = pruebaRazon(filas, rhs, basica, indices, e);
    if (saliente === null) {
      estado = 'no-acotado';
      tablas.push(snap(iter, { e, sal: -1, pivote: Frac.CERO, ratios }));
      break;
    }

    const r = saliente;
    const p = filas[r][e];
    const np = filas[r].map((v) => v.div(p));
    const npRhs = rhs[r].div(p);

    const filasViejas = filas;
    filas = filasViejas.map((fila, k) =>
      k === r ? np : fila.map((v, j) => v.sub(np[j].mul(filasViejas[k][e])))
    );
    const rhsViejos = rhs;
    rhs = rhsViejos.map((bb, k) =>
      k === r ? npRhs : bb.sub(npRhs.mul(filasViejas[k][e]))
    );
    const coefM = reducidosM[e];
    reducidosM = reducidosM.map((t, j) => restarM(t, escalarM(coefM, np[j])));
    zM = restarM(zM, escalarM(coefM, npRhs));

    basica[r] = variables[e];
    indices[r] = e;
    tablas.push(snap(iter, { e, sal: r, pivote: p, ratios }));
  }

  const solucion = new Array<Frac>(tot).fill(Frac.CERO);
  for (let i = 0; i < m; i++) solucion[indices[i]] = rhs[i];

  // Para MIN, z ya esta en terminos de Z_min (no conversion)
  return { estado, tablas, basicaFinal: [...basica], solucion, z: zM.a };
}

function costosGranM(c: Frac[], variables: string[], objetivo: ObjetivoSimplex): TerminoM[] {
  const penalizacion = objetivo === 'min' ? Frac.UNO : Frac.UNO.neg();
  return variables.map((v, j) => terminoM(c[j] ?? Frac.CERO, v.startsWith('R_') ? penalizacion : Frac.CERO));
}

function elegirBland(costos: TerminoM[], variables: string[], basicas: number[], signo: 1 | -1, artificialPositiva: boolean) {
  // Mientras quede flujo artificial, solo un pivote que mejora M puede
  // recuperar factibilidad. En particular, un rayo del objetivo real no
  // permite concluir nada sobre el original hasta certificar la penalización.
  return costos.findIndex((r, j) => !basicas.includes(j) && !variables[j].startsWith('R_') &&
    (artificialPositiva ? r.b.signo : signoM(r)) === signo);
}

function resolverRevisado(
  c: Frac[],
  A: Frac[][],
  b: Frac[],
  objetivo: ObjetivoSimplex,
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): { estado: EstadoPivoteo; revisado: IteracionRevisada[]; basicaFinal: string[]; solucion: Frac[]; z: Frac } {
  const n = c.length;
  const m = A.length;
  const tList = tipos || Array.from({ length: m }, () => 'LE' as const);
  const variables = nombresVariables(n, m, tList);
  const tot = variables.length;

  // Misma forma estándar que el tabular: ≤ suma holgura S_i; ≥ resta exceso
  // E_i y suma artificial R_i; = suma artificial R_i. Las artificiales llevan
  // costo -M (MAX) o +M (MIN) y forman la base inicial junto a las holguras.
  const costos = costosGranM(c, variables, objetivo);
  const ACompleta: Frac[][] = Array.from({ length: m }, () => new Array<Frac>(tot).fill(Frac.CERO));
  const indices: number[] = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) ACompleta[i][j] = A[i][j];
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
  const basica = indices.map((j) => variables[j]);

  const revisado: IteracionRevisada[] = [];

  const estadoBase = (iter: number): IteracionRevisada => {
    const B = Array.from({ length: m }, (_, i) => indices.map((col) => ACompleta[i][col]));
    const BInv = inversa(B);
    const cBM = indices.map(col => costos[col]);
    const yM = indices.map((_, j) => productoM(cBM, columnaDe(BInv, j)));
    const bi = matVec(BInv, b);
    const zM = productoM(cBM, bi);
    const costosReducidos: CostoReducidoRevisado[] = costos.map((cjM, j) => {
      const aj = columnaDe(ACompleta, j);
      const crM = restarM(cjM, productoM(yM, aj));
      return { variable: variables[j], cj: cjM.a, cr: crM.a, cjM, crM, aj };
    });
    return {
      iteracion: iter,
      basica: [...basica],
      B,
      BInv,
      cB: cBM.map(c => c.a),
      y: yM.map(y => y.a),
      cBM,
      yM,
      bi,
      costosReducidos,
      columnaEntrante: null,
      variableEntrante: null,
      d: [],
      ratios: null,
      filaSaliente: null,
      variableSaliente: null,
      z: zM.a,
      zM,
    };
  };

  revisado.push(estadoBase(0));

  let estado: EstadoPivoteo = 'limite-iteraciones';
  for (let iter = 1; iter <= LIMITE_ITERACIONES + 1; iter++) {
    const prev = revisado[revisado.length - 1];
    const e = elegirBland(prev.costosReducidos.map(c => c.crM), variables, indices, objetivo === 'max' ? 1 : -1, !prev.zM.b.esCero);
    if (e === -1) { estado = 'optimo'; break; }
    if (iter > LIMITE_ITERACIONES) break;

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
      if (cmp < 0 || (cmp === 0 && indices[activos[k].fila] < indices[sal])) sal = activos[k].fila;
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
  return { estado, revisado, basicaFinal: [...basica], solucion, z: ultimo.z };
}

/**
 * Núcleo del motor Simplex. Devuelve SOLO fracciones exactas; las matrices de
 * trabajo nunca usan punto flotante.
 */
export const aFrac = (v: number | Frac): Frac => v instanceof Frac ? v : Frac.deDecimal(v);

export function calcularSimplexCore(
  c: (number | Frac)[],
  A: (number | Frac)[][],
  b: (number | Frac)[],
  objetivo: ObjetivoSimplex,
  metodo: 'tabular' | 'revisado',
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): ResultadoSimplexCore {
  const n = c.length;
  const m = A.length;
  const variables = nombresVariables(n, m, tipos);

  const cf = c.map(aFrac), Af = A.map(fila => fila.map(aFrac)), bf = b.map(aFrac);
  const res = metodo === 'tabular' ? resolverTabular(cf, Af, bf, objetivo, tipos) : resolverRevisado(cf, Af, bf, objetivo, tipos);
  const { solucion, basicaFinal, z: valorObjetivo } = res;
  let estado: EstadoSimplex = res.estado;
  // Gran M: si al terminar queda una artificial con valor positivo, ninguna
  // solución cumple todas las restricciones (el "óptimo" solo minimiza la
  // penalización M). Se reporta como infactible.
  // Un rayo que solo mejora la parte real mientras M sigue positivo tampoco
  // certifica no acotamiento del problema original.
  if ((estado === 'optimo' || estado === 'no-acotado') &&
    variables.some((v, j) => v.startsWith('R_') && solucion[j].esPositivo)) {
    estado = 'infactible';
  }

  return {
    estado,
    variables,
    solucion: solucion.slice(0, n),
    holguras: solucion.slice(n),
    basicaFinal,
    valorObjetivo,
    tablas: 'tablas' in res ? res.tablas : [],
    revisado: 'revisado' in res ? res.revisado : [],
  };
}
