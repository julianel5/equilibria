import {
  calcularSimplexDual,
  SimplexDualInputSchema,
  type SimplexDualInput,
  type SimplexDualResultado,
  type FraccionJSON,
} from '../../../src';

const num = (f: FraccionJSON): number => Number(f.num) / Number(f.den);

describe('Simplex Dual', () => {
  // min Z = 2x1 + 3x2  s.a.  x1 + x2 >= 4 ; x1 + 3x2 >= 6
  // Óptimo: x1 = 3, x2 = 1, Z = 9.
  const input: SimplexDualInput = {
    objetivo: 'min',
    funcionObjetivo: [2, 3],
    restricciones: [
      { coeficientes: [1, 1], tipo: 'GE', b: 4 },
      { coeficientes: [1, 3], tipo: 'GE', b: 6 },
    ],
  };

  let res: SimplexDualResultado;
  beforeAll(() => {
    res = calcularSimplexDual(input);
  });

  it('arranca super-óptimo pero primal-infeasible y llega al óptimo exacto', () => {
    expect(res.estado).toBe('optimo');
    expect(res.solucion.map(num)).toEqual([3, 1]);
    expect(res.valorObjetivo.tex).toBe('9');
    // La primera tabla debe tener algún valor básico negativo.
    const inicial = res.iteraciones[0];
    expect(inicial.rhs.some((f) => num(f) < 0)).toBe(true);
    expect(inicial.factible).toBe(false);
    // La última tabla es factible y dual-factible.
    const final = res.iteraciones[res.iteraciones.length - 1];
    expect(final.factible).toBe(true);
    expect(final.filaSaliente).toBeNull();
    expect(final.columnaEntrante).toBeNull();
  });

  it('sale por la fila con el valor básico más negativo', () => {
    const inicial = res.iteraciones[0];
    const valores = inicial.rhs.map(num);
    const minimo = Math.min(...valores);
    expect(num(inicial.rhs[inicial.filaSaliente!])).toBeCloseTo(minimo, 10);
  });

  it('aplica la prueba de la razón dual sólo con coeficientes negativos', () => {
    for (const it of res.iteraciones) {
      for (const r of it.ratios ?? []) {
        if (r.descartada) {
          expect(num(r.coeficiente)).toBeGreaterThanOrEqual(0);
        } else {
          expect(num(r.coeficiente)).toBeLessThan(0);
          expect(num(r.razon!)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('genera procesos con la forma estándar y las tablas duales', () => {
    expect(res.procesos[0].titulo).toContain('Forma estándar');
    expect(res.procesos.some((p) => p.titulo.includes('Simplex Dual — Iteración'))).toBe(true);
    expect(res.procesos.some((p) => p.formula.includes('\\begin{array}'))).toBe(true);
    expect(res.procesos.some((p) => p.resultado.includes('Óptimo'))).toBe(true);
  });

  it('serializa como JSON sin BigInt', () => {
    const ser = JSON.stringify(res);
    expect(ser).toContain('"num"');
    expect(ser).toContain('"tex"');
    expect(() => JSON.parse(ser)).not.toThrow();
  });
});

describe('Simplex Dual — casos especiales', () => {
  it('resuelve un problema de maximización con costos no positivos', () => {
    // max Z = -x1 - x2  s.a.  x1 + x2 >= 1  ->  Z* = -1 (cualquier x1+x2=1).
    const res = calcularSimplexDual({
      objetivo: 'max',
      funcionObjetivo: [-1, -1],
      restricciones: [{ coeficientes: [1, 1], tipo: 'GE', b: 1 }],
    });
    expect(res.estado).toBe('optimo');
    expect(num(res.valorObjetivo)).toBeCloseTo(-1, 10);
    expect(res.solucion.map(num).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('detecta un problema infactible cuando la fila saliente no tiene coeficientes negativos', () => {
    // min x1  s.a.  x1 <= -1, x1 >= 0  ->  infactible.
    const res = calcularSimplexDual({
      objetivo: 'min',
      funcionObjetivo: [1],
      restricciones: [{ coeficientes: [1], tipo: 'LE', b: -1 }],
    });
    expect(res.estado).toBe('infactible');
    expect(res.mensaje.toLowerCase()).toContain('infactible');
  });

  it('rechaza una base inicial no dual-factible', () => {
    // min Z = -x1 + x2 con c no negativo: la base de holguras no es óptima dual.
    const res = calcularSimplexDual({
      objetivo: 'min',
      funcionObjetivo: [-1, 1],
      restricciones: [{ coeficientes: [1, 1], tipo: 'GE', b: 1 }],
    });
    expect(res.estado).toBe('no-dual-factible');
    expect(res.mensaje).toContain('costo');
  });

  it('soporta igualdades desdoblándolas en ≥ y ≤', () => {
    // min x1 + x2  s.a.  x1 + x2 = 1  ->  Z* = 1.
    const res = calcularSimplexDual({
      objetivo: 'min',
      funcionObjetivo: [1, 1],
      restricciones: [{ coeficientes: [1, 1], tipo: 'EQ', b: 1 }],
    });
    expect(res.estado).toBe('optimo');
    expect(num(res.valorObjetivo)).toBeCloseTo(1, 10);
    expect(res.solucion.map(num).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('valida tamaños de coeficientes con Zod', () => {
    expect(() =>
      SimplexDualInputSchema.parse({
        objetivo: 'min',
        funcionObjetivo: [1, 2],
        restricciones: [{ coeficientes: [1], tipo: 'GE', b: 1 }],
      })
    ).toThrow();
  });
});
