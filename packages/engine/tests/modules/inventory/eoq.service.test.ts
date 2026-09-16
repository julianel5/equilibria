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

  test('la curva incluye el punto exacto Q* con costos en equilibrio', () => {
    const data = generarCurvaTC({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 5,
    });

    const puntoOptimo = data.find((p) => p.cantidad === 283);
    expect(puntoOptimo).toBeDefined();
    // En el Q* continuo el costo de ordenar y el de mantener coinciden:
    // D/Q·S = (Q/2)·H = √(D·S·H/2) ≈ 707.11.
    expect(puntoOptimo!.costoOrdenar).toBeCloseTo(707.11, 2);
    expect(puntoOptimo!.costoMantener).toBeCloseTo(707.11, 2);
    expect(Math.abs(puntoOptimo!.costoOrdenar - puntoOptimo!.costoMantener)).toBeLessThan(0.01);
    expect(puntoOptimo!.costoTotal).toBeCloseTo(707.11 * 2, 1);

    // La secuencia queda ordenada y sin cantidades duplicadas.
    const cantidades = data.map((p) => p.cantidad);
    expect(cantidades).toEqual([...cantidades].sort((a, b) => a - b));
    expect(new Set(cantidades).size).toBe(cantidades.length);
  });
});

describe('EOQ - Costo de mantener porcentual (H = I × C)', () => {
  const inputPorcentaje: EOQInput = {
    demandaAnual: 10000,
    costoOrdenar: 20,
    tipoCostoMantener: 'porcentaje',
    costoMantenerPorcentaje: 20,
    costoUnitario: 10,
  };

  test('debe derivar H = (I/100) × C y dar el mismo resultado que el EOQ fijo equivalente', () => {
    // I = 20% y C = 10 → H = (20/100) × 10 = 2
    const porcentaje = calcularEOQ(inputPorcentaje);
    const fijo = calcularEOQ({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 2,
      costoUnitario: 10,
    });

    expect(porcentaje.desglose.costoHoldingUnitario).toBe(2);
    expect(porcentaje.cantidadOptima).toBe(fijo.cantidadOptima);
    expect(porcentaje.costoTotalAnual).toBe(fijo.costoTotalAnual);
    expect(porcentaje.costoMantener).toBe(fijo.costoMantener);
  });

  test('debe exponer el H efectivo en el desglose para la curva de costos', () => {
    const resultado = calcularEOQ(inputPorcentaje);

    expect(resultado.desglose.costoHoldingUnitario).toBe(2);
    expect(resultado.costoMantener).toBeCloseTo((resultado.cantidadOptima / 2) * 2, 1);
  });

  test('debe lanzar error si el modo porcentaje no incluye el costo unitario (C)', () => {
    expect(() => {
      calcularEOQ({ ...inputPorcentaje, costoUnitario: undefined });
    }).toThrow('El costo unitario (C) es obligatorio para calcular el costo de mantener porcentual');
  });

  test('debe lanzar error si el costo unitario (C) es cero en modo porcentaje', () => {
    expect(() => {
      calcularEOQ({ ...inputPorcentaje, costoUnitario: 0 });
    }).toThrow('El costo unitario (C) es obligatorio para calcular el costo de mantener porcentual');
  });

  test('debe lanzar error si el modo porcentaje no incluye el porcentaje (I)', () => {
    expect(() => {
      calcularEOQ({ ...inputPorcentaje, costoMantenerPorcentaje: undefined });
    }).toThrow('El porcentaje (I) del costo de mantener debe ser un número positivo');
  });

  test('en modo fijo el costo unitario sigue siendo opcional', () => {
    const resultado = calcularEOQ({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 5,
    });

    expect(resultado.cantidadOptima).toBe(283);
  });

  test('en modo fijo sin H se lanza un error claro', () => {
    expect(() => {
      calcularEOQ({
        demandaAnual: 10000,
        costoOrdenar: 20,
        costoMantener: undefined,
      });
    }).toThrow('El costo de mantener debe ser un número positivo');
  });

  test('generarCurvaTC respeta el modo porcentaje con el H efectivo', () => {
    const curvaPorcentaje = generarCurvaTC(inputPorcentaje);
    const curvaFija = generarCurvaTC({
      demandaAnual: 10000,
      costoOrdenar: 20,
      costoMantener: 2,
    });

    expect(curvaPorcentaje.length).toBe(curvaFija.length);
    expect(curvaPorcentaje[0].costoMantener).toBeCloseTo(curvaFija[0].costoMantener, 1);
  });

  describe('Fase 0 - Estandarización de Unidades', () => {
    test('reconoce demanda mensual y la convierte a demanda anual (D × 12)', () => {
      // D = 800 unidades/mes → 9,600 unidades/año
      // Q* = √(2 × 9600 × 20 / 5) = √76800 ≈ 277
      const resultado = calcularEOQ({
        demandaAnual: 800,
        unidadDemanda: 'mensual',
        costoOrdenar: 20,
        costoMantener: 5,
      });

      expect(resultado.desglose.demandaAnual).toBe(9600);
      expect(resultado.cantidadOptima).toBe(277);

      expect(resultado.conversionUnidades.activa).toBe(true);
      expect(resultado.conversionUnidades.base).toBe('anual');
      expect(resultado.conversionUnidades.diasLaborables).toBe(365);
      expect(resultado.conversionUnidades.pasos).toHaveLength(1);
      expect(resultado.conversionUnidades.pasos[0]).toMatchObject({
        variable: 'D',
        unidadOrigen: 'mensual',
        factor: 12,
        valorOrigen: 800,
        valorAnual: 9600,
      });
    });

    test('convierte el costo de mantener mensual a H anual (H × 12)', () => {
      // D = 10,000/año, S = 20, H = 1.5/mes → H anual = 18
      // Q* = √(2 × 10000 × 20 / 18) ≈ √22222 ≈ 149
      const resultado = calcularEOQ({
        demandaAnual: 10000,
        costoOrdenar: 20,
        costoMantener: 1.5,
        unidadCostoMantener: 'mensual',
      });

      expect(resultado.desglose.costoHoldingUnitario).toBe(18);
      expect(resultado.cantidadOptima).toBe(149);

      expect(resultado.conversionUnidades.pasos).toHaveLength(1);
      expect(resultado.conversionUnidades.pasos[0]).toMatchObject({
        variable: 'H',
        factor: 12,
        valorAnual: 18,
      });
    });

    test('mezcla de unidades: D semestral y H anual genera dos pasos en la metadata', () => {
      // D = 3,200/semestre → 6,400/año ; H = 5 anual.
      const resultado = calcularEOQ({
        demandaAnual: 3200,
        unidadDemanda: 'semestral',
        costoOrdenar: 20,
        costoMantener: 5,
      });

      expect(resultado.desglose.demandaAnual).toBe(6400);
      expect(resultado.cantidadOptima).toBe(226); // √(2×6400×20/5) ≈ 226.27
      expect(resultado.conversionUnidades.activa).toBe(true);
      expect(resultado.conversionUnidades.pasos).toHaveLength(1);
      // H no se convirtió (anual), así que solo hay un paso: D.
      expect(resultado.conversionUnidades.pasos[0].variable).toBe('D');
    });

    test('por defecto la unidad es anual y la Fase 0 queda inactiva', () => {
      const resultado = calcularEOQ({
        demandaAnual: 10000,
        costoOrdenar: 20,
        costoMantener: 5,
        costoUnitario: 10,
      });

      expect(resultado.conversionUnidades.activa).toBe(false);
      expect(resultado.conversionUnidades.pasos).toHaveLength(0);
      expect(resultado.desglose.demandaAnual).toBe(10000);
    });

    test('la unidad diaria usa diasLaborables del formulario (365), no un factor fijo', () => {
      // D = 10 unidades/día, diasLaborables = 365 → 3,650 unidades/año
      const resultado = calcularEOQ({
        demandaAnual: 10,
        unidadDemanda: 'diario',
        costoOrdenar: 20,
        costoMantener: 5,
        diasLaborables: 365,
      });

      expect(resultado.desglose.demandaAnual).toBe(3650);
      expect(resultado.conversionUnidades.diasLaborables).toBe(365);
      expect(resultado.conversionUnidades.pasos[0]).toMatchObject({
        variable: 'D',
        unidadOrigen: 'diario',
        factor: 365,
        valorOrigen: 10,
        valorAnual: 3650,
      });
    });

    test('la unidad diaria respeta el diasLaborables custom (250) del payload', () => {
      // D = 10 unidades/día, diasLaborables = 250 → 2,500 unidades/año
      const resultado = calcularEOQ({
        demandaAnual: 10,
        unidadDemanda: 'diario',
        costoOrdenar: 20,
        costoMantener: 5,
        diasLaborables: 250,
      });

      expect(resultado.desglose.demandaAnual).toBe(2500);
      expect(resultado.conversionUnidades.pasos[0].factor).toBe(250);
    });

    test('el costo de mantener diario también usa diasLaborables', () => {
      // H = 0.5 unidades/día de holding → 0.5 × 360 = 180 (con payload 360)
      const resultado = calcularEOQ({
        demandaAnual: 10000,
        costoOrdenar: 20,
        costoMantener: 0.5,
        unidadCostoMantener: 'diario',
        diasLaborables: 360,
      });

      expect(resultado.desglose.costoHoldingUnitario).toBe(180);
      expect(resultado.conversionUnidades.pasos[0]).toMatchObject({
        variable: 'H',
        unidadOrigen: 'diario',
        factor: 360,
        valorAnual: 180,
      });
    });

    test('la curva de costos usa la demanda homogeneizada anual', () => {
      const curva = generarCurvaTC({
        demandaAnual: 800,
        unidadDemanda: 'mensual',
        costoOrdenar: 20,
        costoMantener: 5,
      });

      // En Q* continuo D/Q·S = Q/2·H, con D = 9,600 → Q* ≈ 277.13
      const q = Math.sqrt((2 * 9600 * 20) / 5);
      expect(curva).toContainEqual(
        expect.objectContaining({
          cantidad: Math.round(q),
        })
      );
    });

    test('caso homogéneo: D y H semestrales calculan sobre el semestre sin Fase 0', () => {
      // Ambas variables en "semestral": no hay conversión, la base es el semestre.
      const resultado = calcularEOQ({
        demandaAnual: 1200, // 1,200 unidades/semestre
        costoOrdenar: 20,
        costoMantener: 5,   // 5 USD/unidad-semestre
        costoUnitario: 10,
        unidadDemanda: 'semestral',
        unidadCostoMantener: 'semestral',
      });

      expect(resultado.conversionUnidades.activa).toBe(false);
      expect(resultado.conversionUnidades.base).toBe('semestral');
      expect(resultado.conversionUnidades.factorBase).toBe(2);
      expect(resultado.conversionUnidades.pasos).toHaveLength(0);

      // Q* Idéntico al caso anual equivalente (D=2400, H=10): √(2·2400·20/10)=√9600≈98
      const anual = calcularEOQ({
        demandaAnual: 2400,
        costoOrdenar: 20,
        costoMantener: 10,
        costoUnitario: 10,
      });
      expect(resultado.cantidadOptima).toBe(anual.cantidadOptima);

      // Costos y pedidos expresados POR SEMESTRE (equivalentes anuales ÷ 2)
      expect(resultado.costoTotalAnual).toBeCloseTo(anual.costoTotalAnual / 2, 1);
      expect(resultado.costoOrdenar).toBeCloseTo(anual.costoOrdenar / 2, 1);
      expect(resultado.costoMantener).toBeCloseTo(anual.costoMantener / 2, 1);
      expect(resultado.numeroPedidos).toBeCloseTo(anual.numeroPedidos / 2, 1);

      // El ciclo en días es invariante (mismo intervalo real entre órdenes)
      expect(resultado.cicloReposicion).toBeCloseTo(anual.cicloReposicion, 1);
      expect(resultado.desglose.demandaDiaria).toBeCloseTo(anual.desglose.demandaDiaria, 1);
    });

    test('caso homogéneo: D y H mensuales → base mensual con factorBase 12', () => {
      const resultado = calcularEOQ({
        demandaAnual: 300,
        costoOrdenar: 20,
        costoMantener: 4,
        unidadDemanda: 'mensual',
        unidadCostoMantener: 'mensual',
      });

      expect(resultado.conversionUnidades.activa).toBe(false);
      expect(resultado.conversionUnidades.base).toBe('mensual');
      expect(resultado.conversionUnidades.factorBase).toBe(12);
      expect(resultado.conversionUnidades.pasos).toHaveLength(0);
      expect(resultado.desglose.demandaAnual).toBe(300);
    });

    test('caso homogéneo: D y H diarios mantienen base diaria (factorBase = 365)', () => {
      const resultado = calcularEOQ({
        demandaAnual: 100, // unidades/día
        costoOrdenar: 20,
        costoMantener: 0.4,
        unidadDemanda: 'diario',
        unidadCostoMantener: 'diario',
        diasLaborables: 365,
      });

      expect(resultado.conversionUnidades.activa).toBe(false);
      expect(resultado.conversionUnidades.base).toBe('diario');
      expect(resultado.conversionUnidades.factorBase).toBe(365);
      expect(resultado.conversionUnidades.pasos).toHaveLength(0);
      // período de un día → demanda diaria = D / 1 = 100
      expect(resultado.desglose.demandaDiaria).toBe(100);
    });
  });
});

