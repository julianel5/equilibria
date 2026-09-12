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

  test('ROP por defecto = 0 cuando no hay lead time', () => {
    const resultado = calcularEOQ(inputBasico);

    // Sin lead time no aplica punto de reorden
    expect(resultado.puntoReorden).toBe(0);
    expect(resultado.desglose.diasLaborables).toBe(365);
    expect(resultado.desglose.leadTime).toBe(0);
  });

  test('ROP con diasLaborables y leadTime provistos', () => {
    // d = 10000 / 250 = 40 unidades/día
    // ROP = 40 × 5 = 200 unidades
    const resultado = calcularEOQ({
      ...inputBasico,
      diasLaborables: 250,
      leadTime: 5,
    });

    expect(resultado.desglose.demandaDiaria).toBe(40);
    expect(resultado.puntoReorden).toBe(200);
  });

  test('ROP con leadTime fraccionario (días de entrega)', () => {
    // d = 10000 / 365 ≈ 27.397
    // ROP = 27.397 × 3.5 ≈ 95.89 → 96
    const resultado = calcularEOQ({
      ...inputBasico,
      diasLaborables: 365,
      leadTime: 3.5,
    });

    expect(resultado.puntoReorden).toBe(96);
  });

  test('ROP usa diasLaborables hijos (ej. 300 días → d mayor)', () => {
    // d = 10000 / 300 = 33.33
    // ROP = 33.33 × 10 = 333.33 → 333
    const resultado = calcularEOQ({
      ...inputBasico,
      diasLaborables: 300,
      leadTime: 10,
    });

    expect(resultado.puntoReorden).toBe(333);
  });

  test('debe lanzar error con leadTime negativo', () => {
    expect(() => {
      calcularEOQ({ ...inputBasico, leadTime: -1 });
    }).toThrow();
  });

  test('debe lanzar error con diasLaborables cero', () => {
    expect(() => {
      calcularEOQ({ ...inputBasico, diasLaborables: 0 });
    }).toThrow();
  });

  test('debe lanzar error con diasLaborables mayor a 366 (año bisiesto)', () => {
    expect(() => {
      calcularEOQ({ ...inputBasico, diasLaborables: 400 });
    }).toThrow('Los días laborales al año no pueden exceder los 366 días de un año bisiesto.');
  });

  test('debe aceptar el límite de 366 días laborables', () => {
    const resultado = calcularEOQ({ ...inputBasico, diasLaborables: 366 });
    expect(resultado.desglose.diasLaborables).toBe(366);
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
