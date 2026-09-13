import { calcularEOQFaltantes, EOQFaltantesInputSchema } from '../../../src';

describe('EOQ con Faltantes Planeados (Déficit Autorizado)', () => {
  // Ejemplo clásico:
  // D = 10,000 unidades/año
  // S = $20 por orden
  // H = $5 por unidad/año
  // B = $5 por unidad faltante-año
  //
  // eoq = √(2 × 10000 × 20 / 5) = √80000 = 282.8427
  // Q* = 282.8427 × √((5+5)/5) = 282.8427 × √2 = 400
  // S* = 400 × (5/(5+5)) = 400 × 0.5 = 200
  // Imax = 400 - 200 = 200
  // Ch = (200²)/(2×400) × 5 = 50 × 5 = 250
  // Cf = (200²)/(2×400) × 5 = 50 × 5 = 250
  // Co = (10000/400) × 20 = 25 × 20 = 500
  // TC = 500 + 250 + 250 = 1000
  const input = {
    demandaAnual: 10000,
    costoOrdenar: 20,
    costoMantener: 5,
    costoFaltantes: 5,
    costoUnitario: 10,
  };

  test('debe calcular Q* con el factor de ajuste por faltantes (H+B)/B', () => {
    const resultado = calcularEOQFaltantes(input);

    // Q* = 400
    expect(resultado.cantidadOptima).toBe(400);
  });

  test('Q* debe ser mayor que el EOQ puro cuando hay faltantes', () => {
    const resultado = calcularEOQFaltantes(input);

    // EOQ puro = √(2DS/H) = 282.84 < Q* = 400
    expect(resultado.cantidadOptima).toBeGreaterThan(282.84);
  });

  test('debe calcular el faltante máximo S* = Q*(H/(H+B))', () => {
    const resultado = calcularEOQFaltantes(input);

    // S* = 200
    expect(resultado.faltanteMaximo).toBe(200);
  });

  test('debe calcular el inventario máximo Imax = Q* - S*', () => {
    const resultado = calcularEOQFaltantes(input);

    // Imax = 400 - 200 = 200
    expect(resultado.inventarioMaximo).toBe(200);
  });

  test('debe calcular el costo de mantener Ch = Imax²/(2Q*)×H', () => {
    const resultado = calcularEOQFaltantes(input);

    // Ch = 250
    expect(resultado.costoMantener).toBe(250);
  });

  test('debe calcular el costo de faltantes Cf = S*²/(2Q*)×B', () => {
    const resultado = calcularEOQFaltantes(input);

    // Cf = 250
    expect(resultado.costoFaltantes).toBe(250);
  });

  test('debe calcular el costo de ordenar Co = (D/Q*)×S', () => {
    const resultado = calcularEOQFaltantes(input);

    // Co = 500
    expect(resultado.costoOrdenar).toBe(500);
  });

  test('debe calcular el costo relevante total TC = Co + Ch + Cf', () => {
    const resultado = calcularEOQFaltantes(input);

    // TC = 500 + 250 + 250 = 1000
    expect(resultado.costoTotalAnual).toBe(1000);
    expect(resultado.costoTotalAnual).toBe(
      resultado.costoOrdenar + resultado.costoMantener + resultado.costoFaltantes
    );
  });

  test('debe calcular el número de pedidos por año', () => {
    const resultado = calcularEOQFaltantes(input);

    // N = D/Q* = 10000/400 = 25
    expect(resultado.numeroPedidos).toBe(25);
  });

  test('debe calcular el ciclo de reposición usando los días laborables', () => {
    const resultado = calcularEOQFaltantes({ ...input, diasLaborables: 250 });

    // T = 250 / 25 = 10 días
    expect(resultado.cicloReposicion).toBe(10);
  });

  test('debe calcular ROP con lead time sobre base de días laborables', () => {
    const resultado = calcularEOQFaltantes({ ...input, diasLaborables: 250, leadTime: 2 });

    // d = 10000/250 = 40; ROP = 40 × 2 = 80
    expect(resultado.desglose.demandaDiaria).toBe(40);
    expect(resultado.puntoReorden).toBe(80);
  });

  test('ROP = 0 cuando no hay lead time', () => {
    const resultado = calcularEOQFaltantes(input);

    expect(resultado.puntoReorden).toBe(0);
  });

  test('debe lanzar error si el costo de faltantes es cero', () => {
    expect(() => {
      EOQFaltantesInputSchema.parse({ ...input, costoFaltantes: 0 });
    }).toThrow('El costo de faltantes debe ser un número positivo');
  });

  test('debe lanzar error si el costo de faltantes es negativo', () => {
    expect(() => {
      EOQFaltantesInputSchema.parse({ ...input, costoFaltantes: -3 });
    }).toThrow();
  });

  test('debe lanzar error con diasLaborables mayor a 366 (año bisiesto)', () => {
    expect(() => {
      calcularEOQFaltantes({ ...input, diasLaborables: 400 });
    }).toThrow('Los días laborales al año no pueden exceder los 366 días de un año bisiesto.');
  });

  test('debe aceptar el límite de 366 días laborables', () => {
    const resultado = calcularEOQFaltantes({ ...input, diasLaborables: 366 });
    expect(resultado.desglose.diasLaborables).toBe(366);
  });

  test('el desglose debe exponer el costo de faltantes B y el factor H/(H+B)', () => {
    const resultado = calcularEOQFaltantes(input);

    expect(resultado.desglose.costoFaltantesUnitario).toBe(5);
    expect(resultado.desglose.factorFaltantes).toBe(0.5);
  });
});