describe('EOQ - Pestaña Procesos (procesos paso a paso)', () => {
  const inputProcesos = {
    demandaAnual: 10000,
    costoOrdenar: 20,
    costoMantener: 5,
    costoUnitario: 10,
  };

  test('genera el desglose de Q*, costos, N, ciclo y demanda diaria (anual)', () => {
    const resultado = calcularEOQ(inputProcesos);
    const ids = resultado.procesos.map((p) => p.id);

    expect(ids).toContain('eoq-q-optimo');
    expect(ids).toContain('eoq-numero-pedidos');
    expect(ids).toContain('cicloReposicion');
    expect(ids).toContain('demandaDiaria');
    expect(ids).toContain('eoq-costo-ordenar');
    expect(ids).toContain('eoq-costo-mantener');
    expect(ids).toContain('eoq-costo-adquisicion');
    expect(ids).toContain('eoq-costo-total');
    // Sin lead time no se incluye el proceso de ROP
    expect(ids).not.toContain('puntoReorden');

    const q = resultado.procesos.find((p) => p.id === 'eoq-q-optimo')!;
    expect(q.formula).toContain('\\frac{2DS}{H}');
    expect(q.sustitucion).toBe('Q^* = \\sqrt{\\frac{2(10000)(20)}{5}}');
    expect(q.resultado).toBe('Q^* = 283');

    const tc = resultado.procesos.find((p) => p.id === 'eoq-costo-total')!;
    expect(tc.formula).toBe('TC = C_o + C_h + C_c');
    expect(tc.sustitucion).toContain('706.71');
    expect(tc.sustitucion).toContain('707.5');
    expect(tc.sustitucion).toContain('100000');
    expect(tc.resultado).toBe('TC = 101414.21');
  });

  test('la Sustitución usa los valores homogeneizados cuando hubo Fase 0 (D mensual → anual)', () => {
    const resultado = calcularEOQ({
      ...inputProcesos,
      demandaAnual: 800, // unidades/mes
      unidadDemanda: 'mensual',
      unidadCostoMantener: 'anual',
    });

    expect(resultado.conversionUnidades.activa).toBe(true);

    const pasoD = resultado.procesos.find((p) => p.id === 'fase0-0-D');
    expect(pasoD).toBeDefined();
    expect(pasoD!.sustitucion).toContain('800 \\times 12');
    expect(pasoD!.resultado).toBe('D_{\\mathrm{base}} = 9600');

    // Q* debe sustituir 9600 (homogeneizada), NUNCA el 800 crudo del input.
    const q = resultado.procesos.find((p) => p.id === 'eoq-q-optimo')!;
    expect(q.sustitucion).toContain('2(9600)(20)');
    expect(q.sustitucion).not.toContain('2(800)(20)');
    expect(q.resultado).toBe('Q^* = 277');
  });

  test('modo porcentaje antepone el proceso H = I × C', () => {
    const resultado = calcularEOQ({
      ...inputProcesos,
      tipoCostoMantener: 'porcentaje',
      costoUnitario: 50,
      costoMantener: undefined,
      costoMantenerPorcentaje: 20,
    });

    const h = resultado.procesos.find((p) => p.id === 'eoq-h-efectivo');
    expect(h).toBeDefined();
    expect(h!.formula).toBe('H = \\frac{I}{100} \\times C');
    expect(h!.sustitucion).toBe('H = \\frac{20}{100} \\times 50');
    expect(h!.resultado).toBe('H = 10');

    // La sustitución de Q* usa H = 10
    const q = resultado.procesos.find((p) => p.id === 'eoq-q-optimo')!;
    expect(q.sustitucion).toContain('(20)}{10}');
  });

  test('incluye el proceso ROP cuando hay lead time', () => {
    const resultado = calcularEOQ({ ...inputProcesos, leadTime: 5 });
    const rop = resultado.procesos.find((p) => p.id === 'puntoReorden');
    expect(rop).toBeDefined();
    // d = 10000/365 ≈ 27.4 → ROP = 27.4 × 5 = 137
    expect(rop!.sustitucion).toContain('27.4 \\cdot 5');
    expect(rop!.resultado).toBe('ROP = 137');
  });
});

describe('EOQ - Procesos con unidades homogéneas (Caso 1)', () => {
  test('sin Fase 0: no hay procesos de conversión y N se expresa por semestre', () => {
    const resultado = calcularEOQ({
      demandaAnual: 1200,
      costoOrdenar: 20,
      costoMantener: 5,
      costoUnitario: 10,
      unidadDemanda: 'semestral',
      unidadCostoMantener: 'semestral',
    });

    expect(resultado.procesos.some((p) => p.id.startsWith('fase0-'))).toBe(false);
    const n = resultado.procesos.find((p) => p.id === 'eoq-numero-pedidos')!;
    // D/semestre ÷ Q* = 1200/98 ≈ 12.24 pedidos por semestre
    expect(n.resultado).toBe('N = 12.24');
  });
});
