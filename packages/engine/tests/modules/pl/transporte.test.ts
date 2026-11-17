import {
  calcularTransporte,
  TransporteInputSchema,
  type FraccionTransporteJSON,
  type TransporteResultado,
} from '../../../src';

const num = (f: FraccionTransporteJSON): number => Number(f.num) / Number(f.den);

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

function totalPorFilas(res: TransporteResultado): number[] {
  return res.asignacion.map((fila) => sum(fila.map(num)));
}

function totalPorColumnas(res: TransporteResultado): number[] {
  return res.asignacion[0].map((_, j) => sum(res.asignacion.map((fila) => num(fila[j]))));
}

describe('Modelos de Transporte — casos clásicos', () => {
  it('resuelve un 2×2 balanceado con Vogel y MODI (Z* = 70)', () => {
    const res = calcularTransporte({
      costos: [
        [1, 9],
        [9, 1],
      ],
      oferta: [10, 20],
      demanda: [15, 15],
      metodoInicial: 'vogel',
    });

    expect(res.estado).toBe('optimo');
    expect(res.balanceado).toBe(true);
    expect(res.metodoUsado).toBe('vogel');
    expect(num(res.valorObjetivo)).toBe(70);
    expect(res.asignacion.map((f) => f.map(num))).toEqual([
      [10, 0],
      [5, 15],
    ]);
    expect(res.asignaciones).toHaveLength(3);
    expect(res.iteraciones[res.iteraciones.length - 1].optimo).toBe(true);
  });

  it('obtiene el mismo óptimo desde los tres métodos iniciales', () => {
    const base = {
      costos: [
        [1, 9],
        [9, 1],
      ],
      oferta: [10, 20],
      demanda: [15, 15],
    };
    for (const metodoInicial of ['noroeste', 'costo-minimo', 'vogel'] as const) {
      const res = calcularTransporte({ ...base, metodoInicial });
      expect(res.estado).toBe('optimo');
      expect(num(res.valorObjetivo)).toBe(70);
      expect(res.metodoUsado).toBe(metodoInicial);
    }
  });

  it('resuelve un 2×3 degenerado añadiendo una celda básica con flujo 0 (Z* = 360)', () => {
    const res = calcularTransporte({
      costos: [
        [2, 3, 4],
        [5, 4, 2],
      ],
      oferta: [100, 50],
      demanda: [40, 60, 50],
      metodoInicial: 'vogel',
    });

    expect(res.estado).toBe('optimo');
    expect(num(res.valorObjetivo)).toBe(360);
    const inicial = res.iteraciones[0];
    const basicas = inicial.basicas.flat().filter(Boolean).length;
    expect(basicas).toBe(res.m + res.n - 1);
    // Hay celdas básicas de flujo 0 que completan la base degenerada.
    expect(
      inicial.basicas.some((fila, i) =>
        fila.some((b, j) => b && Number(inicial.asignacion[i][j].num) === 0)
      )
    ).toBe(true);
  });

  it('conserva oferta y demanda en todas las iteraciones', () => {
    const res = calcularTransporte({
      costos: [
        [8, 6, 10],
        [9, 12, 13],
        [14, 9, 16],
      ],
      oferta: [20, 30, 25],
      demanda: [15, 25, 35],
      metodoInicial: 'costo-minimo',
    });

    expect(res.estado).toBe('optimo');
    const oferta = res.oferta.map(num);
    const demanda = res.demanda.map(num);

    for (const it of res.iteraciones) {
      const filas = it.asignacion.map((fila) => sum(fila.map(num)));
      const columnas = it.asignacion[0].map((_, j) =>
        sum(it.asignacion.map((fila) => num(fila[j])))
      );
      expect(filas).toEqual(oferta);
      expect(columnas).toEqual(demanda);
    }

    const final = res.iteraciones[res.iteraciones.length - 1];
    const negativos = final.reducidos.flat().filter((r) => r !== null && num(r) < 0);
    expect(negativos).toHaveLength(0);
  });
});

