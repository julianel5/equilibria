import { Frac } from '../simplex/fraction';

/**
 * Algoritmo de Lemke (pivoteo complementario) para el Problema de
 * Complementariedad Lineal (LCP):
 *
 *     w = M z + q,   w ≥ 0,   z ≥ 0,   wᵀ z = 0
 *
 * Se introduce la variable artificial `z_0` con columna de unos:
 *
 *     w = q + M z + e z_0
 *
 * y se arranca con `z_0 = -min_i q_i` (que hace `w ≥ 0`). Después se aplica
 * pivoteo complementario: si sale `w_i`, entra `z_i`; si sale `z_i`, entra
 * `w_i`. El algoritmo termina cuando `z_0` abandona la base (solución
 * complementaria) o cuando la columna entrante no tiene coeficientes positivos
 * (rayo terminal: no se encuentra solución).
 *
 * Toda la aritmética es exacta (`Frac`, BigInt). La regla de la razón usa
 * comparación lexicográfica para evitar ciclos.
 */

export type EstadoLemke = 'solucion' | 'sin-solucion';

export interface RazonLemke {
  fila: number;
  variable: string;
  valorBase: Frac;
  coeficiente: Frac;
  /** `valorBase / coeficiente` cuando el coeficiente es positivo. */
  razon: Frac | null;
  descartada: boolean;
}

export interface IteracionLemke {
  iteracion: number;
  /** Nombres de todas las columnas: z_1..z_N, w_1..w_N, z_0. */
  variables: string[];
  basica: string[];
  filas: Frac[][];
  rhs: Frac[];
  entra: number | null;
  sale: number | null;
  pivote: Frac | null;
  ratios: RazonLemke[] | null;
  paso: 'inicio' | 'artificial' | 'pivote' | 'fin';
  nota: string;
}

export interface ComplementariedadLemke {
  indice: number;
  z: Frac;
  w: Frac;
  producto: Frac;
}

export interface ResultadoLemkeCore {
  estado: EstadoLemke;
  n: number;
  variables: string[];
  z: Frac[];
  w: Frac[];
  /** w - (M z + q): debe ser el vector cero si la solución es válida. */
  residuo: Frac[];
  complementariedad: ComplementariedadLemke[];
  /** w = Mz + q, w,z ≥ 0 y wᵀz = 0. */
  verifica: boolean;
  iteraciones: IteracionLemke[];
  mensaje: string;
}

const LIMITE_ITERACIONES = 1000;

function nombreVariable(idx: number, n: number): string {
  if (idx < n) return `z_{${idx + 1}}`;
  if (idx < 2 * n) return `w_{${idx - n + 1}}`;
  return 'z_{0}';
}

function clonarMatriz(M: Frac[][]): Frac[][] {
  return M.map((fila) => fila.map((v) => v));
}

/** Complemento de una variable: z_i ↔ w_i. */
function complemento(idx: number, n: number): number {
  if (idx < n) return n + idx;
  if (idx < 2 * n) return idx - n;
  throw new Error('La variable artificial z_0 no tiene complemento');
}

/**
 * Compara dos vectores de fracciones lexicográficamente.
 * Devuelve -1 si `a < b`, 0 si son iguales y 1 si `a > b`.
 */
function compararLex(a: Frac[], b: Frac[]): number {
  for (let k = 0; k < a.length; k++) {
    const c = a[k].cmp(b[k]);
    if (c !== 0) return c;
  }
  return 0;
}

function pivotar(
  filas: Frac[][],
  rhs: Frac[],
  aux: Frac[][],
  r: number,
  e: number
): void {
  const pivote = filas[r][e];
  if (pivote.esCero) throw new Error('Pivote nulo en Lemke');
  const filaPivote = filas[r].map((v) => v.div(pivote));
  const rhsPivote = rhs[r].div(pivote);
  const auxPivote = aux[r].map((v) => v.div(pivote));

  for (let i = 0; i < filas.length; i++) {
    if (i === r) continue;
    const factor = filas[i][e];
    if (factor.esCero) continue;
    filas[i] = filas[i].map((v, j) => v.sub(filaPivote[j].mul(factor)));
    rhs[i] = rhs[i].sub(rhsPivote.mul(factor));
    aux[i] = aux[i].map((v, j) => v.sub(auxPivote[j].mul(factor)));
  }
  filas[r] = filaPivote;
  rhs[r] = rhsPivote;
  aux[r] = auxPivote;
}

