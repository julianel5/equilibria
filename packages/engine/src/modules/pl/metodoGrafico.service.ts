import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Método Gráfico y Enumerativo de Programación Lineal
// ═══════════════════════════════════════════════════════════════════════════════
//
// Resolución del problema (2 variables):
//
//   opt Z = c1·x1 + c2·x2          (MAX o MIN)
//   s.a.  a1·x1 + a2·x2 { <=, >=, = } rhs
//
// El algoritmo enumera los vértices de la región factible tal y como se hace a
// mano sobre una hoja:
//
//   Fase 0 (Inyección perimetral).  Se incorporan automáticamente las
//     restricciones de no negatividad  x1 ≥ 0, x2 ≥ 0  y una caja límite
//     dinámica  x1 ≤ M, x2 ≤ M  como defensa ante problemas no acotados (si el
//     óptimo "toca" la caja, el problema es no acotado). El conjunto efectivo
//     de líneas incluye las restricciones del usuario más este perímetro. M se
//     deriva de los propios datos: con R_max el mayor intercepto con los ejes,
//     M = max(10⁶, 100·R_max), de modo que la caja nunca trunca problemas a gran escala.
//
//   Fase 1 (Intersecciones).  Se resuelve el sistema 2×2 de TODAS las
//     combinaciones de pares de líneas. Las líneas paralelas/coincidentes no
//     producen una intersección única y se registran.
//
//   Fase 2 (Filtro de factibilidad).  Cada intersección se evalúa contra TODAS
//     las restricciones efectivas (originales + perímetro): si incumple alguna,
//     se descarta registrando el id de la restricción violada (feedback
//     pedagógico). Si no queda ningún punto, el problema es infactible.
//
//   Fase 3 (Evaluación).  Se calcula Z en cada vértice factible y se selecciona
//     el óptimo según MAX/MIN.
//
//   Fase 4 (Casos especiales).  Si el vértice óptimo cae sobre la caja límite
//     (x1 = M o x2 = M) el problema es no acotado. Si dos vértices
//     obtienen el mismo Z (tolerancia 1e−6) hay múltiples óptimos.
//
// La respuesta devuelve la región factible lista para graficar: vértices
// ordenados trigonométricamente alrededor de su centroide (polígono convexo sin
// cruces) mediante Math.atan2, junto con el segmento de descartes y su motivo.
//
// Limitación documentada: la caja M = max(10⁶, 100·R_max) escala con los datos
// del usuario (e.g. 30.000 → M = 3.000.000) pero siempre dista un factor 100 de
// R_max, por lo que ningún vértice de un problema acotado cae sobre ella; ayudar
// al estudiante no desborda el plano tipo catedra.
// ═══════════════════════════════════════════════════════════════════════════════

// --- Schema de validación (Zod) ---

export const FuncionObjetivoPLSchema = z.object({
  tipo: z.enum(['MAX', 'MIN'], { message: "El tipo de optimización debe ser 'MAX' o 'MIN'." }),
  c1: z.number({ message: 'El coeficiente c1 de x1 debe ser numérico.' }),
  c2: z.number({ message: 'El coeficiente c2 de x2 debe ser numérico.' }),
});

export const RestriccionPLSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, { message: 'El id de cada restricción no puede estar vacío.' }),
  x1: z.number({ message: 'El coeficiente de x1 de la restricción debe ser numérico.' }),
  x2: z.number({ message: 'El coeficiente de x2 de la restricción debe ser numérico.' }),
  operador: z.enum(['<=', '>=', '='], {
    message: "El operador de la restricción debe ser '<=', '>=' o '='.",
  }),
  rhs: z.number({ message: 'El lado derecho (rhs) de la restricción debe ser numérico.' }),
});

export const MetodoGraficoInputSchema = z.object({
  funcionObjetivo: FuncionObjetivoPLSchema,
  restricciones: z
    .array(RestriccionPLSchema)
    .min(1, { message: 'Se requiere al menos una restricción.' }),
});

export type MetodoGraficoInput = z.input<typeof MetodoGraficoInputSchema>;

// --- Estructura de resultados ---

export type TipoOptimizacionPL = 'MAX' | 'MIN';

export interface FuncionObjetivoPL {
  tipo: TipoOptimizacionPL;
  c1: number;
  c2: number;
}

export interface RestriccionPL {
  id: string;
  x1: number;
  x2: number;
  operador: '<=' | '>=' | '=';
  rhs: number;
}

