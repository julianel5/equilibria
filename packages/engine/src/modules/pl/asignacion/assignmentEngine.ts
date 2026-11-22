import { Frac } from '../simplex/fraction';

export interface CeldaAsignacion {
  i: number;
  j: number;
}

/** null representa una asignación prohibida (infinito simbólico). */
export type MatrizAsignacion<T> = (T | null)[][];

export type PasoAsignacion<T> = { matriz: MatrizAsignacion<T> } & (
  | { tipo: 'original' | 'balanceo' }
  | { tipo: 'conversion'; maximo: T | null }
  | { tipo: 'filas' | 'columnas'; minimos: T[] }
  | { tipo: 'cobertura'; iteracion: number; filas: number[]; columnas: number[] }
  | { tipo: 'ajuste'; iteracion: number; minimo: T }
  | { tipo: 'asignacion'; celdas: CeldaAsignacion[] }
  | { tipo: 'infactible'; cardinalidad: number }
);

export interface ResultadoAsignacion<T> {
  estado: 'optimo' | 'infactible';
  objetivo: 'min' | 'max';
  /** Dimensiones originales; el orden de trabajo es max(m, n). */
  m: number;
  n: number;
  iteraciones: number;
  valorObjetivo: T | null;
  asignaciones: (CeldaAsignacion & { valor: T; ficticia: boolean })[];
  pasos: PasoAsignacion<T>[];
}

function extremo(valores: Iterable<Frac | null>, maximizar = false): Frac | null {
  let mejor: Frac | null = null;
  for (const valor of valores) {
    if (valor !== null && (mejor === null || (maximizar ? valor.cmp(mejor) > 0 : valor.cmp(mejor) < 0))) {
      mejor = valor;
    }
  }
  return mejor;
}

/** Emparejamiento máximo por caminos aumentantes, no por selección voraz. */
function emparejar(orden: number, arista: (i: number, j: number) => boolean) {
  const filaPorColumna = new Array<number>(orden).fill(-1);
  const columnaPorFila = new Array<number>(orden).fill(-1);
  function aumentar(i: number, visitadas: boolean[]): boolean {
    for (let j = 0; j < orden; j++) {
      if (visitadas[j] || !arista(i, j)) continue;
      visitadas[j] = true;
      if (filaPorColumna[j] === -1 || aumentar(filaPorColumna[j], visitadas)) {
        filaPorColumna[j] = i;
        columnaPorFila[i] = j;
        return true;
      }
    }
    return false;
  }

  let cardinalidad = 0;
  for (let i = 0; i < orden; i++) {
    if (aumentar(i, new Array<boolean>(orden).fill(false))) cardinalidad++;
  }
  return { cardinalidad, filaPorColumna, columnaPorFila };
}

/** König: filas no alcanzables + columnas alcanzables desde las filas libres. */
function cubrirCeros(matriz: MatrizAsignacion<Frac>) {
  const orden = matriz.length;
  const esCero = (i: number, j: number) => matriz[i][j]?.esCero === true;
  const { columnaPorFila, filaPorColumna, cardinalidad } = emparejar(orden, esCero);
  const pendientes = columnaPorFila.flatMap((j, i) => j === -1 ? [i] : []);
  const filasVisitadas = new Set(pendientes);
  const columnasVisitadas = new Set<number>();
  for (let k = 0; k < pendientes.length; k++) {
    const i = pendientes[k];
    for (let j = 0; j < orden; j++) {
      if (columnaPorFila[i] === j || columnasVisitadas.has(j) || !esCero(i, j)) continue;
      columnasVisitadas.add(j);
      const siguiente = filaPorColumna[j];
      if (siguiente !== -1 && !filasVisitadas.has(siguiente)) {
        filasVisitadas.add(siguiente);
        pendientes.push(siguiente);
      }
    }
  }

  return {
    filas: columnaPorFila.flatMap((_, i) => filasVisitadas.has(i) ? [] : [i]),
    columnas: [...columnasVisitadas].sort((a, b) => a - b),
    cardinalidad,
    columnaPorFila,
  };
}

