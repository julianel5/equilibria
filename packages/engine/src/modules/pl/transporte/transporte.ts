import { Frac } from '../simplex/fraction';

/**
 * Modelo de transporte resuelto con aritmética exacta (BigInt).
 *
 * El motor sigue el esquema clásico de dos etapas:
 *   1. Solución inicial factible: Esquina Noroeste, Costo Mínimo o Vogel.
 *   2. Optimización por MODI/UV (potenciales u_i, v_j y costos reducidos).
 *
 * Supuestos y extensiones soportadas:
 *   - Modelo desbalanceado: se añade un origen o destino ficticio con costo 0.
 *   - Maximización: se optimiza con c' = -c (minimización) y se reporta el
 *     valor original.
 *   - Rutas prohibidas: nunca reciben flujo y no pueden entrar a la base.
 *   - Degeneración: si la solución inicial tiene menos de m + n - 1 celdas
 *     básicas, se completan con celdas de flujo 0 que no formen ciclos.
 */

export type MetodoInicialTransporte = 'noroeste' | 'costo-minimo' | 'vogel';
export type AjusteTransporte = 'ninguno' | 'oferta-ficticia' | 'demanda-ficticia';

export interface CeldaTransporte {
  i: number;
  j: number;
}

export interface CeldaCicloTransporte extends CeldaTransporte {
  signo: 1 | -1;
  cantidad: Frac;
}

export interface IteracionTransporteCore {
  iteracion: number;
  asignacion: Frac[][];
  basicas: boolean[][];
  u: Frac[];
  v: Frac[];
  reducidos: (Frac | null)[][];
  uM: Frac[] | null;
  vM: Frac[] | null;
  reducidosM: (Frac | null)[][] | null;
  flujoProhibido: Frac;
  entra: CeldaTransporte | null;
  ciclo: CeldaCicloTransporte[];
  theta: Frac | null;
  sale: CeldaTransporte | null;
  costo: Frac;
  optimo: boolean;
}

export interface ComparacionInicialCore {
  metodo: MetodoInicialTransporte;
  factible: boolean;
  costo: Frac | null;
}

export interface ResultadoTransporteCore {
  estado: 'optimo' | 'infactible' | 'limite-iteraciones' | 'inconcluso';
  mensaje: string;
  m: number;
  n: number;
  balanceado: boolean;
  ajuste: AjusteTransporte;
  metodoSolicitado: MetodoInicialTransporte;
  metodoUsado: MetodoInicialTransporte;
  maximizar: boolean;
  costosOriginales: Frac[][];
  costosTrabajo: Frac[][];
  oferta: Frac[];
  demanda: Frac[];
  prohibidas: boolean[][];
  origenFicticio: boolean[];
  destinoFicticio: boolean[];
  comparacion: ComparacionInicialCore[];
  fasePenalizada: boolean;
  iteraciones: IteracionTransporteCore[];
  asignacion: Frac[][];
  costo: Frac;
}

const LIMITE_ITERACIONES = 500;

function matrizCeros(m: number, n: number): Frac[][] {
  return Array.from({ length: m }, () => new Array<Frac>(n).fill(Frac.CERO));
}

function matrizBooleanos(m: number, n: number, valor = false): boolean[][] {
  return Array.from({ length: m }, () => new Array<boolean>(n).fill(valor));
}

function suma(xs: Frac[]): Frac {
  return xs.reduce((acc, x) => acc.add(x), Frac.CERO);
}

function minimo(a: Frac, b: Frac): Frac {
  return a.cmp(b) <= 0 ? a : b;
}

function costTotal(costos: Frac[][], x: Frac[][]): Frac {
  let total = Frac.CERO;
  for (let i = 0; i < costos.length; i++) {
    for (let j = 0; j < costos[i].length; j++) {
      if (!x[i][j].esCero) total = total.add(costos[i][j].mul(x[i][j]));
    }
  }
  return total;
}

function hayPendientes(s: Frac[], d: Frac[]): boolean {
  return s.some((v) => v.signo > 0) || d.some((v) => v.signo > 0);
}

// ---------------------------------------------------------------------------
// Soluciones iniciales
// ---------------------------------------------------------------------------

