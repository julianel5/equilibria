import { calcularEOQ, generarCurvaTC, EOQInput, SensitivityDataPoint } from '../../../src';

describe('EOQ - Cantidad Económica de Pedido', () => {
  // Ejemplo clásico de EOQ:
  // D = 10,000 unidades/año
  // S = $20 por orden
  // H = $5 por unidad/año
  //
  // Q* = √(2 × 10000 × 20 / 5) = √80000 = 282.84 ≈ 283 unidades
  // TC = (10000/283)×20 + (283/2)×5 = 706.71 + 707.5 = 1414.21
  const inputBasico: EOQInput = {
    demandaAnual: 10000,
    costoOrdenar: 20,
    costoMantener: 5,
    costoUnitario: 10,
  };

  test('debe calcular Q* correctamente (fórmula √(2DS/H))', () => {
    const resultado = calcularEOQ(inputBasico);

    // Q* = √(2 × 10000 × 20 / 5) = √80000 ≈ 283
    expect(resultado.cantidadOptima).toBe(283);
  });

  test('debe calcular el costo total anual correctamente', () => {
    const resultado = calcularEOQ(inputBasico);

    // TC = (D/Q*)S + (Q*/2)H + DC
    // TC = (10000/283)×20 + (283/2)×5 + 10000×10
    // TC ≈ 706.71 + 707.5 + 100000 = 101414.21
    expect(resultado.costoTotalAnual).toBeCloseTo(101414.21, 0);
  });

  test('debe calcular el número de pedidos por año', () => {
    const resultado = calcularEOQ(inputBasico);

    // N = D / Q* = 10000 / 283 ≈ 35.34
    expect(resultado.numeroPedidos).toBeCloseTo(35.34, 1);
  });

  test('debe calcular el ciclo de reposición en días', () => {
    const resultado = calcularEOQ(inputBasico);

    // T = 365 / N = 365 / 35.34 ≈ 10.33
    expect(resultado.cicloReposicion).toBeCloseTo(10.33, 1);
  });

  test('debe calcular inventario promedio = Q*/2', () => {
    const resultado = calcularEOQ(inputBasico);

    // Q*/2 = 283 / 2 = 141.5
    expect(resultado.inventarioPromedio).toBe(141.5);
  });

  test('debe calcular costo de adquisición = D × C', () => {
    const resultado = calcularEOQ(inputBasico);

    // D × C = 10000 × 10 = 100000
    expect(resultado.costoAdquisicion).toBe(100000);
  });

  test('debe lanzar error con demanda negativa', () => {
    expect(() => {
      calcularEOQ({ ...inputBasico, demandaAnual: -100 });
    }).toThrow();
  });

  test('debe lanzar error con costo de ordenar cero', () => {
    expect(() => {
      calcularEOQ({ ...inputBasico, costoOrdenar: 0 });
    }).toThrow();
  });

  test('debe funcionar sin costo unitario (default 0)', () => {
    const resultado = calcularEOQ({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 5,
    });

    expect(resultado.costoAdquisicion).toBe(0);
    expect(resultado.cantidadOptima).toBe(283);
  });

  test('caso estándar: D=1000, S=5, H=2', () => {
    // Q* = √(2 × 1000 × 5 / 2) = √5000 ≈ 70.71 ≈ 71
    const resultado = calcularEOQ({
      demandaAnual: 1000,
      costoOrdenar: 5,
      costoMantener: 2,
    });

    expect(resultado.cantidadOptima).toBe(71);
  });
});

describe('Curva TC vs Q (Análisis de sensibilidad)', () => {
  test('debe generar datos para la curva de costo total', () => {
    const data = generarCurvaTC({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 5,
    });

    expect(data.length).toBeGreaterThan(10);
    expect(data[0]).toHaveProperty('cantidad');
    expect(data[0]).toHaveProperty('costoTotal');
    expect(data[0]).toHaveProperty('costoOrdenar');
    expect(data[0]).toHaveProperty('costoMantener');
  });

  test('el punto mínimo de la curva debe estar cerca de Q*', () => {
    const data = generarCurvaTC({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 5,
    });

    // Encontrar el punto con menor costo total
    const puntoMinimo = data.reduce((min: SensitivityDataPoint, punto: SensitivityDataPoint) =>
      punto.costoTotal < min.costoTotal ? punto : min
    );

    // Q* ≈ 283, debe estar dentro del rango razonable
    expect(puntoMinimo.cantidad).toBeGreaterThanOrEqual(250);
    expect(puntoMinimo.cantidad).toBeLessThanOrEqual(320);
  });
});