describe('EOQ con Faltantes - Costo de mantener porcentual (H = I × C)', () => {
  // I = 40% y C = 10 → H = (40/100) × 10 = 4
  test('debe derivar H = (I/100) × C y coincidir con el modelo fijo equivalente', () => {
    const porcentaje = calcularEOQFaltantes({
      demandaAnual: 10000,
      costoOrdenar: 20,
      tipoCostoMantener: 'porcentaje',
      costoMantenerPorcentaje: 40,
      costoFaltantes: 5,
      costoUnitario: 10,
    });
    const fijo = calcularEOQFaltantes({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 4,
      costoFaltantes: 5,
      costoUnitario: 10,
    });

    expect(porcentaje.desglose.costoHoldingUnitario).toBe(4);
    expect(porcentaje.cantidadOptima).toBe(fijo.cantidadOptima);
    expect(porcentaje.faltanteMaximo).toBe(fijo.faltanteMaximo);
    expect(porcentaje.costoTotalAnual).toBe(fijo.costoTotalAnual);
  });

  test('debe lanzar error si el modo porcentaje no incluye el costo unitario (C)', () => {
    expect(() => {
      EOQFaltantesInputSchema.parse({
        demandaAnual: 10000,
        costoOrdenar: 20,
        tipoCostoMantener: 'porcentaje',
        costoMantenerPorcentaje: 40,
        costoFaltantes: 5,
      });
    }).toThrow('El costo unitario (C) es obligatorio para calcular el costo de mantener porcentual');
  });

  test('debe lanzar error si el costo unitario (C) es cero en modo porcentaje', () => {
    expect(() => {
      EOQFaltantesInputSchema.parse({
        demandaAnual: 10000,
        costoOrdenar: 20,
        tipoCostoMantener: 'porcentaje',
        costoMantenerPorcentaje: 40,
        costoFaltantes: 5,
        costoUnitario: 0,
      });
    }).toThrow('El costo unitario (C) es obligatorio para calcular el costo de mantener porcentual');
  });

  test('debe lanzar error si el modo porcentaje no incluye el porcentaje (I)', () => {
    expect(() => {
      EOQFaltantesInputSchema.parse({
        demandaAnual: 10000,
        costoOrdenar: 20,
        tipoCostoMantener: 'porcentaje',
        costoFaltantes: 5,
        costoUnitario: 10,
      });
    }).toThrow('El porcentaje (I) del costo de mantener debe ser un número positivo');
  });

  test('en modo fijo sin H se lanza un error claro', () => {
    expect(() => {
      EOQFaltantesInputSchema.parse({
        demandaAnual: 10000,
        costoOrdenar: 20,
        costoFaltantes: 5,
        costoMantener: undefined,
      });
    }).toThrow('El costo de mantener debe ser un número positivo');
  });
});