describe('Modelos de Transporte — desbalance, máximos y fracciones', () => {
  it('añade un destino ficticio cuando la oferta supera la demanda', () => {
    const res = calcularTransporte({
      costos: [
        [1, 2],
        [2, 1],
      ],
      oferta: [10, 20],
      demanda: [10, 15],
    });

    expect(res.estado).toBe('optimo');
    expect(res.balanceado).toBe(false);
    expect(res.ajuste).toBe('demanda-ficticia');
    expect(res.destinoFicticio).toEqual([false, false, true]);
    expect(num(res.valorObjetivo)).toBe(25);
    // El excedente de 5 unidades viaja al destino ficticio con costo 0.
    const ficticias = res.asignaciones.filter((a) => a.ficticia);
    expect(ficticias).toHaveLength(1);
    expect(num(ficticias[0].cantidad)).toBe(5);
    expect(num(ficticias[0].costoUnitario)).toBe(0);
  });

  it('añade un origen ficticio cuando la demanda supera la oferta', () => {
    const res = calcularTransporte({
      costos: [
        [1, 2],
        [2, 1],
      ],
      oferta: [10, 10],
      demanda: [10, 15],
    });

    expect(res.estado).toBe('optimo');
    expect(res.ajuste).toBe('oferta-ficticia');
    expect(res.origenFicticio).toEqual([false, false, true]);
    expect(num(res.valorObjetivo)).toBe(20);
    expect(res.asignaciones.filter((a) => a.ficticia)).toHaveLength(1);
  });

  it('maximiza transformando c′ = −c y reporta el valor original', () => {
    const res = calcularTransporte({
      costos: [
        [5, 3],
        [4, 6],
      ],
      oferta: [10, 20],
      demanda: [15, 15],
      objetivo: 'max',
    });

    expect(res.estado).toBe('optimo');
    expect(res.objetivo).toBe('max');
    expect(num(res.valorObjetivo)).toBe(160);
    expect(res.asignacion.map((f) => f.map(num))).toEqual([
      [10, 0],
      [5, 15],
    ]);
  });

  it('trabaja con fracciones exactas y las serializa en LaTeX', () => {
    const res = calcularTransporte({
      costos: [
        [0.5, 2.5],
        [2.5, 0.5],
      ],
      oferta: [1, 2],
      demanda: [2, 1],
    });

    expect(res.estado).toBe('optimo');
    expect(res.valorObjetivo.tex).toBe('\\frac{7}{2}');
    expect(res.valorObjetivo.dec).toBe('3.5');
    expect(JSON.stringify(res)).not.toContain('bigint');
    expect(() => JSON.parse(JSON.stringify(res))).not.toThrow();
  });
});

describe('Modelos de Transporte — rutas prohibidas e infactibilidad', () => {
  it('respeta las rutas prohibidas (solo quedan las diagonales)', () => {
    const res = calcularTransporte({
      costos: [
        [1, 1],
        [1, 1],
      ],
      oferta: [10, 10],
      demanda: [10, 10],
      prohibidas: [
        { origen: 1, destino: 1 },
        { origen: 2, destino: 2 },
      ],
    });

    expect(res.estado).toBe('optimo');
    expect(res.prohibidas).toEqual([
      [true, false],
      [false, true],
    ]);
    expect(res.asignacion.map((f) => f.map(num))).toEqual([
      [0, 10],
      [10, 0],
    ]);
    expect(num(res.valorObjetivo)).toBe(20);
  });

  it('recurre a otro método inicial si el elegido no logra una asignación factible', () => {
    // Noroeste se bloquea con estas prohibiciones, pero Costo Mínimo/Vogel sí
    // encuentran una solución factible.
    const res = calcularTransporte({
      costos: [
        [1, 2, 3],
        [2, 3, 1],
        [3, 1, 2],
      ],
      oferta: [10, 10, 10],
      demanda: [10, 10, 10],
      metodoInicial: 'noroeste',
      prohibidas: [
        { origen: 1, destino: 3 },
        { origen: 2, destino: 2 },
        { origen: 3, destino: 2 },
        { origen: 3, destino: 3 },
      ],
    });

    expect(res.estado).toBe('optimo');
    expect(res.metodoSolicitado).toBe('noroeste');
    expect(res.metodoUsado).not.toBe('noroeste');
    expect(res.mensaje).toContain('no encontró una asignación factible');
  });

  it('declara infactible cuando las prohibiciones aíslan toda la oferta', () => {
    const res = calcularTransporte({
      costos: [
        [1, 1],
        [1, 1],
      ],
      oferta: [10, 0],
      demanda: [0, 10],
      prohibidas: [{ origen: 1, destino: 2 }],
    });

    expect(res.estado).toBe('infactible');
    expect(res.iteraciones).toHaveLength(0);
    expect(res.mensaje.toLowerCase()).toContain('no existe una asignación factible');
  });
});

