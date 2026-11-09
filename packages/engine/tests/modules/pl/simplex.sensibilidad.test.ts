/**
 * Tests del análisis de sensibilidad (precios sombra y rangos).
 *
 * 1. Valores conocidos de libro (MAX) y calculados a mano (MIN con Gran M).
 * 2. Comprobación por re-optimización en problemas aleatorios MAX y MIN:
 *    - Si b_i cambia en Δ dentro de su rango, Z* cambia exactamente y_i·Δ.
 *    - Si c_j cambia dentro de su rango, la solución actual sigue siendo óptima.
 */
import { calcularSimplex, calcularSimplexCore, analizarSensibilidad, Frac, type FraccionJSON } from '../../../src';

type Tipo = 'LE' | 'GE' | 'EQ';
interface Problema {
  objetivo: 'max' | 'min';
  funcionObjetivo: number[];
  restricciones: Array<{ coeficientes: number[]; tipo: Tipo; b: number }>;
}

const tex = (f: FraccionJSON | null): string => (f === null ? '∞' : f.den === '1' ? f.num : `${f.num}/${f.den}`);

function resolver(p: Problema) {
  return calcularSimplexCore(
    p.funcionObjetivo,
    p.restricciones.map((r) => r.coeficientes),
    p.restricciones.map((r) => r.b),
    p.objetivo,
    'tabular',
    p.restricciones.map((r) => r.tipo)
  );
}

function sensibilidad(p: Problema) {
  const core = resolver(p);
  return {
    core,
    sens: analizarSensibilidad(
      p.funcionObjetivo,
      p.restricciones.map((r) => r.coeficientes),
      p.restricciones.map((r) => r.b),
      p.objetivo,
      p.restricciones.map((r) => r.tipo),
      core.basicaFinal
    ),
  };
}

// ---------------------------------------------------------------------------
// 1. Valores conocidos
// ---------------------------------------------------------------------------

describe('Sensibilidad — MAX clásico (Wyndor)', () => {
  const res = calcularSimplex({
    objetivo: 'max',
    funcionObjetivo: [3, 5],
    restricciones: [
      { coeficientes: [1, 0], b: 4 },
      { coeficientes: [0, 2], b: 12 },
      { coeficientes: [3, 2], b: 18 },
    ],
  });
  const s = res.sensibilidad!;

  it('precios sombra y holguras', () => {
    expect(s.restricciones.map((r) => tex(r.precioSombra))).toEqual(['0', '3/2', '1']);
    expect(s.restricciones.map((r) => tex(r.holgura))).toEqual(['2', '0', '0']);
    expect(s.restricciones.map((r) => r.activa)).toEqual([false, true, true]);
  });

  it('rangos de b', () => {
    expect(s.restricciones.map((r) => [tex(r.rangoB.min), tex(r.rangoB.max)])).toEqual([
      ['2', '∞'],
      ['6', '18'],
      ['12', '24'],
    ]);
  });

  it('rangos de c', () => {
    expect(s.variables.map((v) => [tex(v.rangoC.min), tex(v.rangoC.max)])).toEqual([
      ['0', '15/2'],
      ['2', '∞'],
    ]);
    expect(s.variables.every((v) => v.basica)).toBe(true);
  });

  it('agrega el paso de precios sombra a los procesos', () => {
    expect(res.procesos.some((p) => p.id === 'simplex-precios-sombra')).toBe(true);
  });
});

