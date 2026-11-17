import { Frac } from './fraction';
import type { ObjetivoSimplex } from './simplex';

/**
 * Simplex Dual.
 *
 * El método parte de una base DUAL-FACTIBLE (todos los costos reducidos
 * `Z_j - C_j` satisfacen la condición de optimalidad) pero posiblemente
 * PRIMAL-INFEASIBLE (algún valor básico `x_B < 0`). En cada iteración:
 *
 *   1. Sale la fila con el valor básico más negativo.
 *   2. Entra la variable no básica que conserva la dual-factibilidad
 *      (prueba de la razón dual).
 *   3. Se pivotea y se repite hasta que todos los valores básicos sean ≥ 0
 *      (óptimo) o hasta que no exista columna válida (problema infactible).
 *
 * Igual que el Simplex primal, todas las operaciones matriciales usan `Frac`.
 */

export interface RazonDual {
  /** Columna no básica evaluada. */
  columna: number;
  variable: string;
  /** Costo reducido `Z_j - C_j` (≤ 0 en la forma normalizada de minimización). */
  reducido: Frac;
  /** Coeficiente de la fila saliente en esa columna. */
  coeficiente: Frac;
  /** `reducido / coeficiente` cuando el coeficiente es negativo. */
  razon: Frac | null;
  descartada: boolean;
}

export interface IteracionDual {
  iteracion: number;
  variables: string[];
  basica: string[];
  filas: Frac[][];
  rhs: Frac[];
  /** Costos reducidos `Z_j - C_j` de la forma normalizada de minimización. */
  reducidos: Frac[];
  /** Valor de la función objetivo normalizada (minimización). */
  z: Frac;
  /** Fila que sale en la iteración siguiente. */
  filaSaliente: number | null;
  variableSaliente: string | null;
  /** Columna que entra en la iteración siguiente. */
  columnaEntrante: number | null;
  variableEntrante: string | null;
  pivote: Frac | null;
  ratios: RazonDual[] | null;
  /** Todos los valores básicos son ≥ 0. */
  factible: boolean;
}

export interface ResultadoSimplexDualCore {
  /**
   * `no-dual-factible`: la base inicial no cumple la condición de optimalidad.
   * `infactible`: la fila saliente no tiene coeficientes negativos: el primal
   *               no tiene solución factible (el dual es no acotado).
   */
  estado: 'optimo' | 'infactible' | 'no-dual-factible';
  variables: string[];
  /** Valores de todas las variables (decisión + holguras/excesos). */
  todas: Frac[];
  /** Solo variables de decisión. */
  solucion: Frac[];
  /** Holgura (≤) o exceso (≥) de cada restricción original. */
  holguras: Frac[];
  basicaFinal: string[];
  /** Valor de Z en la orientación original (max/min del usuario). */
  valorObjetivo: Frac;
  /** Valor de Z de la forma normalizada de minimización. */
  zNormalizado: Frac;
  iteraciones: IteracionDual[];
  mensaje: string;
}

const LIMITE_ITERACIONES = 200;

function clonarMatriz(M: Frac[][]): Frac[][] {
  return M.map((fila) => fila.map((v) => v));
}