function metodoNoroeste(
  costos: Frac[][],
  oferta: Frac[],
  demanda: Frac[],
  prohibidas: boolean[][]
): Frac[][] | null {
  const m = oferta.length;
  const n = demanda.length;
  const x = matrizCeros(m, n);
  const s = [...oferta];
  const d = [...demanda];

  // Recorrido fila por fila: en cada celda permitida se asigna el máximo
  // posible. Sin rutas prohibidas coincide exactamente con la Esquina Noroeste.
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (s[i].signo <= 0) break;
      if (d[j].signo <= 0) continue;
      if (prohibidas[i][j]) continue;
      const cantidad = minimo(s[i], d[j]);
      x[i][j] = cantidad;
      s[i] = s[i].sub(cantidad);
      d[j] = d[j].sub(cantidad);
    }
  }
  return hayPendientes(s, d) ? null : x;
}

function metodoCostoMinimo(
  costos: Frac[][],
  oferta: Frac[],
  demanda: Frac[],
  prohibidas: boolean[][]
): Frac[][] | null {
  const m = oferta.length;
  const n = demanda.length;
  const x = matrizCeros(m, n);
  const s = [...oferta];
  const d = [...demanda];

  while (hayPendientes(s, d)) {
    let mejorI = -1;
    let mejorJ = -1;
    for (let i = 0; i < m; i++) {
      if (s[i].signo <= 0) continue;
      for (let j = 0; j < n; j++) {
        if (d[j].signo <= 0 || prohibidas[i][j]) continue;
        if (
          mejorI < 0 ||
          costos[i][j].cmp(costos[mejorI][mejorJ]) < 0 ||
          (costos[i][j].cmp(costos[mejorI][mejorJ]) === 0 &&
            (i < mejorI || (i === mejorI && j < mejorJ)))
        ) {
          mejorI = i;
          mejorJ = j;
        }
      }
    }
    if (mejorI < 0) return null;
    const cantidad = minimo(s[mejorI], d[mejorJ]);
    x[mejorI][mejorJ] = x[mejorI][mejorJ].add(cantidad);
    s[mejorI] = s[mejorI].sub(cantidad);
    d[mejorJ] = d[mejorJ].sub(cantidad);
  }
  return x;
}

interface Penalidad {
  tipo: 'fila' | 'columna';
  indice: number;
  valor: Frac;
}

function metodoVogel(
  costos: Frac[][],
  oferta: Frac[],
  demanda: Frac[],
  prohibidas: boolean[][]
): Frac[][] | null {
  const m = oferta.length;
  const n = demanda.length;
  const x = matrizCeros(m, n);
  const s = [...oferta];
  const d = [...demanda];

  const penalidad = (valores: Frac[]): Frac | null => {
    if (valores.length === 0) return null;
    const ordenados = [...valores].sort((a, b) => a.cmp(b));
    if (ordenados.length === 1) return ordenados[0];
    return ordenados[1].sub(ordenados[0]);
  };

  while (hayPendientes(s, d)) {
    const filas: Penalidad[] = [];
    for (let i = 0; i < m; i++) {
      if (s[i].signo <= 0) continue;
      const disponibles: Frac[] = [];
      for (let j = 0; j < n; j++) {
        if (d[j].signo > 0 && !prohibidas[i][j]) disponibles.push(costos[i][j]);
      }
      const p = penalidad(disponibles);
      if (p === null) return null;
      filas.push({ tipo: 'fila', indice: i, valor: p });
    }

    const columnas: Penalidad[] = [];
    for (let j = 0; j < n; j++) {
      if (d[j].signo <= 0) continue;
      const disponibles: Frac[] = [];
      for (let i = 0; i < m; i++) {
        if (s[i].signo > 0 && !prohibidas[i][j]) disponibles.push(costos[i][j]);
      }
      const p = penalidad(disponibles);
      if (p === null) return null;
      columnas.push({ tipo: 'columna', indice: j, valor: p });
    }

    const candidatas = [...filas, ...columnas];
    if (candidatas.length === 0) return null;

    let elegida = candidatas[0];
    for (const c of candidatas) {
      if (c.valor.cmp(elegida.valor) > 0) elegida = c;
      // Desempate determinista: filas antes que columnas y menor índice.
      else if (c.valor.cmp(elegida.valor) === 0) {
        if (elegida.tipo === 'columna' && c.tipo === 'fila') elegida = c;
        else if (elegida.tipo === c.tipo && c.indice < elegida.indice) elegida = c;
      }
    }

    let mejorI = -1;
    let mejorJ = -1;
    if (elegida.tipo === 'fila') {
      const i = elegida.indice;
      for (let j = 0; j < n; j++) {
        if (d[j].signo <= 0 || prohibidas[i][j]) continue;
        if (mejorJ < 0 || costos[i][j].cmp(costos[i][mejorJ]) < 0) mejorJ = j;
      }
      mejorI = i;
    } else {
      const j = elegida.indice;
      for (let i = 0; i < m; i++) {
        if (s[i].signo <= 0 || prohibidas[i][j]) continue;
        if (mejorI < 0 || costos[i][j].cmp(costos[mejorI][j]) < 0) mejorI = i;
      }
      mejorJ = j;
    }
    if (mejorI < 0 || mejorJ < 0) return null;

    const cantidad = minimo(s[mejorI], d[mejorJ]);
    x[mejorI][mejorJ] = x[mejorI][mejorJ].add(cantidad);
    s[mejorI] = s[mejorI].sub(cantidad);
    d[mejorJ] = d[mejorJ].sub(cantidad);
  }

  return x;
}

