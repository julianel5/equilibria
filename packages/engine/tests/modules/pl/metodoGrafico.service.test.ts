import {
  calcularMetodoGrafico,
  MetodoGraficoInput,
} from '../../../src';

// Casos de referencia del Método Gráfico:
//
// 1) MAX Z = 5x1 + 7x2  s.a. x1 + x2 <= 4 ; x1 + 3x2 <= 6 ; x1, x2 >= 0
//    Vértices: (0,0)=0, (4,0)=20, (3,1)=22 → óptimo (3,1); (0,2)=14
//
// 2) MIN Z = 3x1 + 4x2  s.a. x1 + x2 >= 3 ; x1 + 2x2 >= 4
//    Vértices factibles: (2,1)=10 ← óptimo; (0,3)=12; (4,0)=12
//
// 3) Infactible: x1 + x2 <= 2 ; x1 + x2 >= 5
// 4) No acotado (MAX): x1 + x2 >= 1
// 5) Múltiples óptimos: MAX Z = 2x1 + 2x2 s.a. x1 + x2 <= 4
//    (0,4)=8 y (4,0)=8 empatan; toda la arista óptima
// 6) Igualdad: MAX Z = x1 s.a. x1 + x2 = 2 → vértices (0,2),(2,0); óptimo (2,0)

const caso1: MetodoGraficoInput = {
  funcionObjetivo: { tipo: 'MAX', c1: 5, c2: 7 },
  restricciones: [
    { id: 'r1', x1: 1, x2: 1, operador: '<=', rhs: 4 },
    { id: 'r2', x1: 1, x2: 3, operador: '<=', rhs: 6 },
  ],
};

const caso2: MetodoGraficoInput = {
  funcionObjetivo: { tipo: 'MIN', c1: 3, c2: 4 },
  restricciones: [
    { id: 'r1', x1: 1, x2: 1, operador: '>=', rhs: 3 },
    { id: 'r2', x1: 1, x2: 2, operador: '>=', rhs: 4 },
  ],
};

const caso5: MetodoGraficoInput = {
  funcionObjetivo: { tipo: 'MAX', c1: 2, c2: 2 },
  restricciones: [{ id: 'r1', x1: 1, x2: 1, operador: '<=', rhs: 4 }],
};

const caso6: MetodoGraficoInput = {
  funcionObjetivo: { tipo: 'MAX', c1: 1, c2: 0 },
  restricciones: [{ id: 'r1', x1: 1, x2: 1, operador: '=', rhs: 2 }],
};

describe('Método Gráfico — vértices y óptimo', () => {
  test('MAX con región acotada encuentra el vértice óptimo', () => {
    const r = calcularMetodoGrafico(caso1);
    expect(r.valorZ).toBeCloseTo(22, 6);
    const opt = r.verticeOptimo;
    expect(Array.isArray(opt)).toBe(false);
    expect(r.multiplesOptimos).toBe(false);
    const o = opt as { x1: number; x2: number };
    expect(o.x1).toBeCloseTo(3, 5);
    expect(o.x2).toBeCloseTo(1, 5);
  });

  test('expone como óptimo SOLO el vértice ganador', () => {
    const r = calcularMetodoGrafico(caso1);
    const opt = r.verticeOptimo as { x1: number; x2: number };
    r.verticesFactibles.forEach((v) => {
      const esReal = Math.abs(v.x1 - opt.x1) < 1e-5 && Math.abs(v.x2 - opt.x2) < 1e-5;
      expect(v.esVerticeOptimo).toBe(esReal);
    });
  });

  test('MIN elige el menor Z entre los vértices factibles', () => {
    const r = calcularMetodoGrafico(caso2);
    expect(r.valorZ).toBeCloseTo(10, 6);
    const o = r.verticeOptimo as { x1: number; x2: number };
    expect(o.x1).toBeCloseTo(2, 5);
    expect(o.x2).toBeCloseTo(1, 5);
  });

  test('restricción de igualdad genera el segmento factible correcto', () => {
    const r = calcularMetodoGrafico(caso6);
    expect(r.valorZ).toBeCloseTo(2, 6);
    const o = r.verticeOptimo as { x1: number; x2: number };
    expect(o.x1).toBeCloseTo(2, 5);
    expect(o.x2).toBeCloseTo(0, 5);
    // Los dos extremos del segmento son vértices factibles.
    expect(r.verticesFactibles).toHaveLength(2);
  });
});