/** Convierte la matriz de restricciones y su lado derecho a la forma dual. */
function construirForma(
  A: number[][],
  b: number[],
  tipos: Array<'LE' | 'GE' | 'EQ'>,
  n: number
): {
  variables: string[];
  filas: Frac[][];
  rhs: Frac[];
  basica: string[];
  indices: number[];
  origen: number[];
  etiquetas: string[];
  /** Columnas de holgura/exceso por restricción original. */
  columnas: Array<{ s: number | null; e: number | null }>;
} {
  const m = A.length;
  const variables: string[] = Array.from({ length: n }, (_, j) => `x_{${j + 1}}`);
  const columnas: Array<{ s: number | null; e: number | null }> = [];

  // Primero se reservan las columnas de holgura/exceso para conocer el ancho
  // total de cada fila antes de rellenar los coeficientes.
  for (let i = 0; i < m; i++) {
    const t = tipos[i];
    if (t === 'LE') {
      const s = variables.length;
      variables.push(`S_{${i + 1}}`);
      columnas.push({ s, e: null });
    } else if (t === 'GE') {
      const e = variables.length;
      variables.push(`E_{${i + 1}}`);
      columnas.push({ s: null, e });
    } else {
      const e = variables.length;
      variables.push(`E_{${i + 1}}`);
      const s = variables.length;
      variables.push(`S_{${i + 1}}`);
      columnas.push({ s, e });
    }
  }

  const tot = variables.length;
  const filas: Frac[][] = [];
  const rhs: Frac[] = [];
  const basica: string[] = [];
  const indices: number[] = [];
  const origen: number[] = [];
  const etiquetas: string[] = [];

  const nuevaFila = (): Frac[] => new Array<Frac>(tot).fill(Frac.CERO);

  for (let i = 0; i < m; i++) {
    const t = tipos[i];
    const cols = columnas[i];
    const coefs = A[i].map((v) => Frac.deDecimal(v));
    const lado = Frac.deDecimal(b[i]);

    if (t === 'LE') {
      const fila = nuevaFila();
      coefs.forEach((v, j) => (fila[j] = v));
      fila[cols.s!] = Frac.UNO;
      filas.push(fila);
      rhs.push(lado);
      basica.push(variables[cols.s!]);
      indices.push(cols.s!);
      origen.push(i);
      etiquetas.push(`R${i + 1} (≤)`);
    } else if (t === 'GE') {
      // A x - E = b  ->  -A x + E = -b (el exceso queda básico con +1).
      const fila = nuevaFila();
      coefs.forEach((v, j) => (fila[j] = v.neg()));
      fila[cols.e!] = Frac.UNO;
      filas.push(fila);
      rhs.push(lado.neg());
      basica.push(variables[cols.e!]);
      indices.push(cols.e!);
      origen.push(i);
      etiquetas.push(`R${i + 1} (≥)`);
    } else {
      // Una igualdad se desdobla en ≥ y ≤: ambas filas juntas imponen A x = b.
      const filaGE = nuevaFila();
      coefs.forEach((v, j) => (filaGE[j] = v.neg()));
      filaGE[cols.e!] = Frac.UNO;
      filas.push(filaGE);
      rhs.push(lado.neg());
      basica.push(variables[cols.e!]);
      indices.push(cols.e!);
      origen.push(i);
      etiquetas.push(`R${i + 1} (=, parte ≥)`);

      const filaLE = nuevaFila();
      coefs.forEach((v, j) => (filaLE[j] = v));
      filaLE[cols.s!] = Frac.UNO;
      filas.push(filaLE);
      rhs.push(lado);
      basica.push(variables[cols.s!]);
      indices.push(cols.s!);
      origen.push(i);
      etiquetas.push(`R${i + 1} (=, parte ≤)`);
    }
  }

  return { variables, filas, rhs, basica, indices, origen, etiquetas, columnas };
}

/**
 * Resuelve un PL con el Simplex Dual a partir de la base de holguras/excesos.
 *
 * La forma normalizada es siempre de MINIMIZACIÓN. Si el problema original es
 * de maximización se usa `c' = -c` y al final se recupera `Z = -Z'`.
 */