describe('Sensibilidad — MIN con Gran M', () => {
  const s = calcularSimplex({
    objetivo: 'min',
    funcionObjetivo: [5, 8],
    restricciones: [
      { coeficientes: [2, 1], tipo: 'GE', b: 10 },
      { coeficientes: [1, 2], tipo: 'GE', b: 8 },
      { coeficientes: [1, 1], tipo: 'LE', b: 7 },
    ],
  }).sensibilidad!;

  it('precios sombra: Z* sube 2/3 y 11/3 por unidad de b1 y b2', () => {
    expect(s.restricciones.map((r) => tex(r.precioSombra))).toEqual(['2/3', '11/3', '0']);
    expect(s.restricciones.map((r) => tex(r.holgura))).toEqual(['0', '0', '1']);
  });

  it('rangos de b y de c', () => {
    expect(s.restricciones.map((r) => [tex(r.rangoB.min), tex(r.rangoB.max)])).toEqual([
      ['4', '13'],
      ['5', '11'],
      ['6', '∞'],
    ]);
    expect(s.variables.map((v) => [tex(v.rangoC.min), tex(v.rangoC.max)])).toEqual([
      ['4', '16'],
      ['5/2', '10'],
    ]);
  });
});

describe('Sensibilidad — variables no básicas', () => {
  it('MAX: una variable fuera de la base admite c_j hasta yᵀa_j', () => {
    const s = calcularSimplex({
      objetivo: 'max',
      funcionObjetivo: [2, 3, 4],
      restricciones: [
        { coeficientes: [3, 2, 1], b: 10 },
        { coeficientes: [2, 5, 3], b: 15 },
      ],
    }).sensibilidad!;
    // Óptimo x3 = 5 con y = (0, 4/3): x1 entra si c1 > 8/3, x2 si c2 > 20/3.
    const [x1, x2, x3] = s.variables;
    expect([x1.basica, x2.basica, x3.basica]).toEqual([false, false, true]);
    expect([tex(x1.rangoC.min), tex(x1.rangoC.max), tex(x1.costoReducido)]).toEqual(['∞', '8/3', '-2/3']);
    expect([tex(x2.rangoC.min), tex(x2.rangoC.max)]).toEqual(['∞', '20/3']);
  });

  it('óptimo degenerado con una artificial en la base: el precio sombra sale de una base válida', () => {
    // x1 ≤ 4 (por 6x1 ≤ 24) y x1 ≥ 4: Gran M termina con R4 = 0 en la base.
    const res = calcularSimplex({
      objetivo: 'min',
      funcionObjetivo: [8, 9, 7],
      restricciones: [
        { coeficientes: [6, 1, 2], tipo: 'LE', b: 26 },
        { coeficientes: [6, 3, 0], tipo: 'LE', b: 24 },
        { coeficientes: [0, 0, 5], tipo: 'LE', b: 29 },
        { coeficientes: [1, 0, 0], tipo: 'GE', b: 4 },
      ],
    });
    expect(res.basicaFinal).toContain('R_{4}');
    const s = res.sensibilidad!;
    expect(s.degenerada).toBe(true);
    // Bajar b4 de 4 a 3 baja Z* de 32 a 24: 8 por unidad (subirlo es infactible).
    const r4 = s.restricciones[3];
    expect(tex(r4.precioSombra)).toBe('8');
    expect(tex(r4.rangoB.max)).toBe('4');
  });

  it('no hay análisis cuando el problema es no acotado o infactible', () => {
    const noAcotado = calcularSimplex({
      objetivo: 'max',
      funcionObjetivo: [1, 1],
      restricciones: [{ coeficientes: [1, -1], b: 2 }],
    });
    const infactible = calcularSimplex({
      objetivo: 'min',
      funcionObjetivo: [1, 1],
      restricciones: [
        { coeficientes: [1, 1], tipo: 'LE', b: 2 },
        { coeficientes: [1, 1], tipo: 'GE', b: 5 },
      ],
    });
    expect(noAcotado.sensibilidad).toBeNull();
    expect(infactible.sensibilidad).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Comprobación por re-optimización en problemas aleatorios
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

function problemaAleatorio(rnd: () => number, objetivo: 'max' | 'min'): Problema {
  const entero = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const n = entero(2, 3);
  const m = entero(2, 4);
  const tipos: Tipo[] = ['LE', 'LE', 'GE', 'GE', 'EQ'];
  const restricciones = Array.from({ length: m }, (_, i) => {
    const acotadora = i === 0 && objetivo === 'max';
    const coeficientes = Array.from({ length: n }, () => (acotadora ? entero(1, 6) : entero(0, 6)));
    if (!coeficientes.some((c) => c !== 0)) coeficientes[0] = 1;
    return { coeficientes, tipo: acotadora ? ('LE' as Tipo) : tipos[entero(0, 4)], b: entero(1, 30) };
  });
  const funcionObjetivo = Array.from({ length: n }, () => entero(objetivo === 'min' ? 0 : -2, 9));
  if (!funcionObjetivo.some((c) => c !== 0)) funcionObjetivo[0] = 1;
  return { objetivo, funcionObjetivo, restricciones };
}

/** Un paso Δ dentro del rango [min, max] de un valor actual v (o null si el rango es un punto). */
function pasoDentro(v: Frac, min: Frac | null, max: Frac | null): Frac | null {
  if (max === null) return Frac.UNO;
  if (max.cmp(v) > 0) return max.sub(v).div(new Frac(2));
  if (min === null) return Frac.UNO.neg();
  if (min.cmp(v) < 0) return min.sub(v).div(new Frac(2));
  return null;
}

const aNum = (f: Frac): number => Number(f.num) / Number(f.den);

describe('Sensibilidad — re-optimización en problemas aleatorios', () => {
  for (const objetivo of ['max', 'min'] as const) {
    it(`${objetivo.toUpperCase()}: precios sombra y rangos de c coinciden al re-resolver`, () => {
      const rnd = prng(objetivo === 'max' ? 2024 : 4202);
      let probados = 0;
      for (let intento = 0; intento < 1500 && probados < 120; intento++) {
        const p = problemaAleatorio(rnd, objetivo);
        const { core, sens } = sensibilidad(p);
        if (core.estado !== 'optimo') continue;
        probados++;
        const contexto = JSON.stringify(p);

        // b_i → b_i + Δ dentro del rango: Z* cambia y_i·Δ.
        for (const r of sens.restricciones) {
          const delta = pasoDentro(r.b, r.rangoB.min, r.rangoB.max);
          if (delta === null) continue;
          const nuevoB = r.b.add(delta);
          const p2: Problema = {
            ...p,
            restricciones: p.restricciones.map((x, i) => (i === r.indice ? { ...x, b: aNum(nuevoB) } : x)),
          };
          // Solo cuando Δ es representable exactamente como decimal en la entrada.
          if (!Frac.deDecimal(aNum(nuevoB)).equals(nuevoB)) continue;
          const z2 = resolver(p2);
          expect({ contexto, i: r.indice, estado: z2.estado }).toEqual({ contexto, i: r.indice, estado: 'optimo' });
          const esperado = core.valorObjetivo.add(r.precioSombra.mul(delta));
          expect({ contexto, i: r.indice, z: z2.valorObjetivo.toString() }).toEqual({
            contexto,
            i: r.indice,
            z: esperado.toString(),
          });
        }

        // c_j → c_j + Δ dentro del rango: la solución x* sigue siendo óptima.
        for (const v of sens.variables) {
          const delta = pasoDentro(v.c, v.rangoC.min, v.rangoC.max);
          if (delta === null) continue;
          const nuevoC = v.c.add(delta);
          if (!Frac.deDecimal(aNum(nuevoC)).equals(nuevoC)) continue;
          const c2 = p.funcionObjetivo.map((c, j) => (j === v.indice ? aNum(nuevoC) : c));
          const re = resolver({ ...p, funcionObjetivo: c2 });
          const zConXActual = core.solucion.reduce((acc, x, j) => acc.add(Frac.deDecimal(c2[j]).mul(x)), Frac.CERO);
          expect({ contexto, j: v.indice, z: re.valorObjetivo.toString() }).toEqual({
            contexto,
            j: v.indice,
            z: zConXActual.toString(),
          });
        }
      }
      expect(probados).toBe(120);
    });
  }
});