function resolverInicial(
  metodo: MetodoInicialTransporte,
  costos: Frac[][],
  oferta: Frac[],
  demanda: Frac[],
  prohibidas: boolean[][]
): Frac[][] | null {
  if (metodo === 'noroeste') return metodoNoroeste(costos, oferta, demanda, prohibidas);
  if (metodo === 'costo-minimo') return metodoCostoMinimo(costos, oferta, demanda, prohibidas);
  return metodoVogel(costos, oferta, demanda, prohibidas);
}

// ---------------------------------------------------------------------------
// MODI / UV
// ---------------------------------------------------------------------------

/** Completa la base hasta m + n - 1 celdas sin formar ciclos (flujo 0). */
function completarBase(x: Frac[][], permitidas: boolean[][], m: number, n: number): boolean[][] {
  const basicas = x.map((fila) => fila.map((v) => v.signo > 0));
  let total = basicas.reduce((acc, fila) => acc + fila.filter(Boolean).length, 0);
  if (total >= m + n - 1) return basicas;

  const padre = Array.from({ length: m + n }, (_, i) => i);
  const buscar = (a: number): number => {
    let raiz = a;
    while (padre[raiz] !== raiz) raiz = padre[raiz];
    while (padre[a] !== a) {
      const siguiente = padre[a];
      padre[a] = raiz;
      a = siguiente;
    }
    return raiz;
  };
  const unir = (a: number, b: number): void => {
    const ra = buscar(a);
    const rb = buscar(b);
    if (ra !== rb) padre[ra] = rb;
  };

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (basicas[i][j]) unir(i, m + j);
    }
  }

  for (let i = 0; i < m && total < m + n - 1; i++) {
    for (let j = 0; j < n && total < m + n - 1; j++) {
      if (basicas[i][j] || !permitidas[i][j]) continue;
      if (buscar(i) !== buscar(m + j)) {
        basicas[i][j] = true;
        unir(i, m + j);
        total++;
      }
    }
  }
  return basicas;
}

interface Potenciales {
  u: Frac[];
  v: Frac[];
  reducidos: (Frac | null)[][];
}

function calcularPotenciales(
  costos: Frac[][],
  basicas: boolean[][],
  permitidas: boolean[][],
  m: number,
  n: number
): Potenciales {
  const u: (Frac | null)[] = new Array<Frac | null>(m).fill(null);
  const v: (Frac | null)[] = new Array<Frac | null>(n).fill(null);

  for (let inicio = 0; inicio < m; inicio++) {
    if (u[inicio] !== null) continue;
    u[inicio] = Frac.CERO;
    const cola: number[] = [inicio];
    while (cola.length > 0) {
      const nodo = cola.shift()!;
      if (nodo < m) {
        const i = nodo;
        for (let j = 0; j < n; j++) {
          if (basicas[i][j] && v[j] === null) {
            v[j] = costos[i][j].sub(u[i]!);
            cola.push(m + j);
          }
        }
      } else {
        const j = nodo - m;
        for (let i = 0; i < m; i++) {
          if (basicas[i][j] && u[i] === null) {
            u[i] = costos[i][j].sub(v[j]!);
            cola.push(i);
          }
        }
      }
    }
  }

  const uu = u.map((valor) => valor ?? Frac.CERO);
  const vv = v.map((valor) => valor ?? Frac.CERO);
  const reducidos: (Frac | null)[][] = Array.from({ length: m }, () =>
    new Array<Frac | null>(n).fill(null)
  );
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (basicas[i][j] || !permitidas[i][j]) continue;
      reducidos[i][j] = costos[i][j].sub(uu[i].add(vv[j]));
    }
  }
  return { u: uu, v: vv, reducidos };
}

