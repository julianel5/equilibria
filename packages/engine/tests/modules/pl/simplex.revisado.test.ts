/**
 * Tests del Simplex Revisado (matricial).
 *
 * 1. Problemas clásicos de MAX y MIN con solución conocida (≤, ≥, = y mezclas).
 * 2. Invariantes matriciales en cada iteración (B·B⁻¹ = I, b̄ = B⁻¹b ≥ 0,
 *    yᵀ = c_B B⁻¹, Z = c_B b̄, costos reducidos nulos en la base).
 * 3. Coincidencia con el método tabular.
 * 4. Comparación contra enumeración exhaustiva de vértices en problemas
 *    aleatorios (con semilla fija, reproducibles).
 * 5. Casos especiales: no acotado (MAX y MIN), infactible, degenerado.
 */
import { calcularSimplex, calcularSimplexCore, Frac, type FraccionJSON } from '../../../src';

type Tipo = 'LE' | 'GE' | 'EQ';
interface Restriccion {
  coeficientes: number[];
  tipo: Tipo;
  b: number;
}
interface Problema {
  objetivo: 'max' | 'min';
  funcionObjetivo: number[];
  restricciones: Restriccion[];
}

const num = (f: FraccionJSON): number => Number(f.num) / Number(f.den);
const F = (v: number): Frac => Frac.deDecimal(v);

function resolverCore(p: Problema) {
  return calcularSimplexCore(
    p.funcionObjetivo,
    p.restricciones.map((r) => r.coeficientes),
    p.restricciones.map((r) => r.b),
    p.objetivo,
    'revisado',
    p.restricciones.map((r) => r.tipo)
  );
}

/** Comprueba que x (exacto) cumple todas las restricciones y x ≥ 0. */
function esFactible(p: Problema, x: Frac[]): boolean {
  if (x.some((v) => v.esNegativo)) return false;
  return p.restricciones.every((r) => {
    const lhs = r.coeficientes.reduce((acc, a, j) => acc.add(F(a).mul(x[j])), Frac.CERO);
    const c = lhs.cmp(F(r.b));
    return r.tipo === 'LE' ? c <= 0 : r.tipo === 'GE' ? c >= 0 : c === 0;
  });
}

const valorZ = (p: Problema, x: Frac[]): Frac =>
  p.funcionObjetivo.reduce((acc, c, j) => acc.add(F(c).mul(x[j])), Frac.CERO);

// ---------------------------------------------------------------------------
// 1. Problemas con solución conocida
// ---------------------------------------------------------------------------

interface Caso {
  nombre: string;
  problema: Problema;
  z: number;
  /** Solución esperada (solo si el óptimo es único). */
  x?: number[];
}

