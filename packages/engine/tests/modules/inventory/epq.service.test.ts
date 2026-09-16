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

describe('EPQ - Costo de mantener porcentual (H = I × C)', () => {
  // I = 20% y C = 10 → H = (20/100) × 10 = 2
  // D = 10000, P = 20000, S = 20, factor (1 - D/P) = 0.5
  // Q* = √( 2DS / (H × factor) ) = √( 400000 / (2 × 0.5) ) = √400000 ≈ 632
  test('debe derivar H = (I/100) × C y coincidir con el EPQ fijo equivalente', () => {
    const porcentaje = calcularEPQ({
      demandaAnual: 10000,
      tasaProduccion: 20000,
      costoOrdenar: 20,
      tipoCostoMantener: 'porcentaje',
      costoMantenerPorcentaje: 20,
      costoUnitario: 10,
    });
    const fijo = calcularEPQ({
      demandaAnual: 10000,
      tasaProduccion: 20000,
      costoOrdenar: 20,
      costoMantener: 2,
      costoUnitario: 10,
    });

    expect(porcentaje.desglose.costoHoldingUnitario).toBe(2);
    expect(porcentaje.cantidadOptima).toBe(fijo.cantidadOptima);
    expect(porcentaje.inventarioMaximo).toBe(fijo.inventarioMaximo);
    expect(porcentaje.costoTotalAnual).toBe(fijo.costoTotalAnual);
  });

  test('debe lanzar error si el modo porcentaje no incluye el costo unitario (C)', () => {
    expect(() => {
      EPQValidatedSchema.parse({
        demandaAnual: 10000,
        tasaProduccion: 20000,
        costoOrdenar: 20,
        tipoCostoMantener: 'porcentaje',
        costoMantenerPorcentaje: 20,
      });
    }).toThrow('El costo unitario (C) es obligatorio para calcular el costo de mantener porcentual');
  });

  test('debe lanzar error si el costo unitario (C) es cero en modo porcentaje', () => {
    expect(() => {
      EPQValidatedSchema.parse({
        demandaAnual: 10000,
        tasaProduccion: 20000,
        costoOrdenar: 20,
        tipoCostoMantener: 'porcentaje',
        costoMantenerPorcentaje: 20,
        costoUnitario: 0,
      });
    }).toThrow('El costo unitario (C) es obligatorio para calcular el costo de mantener porcentual');
  });

  test('debe lanzar error si el modo porcentaje no incluye el porcentaje (I)', () => {
    expect(() => {
      EPQValidatedSchema.parse({
        demandaAnual: 10000,
        tasaProduccion: 20000,
        costoOrdenar: 20,
        tipoCostoMantener: 'porcentaje',
        costoUnitario: 10,
      });
    }).toThrow('El porcentaje (I) del costo de mantener debe ser un número positivo');
  });

  test('en modo fijo sin H se lanza un error claro', () => {
    expect(() => {
      EPQValidatedSchema.parse({
        demandaAnual: 10000,
        tasaProduccion: 20000,
        costoOrdenar: 20,
        costoMantener: undefined,
      });
    }).toThrow('El costo de mantener debe ser un número positivo');
  });
});

describe('EPQ - Unidades homogéneas (Caso 1)', () => {
  test('D y H semestrales calculan sobre el semestre sin Fase 0', () => {
    const resultado = calcularEPQ({
      demandaAnual: 5000,       // unidades/semestre
      tasaProduccion: 10000,    // unidades/semestre
      costoOrdenar: 20,
      costoMantener: 2.5,       // USD/unidad-semestre
      costoUnitario: 10,
      unidadDemanda: 'semestral',
      unidadCostoMantener: 'semestral',
    });
    const anual = calcularEPQ({
      demandaAnual: 10000,
      tasaProduccion: 20000,
      costoOrdenar: 20,
      costoMantener: 5,
      costoUnitario: 10,
    });

    expect(resultado.conversionUnidades.activa).toBe(false);
    expect(resultado.conversionUnidades.base).toBe('semestral');
    expect(resultado.conversionUnidades.factorBase).toBe(2);
    expect(resultado.conversionUnidades.pasos).toHaveLength(0);

    // Miso Q* y el mismo ciclo en días (invariantes); costos/pedidos por semestre
    expect(resultado.cantidadOptima).toBe(anual.cantidadOptima);
    expect(resultado.cicloProduccion).toBe(anual.cicloProduccion);
    expect(resultado.costoMantener).toBeCloseTo(anual.costoMantener / 2, 1);
    expect(resultado.costoOrdenar).toBeCloseTo(anual.costoOrdenar / 2, 1);
    expect(resultado.numeroProducciones).toBeCloseTo(anual.numeroProducciones / 2, 1);
    expect(resultado.costoTotalAnual).toBeCloseTo(anual.costoTotalAnual / 2, 1);
  });
});