export function resolverAsignacion(
  original: MatrizAsignacion<Frac>,
  objetivo: 'min' | 'max'
): ResultadoAsignacion<Frac> {
  const m = original.length;
  const n = original[0]?.length ?? 0;
  if (m === 0 || n === 0 || original.some(fila => fila.length !== n)) {
    throw new Error('La matriz debe ser rectangular y no vacía.');
  }

  const orden = Math.max(m, n);
  const pasos: PasoAsignacion<Frac>[] = [{ tipo: 'original', matriz: original }];
  let matriz = original;
  if (objetivo === 'max') {
    // Toda asignación completa usa exactamente min(m, n) parejas reales.
    // Por eso la conversión conserva el óptimo sin transformar los ceros ficticios.
    const maximo = extremo(original.flat(), true);
    matriz = original.map(fila => fila.map(valor =>
      valor === null || maximo === null ? null : maximo.sub(valor)
    ));
    pasos.push({ tipo: 'conversion', matriz, maximo });
  }
  if (m !== n) {
    const real = matriz;
    matriz = Array.from({ length: orden }, (_, i) =>
      Array.from({ length: orden }, (_, j) => i < m && j < n ? real[i][j] : Frac.CERO)
    );
    pasos.push({ tipo: 'balanceo', matriz });
  }

  // Antes de buscar ceros, comprobar si las aristas permitidas admiten una
  // asignación completa. También detecta bloqueos colectivos (condición de Hall).
  const factible = emparejar(orden, (i, j) => matriz[i][j] !== null);
  if (factible.cardinalidad < orden) {
    pasos.push({ tipo: 'infactible', matriz, cardinalidad: factible.cardinalidad });
    return { estado: 'infactible', objetivo, m, n, iteraciones: 0, valorObjetivo: null, asignaciones: [], pasos };
  }

  // El emparejamiento perfecto permitido garantiza un mínimo finito en
  // cada fila y columna. Las matrices de la traza nunca se mutan.
  const minimosFilas = matriz.map(fila => extremo(fila)!);
  matriz = matriz.map((fila, i) => fila.map(valor => valor?.sub(minimosFilas[i]) ?? null));
  pasos.push({ tipo: 'filas', matriz, minimos: minimosFilas });

  const minimosColumnas = matriz[0].map((_, j) => extremo(matriz.map(fila => fila[j]))!);
  matriz = matriz.map(fila => fila.map((valor, j) => valor?.sub(minimosColumnas[j]) ?? null));
  pasos.push({ tipo: 'columnas', matriz, minimos: minimosColumnas });

  let iteraciones = 0;
  for (;;) {
    const { filas, columnas, cardinalidad, columnaPorFila } = cubrirCeros(matriz);
    pasos.push({ tipo: 'cobertura', matriz, iteracion: iteraciones + 1, filas, columnas });
    if (cardinalidad === orden) {
      const asignaciones = columnaPorFila.map((j, i) => {
        const ficticia = i >= m || j >= n;
        return { i, j, ficticia, valor: ficticia ? Frac.CERO : original[i][j]! };
      });
      const valorObjetivo = asignaciones.reduce((total, celda) => total.add(celda.valor), Frac.CERO);
      pasos.push({ tipo: 'asignacion', matriz, celdas: asignaciones.map(({ i, j }) => ({ i, j })) });
      return { estado: 'optimo', objetivo, m, n, iteraciones, valorObjetivo, asignaciones, pasos };
    }

    const filasCubiertas = new Set(filas);
    const columnasCubiertas = new Set(columnas);
    const minimo = extremo(matriz.flatMap((fila, i) =>
      filasCubiertas.has(i) ? [] : fila.filter((_, j) => !columnasCubiertas.has(j))
    ));
    // Con menos de «orden» líneas, un emparejamiento permitido perfecto
    // no puede quedar cubierto entero. Ningún cero queda fuera de la cobertura.
    if (!minimo?.esPositivo) throw new Error('No se encontró un ajuste positivo en la matriz factible.');
    matriz = matriz.map((fila, i) => fila.map((valor, j) => {
      if (valor === null) return null;
      const filaCubierta = filasCubiertas.has(i);
      const columnaCubierta = columnasCubiertas.has(j);
      if (filaCubierta !== columnaCubierta) return valor;
      return filaCubierta ? valor.add(minimo) : valor.sub(minimo);
    }));
    pasos.push({ tipo: 'ajuste', matriz, iteracion: ++iteraciones, minimo });
  }
}