export interface VerticePL {
  x1: number;
  x2: number;
  z: number;
  esVerticeOptimo: boolean;
  /** Referencia de las dos rectas (id) cuya intersección genera este vértice. */
  lineas: [string, string];
}

export interface InterseccionDescartadaPL {
  restriccionA: string;
  restriccionB: string;
  /** Referencia de las dos rectas (id) del cruce (recta1, recta2). */
  lineas: [string, string];
  /** Id de la restricción violada por el punto; null si no hubo intersección única. */
  violada: string | null;
  /** Punto hallado cuando sí existió intersección pero resultó infactible. */
  punto?: { x1: number; x2: number };
  motivo: string;
}

export interface LineaEfectivaPLResult {
  id: string;
  x1: number;
  x2: number;
  operador: '<=' | '>=' | '=';
  rhs: number;
}

export interface MetodoGraficoResult {
  funcionObjetivo: FuncionObjetivoPL;
  valorZ: number;
  /** Vértice óptimo único; array ordenado cuando hay múltiples óptimos. */
  verticeOptimo: VerticePL | VerticePL[];
  multiplesOptimos: boolean;
  /** Vértices factibles del polígono ordenados trigonométricamente (sin cruces). */
  verticesFactibles: VerticePL[];
  interseccionesDescartadas: InterseccionDescartadaPL[];
  /** Líneas efectivas (restricciones del usuario + perímetro inyectado) con sus coeficientes. */
  lineasEfectivas: LineaEfectivaPLResult[];
}

// --- Servicio ---

const CAJA_BASE = 1000000;      // límite inferior de la caja dinámica si los datos son pequeños
const EPS_PARALELAS = 1e-9;  // determinante menor a esto → líneas paralelas/coincidentes
const EPS_EVAL = 1e-6;       // holgura para considerar satisfecha una restricción >= / <= / =
const EPS_PUNTO = 1e-6;      // simultaneidad de dos vértices (dedupe)
const TOL_OPTIMO = 1e-6;     // tolerancia de punto flotante entre óptimos
const EPS_CAJA = 1e-4;       // margen para considerar que el óptimo "tocó" la caja límite

const redondear = (n: number, decimales = 6): number =>
  Math.round(n * 10 ** decimales) / 10 ** decimales;

interface LineaEfectivaPL {
  id: string;
  a: number;
  b: number;
  rhs: number;
  operador: '<=' | '>=' | '=';
}

/** Punto factible candidato que conserva la referencia de las dos rectas que lo generaron. */
interface PuntoConLineasPL {
  x1: number;
  x2: number;
  lineas: [string, string];
}

/**
 * Frontera dinámica (Dynamic Upper Bound): M = max(10⁶, 100·R_max), donde R_max
 * es el mayor intercepto con los ejes de las restricciones del usuario
 * (rhs/x1 y rhs/x2 para coeficientes estrictamente positivos). Así la caja
 * se escala con los datos y no trunca problemas grandes.
 */
function calcularFronteraCaja(restricciones: RestriccionPL[]): number {
  let rMax = 0;
  for (const r of restricciones) {
    if (r.x1 > 0) rMax = Math.max(rMax, r.rhs / r.x1);
    if (r.x2 > 0) rMax = Math.max(rMax, r.rhs / r.x2);
  }
  return Math.max(CAJA_BASE, redondear(rMax * 100, 4));
}

/** Ids internos de las dos rectas de la caja límite para el problema dado. */
function idsCaja(limite: number): [string, string] {
  return [`x1 <= ${limite}`, `x2 <= ${limite}`];
}

function construirLineasEfectivas(restricciones: RestriccionPL[], limiteCaja: number): LineaEfectivaPL[] {
  const lineas: LineaEfectivaPL[] = restricciones.map((r) => ({
    id: r.id,
    a: r.x1,
    b: r.x2,
    rhs: r.rhs,
    operador: r.operador,
  }));
  // Inyección perimetral: no negatividad + caja límite dinámica M.
  lineas.push(
    { id: 'x1 >= 0', a: 1, b: 0, rhs: 0, operador: '>=' },
    { id: 'x2 >= 0', a: 0, b: 1, rhs: 0, operador: '>=' },
    { id: idsCaja(limiteCaja)[0], a: 1, b: 0, rhs: limiteCaja, operador: '<=' },
    { id: idsCaja(limiteCaja)[1], a: 0, b: 1, rhs: limiteCaja, operador: '<=' }
  );
  return lineas;
}