describe('EPQ - Pestaña Procesos (procesos paso a paso)', () => {
  const inputEPQ = {
    demandaAnual: 10000,
    tasaProduccion: 20000,
    costoOrdenar: 20,
    costoMantener: 5,
    costoUnitario: 10,
  };

  test('genera el desglose de Q*, Imax, N, ciclo, costos y TC (anual)', () => {
    const resultado = calcularEPQ(inputEPQ);
    const ids = resultado.procesos.map((p) => p.id);

    expect(ids).toContain('epq-q-optimo');
    expect(ids).toContain('epq-inventario-maximo');
    expect(ids).toContain('epq-inventario-promedio');
    expect(ids).toContain('epq-numero-producciones');
    expect(ids).toContain('cicloProduccion');
    expect(ids).toContain('demandaDiaria');
    expect(ids).toContain('epq-costo-mantener');
    expect(ids).toContain('epq-costo-preparacion');
    expect(ids).toContain('epq-costo-adquisicion');
    expect(ids).toContain('epq-costo-total');
    expect(ids).not.toContain('puntoReorden');

    // factor = 1 - D/P = 0.5 → Q* = √(2·10000·20/(5·0.5)) = 400
    const q = resultado.procesos.find((p) => p.id === 'epq-q-optimo')!;
    expect(q.sustitucion).toContain('2(10000)(20)');
    expect(q.sustitucion).toContain('\\frac{10000}{20000}');
    expect(q.resultado).toBe('Q^* = 400');

    const imax = resultado.procesos.find((p) => p.id === 'epq-inventario-maximo')!;
    expect(imax.sustitucion).toContain('400 \\cdot 0.5');
    expect(imax.resultado).toBe('I_{max} = 200');

    const tc = resultado.procesos.find((p) => p.id === 'epq-costo-total')!;
    expect(tc.resultado).toBe('TC = 101000');
  });

  test('la Sustitución de Q* usa la D homogeneizada en el caso mixto', () => {
    const resultado = calcularEPQ({
      ...inputEPQ,
      demandaAnual: 2500, // unidades/trimestre
      unidadDemanda: 'trimestral',
      unidadCostoMantener: 'anual',
    });

    expect(resultado.conversionUnidades.activa).toBe(true);
    const q = resultado.procesos.find((p) => p.id === 'epq-q-optimo')!;
    // D homogeneizada = 2500 × 4 = 10000/año
    expect(q.sustitucion).toContain('2(10000)(20)');
    expect(q.sustitucion).not.toContain('2(2500)(20)');
    expect(resultado.procesos.some((p) => p.id === 'fase0-0-D')).toBe(true);
  });

  test('caso homogéneo semestral: N se expresa por semestre (12.5 corridas)', () => {
    const resultado = calcularEPQ({
      ...inputEPQ,
      demandaAnual: 5000,
      tasaProduccion: 10000,
      costoMantener: 2.5,
      unidadDemanda: 'semestral',
      unidadCostoMantener: 'semestral',
    });

    expect(resultado.procesos.some((p) => p.id.startsWith('fase0-'))).toBe(false);
    const n = resultado.procesos.find((p) => p.id === 'epq-numero-producciones')!;
    expect(n.resultado).toBe('N = 12.5');
  });
});