describe('Modelos de Transporte — validación y determinismo', () => {
  it('valida dimensiones, valores negativos y rutas fuera de rango', () => {
    expect(() =>
      calcularTransporte({
        costos: [[1, 2]],
        oferta: [1],
        demanda: [1, 1, 1],
      })
    ).toThrow();

    expect(() =>
      calcularTransporte({
        costos: [[1, 2]],
        oferta: [-1],
        demanda: [1],
      })
    ).toThrow();

    expect(() =>
      calcularTransporte({
        costos: [[1, 2]],
        oferta: [1],
        demanda: [1],
        prohibidas: [{ origen: 3, destino: 1 }],
      })
    ).toThrow();

    const schema = TransporteInputSchema.safeParse({
      costos: [
        [1, 2],
        [3],
      ],
      oferta: [1, 2],
      demanda: [1, 2],
    });
    expect(schema.success).toBe(false);
  });

  it('es determinista para la misma entrada', () => {
    const input = {
      costos: [
        [8, 6, 10],
        [9, 12, 13],
        [14, 9, 16],
      ],
      oferta: [20, 30, 25],
      demanda: [15, 25, 35],
      metodoInicial: 'vogel' as const,
    };
    const a = calcularTransporte(input);
    const b = calcularTransporte(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('incluye la comparación de los tres métodos iniciales y procesos', () => {
    const res = calcularTransporte({
      costos: [
        [1, 9],
        [9, 1],
      ],
      oferta: [10, 20],
      demanda: [15, 15],
      metodoInicial: 'costo-minimo',
    });

    expect(res.comparacionInicial.map((c) => c.metodo)).toEqual([
      'vogel',
      'costo-minimo',
      'noroeste',
    ]);
    expect(res.comparacionInicial.every((c) => c.factible)).toBe(true);
    expect(res.comparacionInicial.every((c) => num(c.costo!) === 70)).toBe(true);
    expect(res.procesos.some((p) => p.titulo.includes('Modelo de transporte'))).toBe(true);
    expect(res.procesos.some((p) => p.titulo.includes('Criterio de optimalidad'))).toBe(true);
    expect(res.procesos.some((p) => p.formula.includes('\\begin{array}'))).toBe(true);
  });

  it('verifica el costo con la suma de las asignaciones finales', () => {
    const res = calcularTransporte({
      costos: [
        [8, 6, 10],
        [9, 12, 13],
        [14, 9, 16],
      ],
      oferta: [20, 30, 25],
      demanda: [15, 25, 35],
      metodoInicial: 'noroeste',
    });

    const total = sum(res.asignaciones.map((a) => num(a.costo)));
    expect(total).toBeCloseTo(num(res.valorObjetivo), 10);
    expect(totalPorFilas(res)).toEqual(res.oferta.map(num));
    expect(totalPorColumnas(res)).toEqual(res.demanda.map(num));
  });
});