const casos: Caso[] = [
  // ----- Maximización -----
  {
    nombre: 'MAX clásico 2 variables (≤)',
    problema: {
      objetivo: 'max',
      funcionObjetivo: [3, 5],
      restricciones: [
        { coeficientes: [1, 0], tipo: 'LE', b: 4 },
        { coeficientes: [0, 2], tipo: 'LE', b: 12 },
        { coeficientes: [3, 2], tipo: 'LE', b: 18 },
      ],
    },
    z: 36,
    x: [2, 6],
  },
  {
    nombre: 'MAX 3 variables (≤)',
    problema: {
      objetivo: 'max',
      funcionObjetivo: [2, 3, 4],
      restricciones: [
        { coeficientes: [3, 2, 1], tipo: 'LE', b: 10 },
        { coeficientes: [2, 5, 3], tipo: 'LE', b: 15 },
      ],
    },
    z: 20,
    x: [0, 0, 5],
  },
  {
    nombre: 'MAX con solución fraccionaria',
    problema: {
      objetivo: 'max',
      funcionObjetivo: [5, 4],
      restricciones: [
        { coeficientes: [6, 4], tipo: 'LE', b: 24 },
        { coeficientes: [1, 2], tipo: 'LE', b: 6 },
        { coeficientes: [-1, 1], tipo: 'LE', b: 1 },
        { coeficientes: [0, 1], tipo: 'LE', b: 2 },
      ],
    },
    z: 21,
    x: [3, 1.5],
  },
  {
    nombre: 'MAX con ≥ (Gran M)',
    problema: {
      objetivo: 'max',
      funcionObjetivo: [2, 3],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'LE', b: 10 },
        { coeficientes: [1, 0], tipo: 'GE', b: 3 },
        { coeficientes: [0, 1], tipo: 'GE', b: 2 },
      ],
    },
    z: 27,
    x: [3, 7],
  },
  {
    nombre: 'MAX con = (Gran M)',
    problema: {
      objetivo: 'max',
      funcionObjetivo: [3, 2],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'EQ', b: 4 },
        { coeficientes: [1, 0], tipo: 'LE', b: 3 },
      ],
    },
    z: 11,
    x: [3, 1],
  },
  {
    nombre: 'MAX mezclando ≤, ≥ y = (3 variables)',
    problema: {
      objetivo: 'max',
      funcionObjetivo: [1, 2, 3],
      restricciones: [
        { coeficientes: [1, 1, 1], tipo: 'EQ', b: 10 },
        { coeficientes: [1, 0, 0], tipo: 'GE', b: 2 },
        { coeficientes: [0, 0, 1], tipo: 'LE', b: 5 },
      ],
    },
    z: 23,
    x: [2, 3, 5],
  },
  // ----- Minimización -----
  {
    nombre: 'MIN problema de la Gran M (≥, ≥, ≤)',
    problema: {
      objetivo: 'min',
      funcionObjetivo: [5, 8],
      restricciones: [
        { coeficientes: [2, 1], tipo: 'GE', b: 10 },
        { coeficientes: [1, 2], tipo: 'GE', b: 8 },
        { coeficientes: [1, 1], tipo: 'LE', b: 7 },
      ],
    },
    z: 36,
    x: [4, 2],
  },
  {
    nombre: 'MIN dieta (≥)',
    problema: {
      objetivo: 'min',
      funcionObjetivo: [0.6, 1],
      restricciones: [
        { coeficientes: [10, 4], tipo: 'GE', b: 20 },
        { coeficientes: [5, 5], tipo: 'GE', b: 20 },
        { coeficientes: [2, 6], tipo: 'GE', b: 12 },
      ],
    },
    z: 2.8,
    x: [3, 1],
  },
  {
    nombre: 'MIN con fracciones en el óptimo',
    problema: {
      objetivo: 'min',
      funcionObjetivo: [10, 8],
      restricciones: [
        { coeficientes: [1, 2], tipo: 'GE', b: 36 },
        { coeficientes: [5, 1], tipo: 'GE', b: 60 },
      ],
    },
    z: 200,
    x: [28 / 3, 40 / 3],
  },
  {
    nombre: 'MIN con = (Gran M)',
    problema: {
      objetivo: 'min',
      funcionObjetivo: [4, 1],
      restricciones: [
        { coeficientes: [3, 1], tipo: 'EQ', b: 3 },
        { coeficientes: [4, 3], tipo: 'GE', b: 6 },
        { coeficientes: [1, 2], tipo: 'LE', b: 4 },
      ],
    },
    z: 3.4,
    x: [0.4, 1.8],
  },
  {
    nombre: 'MIN solo ≤ (óptimo en el origen)',
    problema: {
      objetivo: 'min',
      funcionObjetivo: [2, 3],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'LE', b: 4 },
        { coeficientes: [1, 3], tipo: 'LE', b: 6 },
      ],
    },
    z: 0,
    x: [0, 0],
  },
  {
    nombre: 'MIN con costo negativo (≤)',
    problema: {
      objetivo: 'min',
      funcionObjetivo: [-1, -2],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'LE', b: 4 },
        { coeficientes: [1, 3], tipo: 'LE', b: 6 },
      ],
    },
    z: -5,
    x: [3, 1],
  },
  {
    nombre: 'MIN 3 variables mezclando tipos',
    problema: {
      objetivo: 'min',
      funcionObjetivo: [2, 3, 1],
      restricciones: [
        { coeficientes: [1, 1, 1], tipo: 'GE', b: 6 },
        { coeficientes: [0, 1, 1], tipo: 'EQ', b: 4 },
        { coeficientes: [0, 0, 1], tipo: 'LE', b: 3 },
      ],
    },
    z: 10,
    x: [2, 1, 3],
  },
];