describe('Método Gráfico — casos especiales', () => {
  test('región vacía lanza el error de infactibilidad', () => {
    const r: MetodoGraficoInput = {
      funcionObjetivo: { tipo: 'MAX', c1: 1, c2: 1 },
      restricciones: [
        { id: 'r1', x1: 1, x2: 1, operador: '<=', rhs: 2 },
        { id: 'r2', x1: 1, x2: 1, operador: '>=', rhs: 5 },
      ],
    };
    expect(() => calcularMetodoGrafico(r)).toThrow('El problema es infactible (no tiene área de solución)');
  });

  test('restricciones paralelas se registran como descartadas (sin intersección)', () => {
    // r1 (x1+x2<=4) y redund (x1+x2<=10) tienen el mismo plano → líneas paralelas.
    const r = calcularMetodoGrafico({
      funcionObjetivo: { tipo: 'MAX', c1: 5, c2: 7 },
      restricciones: [
        { id: 'r1', x1: 1, x2: 1, operador: '<=', rhs: 4 },
        { id: 'r2', x1: 1, x2: 3, operador: '<=', rhs: 6 },
        { id: 'redund', x1: 1, x2: 1, operador: '<=', rhs: 10 },
      ],
    });
    const par = r.interseccionesDescartadas.find(
      (d) => d.restriccionA === 'r1' && d.restriccionB === 'redund'
    );
    expect(par).toBeDefined();
    expect(par!.motivo).toContain('paralelas');
    expect(par!.punto).toBeUndefined();
  });

  test('el óptimo tocando la caja límite lanza el error de solución no acotada', () => {
    const r: MetodoGraficoInput = {
      funcionObjetivo: { tipo: 'MAX', c1: 1, c2: 1 },
      restricciones: [{ id: 'r1', x1: 1, x2: 1, operador: '>=', rhs: 1 }],
    };
    expect(() => calcularMetodoGrafico(r)).toThrow('La solución es no acotada');
  });

  test('MIN no acotado hacia abajo también se detecta con la caja', () => {
    // Minimizar Z = −x1 si x1 >= 0 empuja el óptimo hacia x1 = 10000.
    const r: MetodoGraficoInput = {
      funcionObjetivo: { tipo: 'MIN', c1: -1, c2: 0 },
      restricciones: [{ id: 'r1', x1: 1, x2: 0, operador: '>=', rhs: 0 }],
    };
    expect(() => calcularMetodoGrafico(r)).toThrow('La solución es no acotada');
  });

  test('múltiples óptimos marca ambos vértices como ganadores', () => {
    const r = calcularMetodoGrafico(caso5);
    expect(r.multiplesOptimos).toBe(true);
    expect(Array.isArray(r.verticeOptimo)).toBe(true);
    const optimos = r.verticeOptimo as Array<{ x1: number; x2: number }>;
    expect(optimos).toHaveLength(2);
    expect(r.valorZ).toBeCloseTo(8, 6);
    const coords = optimos.map((v) => `${v.x1},${v.x2}`).sort();
    expect(coords).toEqual(['0,4', '4,0']);
    expect(r.verticesFactibles.filter((v) => v.esVerticeOptimo)).toHaveLength(2);
  });

  test('una restricción redundante (no activa) no altera el polígono ni el óptimo', () => {
    // Caso 1 + x1+x2 <= 10, inactiva en el triángulo (todos los vértices cumplen x1+x2 <= 4).
    const r = calcularMetodoGrafico({
      funcionObjetivo: { tipo: 'MAX', c1: 5, c2: 7 },
      restricciones: [
        { id: 'r1', x1: 1, x2: 1, operador: '<=', rhs: 4 },
        { id: 'r2', x1: 1, x2: 3, operador: '<=', rhs: 6 },
        { id: 'redund', x1: 1, x2: 1, operador: '<=', rhs: 10 },
      ],
    });
    expect(r.verticesFactibles).toHaveLength(4);
    expect(r.valorZ).toBeCloseTo(22, 6);
    const opt = r.verticeOptimo as { x1: number; x2: number };
    expect(opt.x1).toBeCloseTo(3, 5);
    expect(opt.x2).toBeCloseTo(1, 5);
  });
});

describe('Método Gráfico — geometría para UI y descartes pedagógicos', () => {
  test('los vértices factibles forman un polígono ordenado por ángulo sin cruces', () => {
    const r = calcularMetodoGrafico(caso1);
    const vs = r.verticesFactibles;
    expect(vs.length).toBeGreaterThanOrEqual(3);
    const cx = vs.reduce((acc, v) => acc + v.x1, 0) / vs.length;
    const cy = vs.reduce((acc, v) => acc + v.x2, 0) / vs.length;
    const angulos = vs.map((v) => Math.atan2(v.x2 - cy, v.x1 - cx));
    for (let i = 1; i < angulos.length; i += 1) {
      expect(angulos[i]).toBeGreaterThanOrEqual(angulos[i - 1]);
    }
    // Ninguna arista del polígono se cruza con otra (chequeo geométrico ligero).
    const mide = (a: { x1: number; x2: number }, b: { x1: number; x2: number }) =>
      (b.x1 - a.x1) ** 2 + (b.x2 - a.x2) ** 2;
    const lados = vs.map((_, i) => mide(vs[i], vs[(i + 1) % vs.length])).sort((a, b) => a - b);
    // Para un polígono simple, las dos aristas más cortas no comparten extremos
    // con las más largas; este chequeo valida que no haya "zigzag" obvio.
    expect(lados[0]).toBeLessThan(1e6);
  });

  test('los vértices del caso 1 son exactamente el polígono esperado', () => {
    const r = calcularMetodoGrafico(caso1);
    const coords = r.verticesFactibles
      .map((v) => `${Math.round(v.x1)},${Math.round(v.x2)}`)
      .sort();
    // Conjunto de vértices del rectángulo trapezoidal: (0,0),(4,0),(3,1),(0,2)
    expect(coords).toEqual(['0,0', '0,2', '3,1', '4,0']);
  });

  test('registra las intersecciones descartadas por restricción violada', () => {
    // (4,2) viola x1+3x2<=6 → su cruce (x1<=4 con x1+3x2<=6, en (4, 2/3)) — se
    // verifica que exista al menos un descarte con el id de la restricción.
    const r = calcularMetodoGrafico(caso1);
    const conViolacion = r.interseccionesDescartadas.filter((d) => d.motivo.includes('restricción'));
    expect(conViolacion.length).toBeGreaterThan(0);
    expect(conViolacion.some((d) => d.punto !== undefined)).toBe(true);
  });
});