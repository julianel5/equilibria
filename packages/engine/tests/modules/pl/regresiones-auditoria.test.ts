import { calcularLemke, calcularMetodoGrafico, calcularSimplex, calcularTransporte } from '../../../src';

describe('Regresiones de auditoría de programación lineal', () => {
  it.each(['tabular', 'revisado'] as const)('C01: resuelve el caso de ciclado de Beale (%s)', metodo => {
    const r = calcularSimplex({
      metodo, objetivo: 'max', funcionObjetivo: [10, -57, -9, -24],
      restricciones: [
        { coeficientes: [0.5, -5.5, -2.5, 9], b: 0 },
        { coeficientes: [0.5, -1.5, -0.5, 1], b: 0 },
        { coeficientes: [1, 0, 0, 0], b: 1 },
      ],
    });
    expect(r.estado).toBe('optimo');
    expect(r.valorObjetivo.tex).toBe('1');
    expect(r.solucion.map(x => x.tex)).toEqual(['1', '0', '1', '0']);
    expect(metodo === 'tabular' ? r.revisado : r.tablas).toEqual([]);
  });

  it.each(['tabular', 'revisado'] as const)('C01: agotar los pivotes no certifica optimalidad (%s)', metodo => {
    // Bland incorpora x1, x2, … en ese orden. Queda una mejora tras 200 pivotes.
    const r = calcularSimplex({
      metodo,
      funcionObjetivo: Array.from({ length: 201 }, (_, i) => i + 1),
      restricciones: [{ coeficientes: Array<number>(201).fill(1), b: 1 }],
    });
    expect(r.estado).toBe('limite-iteraciones');
    expect(r.sensibilidad).toBeNull();
    expect(r.optimosMultiples).toBeNull();
  });

  it.each(['tabular', 'revisado'] as const)('C02: M domina a todo costo real (%s)', metodo => {
    const r = calcularSimplex({
      metodo, objetivo: 'min', funcionObjetivo: [2000000],
      restricciones: [{ coeficientes: [1], tipo: 'GE', b: 1 }],
    });
    expect(r.estado).toBe('optimo');
    expect(r.solucion[0].tex).toBe('1');
    expect(r.valorObjetivo.tex).toBe('2000000');
    if (metodo === 'tabular') {
      expect(r.tablas[0].reducidosM?.[0]).toMatchObject({ a: { num: '-2000000' }, b: { num: '1' } });
    } else {
      expect(r.revisado[0].costosReducidos[0].crM).toMatchObject({ a: { num: '2000000' }, b: { num: '-1' } });
    }
  });

  it('C02: un rayo real no impide recuperar factibilidad primero', () => {
    const r = calcularSimplex({
      funcionObjetivo: [1, -1],
      restricciones: [{ coeficientes: [0, 1], tipo: 'GE', b: 1 }],
    });
    expect(r.estado).toBe('no-acotado');
    expect(r.solucion[1].tex).toBe('1');
  });

  it('C03: encuentra el flujo permitido cuando las tres heurísticas fallan', () => {
    const r = calcularTransporte({
      costos: [[10, 15, 8], [1, 3, 6], [7, 7, 5]], oferta: [1, 1, 1], demanda: [1, 1, 1],
      prohibidas: [{ origen: 1, destino: 3 }, { origen: 3, destino: 2 }, { origen: 3, destino: 3 }],
    });
    expect(r.estado).toBe('optimo');
    expect(r.fasePenalizada).toBe(true);
    expect(r.iteraciones[r.iteraciones.length - 1].flujoProhibido.tex).toBe('0');
    expect(r.valorObjetivo?.tex).toBe('28');
    expect(r.asignacion.map(f => f.map(x => x.tex))).toEqual([['0', '1', '0'], ['0', '0', '1'], ['1', '0', '0']]);
  });

  it('C04: devuelve el vértice lejano de un problema acotado', () => {
    const r = calcularMetodoGrafico({
      funcionObjetivo: { tipo: 'MAX', c1: 1, c2: 1 },
      restricciones: [
        { id: 'r1', x1: 1, x2: -1, operador: '<=', rhs: 1 },
        { id: 'r2', x1: -1, x2: 1.0000001, operador: '<=', rhs: 1 },
      ],
    });
    expect(r.estado).toBe('optimo');
    expect(r.verticeOptimo).toMatchObject({ x1: 20000001, x2: 20000000 });
    expect(r.valorZ).toBe(40000001);
  });

  it('C04: distingue un rayo oblicuo de mejora de un rayo de costo constante', () => {
    const restricciones = [{ id: 'r1', x1: 1, x2: -1, operador: '=' as const, rhs: 0 }];
    expect(() => calcularMetodoGrafico({
      funcionObjetivo: { tipo: 'MAX', c1: 1, c2: 0 }, restricciones,
    })).toThrow(/no acotada/i);
    const plano = calcularMetodoGrafico({
      funcionObjetivo: { tipo: 'MAX', c1: 1, c2: -1 }, restricciones,
    });
    expect(plano).toMatchObject({ estado: 'optimo', valorZ: 0, multiplesOptimos: true, rayoOptimo: true });
  });

  it('C05: rechaza una Q simétrica pero no semidefinida positiva', () => {
    expect(() => calcularLemke({ tipo: 'qp', Q: [[-1]], c: [0], A: [], b: [] })).toThrow(/no convexo/i);
  });

  it('C05: distingue una matriz singular PSD de una matriz indefinida', () => {
    expect(() => calcularLemke({ tipo: 'qp', Q: [[0, 1], [1, 0]], c: [0, 0] })).toThrow(/no convexo/i);
    expect(calcularLemke({ tipo: 'qp', Q: [[1, 1], [1, 1]], c: [0, 0] }).estado).toBe('solucion');
  });

  it('C05: un rayo de Lemke es inconcluso incluso si existe solución por otro camino', () => {
    // z=(0,1) implica w=(0,0), aunque Lemke termina por rayo.
    const r = calcularLemke({ tipo: 'lcp', M: [[-1, 2], [0, 1]], q: [-2, -1] });
    expect(r.estado).toBe('rayo-inconcluso');
    expect(r.mensaje).toMatch(/trayectoria/i);
  });

  it('C13: Simplex conserva los dígitos del lado derecho textual', () => {
    const r = calcularSimplex({
      funcionObjetivo: [1],
      restricciones: [{ coeficientes: [1], b: '9007199254740993' }],
    });
    expect(r.estado).toBe('optimo');
    expect(r.valorObjetivo.tex).toBe('9007199254740993');
  });

  it('C13: Transporte conserva 1/3 desde el contrato textual', () => {
    const r = calcularTransporte({ costos: [['1/3']], oferta: [1], demanda: [1] });
    expect(r.valorObjetivo).toMatchObject({ num: '1', den: '3' });
  });

  it.each(['a', ''])('C13: Transporte rechaza la celda textual %j con diagnóstico de valor exacto', valor => {
    expect(() => calcularTransporte({
      costos: [[valor]], oferta: [1], demanda: [1],
    })).toThrow(/entero, decimal o fracción/i);
  });
});