/** Resuelve el sistema 2×2 de dos líneas; devuelve null si son paralelas/coincidentes. */
function interseccionDos(
  l1: LineaEfectivaPL,
  l2: LineaEfectivaPL
): { x1: number; x2: number } | null {
  const det = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(det) < EPS_PARALELAS) return null;
  const x1 = (l1.rhs * l2.b - l2.rhs * l1.b) / det;
  const x2 = (l1.a * l2.rhs - l2.a * l1.rhs) / det;
  return { x1, x2 };
}

/** Verifica que (x1, x2) cumpla todas las líneas; devuelve el id violado o null. */
function restriccionViolada(lineas: LineaEfectivaPL[], x1: number, x2: number): string | null {
  for (const l of lineas) {
    const valor = l.a * x1 + l.b * x2;
    if (l.operador === '<=') {
      if (valor > l.rhs + EPS_EVAL) return l.id;
    } else if (l.operador === '>=') {
      if (valor < l.rhs - EPS_EVAL) return l.id;
    } else if (Math.abs(valor - l.rhs) > EPS_EVAL) {
      return l.id;
    }
  }
  return null;
}

function puntoRepetido(puntos: Array<{ x1: number; x2: number }>, p: { x1: number; x2: number }): boolean {
  return puntos.some((q) => Math.abs(q.x1 - p.x1) < EPS_PUNTO && Math.abs(q.x2 - p.x2) < EPS_PUNTO);
}

/** Cierre convexo (monotone chain) que elimina colineales y puntos interiores espurios. */
function convexHull(puntos: PuntoConLineasPL[]): PuntoConLineasPL[] {
  const sorteados = [...puntos].sort((p, q) => p.x1 - q.x1 || p.x2 - q.x2);
  if (sorteados.length <= 2) return sorteados;

  const cruce = (o: PuntoConLineasPL, a: PuntoConLineasPL, b: PuntoConLineasPL) =>
    (a.x1 - o.x1) * (b.x2 - o.x2) - (a.x2 - o.x2) * (b.x1 - o.x1);

  const inferior: PuntoConLineasPL[] = [];
  for (const p of sorteados) {
    while (inferior.length >= 2 && cruce(inferior[inferior.length - 2], inferior[inferior.length - 1], p) <= 0)
      inferior.pop();
    inferior.push(p);
  }

  const superior: PuntoConLineasPL[] = [];
  for (let i = sorteados.length - 1; i >= 0; i -= 1) {
    const p = sorteados[i];
    while (superior.length >= 2 && cruce(superior[superior.length - 2], superior[superior.length - 1], p) <= 0)
      superior.pop();
    superior.push(p);
  }

  inferior.pop();
  superior.pop();
  return inferior.concat(superior);
}

/**
 * Ordena los vértices alrededor de su centroide (promedio de x1 y de x2) usando
 * Math.atan2(x2−cy, x1−cx). Para un polígono (convexo) nunca produce aristas
 * cruzadas y deja la figura lista para dibujar.
 */
function ordenarPorAnguloCentroide(puntos: PuntoConLineasPL[]): PuntoConLineasPL[] {
  if (puntos.length <= 2) return [...puntos].sort((a, b) => a.x1 - b.x1 || a.x2 - b.x2);
  const cx = puntos.reduce((acc, p) => acc + p.x1, 0) / puntos.length;
  const cy = puntos.reduce((acc, p) => acc + p.x2, 0) / puntos.length;
  return [...puntos]
    .map((p) => ({ p, angulo: Math.atan2(p.x2 - cy, p.x1 - cx) }))
    .sort((a, b) => a.angulo - b.angulo)
    .map(({ p }) => p);
}