export function resolverLemke(M: Frac[][], q: Frac[]): ResultadoLemkeCore {
  const n = q.length;
  if (M.length !== n || M.some((fila) => fila.length !== n)) {
    throw new Error('La matriz M debe ser cuadrada y coincidir con el tamaño de q');
  }

  const totalColumnas = 2 * n + 1;
  const variables = Array.from({ length: totalColumnas }, (_, j) => nombreVariable(j, n));

  // Sistema de ecuaciones: w_i - Σ_j M_ij z_j - z_0 = q_i.
  const filas: Frac[][] = Array.from({ length: n }, () => new Array<Frac>(totalColumnas).fill(Frac.CERO));
  const rhs: Frac[] = new Array<Frac>(n);
  const basica: string[] = new Array<string>(n);
  const indices: number[] = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) filas[i][j] = M[i][j].neg();
    filas[i][n + i] = Frac.UNO;
    filas[i][2 * n] = Frac.UNO.neg();
    rhs[i] = q[i];
    basica[i] = variables[n + i];
    indices[i] = n + i;
  }

  // Matriz auxiliar (identidad) para la regla lexicográfica.
  const aux: Frac[][] = Array.from({ length: n }, (_, i) => {
    const fila = new Array<Frac>(n).fill(Frac.CERO);
    fila[i] = Frac.UNO;
    return fila;
  });

  const iteraciones: IteracionLemke[] = [];

  const snapshot = (
    iter: number,
    extra: {
      entra: number | null;
      sale: number | null;
      ratios: RazonLemke[] | null;
      paso: IteracionLemke['paso'];
      nota: string;
    }
  ): IteracionLemke => ({
    iteracion: iter,
    variables: [...variables],
    basica: [...basica],
    filas: clonarMatriz(filas),
    rhs: [...rhs],
    entra: extra.entra,
    sale: extra.sale,
    pivote:
      extra.entra !== null && extra.sale !== null ? filas[extra.sale][extra.entra] : null,
    ratios: extra.ratios,
    paso: extra.paso,
    nota: extra.nota,
  });

  // Caso trivial: q ≥ 0 ⇒ z = 0, w = q.
  if (q.every((v) => !v.esNegativo)) {
    iteraciones.push(
      snapshot(0, {
        entra: null,
        sale: null,
        ratios: null,
        paso: 'inicio',
        nota: 'q ≥ 0: la solución trivial z = 0, w = q ya es complementaria.',
      })
    );
    return {
      estado: 'solucion',
      n,
      variables,
      z: new Array<Frac>(n).fill(Frac.CERO),
      w: q.map((v) => v),
      residuo: new Array<Frac>(n).fill(Frac.CERO),
      complementariedad: q.map((w, j) => ({ indice: j, z: Frac.CERO, w, producto: Frac.CERO })),
      verifica: true,
      iteraciones,
      mensaje: 'q ≥ 0: solución trivial.',
    };
  }

  // Fila del mínimo q_i y entrada de z_0.
  let filaArtificial = 0;
  for (let i = 1; i < n; i++) {
    if (q[i].cmp(q[filaArtificial]) < 0) filaArtificial = i;
  }

  iteraciones.push(
    snapshot(0, {
      entra: 2 * n,
      sale: filaArtificial,
      ratios: null,
      paso: 'inicio',
      nota: `Entra la artificial z_0 en la fila ${filaArtificial + 1} (q_{${filaArtificial + 1}} es el más negativo).`,
    })
  );

  const saleArtificial = basica[filaArtificial];
  pivotar(filas, rhs, aux, filaArtificial, 2 * n);
  basica[filaArtificial] = variables[2 * n];
  indices[filaArtificial] = 2 * n;

  // El complemento de la variable que salió (w_r) marca la siguiente entrada.
  const idxSaliente = variables.indexOf(saleArtificial);
  let entra: number | null = complemento(idxSaliente, n);
  let estado: EstadoLemke = 'solucion';
  let mensaje = 'Solución complementaria encontrada: z_0 salió de la base.';
  let iter = 1;

  while (entra !== null && iter <= LIMITE_ITERACIONES) {
    // Prueba de la razón mínima lexicográfica.
    const ratios: RazonLemke[] = [];
    const candidatos: { fila: number; vector: Frac[] }[] = [];
    for (let i = 0; i < n; i++) {
      const a = filas[i][entra];
      if (!a.esPositivo) {
        ratios.push({
          fila: i,
          variable: basica[i],
          valorBase: rhs[i],
          coeficiente: a,
          razon: null,
          descartada: true,
        });
        continue;
      }
      ratios.push({
        fila: i,
        variable: basica[i],
        valorBase: rhs[i],
        coeficiente: a,
        razon: rhs[i].div(a),
        descartada: false,
      });
      candidatos.push({
        fila: i,
        vector: [rhs[i].div(a), ...aux[i].map((v) => v.div(a))],
      });
    }

    if (candidatos.length === 0) {
      iteraciones.push(
        snapshot(iter, {
          entra,
          sale: null,
          ratios,
          paso: 'fin',
          nota: `La columna de ${variables[entra]} no tiene coeficientes positivos: rayo terminal, no se encuentra solución complementaria.`,
        })
      );
      estado = 'sin-solucion';
      mensaje =
        'Rayo terminal: la columna entrante no tiene coeficientes positivos. El LCP no tiene solución complementaria por este camino.';
      break;
    }

    let mejor = candidatos[0];
    for (let k = 1; k < candidatos.length; k++) {
      if (compararLex(candidatos[k].vector, mejor.vector) < 0) mejor = candidatos[k];
    }
    const sale = mejor.fila;
    const variableSaliente = basica[sale];

    iteraciones.push(
      snapshot(iter, {
        entra,
        sale,
        ratios,
        paso: 'pivote',
        nota: `Entra ${variables[entra]} y sale ${variableSaliente}.`,
      })
    );

    pivotar(filas, rhs, aux, sale, entra);
    basica[sale] = variables[entra];
    indices[sale] = entra;

    if (variableSaliente === 'z_{0}') {
      iteraciones.push(
        snapshot(iter + 1, {
          entra: null,
          sale: null,
          ratios: null,
          paso: 'fin',
          nota: 'z_0 sale de la base: se obtiene una solución complementaria.',
        })
      );
      estado = 'solucion';
      mensaje = 'Solución complementaria encontrada: z_0 salió de la base.';
      break;
    }

    entra = complemento(variables.indexOf(variableSaliente), n);
    iter++;
  }

  if (iter > LIMITE_ITERACIONES) {
    estado = 'sin-solucion';
    mensaje = 'Se alcanzó el límite de iteraciones sin encontrar una solución complementaria.';
    iteraciones.push(
      snapshot(iter, {
        entra: null,
        sale: null,
        ratios: null,
        paso: 'fin',
        nota: 'Límite de iteraciones alcanzado.',
      })
    );
  }

  // Valores finales de z y w a partir de la base.
  const z = new Array<Frac>(n).fill(Frac.CERO);
  const w = new Array<Frac>(n).fill(Frac.CERO);
  for (let i = 0; i < n; i++) {
    const idx = indices[i];
    if (idx < n) z[idx] = rhs[i];
    else if (idx < 2 * n) w[idx - n] = rhs[i];
  }

  const residuo: Frac[] = [];
  for (let i = 0; i < n; i++) {
    let suma = q[i];
    for (let j = 0; j < n; j++) suma = suma.add(M[i][j].mul(z[j]));
    residuo.push(w[i].sub(suma));
  }
  const complementariedad = z.map((zj, j) => ({ indice: j, z: zj, w: w[j], producto: zj.mul(w[j]) }));
  const verifica =
    estado === 'solucion' &&
    z.every((v) => !v.esNegativo) &&
    w.every((v) => !v.esNegativo) &&
    residuo.every((v) => v.esCero) &&
    complementariedad.every((c) => c.producto.esCero);

  return {
    estado,
    n,
    variables,
    z,
    w,
    residuo,
    complementariedad,
    verifica,
    iteraciones,
    mensaje,
  };
}
