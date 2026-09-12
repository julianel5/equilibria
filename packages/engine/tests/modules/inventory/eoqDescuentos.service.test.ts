import { calcularEOQDescuentos, EOQDescuentosInputSchema } from '../../../src';

describe('EOQ con Descuentos por Cantidad', () => {
  // ============ Modo fijo: ajuste a q_min y ganador por menor TC ============
  // D=1000, S=5, H=2 (fijo)
  // Nivel 1: [0,199] C=10 → Q*=√(2·1000·5/2)=√5000=70.71 (válido)
  //          TC = 70.71 + 70.71 + 10000 = 10141.42
  // Nivel 2: [200,∞] C=9 → Q*=70.71 < 200 → candidato Q=200 (ajustado)
  //          TC = 1000/200·5 + 200/2·2 + 9000 = 25 + 200 + 9000 = 9225 ← ganador
  const inputFijo = {
    demandaAnual: 1000,
    costoOrdenar: 5,
    tipoCostoMantener: 'fijo' as const,
    costoMantener: 2,
    rangos: [
      { cantidadMinima: 0, cantidadMaxima: 199, costoUnitario: 10 },
      { cantidadMinima: 200, costoUnitario: 9 },
    ],
  };

  test('debe ajustar el candidato a q_min cuando Q* < q_min', () => {
    const resultado = calcularEOQDescuentos(inputFijo);

    // Nivel 2: Q* = 70.71 < 200 → candidato 200
    expect(resultado.rangos[1].qAjustado).toBe(200);
    expect(resultado.rangos[1].qOriginal).toBeCloseTo(70.71, 2);
  });

  test('debe seleccionar como ganador el nivel con menor TC total', () => {
    const resultado = calcularEOQDescuentos(inputFijo);

    expect(resultado.loteOptimo).toBe(200);
    expect(resultado.costoTotalOptimo).toBe(9225);
    expect(resultado.rangos[1].esGanador).toBe(true);
    expect(resultado.rangos[0].esGanador).toBe(false);
  });

  test('debe calcular los costos del candidato de cada nivel', () => {
    const resultado = calcularEOQDescuentos(inputFijo);

    // Nivel 1: Co = Ch = 70.71, producto = 10000
    expect(resultado.rangos[0].costoOrdenar).toBeCloseTo(70.71, 2);
    expect(resultado.rangos[0].costoMantener).toBeCloseTo(70.71, 2);
    expect(resultado.rangos[0].costoProducto).toBe(10000);
    expect(resultado.rangos[0].costoTotal).toBeCloseTo(10141.42, 2);

    // Nivel 2: Co = 25, Ch = 200, producto = 9000, TC = 9225
    expect(resultado.rangos[1].costoOrdenar).toBe(25);
    expect(resultado.rangos[1].costoMantener).toBe(200);
    expect(resultado.rangos[1].costoProducto).toBe(9000);
    expect(resultado.rangos[1].costoTotal).toBe(9225);
  });

  // ============ Regla de descarte: Q* > q_max ============
  // D=1000, S=5, H=1 (fijo)
  // Nivel 1: [0,99] C=10 → Q*=√(2·1000·5/1)=100 > 99 → DESCARTADO
  // Nivel 2: [100,∞] C=9 → Q*=100 válido
  const inputDescartado = {
    demandaAnual: 1000,
    costoOrdenar: 5,
    tipoCostoMantener: 'fijo' as const,
    costoMantener: 1,
    rangos: [
      { cantidadMinima: 0, cantidadMaxima: 99, costoUnitario: 10 },
      { cantidadMinima: 100, costoUnitario: 9 },
    ],
  };

  test('debe descartar el nivel cuando Q* > q_max', () => {
    const resultado = calcularEOQDescuentos(inputDescartado);

    expect(resultado.rangos[0].descartado).toBe(true);
    expect(resultado.rangos[0].qAjustado).toBeNull();
    expect(resultado.rangos[0].costoTotal).toBeNull();
    expect(resultado.rangos[1].descartado).toBe(false);
    expect(resultado.loteOptimo).toBe(100);
    expect(resultado.costoTotalOptimo).toBe(9100);
  });

  // ============ Modo porcentaje: H_j = (I/100)×C_j ============
  // D=10000, S=20, I=20%
  // Nivel 1: [0,1000] C=10 → H=2 → Q*=√(2·10000·20/2)=447.21 (válido)
  //          TC = 447.21 + 447.21 + 100000 = 100894.42
  // Nivel 2: [1001,∞] C=9 → H=1.8 → Q*=√(400000/1.8)=471.40 (válido)
  //          Co = (10000/471.4)·20 = 424.27, Ch = (471.4/2)·1.8 = 424.26,
  //          TC = 424.27 + 424.26 + 90000 = 90848.53 ← ganador
  const inputPorcentaje = {
    demandaAnual: 10000,
    costoOrdenar: 20,
    tipoCostoMantener: 'porcentaje' as const,
    costoMantenerPorcentaje: 20,
    rangos: [
      { cantidadMinima: 0, cantidadMaxima: 1000, costoUnitario: 10 },
      { cantidadMinima: 1001, costoUnitario: 9 },
    ],
  };

  test('debe calcular H_j = (I/100)×C_j por nivel en modo porcentaje', () => {
    const resultado = calcularEOQDescuentos(inputPorcentaje);

    expect(resultado.rangos[0].costoMantenerEfectivo).toBe(2);
    expect(resultado.rangos[1].costoMantenerEfectivo).toBe(1.8);
  });

  test('debe ganar el nivel con descuento aunque su lote sea mayor', () => {
    const resultado = calcularEOQDescuentos(inputPorcentaje);

    // Nivel 2: Q* = 471.4 < q_min (1001) → candidato ajustado a 1001.
    // TC₂ = (10000/1001)·20 + (1001/2)·1.8 + 90000 = 199.80 + 900.90 + 90000 = 91100.70
    expect(resultado.rangos[1].esGanador).toBe(true);
    expect(resultado.rangos[1].qOriginal).toBeCloseTo(471.4, 1);
    expect(resultado.rangos[1].qAjustado).toBe(1001);
    expect(resultado.loteOptimo).toBe(1001);
    expect(resultado.costoTotalOptimo).toBeCloseTo(91100.7, 2);
  });

  test('el modo porcentaje debe requerir I', () => {
    expect(() => {
      EOQDescuentosInputSchema.parse({
        demandaAnual: 10000,
        costoOrdenar: 20,
        tipoCostoMantener: 'porcentaje',
        rangos: [
          { cantidadMinima: 0, cantidadMaxima: 1000, costoUnitario: 10 },
          { cantidadMinima: 1001, costoUnitario: 9 },
        ],
      });
    }).toThrow(/porcentaje \(I\)/);
  });

  test('el modo fijo debe requerir H', () => {
    expect(() => {
      EOQDescuentosInputSchema.parse({
        ...inputFijo,
        costoMantener: undefined,
      });
    }).toThrow(/costo de mantener \(H\)/);
  });

  test('debe exigir al menos dos niveles de precio', () => {
    expect(() => {
      EOQDescuentosInputSchema.parse({
        ...inputFijo,
        rangos: [{ cantidadMinima: 0, cantidadMaxima: 100, costoUnitario: 10 }],
      });
    }).toThrow(/al menos dos niveles/);
  });

  test('debe rechazar niveles solapados', () => {
    expect(() => {
      EOQDescuentosInputSchema.parse({
        ...inputFijo,
        rangos: [
          { cantidadMinima: 0, cantidadMaxima: 100, costoUnitario: 10 },
          { cantidadMinima: 50, costoUnitario: 9 },
        ],
      });
    }).toThrow(/mayor que el máximo del nivel anterior/);
  });

  test('debe aceptar cantidad máxima en blanco solo en el último nivel', () => {
    expect(() => {
      EOQDescuentosInputSchema.parse({
        ...inputFijo,
        rangos: [
          { cantidadMinima: 0, cantidadMaxima: 100, costoUnitario: 10 },
          { cantidadMinima: 101, costoUnitario: 9 },
          { cantidadMinima: 201, cantidadMaxima: 300, costoUnitario: 8 },
        ],
      });
    }).toThrow(/Solo el último nivel/);
  });

  test('debe rechazar q_max menor que q_min', () => {
    expect(() => {
      EOQDescuentosInputSchema.parse({
        ...inputFijo,
        rangos: [
          { cantidadMinima: 0, cantidadMaxima: 100, costoUnitario: 10 },
          { cantidadMinima: 200, cantidadMaxima: 150, costoUnitario: 9 },
        ],
      });
    }).toThrow(/no puede ser menor/);
  });

  test('debe exponer el rango ganador y el desglose', () => {
    const resultado = calcularEOQDescuentos(inputFijo);

    expect(resultado.rangoGanador).toEqual({
      cantidadMinima: 200,
      cantidadMaxima: null,
      costoUnitario: 9,
    });
    expect(resultado.desglose.demandaAnual).toBe(1000);
    expect(resultado.desglose.costoFijoOrden).toBe(5);
  });
});