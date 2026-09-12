import { calcularEPQ, EPQValidatedSchema } from '../../../src';

describe('EPQ - Lote Económico de Producción', () => {
  // Ejemplo clásico de EPQ:
  // D = 10,000 unidades/año
  // P = 20,000 unidades/año
  // S = $20 por corrida de producción
  // H = $5 por unidad/año
  //
  // 1 - D/P = 1 - 10000/20000 = 0.5
  // Q* = √(2 × 10000 × 20 / (5 × 0.5)) = √(400000/2.5) = √160000 = 400
  // Imax = 400 × 0.5 = 200
  // Ch = (200/2) × 5 = 500
  const input = {
    demandaAnual: 10000,
    tasaProduccion: 20000,
    costoOrdenar: 20,
    costoMantener: 5,
    costoUnitario: 10,
  };

  test('debe lanzar error si P es menor que D (inviable)', () => {
    expect(() => {
      EPQValidatedSchema.parse({ ...input, tasaProduccion: 5000 });
    }).toThrow();
  });

  test('debe lanzar error si P es igual a D (inviable)', () => {
    expect(() => {
      EPQValidatedSchema.parse({ ...input, tasaProduccion: 10000 });
    }).toThrow();
  });

  test('el error debe ser claro y mencionar la condición P > D', () => {
    expect(() => {
      EPQValidatedSchema.parse({ ...input, tasaProduccion: 8000 });
    }).toThrow(/inviable/);
  });

  test('debe calcular Q* con factor (1 - D/P)', () => {
    const resultado = calcularEPQ(input);

    // Q* = √160000 = 400
    expect(resultado.cantidadOptima).toBe(400);
  });

  test('debe calcular el inventario máximo Imax = Q*(1 - D/P)', () => {
    const resultado = calcularEPQ(input);

    // Imax = 400 × 0.5 = 200
    expect(resultado.inventarioMaximo).toBe(200);
  });

  test('debe calcular el costo de mantener con Imax/2 × H', () => {
    const resultado = calcularEPQ(input);

    // Ch = (200/2) × 5 = 500
    expect(resultado.costoMantener).toBe(500);
  });

  test('debe calcular el costo de preparación (D/Q*)×S', () => {
    const resultado = calcularEPQ(input);

    // Co = (10000/400) × 20 = 500
    expect(resultado.costoOrdenar).toBe(500);
  });

  test('debe calcular el costo total anual TC', () => {
    const resultado = calcularEPQ(input);

    // TC = 500 + 500 + 100000 = 101000
    expect(resultado.costoTotalAnual).toBe(101000);
  });

  test('debe calcular corridas de producción por año', () => {
    const resultado = calcularEPQ(input);

    // N = D/Q* = 10000/400 = 25
    expect(resultado.numeroProducciones).toBe(25);
  });

  test('debe calcular el ciclo de producción usando los días laborables', () => {
    const resultado = calcularEPQ({ ...input, diasLaborables: 250 });

    // T = 250 / 25 = 10 días
    expect(resultado.cicloProduccion).toBe(10);
  });

  test('debe calcular ROP con lead time sobre base de días laborables', () => {
    const resultado = calcularEPQ({ ...input, diasLaborables: 250, leadTime: 2 });

    // d = 10000/250 = 40; ROP = 40 × 2 = 80
    expect(resultado.desglose.demandaDiaria).toBe(40);
    expect(resultado.puntoReorden).toBe(80);
  });

  test('ROP = 0 cuando no hay lead time', () => {
    const resultado = calcularEPQ(input);

    expect(resultado.puntoReorden).toBe(0);
  });

  test('debe lanzar error con diasLaborables mayor a 366 (año bisiesto)', () => {
    expect(() => {
      calcularEPQ({ ...input, diasLaborables: 400 });
    }).toThrow('Los días laborales al año no pueden exceder los 366 días de un año bisiesto.');
  });

  test('debe aceptar el límite de 366 días laborables', () => {
    const resultado = calcularEPQ({ ...input, diasLaborables: 366 });
    expect(resultado.desglose.diasLaborables).toBe(366);
  });
});