export function calcularSimplexDualCore(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex,
  tipos?: Array<'LE' | 'GE' | 'EQ'>
): ResultadoSimplexDualCore {
  const n = c.length;
  const m = A.length;
  const tList = tipos ?? Array.from({ length: m }, () => 'LE' as const);
  const forma = construirForma(A, b, tList, n);
  const tot = forma.variables.length;
  const esMin = objetivo === 'min';

  // Costos de la forma normalizada de minimización.
  const cNorm: Frac[] = new Array<Frac>(tot).fill(Frac.CERO);
  for (let j = 0; j < n; j++) {
    cNorm[j] = esMin ? Frac.deDecimal(c[j]) : Frac.deDecimal(c[j]).neg();
  }

  let filas = clonarMatriz(forma.filas);
  let rhs = [...forma.rhs];
  const basica = [...forma.basica];
  const indices = [...forma.indices];

  // Con la base de holguras/excesos (c_B = 0) los costos reducidos son -c_j.
  let reducidos = cNorm.map((cj) => cj.neg());

  const valorZ = (): Frac => {
    let z = Frac.CERO;
    for (let i = 0; i < filas.length; i++) {
      const ci = cNorm[indices[i]];
      if (!ci.esCero) z = z.add(ci.mul(rhs[i]));
    }
    return z;
  };

  const factible = (): boolean => rhs.every((v) => !v.esNegativo);

  const dualFactible = reducidos.every((v) => !v.esPositivo);

  const iteraciones: IteracionDual[] = [];

  const snapshot = (
    iter: number,
    extra: {
      r: number | null;
      e: number | null;
      pivote: Frac | null;
      ratios: RazonDual[] | null;
    } | null
  ): IteracionDual => ({
    iteracion: iter,
    variables: [...forma.variables],
    basica: [...basica],
    filas: clonarMatriz(filas),
    rhs: [...rhs],
    reducidos: [...reducidos],
    z: valorZ(),
    filaSaliente: extra ? extra.r : null,
    variableSaliente: extra && extra.r !== null ? basica[extra.r] : null,
    columnaEntrante: extra ? extra.e : null,
    variableEntrante: extra && extra.e !== null ? forma.variables[extra.e] : null,
    pivote: extra ? extra.pivote : null,
    ratios: extra ? extra.ratios : null,
    factible: factible(),
  });

  if (!dualFactible) {
    iteraciones.push(snapshot(0, null));
    return {
      estado: 'no-dual-factible',
      variables: forma.variables,
      todas: new Array<Frac>(tot).fill(Frac.CERO),
      solucion: new Array<Frac>(n).fill(Frac.CERO),
      holguras: new Array<Frac>(m).fill(Frac.CERO),
      basicaFinal: [...basica],
      valorObjetivo: Frac.CERO,
      zNormalizado: Frac.CERO,
      iteraciones,
      mensaje:
        'La base inicial de holguras/excesos no es dual-factible: en la forma de minimización todos los costos deben ser ≥ 0 (o ≤ 0 en maximización).',
    };
  }

  let estado: 'optimo' | 'infactible' | 'no-dual-factible' = 'optimo';
  let mensaje = '';

  for (let iter = 0; iter <= LIMITE_ITERACIONES; iter++) {
    if (factible()) {
      iteraciones.push(snapshot(iter, null));
      estado = 'optimo';
      mensaje = 'Todos los valores básicos son ≥ 0 y la base es dual-factible: solución óptima.';
      break;
    }

    // 1) Fila saliente: el valor básico más negativo (empate: menor índice).
    let r = -1;
    for (let i = 0; i < rhs.length; i++) {
      if (!rhs[i].esNegativo) continue;
      if (r === -1 || rhs[i].cmp(rhs[r]) < 0) r = i;
    }

    // 2) Prueba de la razón dual sobre las columnas no básicas.
    const ratios: RazonDual[] = [];
    for (let j = 0; j < tot; j++) {
      if (indices.includes(j)) continue;
      const a = filas[r][j];
      const reducido = reducidos[j];
      if (!a.esNegativo) {
        ratios.push({
          columna: j,
          variable: forma.variables[j],
          reducido,
          coeficiente: a,
          razon: null,
          descartada: true,
        });
        continue;
      }
      ratios.push({
        columna: j,
        variable: forma.variables[j],
        reducido,
        coeficiente: a,
        razon: reducido.div(a),
        descartada: false,
      });
    }

    const activos = ratios.filter((x) => !x.descartada);
    let e: number | null = null;
    if (activos.length > 0) {
      let mejor = activos[0];
      for (let k = 1; k < activos.length; k++) {
        const cmp = activos[k].razon!.cmp(mejor.razon!);
        if (cmp < 0 || (cmp === 0 && activos[k].columna < mejor.columna)) mejor = activos[k];
      }
      e = mejor.columna;
    }

    if (e === null) {
      iteraciones.push(snapshot(iter, { r, e: null, pivote: null, ratios }));
      estado = 'infactible';
      mensaje =
        'La fila saliente no tiene coeficientes negativos: no se puede recuperar la factibilidad primal, por lo que el problema es infactible.';
      break;
    }

    const pivote = filas[r][e];
    iteraciones.push(snapshot(iter, { r, e, pivote, ratios }));

    // 3) Pivoteo de Gauss-Jordan (fracciones exactas).
    const filaPivote = filas[r].map((v) => v.div(pivote));
    const rhsPivote = rhs[r].div(pivote);

    const filasViejas = filas;
    const rhsViejos = rhs;
    const coefObj = reducidos[e];

    filas = filasViejas.map((fila, i) =>
      i === r ? filaPivote : fila.map((v, j) => v.sub(filaPivote[j].mul(filasViejas[i][e])))
    );
    rhs = rhsViejos.map((v, i) => (i === r ? rhsPivote : v.sub(rhsPivote.mul(filasViejas[i][e]))));
    reducidos = reducidos.map((v, j) => v.sub(filaPivote[j].mul(coefObj)));

    basica[r] = forma.variables[e];
    indices[r] = e;

    if (iter === LIMITE_ITERACIONES) {
      estado = 'infactible';
      mensaje = 'Se alcanzó el límite de iteraciones sin converger.';
      iteraciones.push(snapshot(iter + 1, null));
    }
  }

  // Solución de la última tabla.
  const todas = new Array<Frac>(tot).fill(Frac.CERO);
  for (let i = 0; i < filas.length; i++) todas[indices[i]] = rhs[i];

  const solucion = todas.slice(0, n);
  const holguras = forma.columnas.map((cols, i) => {
    const t = tList[i];
    if (t === 'GE') return cols.e !== null ? todas[cols.e] : Frac.CERO;
    // ≤ y =: la holgura S_i (en una igualdad debe ser 0).
    return cols.s !== null ? todas[cols.s] : Frac.CERO;
  });

  const zNormalizado = valorZ();
  const valorObjetivo = esMin ? zNormalizado : zNormalizado.neg();

  return {
    estado,
    variables: forma.variables,
    todas,
    solucion,
    holguras,
    basicaFinal: [...basica],
    valorObjetivo,
    zNormalizado,
    iteraciones,
    mensaje,
  };
}