function buscarEntrada(reducidos: (Frac | null)[][], coefM: (Frac | null)[][] | null, m: number, n: number): CeldaTransporte | null {
  // Bland en orden fila/columna; primero se compara el coeficiente de M.
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const r = reducidos[i][j];
      if (r !== null && ((coefM?.[i][j]?.signo ?? 0) || r.signo) < 0) return { i, j };
    }
  }
  return null;
}

/** Ciclo alternado que se forma al añadir la celda entrante a la base. */
function buscarCiclo(
  entra: CeldaTransporte,
  basicas: boolean[][],
  m: number,
  n: number
): CeldaTransporte[] | null {
  const inicio = m + entra.j;
  const objetivo = entra.i;
  const vistos = new Set<number>([inicio]);
  const padre = new Map<number, { previo: number; i: number; j: number }>();
  const cola: number[] = [inicio];

  while (cola.length > 0) {
    const nodo = cola.shift()!;
    if (nodo === objetivo) break;
    if (nodo < m) {
      const i = nodo;
      for (let j = 0; j < n; j++) {
        if (!basicas[i][j]) continue;
        const siguiente = m + j;
        if (vistos.has(siguiente)) continue;
        vistos.add(siguiente);
        padre.set(siguiente, { previo: nodo, i, j });
        cola.push(siguiente);
      }
    } else {
      const j = nodo - m;
      for (let i = 0; i < m; i++) {
        if (!basicas[i][j]) continue;
        if (vistos.has(i)) continue;
        vistos.add(i);
        padre.set(i, { previo: nodo, i, j });
        cola.push(i);
      }
    }
  }

  if (!vistos.has(objetivo)) return null;

  const camino: CeldaTransporte[] = [];
  let actual = objetivo;
  while (actual !== inicio) {
    const p = padre.get(actual);
    if (!p) return null;
    camino.push({ i: p.i, j: p.j });
    actual = p.previo;
  }
  camino.reverse();
  return camino;
}

function construirCiclo(
  entra: CeldaTransporte,
  camino: CeldaTransporte[],
  x: Frac[][]
): CeldaCicloTransporte[] {
  const ciclo: CeldaCicloTransporte[] = [
    { i: entra.i, j: entra.j, signo: 1, cantidad: x[entra.i][entra.j] },
  ];
  camino.forEach((celda, indice) => {
    ciclo.push({
      i: celda.i,
      j: celda.j,
      signo: indice % 2 === 0 ? -1 : 1,
      cantidad: x[celda.i][celda.j],
    });
  });
  return ciclo;
}

// ---------------------------------------------------------------------------
// Resolución completa
// ---------------------------------------------------------------------------

export interface EntradaTransporteCore {
  costos: Frac[][];
  oferta: Frac[];
  demanda: Frac[];
  prohibidas?: boolean[][];
  metodoInicial?: MetodoInicialTransporte;
  maximizar?: boolean;
}

const ORDEN_METODOS: MetodoInicialTransporte[] = ['vogel', 'costo-minimo', 'noroeste'];