export function calcularMetodoGrafico(input: MetodoGraficoInput): MetodoGraficoResult {
  const validated = MetodoGraficoInputSchema.parse(input);
  const { tipo, c1, c2 } = validated.funcionObjetivo;
  const limiteCaja = calcularFronteraCaja(validated.restricciones);
  const cajaIds = idsCaja(limiteCaja);
  const lineas = construirLineasEfectivas(validated.restricciones, limiteCaja);

  // ═══════════════════════════════════════════════════════════════════════════
  // Fase 1 y 2: intersecciones de todos los pares + filtro de factibilidad.
  // ═══════════════════════════════════════════════════════════════════════════
  const descartadas: InterseccionDescartadaPL[] = [];
  const puntosFactibles: PuntoConLineasPL[] = [];

  for (let i = 0; i < lineas.length - 1; i += 1) {
    for (let j = i + 1; j < lineas.length; j += 1) {
      const l1 = lineas[i];
      const l2 = lineas[j];
      const cruce = interseccionDos(l1, l2);

      if (cruce === null) {
        descartadas.push({
          restriccionA: l1.id,
          restriccionB: l2.id,
          lineas: [l1.id, l2.id],
          violada: null,
          motivo: 'Las restricciones son paralelas o coincidentes: no definen una intersección única.',
        });
        continue;
      }

      const violada = restriccionViolada(lineas, cruce.x1, cruce.x2);
      if (violada !== null) {
        descartadas.push({
          restriccionA: l1.id,
          restriccionB: l2.id,
          lineas: [l1.id, l2.id],
          violada,
          punto: { x1: redondear(cruce.x1), x2: redondear(cruce.x2) },
          motivo: `El punto violó la restricción "${violada}".`,
        });
        continue;
      }

      if (puntoRepetido(puntosFactibles, cruce)) continue;
      puntosFactibles.push({ x1: cruce.x1, x2: cruce.x2, lineas: [l1.id, l2.id] });
    }
  }

  // Fase 2: región vacía → infactible.
  if (puntosFactibles.length === 0) {
    throw new Error('El problema es infactible (no tiene área de solución)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Fase 3: polígono (hull convexo) y evaluación de Z en cada vértice.
  // ═══════════════════════════════════════════════════════════════════════════
  const poligono = ordenarPorAnguloCentroide(convexHull(puntosFactibles));

  const valorZEn = (x1: number, x2: number) => c1 * x1 + c2 * x2;

  const crudos = poligono.map((p) => ({
    x1: p.x1,
    x2: p.x2,
    z: valorZEn(p.x1, p.x2),
    lineas: p.lineas,
  }));

  // Óptimo numérico (crudo) para comparar con tolerancia de punto flotante.
  let mejor = crudos[0];
  for (const v of crudos) {
    const gana = tipo === 'MAX' ? v.z > mejor.z : v.z < mejor.z;
    if (gana) mejor = v;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Fase 4: casos especiales.
  // ═══════════════════════════════════════════════════════════════════════════
  // No acotado: el óptimo quedó sobre la caja límite inyectada (x = M).
  if (
    Math.abs(mejor.x1 - limiteCaja) <= EPS_CAJA ||
    Math.abs(mejor.x2 - limiteCaja) <= EPS_CAJA
  ) {
    throw new Error('La solución es no acotada');
  }

  // Múltiples óptimos: más de un vértice con el mismo Z (tolerancia 1e−6).
  const conFlag = crudos.map((v) => ({
    x1: redondear(v.x1),
    x2: redondear(v.x2),
    z: redondear(v.z),
    esVerticeOptimo: Math.abs(v.z - mejor.z) <= TOL_OPTIMO,
    lineas: v.lineas,
  }));
  const optimos = conFlag.filter((v) => v.esVerticeOptimo);
  const multiplesOptimos = optimos.length >= 2;

  // Fase 5 (payload pedagógico): el artificio de la caja límite (Límite M) se
  // omite de la lista de descartes; solo se muestran los cruces entre
  // restricciones del problema y los ejes de no negatividad. La detección es
  // dinámica: se excluyen los cruces cuyas rectas son de la caja M o cuyo
  // punto toca la frontera M (no un valor fijo como 10000).
  const tocaCaja = (id: string) => id === cajaIds[0] || id === cajaIds[1];
  const interseccionesDescartadas = descartadas.filter(
    (d) =>
      !tocaCaja(d.lineas[0]) &&
      !tocaCaja(d.lineas[1]) &&
      !(
        d.punto !== undefined &&
        (Math.abs(d.punto.x1 - limiteCaja) <= EPS_CAJA || Math.abs(d.punto.x2 - limiteCaja) <= EPS_CAJA)
      )
  );

  return {
    funcionObjetivo: { tipo, c1, c2 },
    valorZ: redondear(mejor.z),
    verticeOptimo: multiplesOptimos ? optimos : optimos[0],
    multiplesOptimos,
    verticesFactibles: conFlag,
    interseccionesDescartadas,
    lineasEfectivas: lineas.map((l) => ({ id: l.id, x1: l.a, x2: l.b, operador: l.operador, rhs: l.rhs })),
  };
}