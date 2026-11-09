/**
 * Tests de la detección de óptimos múltiples.
 *
 * 1. Casos conocidos: MAX y MIN con dos vértices óptimos, conjunto óptimo no
 *    acotado (rayo) y óptimo único.
 * 2. Problemas aleatorios MAX y MIN contra la enumeración de todos los vértices:
 *    se avisa si y solo si hay otro vértice con el mismo Z*, y la solución
 *    alternativa que se muestra es factible y óptima.
 */
import { calcularSimplex, Frac, type FraccionJSON } from '../../../src';

type Tipo = 'LE' | 'GE' | 'EQ';
interface Problema {
  objetivo: 'max' | 'min';
  funcionObjetivo: number[];
  restricciones: Array<{ coeficientes: number[]; tipo: Tipo; b: number }>;
}

const F = (v: number) => Frac.deDecimal(v);
const aFrac = (f: FraccionJSON) => new Frac(BigInt(f.num), BigInt(f.den));
const tex = (fs: FraccionJSON[] | null) => (fs ? fs.map((f) => (f.den === '1' ? f.num : `${f.num}/${f.den}`)) : null);

function esFactible(p: Problema, x: Frac[]): boolean {
  if (x.some((v) => v.esNegativo)) return false;
  return p.restricciones.every((r) => {
    const lhs = r.coeficientes.reduce((acc, a, j) => acc.add(F(a).mul(x[j])), Frac.CERO);
    const c = lhs.cmp(F(r.b));
    return r.tipo === 'LE' ? c <= 0 : r.tipo === 'GE' ? c >= 0 : c === 0;
  });
}
const valorZ = (p: Problema, x: Frac[]) => p.funcionObjetivo.reduce((acc, c, j) => acc.add(F(c).mul(x[j])), Frac.CERO);

// ---------------------------------------------------------------------------
// 1. Casos conocidos
// ---------------------------------------------------------------------------