export function resolverTransporte(entrada: EntradaTransporteCore): ResultadoTransporteCore {
  const metodoSolicitado = entrada.metodoInicial ?? 'vogel';
  const maximizar = entrada.maximizar === true;

  // 1) Balance del modelo.
  const ofertaOriginal = entrada.oferta;
  const demandaOriginal = entrada.demanda;
  const totalOferta = suma(ofertaOriginal);
  const totalDemanda = suma(demandaOriginal);

  let ajuste: AjusteTransporte = 'ninguno';
  let oferta = [...ofertaOriginal];
  let demanda = [...demandaOriginal];
  let costosOriginales = entrada.costos.map((fila) => [...fila]);
  let prohibidas = (entrada.prohibidas ?? matrizBooleanos(entrada.costos.length, entrada.costos[0]?.length ?? 0)).map(
    (fila) => [...fila]
  );

  if (totalOferta.cmp(totalDemanda) > 0) {
    // Sobra oferta: destino ficticio que absorbe el excedente.
    ajuste = 'demanda-ficticia';
    const excedente = totalOferta.sub(totalDemanda);
    demanda = [...demanda, excedente];
    costosOriginales = costosOriginales.map((fila) => [...fila, Frac.CERO]);
    prohibidas = prohibidas.map((fila) => [...fila, false]);
  } else if (totalOferta.cmp(totalDemanda) < 0) {
    // Falta oferta: origen ficticio que cubre el déficit.
    ajuste = 'oferta-ficticia';
    const deficit = totalDemanda.sub(totalOferta);
    oferta = [...oferta, deficit];
    costosOriginales = [...costosOriginales, new Array<Frac>(demanda.length).fill(Frac.CERO)];
    prohibidas = [...prohibidas, new Array<boolean>(demanda.length).fill(false)];
  }

  const m = oferta.length;
  const n = demanda.length;
  const balanceado = ajuste === 'ninguno';

  const origenFicticio = Array.from({ length: m }, (_, i) => i >= ofertaOriginal.length);
  const destinoFicticio = Array.from({ length: n }, (_, j) => j >= demandaOriginal.length);

  const permitidas = prohibidas.map((fila) => fila.map((p) => !p));
  const costosTrabajo = maximizar
    ? costosOriginales.map((fila) => fila.map((c) => c.neg()))
    : costosOriginales.map((fila) => [...fila]);

  // 2) Comparación de los tres métodos iniciales.
  const comparacion: ComparacionInicialCore[] = ORDEN_METODOS.map((metodo) => {
    const x = resolverInicial(metodo, costosTrabajo, oferta, demanda, prohibidas);
    return {
      metodo,
      factible: x !== null,
      costo: x ? costTotal(costosOriginales, x) : null,
    };
  });

  // 3) Solución inicial: el método pedido; si falla por las prohibiciones, se
  //    recurre a otro y, si ninguno sirve, permite las rutas con Gran M.
  let x = resolverInicial(metodoSolicitado, costosTrabajo, oferta, demanda, prohibidas);
  let metodoUsado = metodoSolicitado;
  let notaMetodo = '';
  if (x === null) {
    for (const metodo of ORDEN_METODOS) {
      if (metodo === metodoSolicitado) continue;
      const alterna = resolverInicial(metodo, costosTrabajo, oferta, demanda, prohibidas);
      if (alterna !== null) {
        x = alterna;
        metodoUsado = metodo;
        notaMetodo = ` El método ${etiquetaMetodo(metodoSolicitado)} no encontró una asignación factible; se usó ${etiquetaMetodo(metodo)}.`;
        break;
      }
    }
  }

  const fasePenalizada = x === null;
  const habilitadas = fasePenalizada ? matrizBooleanos(m, n, true) : permitidas;
  const coefM = fasePenalizada
    ? prohibidas.map(fila => fila.map(p => p ? Frac.UNO : Frac.CERO))
    : null;
  if (fasePenalizada) {
    // Sobre la red completa y balanceada Noroeste siempre da una base factible.
    x = metodoNoroeste(costosTrabajo, oferta, demanda, matrizBooleanos(m, n));
    metodoUsado = 'noroeste';
    notaMetodo = ' Se inició con Esquina Noroeste y una penalización simbólica M en las rutas prohibidas.';
  }
  if (x === null) throw new Error('No se pudo construir una base inicial para el transporte balanceado.');

  // 4) MODI/UV: se repite hasta que todos los costos reducidos sean ≥ 0.
  let actual: Frac[][] = x;
  let base = completarBase(actual, habilitadas, m, n);
  const iteraciones: IteracionTransporteCore[] = [];
  let iteracion = 0;
  let estado: ResultadoTransporteCore['estado'] = 'limite-iteraciones';
  while (iteracion <= LIMITE_ITERACIONES) {
    const basicas = base;
    const { u, v, reducidos } = calcularPotenciales(costosTrabajo, basicas, habilitadas, m, n);
    const penalizacion = coefM ? calcularPotenciales(coefM, basicas, habilitadas, m, n) : null;
    const entra = buscarEntrada(reducidos, penalizacion?.reducidos ?? null, m, n);
    const costo = costTotal(costosOriginales, actual);
    const flujoProhibido = coefM ? costTotal(coefM, actual) : Frac.CERO;
    const simbolico = { uM: penalizacion?.u ?? null, vM: penalizacion?.v ?? null,
      reducidosM: penalizacion?.reducidos ?? null, flujoProhibido };

    if (entra === null) {
      estado = flujoProhibido.esPositivo ? 'infactible' : 'optimo';
      iteraciones.push({
        iteracion,
        asignacion: actual.map((fila) => [...fila]),
        basicas,
        u,
        v,
        reducidos,
        ...simbolico,
        entra: null,
        ciclo: [],
        theta: null,
        sale: null,
        costo,
        optimo: estado === 'optimo',
      });
      break;
    }
    if (iteracion === LIMITE_ITERACIONES) break;

    const camino = buscarCiclo(entra, basicas, m, n);
    if (camino === null) {
      iteraciones.push({
        iteracion,
        asignacion: actual.map((fila) => [...fila]),
        basicas,
        u,
        v,
        reducidos,
        ...simbolico,
        entra,
        ciclo: [],
        theta: null,
        sale: null,
        costo,
        optimo: false,
      });
      estado = 'inconcluso';
      break;
    }

    const ciclo = construirCiclo(entra, camino, actual);
    let theta: Frac | null = null;
    let indiceSale = -1;
    ciclo.forEach((celda, indice) => {
      if (celda.signo !== -1) return;
      const anterior = ciclo[indiceSale];
      if (theta === null || celda.cantidad.cmp(theta) < 0 ||
        (celda.cantidad.equals(theta) && celda.i * n + celda.j < anterior.i * n + anterior.j)) {
        theta = celda.cantidad;
        indiceSale = indice;
      }
    });
    const saliente = indiceSale >= 0 ? ciclo[indiceSale] : null;
    const t = theta ?? Frac.CERO;

    const nueva: Frac[][] = actual.map((fila) => [...fila]);
    ciclo.forEach((celda) => {
      nueva[celda.i][celda.j] =
        celda.signo === 1
          ? nueva[celda.i][celda.j].add(t)
          : nueva[celda.i][celda.j].sub(t);
    });

    iteraciones.push({
      iteracion,
      asignacion: actual.map((fila) => [...fila]),
      basicas,
      u,
      v,
      reducidos,
      ...simbolico,
      entra,
      ciclo,
      theta: t,
      sale: saliente ? { i: saliente.i, j: saliente.j } : null,
      costo,
      optimo: false,
    });

    // La base se conserva entre iteraciones: el pivoteo degenerado (θ = 0)
    // cambia la celda básica aunque la asignación no cambie.
    const nuevaBase = base.map((fila) => [...fila]);
    nuevaBase[entra.i][entra.j] = true;
    if (saliente) nuevaBase[saliente.i][saliente.j] = false;
    base = nuevaBase;
    actual = nueva;
    iteracion++;
  }

  const costoFinal = costTotal(costosOriginales, actual);
  const mensaje = estado === 'optimo'
    ? `Solución óptima con ${etiquetaMetodo(metodoUsado)} como método inicial.${notaMetodo}`
    : estado === 'infactible'
      ? 'No existe una asignación factible con las rutas permitidas: el flujo prohibido mínimo es positivo.'
      : estado === 'limite-iteraciones'
        ? 'Se alcanzó el límite de iteraciones sin certificar la optimalidad.'
        : 'No se encontró un ciclo de pivoteo; el resultado es inconcluso.';

  return {
    estado,
    mensaje,
    m,
    n,
    balanceado,
    ajuste,
    metodoSolicitado,
    metodoUsado,
    maximizar,
    costosOriginales,
    costosTrabajo,
    oferta,
    demanda,
    prohibidas,
    origenFicticio,
    destinoFicticio,
    comparacion,
    fasePenalizada,
    iteraciones,
    asignacion: actual,
    costo: costoFinal,
  };
}

export function etiquetaMetodo(metodo: MetodoInicialTransporte): string {
  if (metodo === 'noroeste') return 'Esquina Noroeste';
  if (metodo === 'costo-minimo') return 'Costo Mínimo';
  return 'Aproximación de Vogel';
}
