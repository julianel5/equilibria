import {
  calcularLemke,
  LemkeInputSchema,
  type FraccionJSON,
  type LemkeResultado,
} from '../../../src';

const num = (f: FraccionJSON): number => Number(f.num) / Number(f.den);

describe('Algoritmo de Lemke — LCP', () => {
  it('resuelve el LCP clásico M=[[2,1],[1,2]], q=(-5,-6)', () => {
    const res: LemkeResultado = calcularLemke({
      tipo: 'lcp',
      M: [
        [2, 1],
        [1, 2],
      ],
      q: [-5, -6],
    });
    expect(res.estado).toBe('solucion');
    expect(res.verifica).toBe(true);
    expect(res.z.map(num)).toEqual([4 / 3, 7 / 3]);
    expect(res.w.map(num)).toEqual([0, 0]);
    expect(res.z[0].tex).toBe('\\frac{4}{3}');
    expect(res.z[1].tex).toBe('\\frac{7}{3}');
    expect(res.complementariedad.every((c) => c.producto.num === '0')).toBe(true);
  });

  it('resuelve el caso trivial q ≥ 0 con z = 0', () => {
    const res = calcularLemke({
      tipo: 'lcp',
      M: [
        [1, 0],
        [0, 1],
      ],
      q: [2, 3],
    });
    expect(res.estado).toBe('solucion');
    expect(res.z.map(num)).toEqual([0, 0]);
    expect(res.w.map(num)).toEqual([2, 3]);
    expect(res.verifica).toBe(true);
    expect(res.iteraciones).toHaveLength(1);
  });

  it('detecta un rayo terminal cuando no hay solución complementaria', () => {
    // w = -z - 1 no puede ser ≥ 0 con z ≥ 0.
    const res = calcularLemke({ tipo: 'lcp', M: [[-1]], q: [-1] });
    expect(res.estado).toBe('sin-solucion');
    expect(res.mensaje.toLowerCase()).toContain('rayo terminal');
  });

  it('genera la traza con pivoteo complementario y procesos', () => {
    const res = calcularLemke({
      tipo: 'lcp',
      M: [
        [2, 1],
        [1, 2],
      ],
      q: [-5, -6],
    });
    expect(res.iteraciones.length).toBeGreaterThan(1);
    expect(res.iteraciones[0].paso).toBe('inicio');
    expect(res.iteraciones.some((it) => it.paso === 'fin')).toBe(true);
    expect(res.procesos.some((p) => p.titulo.includes('Lemke — Iteración'))).toBe(true);
    expect(res.procesos.some((p) => p.titulo.includes('Solución complementaria'))).toBe(true);
    expect(res.procesos.some((p) => p.formula.includes('\\begin{array}'))).toBe(true);
  });

  it('serializa como JSON sin BigInt', () => {
    const res = calcularLemke({
      tipo: 'lcp',
      M: [
        [2, 1],
        [1, 2],
      ],
      q: [-5, -6],
    });
    const ser = JSON.stringify(res);
    expect(ser).toContain('"num"');
    expect(() => JSON.parse(ser)).not.toThrow();
  });
});

describe('Algoritmo de Lemke — QP', () => {
  it('resuelve un QP convexo con restricción activa', () => {
    // min 1/2(x1²+x2²) - 2x1 - 2x2  s.a.  x1 + x2 >= 6
    // Solución: x = (3,3), λ = 1, Z = 9 - 12 = -3.
    const res = calcularLemke({
      tipo: 'qp',
      Q: [
        [1, 0],
        [0, 1],
      ],
      c: [-2, -2],
      A: [[1, 1]],
      b: [6],
    });
    expect(res.estado).toBe('solucion');
    expect(res.verifica).toBe(true);
    expect(res.qp).not.toBeNull();
    expect(res.qp!.x.map(num)).toEqual([3, 3]);
    expect(res.qp!.lambda.map(num)).toEqual([1]);
    expect(res.qp!.holguras.map(num)).toEqual([0]);
    expect(num(res.qp!.valorObjetivo)).toBeCloseTo(-3, 10);
    expect(res.tamanoLCP).toBe(3);
  });

  it('resuelve un QP con restricción inactiva (λ = 0)', () => {
    // min 1/2(x1²+x2²) - 4x1 - 6x2  s.a.  x1 + x2 >= 3
    // Óptimo sin restricción: x = (4,6), Z = 26 - 52 = -26.
    const res = calcularLemke({
      tipo: 'qp',
      Q: [
        [1, 0],
        [0, 1],
      ],
      c: [-4, -6],
      A: [[1, 1]],
      b: [3],
    });
    expect(res.estado).toBe('solucion');
    expect(res.qp!.x.map(num)).toEqual([4, 6]);
    expect(res.qp!.lambda.map(num)).toEqual([0]);
    expect(res.qp!.holguras.map(num)).toEqual([7]);
    expect(num(res.qp!.valorObjetivo)).toBeCloseTo(-26, 10);
  });

  it('construye el LCP de KKT y lo muestra en los procesos', () => {
    const res = calcularLemke({
      tipo: 'qp',
      Q: [
        [2, 0],
        [0, 2],
      ],
      c: [-2, -2],
      A: [[1, 1]],
      b: [6],
    });
    expect(res.procesos[0].titulo).toContain('KKT');
    expect(res.procesos[0].resultado).toContain('\\begin{bmatrix}');
    expect(res.lcp.M).toHaveLength(3);
    expect(res.lcp.q.map(num)).toEqual([-2, -2, -6]);
  });

  it('valida la simetría de Q con Zod', () => {
    expect(() =>
      LemkeInputSchema.parse({
        tipo: 'qp',
        Q: [
          [1, 2],
          [0, 1],
        ],
        c: [1, 1],
        A: [[1, 1]],
        b: [1],
      })
    ).toThrow();
  });
});