describe('Óptimos múltiples — casos conocidos', () => {
  it('MAX: la función objetivo es paralela a una restricción activa', () => {
    const r = calcularSimplex({
      objetivo: 'max',
      funcionObjetivo: [3, 2],
      restricciones: [
        { coeficientes: [1, 0], b: 4 },
        { coeficientes: [0, 2], b: 12 },
        { coeficientes: [3, 2], b: 18 },
      ],
    });
    expect(r.optimosMultiples!.hay).toBe(true);
    expect(tex(r.solucion.map((f) => f))).toEqual(['4', '3']);
    expect(tex(r.optimosMultiples!.alternativa)).toEqual(['2', '6']);
    expect(r.procesos.some((p) => p.id === 'simplex-optimos-multiples')).toBe(true);
  });

  it('MIN con Gran M: segmento óptimo entre (3, 1) y (0, 4)', () => {
    const r = calcularSimplex({
      objetivo: 'min',
      funcionObjetivo: [1, 1],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'GE', b: 4 },
        { coeficientes: [1, 0], tipo: 'LE', b: 3 },
      ],
    });
    expect(r.optimosMultiples!.hay).toBe(true);
    expect(tex(r.solucion)).toEqual(['3', '1']);
    expect(tex(r.optimosMultiples!.alternativa)).toEqual(['0', '4']);
  });

  it('conjunto óptimo no acotado: x2 puede crecer sin cambiar Z*', () => {
    const r = calcularSimplex({
      objetivo: 'max',
      funcionObjetivo: [2, 0],
      restricciones: [{ coeficientes: [1, 0], b: 4 }],
    });
    expect(r.estado).toBe('optimo');
    expect(r.optimosMultiples!.hay).toBe(true);
    expect(r.optimosMultiples!.alternativa).toBeNull();
    expect(tex(r.optimosMultiples!.rayo)).toEqual(['0', '1']);
  });

  it('óptimo único: no se avisa', () => {
    const r = calcularSimplex({
      objetivo: 'max',
      funcionObjetivo: [3, 5],
      restricciones: [
        { coeficientes: [1, 0], b: 4 },
        { coeficientes: [0, 2], b: 12 },
        { coeficientes: [3, 2], b: 18 },
      ],
    });
    expect(r.optimosMultiples!.hay).toBe(false);
    expect(r.procesos.some((p) => p.id === 'simplex-optimos-multiples')).toBe(false);
  });

  it('sin óptimo finito no hay análisis', () => {
    const r = calcularSimplex({
      objetivo: 'max',
      funcionObjetivo: [1, 1],
      restricciones: [{ coeficientes: [1, -1], b: 2 }],
    });
    expect(r.optimosMultiples).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Problemas aleatorios contra enumeración de vértices
// ---------------------------------------------------------------------------

function prng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolverSistema(A: Frac[][], b: Frac[]): Frac[] | null {
  const n = A.length;
  const M = A.map((fila, i) => [...fila, b[i]]);
  for (let col = 0; col < n; col++) {
    const piv = M.findIndex((fila, i) => i >= col && !fila[col].esCero);
    if (piv === -1) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const p = M[col][col];
    M[col] = M[col].map((v) => v.div(p));
    for (let i = 0; i < n; i++) {
      if (i === col || M[i][col].esCero) continue;
      const f = M[i][col];
      M[i] = M[i].map((v, j) => v.sub(f.mul(M[col][j])));
    }
  }
  return M.map((fila) => fila[n]);
}

function combinaciones(total: number, k: number): number[][] {
  const res: number[][] = [];
  const rec = (inicio: number, actual: number[]) => {
    if (actual.length === k) return void res.push([...actual]);
    for (let i = inicio; i < total; i++) rec(i + 1, [...actual, i]);
  };
  rec(0, []);
  return res;
}

/** Vértices factibles distintos de la región. */
function vertices(p: Problema): Frac[][] {
  const n = p.funcionObjetivo.length;
  const planos = [
    ...p.restricciones.map((r) => ({ a: r.coeficientes.map(F), b: F(r.b) })),
    ...Array.from({ length: n }, (_, j) => ({
      a: Array.from({ length: n }, (_, k) => (k === j ? Frac.UNO : Frac.CERO)),
      b: Frac.CERO,
    })),
  ];
  const out: Frac[][] = [];
  for (const comb of combinaciones(planos.length, n)) {
    const x = resolverSistema(comb.map((i) => planos[i].a), comb.map((i) => planos[i].b));
    if (!x || !esFactible(p, x)) continue;
    if (!out.some((v) => v.every((vi, j) => vi.equals(x[j])))) out.push(x);
  }
  return out;
}

function problemaAleatorio(rnd: () => number, objetivo: 'max' | 'min'): Problema {
  const entero = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const n = entero(2, 3);
  const m = entero(2, 4);
  const tipos: Tipo[] = ['LE', 'LE', 'GE', 'GE', 'EQ'];
  const restricciones = Array.from({ length: m }, (_, i) => {
    const acotadora = i === 0 && objetivo === 'max';
    const coeficientes = Array.from({ length: n }, () => (acotadora ? entero(1, 4) : entero(0, 4)));
    if (!coeficientes.some((c) => c !== 0)) coeficientes[0] = 1;
    return { coeficientes, tipo: acotadora ? ('LE' as Tipo) : tipos[entero(0, 4)], b: entero(1, 12) };
  });
  // Coeficientes chicos y a veces copiados de una restricción, para que los
  // empates (óptimos múltiples) aparezcan con frecuencia.
  let funcionObjetivo = Array.from({ length: n }, () => entero(objetivo === 'min' ? 0 : -1, 4));
  if (rnd() < 0.4) funcionObjetivo = [...restricciones[entero(0, m - 1)].coeficientes];
  if (!funcionObjetivo.some((c) => c !== 0)) funcionObjetivo[0] = 1;
  return { objetivo, funcionObjetivo, restricciones };
}

describe('Óptimos múltiples — problemas aleatorios vs. enumeración de vértices', () => {
  for (const objetivo of ['max', 'min'] as const) {
    it(`${objetivo.toUpperCase()}: se avisa exactamente cuando hay otro óptimo`, () => {
      const rnd = prng(objetivo === 'max' ? 777 : 999);
      let probados = 0;
      let conMultiples = 0;
      for (let intento = 0; intento < 2000 && probados < 150; intento++) {
        const p = problemaAleatorio(rnd, objetivo);
        const r = calcularSimplex(p);
        if (r.estado !== 'optimo') continue;
        probados++;
        const contexto = JSON.stringify(p);
        const om = r.optimosMultiples!;
        const x = r.solucion.map(aFrac);
        const z = valorZ(p, x);

        const verts = vertices(p);
        const otrosOptimos = verts.filter((v) => valorZ(p, v).equals(z) && !v.every((vi, j) => vi.equals(x[j])));
        // Región no acotada en una dirección con Z constante: hay rayo.
        const esperaMultiples = otrosOptimos.length > 0 || om.rayo !== null;

        expect({ contexto, hay: om.hay }).toEqual({ contexto, hay: esperaMultiples });
        if (om.hay) conMultiples++;

        if (om.alternativa) {
          const alt = om.alternativa.map(aFrac);
          expect({ contexto, factible: esFactible(p, alt) }).toEqual({ contexto, factible: true });
          expect({ contexto, z: valorZ(p, alt).toString() }).toEqual({ contexto, z: z.toString() });
          expect({ contexto, distinta: alt.some((v, j) => !v.equals(x[j])) }).toEqual({ contexto, distinta: true });
        }
        if (om.rayo) {
          const d = om.rayo.map(aFrac);
          for (const t of [1, 10, 1000]) {
            const xt = x.map((v, j) => v.add(new Frac(t).mul(d[j])));
            expect({ contexto, t, factible: esFactible(p, xt) }).toEqual({ contexto, t, factible: true });
            expect({ contexto, t, z: valorZ(p, xt).toString() }).toEqual({ contexto, t, z: z.toString() });
          }
        }
      }
      expect(probados).toBe(150);
      expect(conMultiples).toBeGreaterThan(10);
    });
  }
});