describe('Simplex Revisado — problemas con solución conocida', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      const res = calcularSimplex({ ...caso.problema, metodo: 'revisado' });
      expect(res.estado).toBe('optimo');
      expect(num(res.valorObjetivo)).toBeCloseTo(caso.z, 9);
      if (caso.x) res.solucion.forEach((f, j) => expect(num(f)).toBeCloseTo(caso.x![j], 9));
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Invariantes matriciales en cada iteración
// ---------------------------------------------------------------------------

function verificarInvariantes(p: Problema): void {
  const core = resolverCore(p);
  const m = p.restricciones.length;
  const bFrac = p.restricciones.map((r) => F(r.b));
  const iteraciones = core.revisado;
  expect(iteraciones.length).toBeGreaterThan(0);

  for (const it of iteraciones) {
    // B · B⁻¹ = I
    for (let i = 0; i < m; i++) {
      for (let k = 0; k < m; k++) {
        let s = Frac.CERO;
        for (let l = 0; l < m; l++) s = s.add(it.B[i][l].mul(it.BInv[l][k]));
        expect(s.equals(i === k ? Frac.UNO : Frac.CERO)).toBe(true);
      }
    }
    // b̄ = B⁻¹ b y factibilidad primal (b̄ ≥ 0)
    for (let i = 0; i < m; i++) {
      const bi = it.BInv[i].reduce((acc, v, k) => acc.add(v.mul(bFrac[k])), Frac.CERO);
      expect(bi.equals(it.bi[i])).toBe(true);
      expect(it.bi[i].esNegativo).toBe(false);
    }
    // yᵀ = c_B B⁻¹
    for (let k = 0; k < m; k++) {
      const yk = it.cB.reduce((acc, cb, i) => acc.add(cb.mul(it.BInv[i][k])), Frac.CERO);
      expect(yk.equals(it.y[k])).toBe(true);
    }
    // Z = c_B b̄
    const z = it.cB.reduce((acc, cb, i) => acc.add(cb.mul(it.bi[i])), Frac.CERO);
    expect(z.equals(it.z)).toBe(true);
    // Costos reducidos nulos para las variables básicas
    for (const nombre of it.basica) {
      const cr = it.costosReducidos.find((c) => c.variable === nombre)!;
      expect(cr.cr.esCero).toBe(true);
    }
  }

  // Optimalidad en la última iteración: ningún costo reducido mejora Z
  // (las artificiales no pueden volver a entrar).
  if (core.estado === 'optimo') {
    const ultima = iteraciones[iteraciones.length - 1];
    for (const c of ultima.costosReducidos) {
      if (c.variable.startsWith('R_')) continue;
      if (p.objetivo === 'max') expect(c.cr.esPositivo).toBe(false);
      else expect(c.cr.esNegativo).toBe(false);
    }
  }
}

describe('Simplex Revisado — invariantes matriciales en cada iteración', () => {
  for (const caso of casos) {
    it(caso.nombre, () => verificarInvariantes(caso.problema));
  }
});

// ---------------------------------------------------------------------------
// 3. Coincidencia con el tabular
// ---------------------------------------------------------------------------

describe('Simplex Revisado — coincide con el método tabular', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      const rev = calcularSimplex({ ...caso.problema, metodo: 'revisado' });
      const tab = calcularSimplex({ ...caso.problema, metodo: 'tabular' });
      expect(rev.estado).toBe(tab.estado);
      expect(rev.valorObjetivo.num).toBe(tab.valorObjetivo.num);
      expect(rev.valorObjetivo.den).toBe(tab.valorObjetivo.den);
      expect(rev.solucion).toEqual(tab.solucion);
      expect([...rev.basicaFinal].sort()).toEqual([...tab.basicaFinal].sort());
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Problemas aleatorios contra enumeración exhaustiva de vértices
// ---------------------------------------------------------------------------

/** PRNG determinista (mulberry32) para que los casos sean reproducibles. */
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

/** Resuelve un sistema n×n exacto; null si es singular. */
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

/**
 * Óptimo por fuerza bruta: cada vértice es la intersección de n hiperplanos
 * elegidos entre las m restricciones y las n cotas x_j = 0.
 */
function optimoPorVertices(p: Problema): Frac | null {
  const n = p.funcionObjetivo.length;
  const hiperplanos: Array<{ a: Frac[]; b: Frac }> = [
    ...p.restricciones.map((r) => ({ a: r.coeficientes.map(F), b: F(r.b) })),
    ...Array.from({ length: n }, (_, j) => ({
      a: Array.from({ length: n }, (_, k) => (k === j ? Frac.UNO : Frac.CERO)),
      b: Frac.CERO,
    })),
  ];
  let mejor: Frac | null = null;
  for (const comb of combinaciones(hiperplanos.length, n)) {
    const x = resolverSistema(
      comb.map((i) => hiperplanos[i].a),
      comb.map((i) => hiperplanos[i].b)
    );
    if (!x || !esFactible(p, x)) continue;
    const z = valorZ(p, x);
    if (mejor === null || (p.objetivo === 'max' ? z.cmp(mejor) > 0 : z.cmp(mejor) < 0)) mejor = z;
  }
  return mejor;
}

/**
 * Genera problemas acotados: en MAX se incluye siempre una restricción ≤ con
 * coeficientes positivos (región acotada); en MIN los costos son ≥ 0.
 */
function problemaAleatorio(rnd: () => number, objetivo: 'max' | 'min'): Problema {
  const entero = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const n = entero(2, 3);
  const m = entero(2, 4);
  const restricciones: Restriccion[] = [];
  for (let i = 0; i < m; i++) {
    const tiposPosibles: Tipo[] = ['LE', 'LE', 'GE', 'GE', 'EQ'];
    const tipo = i === 0 && objetivo === 'max' ? 'LE' : tiposPosibles[entero(0, 4)];
    const coeficientes = Array.from({ length: n }, () =>
      i === 0 && objetivo === 'max' ? entero(1, 6) : entero(0, 6)
    );
    if (!coeficientes.some((c) => c !== 0)) coeficientes[0] = 1;
    restricciones.push({ coeficientes, tipo, b: entero(1, 30) });
  }
  const funcionObjetivo = Array.from({ length: n }, () => entero(objetivo === 'min' ? 0 : -2, 9));
  if (!funcionObjetivo.some((c) => c !== 0)) funcionObjetivo[0] = 1;
  return { objetivo, funcionObjetivo, restricciones };
}

describe('Simplex Revisado — problemas aleatorios vs. enumeración de vértices', () => {
  for (const objetivo of ['max', 'min'] as const) {
    it(`${objetivo.toUpperCase()}: 150 problemas aleatorios factibles (+ los infactibles que aparezcan)`, () => {
      const rnd = prng(objetivo === 'max' ? 12345 : 67890);
      let probados = 0;
      let infactibles = 0;
      let intentos = 0;
      while (probados < 150 && intentos < 2000) {
        intentos++;
        const p = problemaAleatorio(rnd, objetivo);
        const esperado = optimoPorVertices(p);
        const core = resolverCore(p);
        const contexto = JSON.stringify(p);
        if (esperado === null) {
          // Sin vértices factibles: el método debe reportarlo como infactible.
          infactibles++;
          expect({ contexto, estado: core.estado }).toEqual({ contexto, estado: 'infactible' });
          continue;
        }
        probados++;

        expect({ contexto, estado: core.estado }).toEqual({ contexto, estado: 'optimo' });
        const x = core.solucion;
        expect({ contexto, factible: esFactible(p, x) }).toEqual({ contexto, factible: true });
        expect({ contexto, z: valorZ(p, x).toString() }).toEqual({ contexto, z: esperado.toString() });
        expect({ contexto, z: core.valorObjetivo.toString() }).toEqual({ contexto, z: esperado.toString() });
      }
      expect(probados).toBe(150);
      expect(infactibles).toBeGreaterThan(0); // también se ejercitó la detección de infactibilidad
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Casos especiales
// ---------------------------------------------------------------------------

describe('Simplex Revisado — casos especiales', () => {
  it('MAX no acotado', () => {
    const res = calcularSimplex({
      metodo: 'revisado',
      objetivo: 'max',
      funcionObjetivo: [2, 1],
      restricciones: [{ coeficientes: [1, -1], tipo: 'LE', b: 4 }],
    });
    expect(res.estado).toBe('no-acotado');
  });

  it('MIN no acotado (costo negativo, región abierta)', () => {
    const res = calcularSimplex({
      metodo: 'revisado',
      objetivo: 'min',
      funcionObjetivo: [-1, -1],
      restricciones: [{ coeficientes: [1, -1], tipo: 'GE', b: 1 }],
    });
    expect(res.estado).toBe('no-acotado');
  });

  for (const metodo of ['revisado', 'tabular'] as const) {
    for (const objetivo of ['max', 'min'] as const) {
      it(`${objetivo.toUpperCase()} infactible (≤ 2 y ≥ 5 a la vez) — ${metodo}`, () => {
        const res = calcularSimplex({
          metodo,
          objetivo,
          funcionObjetivo: [3, 2],
          restricciones: [
            { coeficientes: [1, 1], tipo: 'LE', b: 2 },
            { coeficientes: [1, 1], tipo: 'GE', b: 5 },
          ],
        });
        expect(res.estado).toBe('infactible');
        expect(res.procesos.some((pr) => pr.id === 'simplex-infactible')).toBe(true);
      });
    }
  }

  it('MIN infactible con igualdad incompatible', () => {
    const res = calcularSimplex({
      metodo: 'revisado',
      objetivo: 'min',
      funcionObjetivo: [1, 1],
      restricciones: [
        { coeficientes: [1, 0], tipo: 'LE', b: 1 },
        { coeficientes: [1, 0], tipo: 'EQ', b: 3 },
      ],
    });
    expect(res.estado).toBe('infactible');
  });

  it('MAX degenerado (empate en la razón mínima) llega al óptimo', () => {
    const res = calcularSimplex({
      metodo: 'revisado',
      objetivo: 'max',
      funcionObjetivo: [3, 9],
      restricciones: [
        { coeficientes: [1, 4], tipo: 'LE', b: 8 },
        { coeficientes: [1, 2], tipo: 'LE', b: 4 },
      ],
    });
    expect(res.estado).toBe('optimo');
    expect(num(res.valorObjetivo)).toBeCloseTo(18, 9);
    expect(num(res.solucion[0])).toBeCloseTo(0, 9);
    expect(num(res.solucion[1])).toBeCloseTo(2, 9);
  });

  it('MIN con óptimos múltiples devuelve un vértice óptimo factible', () => {
    const p: Problema = {
      objetivo: 'min',
      funcionObjetivo: [1, 1],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'GE', b: 4 },
        { coeficientes: [1, 0], tipo: 'LE', b: 3 },
      ],
    };
    const core = resolverCore(p);
    expect(core.estado).toBe('optimo');
    expect(core.valorObjetivo.toString()).toBe('4');
    expect(esFactible(p, core.solucion)).toBe(true);
  });

  it('la base inicial usa holguras para ≤ y artificiales para ≥ / =', () => {
    const core = resolverCore({
      objetivo: 'min',
      funcionObjetivo: [1, 2],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'LE', b: 5 },
        { coeficientes: [1, 0], tipo: 'GE', b: 1 },
        { coeficientes: [0, 1], tipo: 'EQ', b: 2 },
      ],
    });
    expect(core.revisado[0].basica).toEqual(['S_{1}', 'R_{2}', 'R_{3}']);
    expect(core.basicaFinal.some((v) => v.startsWith('R_'))).toBe(false);
    expect(core.valorObjetivo.toString()).toBe('5');
  });
});
