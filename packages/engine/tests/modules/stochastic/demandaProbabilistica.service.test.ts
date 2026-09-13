import {
  calcularDemandaProbabilistica,
  inversaNormalEstandar,
  DemandaProbabilisticaInput,
} from '../../../src';

describe('Inversa de la distribución normal estándar (Φ⁻¹)', () => {
  test('Φ⁻¹(0.5) = 0', () => {
    expect(inversaNormalEstandar(0.5)).toBeCloseTo(0, 10);
  });

  test('Φ⁻¹(0.975) ≈ 1.96', () => {
    expect(inversaNormalEstandar(0.975)).toBeCloseTo(1.96, 2);
  });

  test('Φ⁻¹(0.99) ≈ 2.3263', () => {
    expect(inversaNormalEstandar(0.99)).toBeCloseTo(2.3263, 3);
  });

  test('Φ⁻¹(0.999) ≈ 3.0902', () => {
    expect(inversaNormalEstandar(0.999)).toBeCloseTo(3.0902, 3);
  });

  test('Φ⁻¹(0.16) ≈ −0.9945', () => {
    expect(inversaNormalEstandar(0.16)).toBeCloseTo(-0.9945, 3);
  });

  test('ζ⁻¹(0.025) ≈ −1.96 (cola izquierda)', () => {
    expect(inversaNormalEstandar(0.025)).toBeCloseTo(-1.96, 2);
  });

  test('ζ⁻¹(0.95) ≈ 1.6449', () => {
    expect(inversaNormalEstandar(0.95)).toBeCloseTo(1.6449, 3);
  });
});

describe('Demanda Probabilística — Punto de Reorden', () => {
  // Valores base para un caso de uso estándar:
  const basico: DemandaProbabilisticaInput = {
    demandaPromedioDiaria: 50,
    desviacionEstandarDemandaDiaria: 10,
    tiempoEntrega: 7,
    nivelServicio: 95,
  };

  //   d̄  = 50, σ_d = 10, L = 7, CSL = 95%
  //   σ_L = 10 × √7 ≈ 26.4575
  //   Z   = Φ⁻¹(0.95) ≈ 1.6449
  //   SS  = 1.6449 × 26.4575 ≈ 43.52
  //   D_L = 50 × 7 = 350
  //   ROP = 350 + 43.52 = 393.52

  test('debe calcular σ_L correctamente', () => {
    const resultado = calcularDemandaProbabilistica(basico);
    expect(resultado.sigmaDuranteEntrega).toBeCloseTo(26.46, 1);
  });

  test('debe calcular Z (CSL 95%) ≈ 1.6449', () => {
    const resultado = calcularDemandaProbabilistica(basico);
    expect(resultado.valorZ).toBeCloseTo(1.6449, 3);
  });

  test('debe calcular D_L = d̄ × L', () => {
    const resultado = calcularDemandaProbabilistica(basico);
    expect(resultado.demandaDuranteEntrega).toBe(350);
  });

  test('debe calcular SS = Z × σ_L ≈ 43.52', () => {
    const resultado = calcularDemandaProbabilistica(basico);
    expect(resultado.stockSeguridad).toBeCloseTo(43.52, 1);
  });

  test('debe calcular ROP = D_L + SS ≈ 393.52', () => {
    const resultado = calcularDemandaProbabilistica(basico);
    expect(resultado.puntoReorden).toBeCloseTo(393.52, 1);
  });

  test('debe devolver un desglose completo', () => {
    const resultado = calcularDemandaProbabilistica(basico);
    expect(resultado.desglose.demandaPromedioDiaria).toBe(50);
    expect(resultado.desglose.desviacionEstandarDemandaDiaria).toBe(10);
    expect(resultado.desglose.tiempoEntrega).toBe(7);
    expect(resultado.desglose.nivelServicio).toBe(95);
  });

  test('CSL 97.5% produce Z ≈ 1.96', () => {
    const resultado = calcularDemandaProbabilistica({
      ...basico,
      nivelServicio: 97.5,
    });
    expect(resultado.valorZ).toBeCloseTo(1.96, 2);
    expect(resultado.stockSeguridad).toBeCloseTo(1.96 * 26.4575, 0);
    expect(resultado.puntoReorden).toBeCloseTo(350 + 1.96 * 26.4575, 0);
  });

  test('L = 1 día reduce σ_L a solo σ_d', () => {
    const resultado = calcularDemandaProbabilistica({ ...basico, tiempoEntrega: 1 });
    expect(resultado.sigmaDuranteEntrega).toBe(10);
    expect(resultado.stockSeguridad).toBeCloseTo(1.6449 * 10, 1);
  });

  test('debe rechazar CSL ≤ 50%', () => {
    expect(() =>
      calcularDemandaProbabilistica({ ...basico, nivelServicio: 50 })
    ).toThrow();
  });

  test('debe rechazar CSL = 99.99%', () => {
    expect(() =>
      calcularDemandaProbabilistica({ ...basico, nivelServicio: 99.99 })
    ).toThrow();
  });

  test('debe rechazar CSL > 99.99%', () => {
    expect(() =>
      calcularDemandaProbabilistica({ ...basico, nivelServicio: 100 })
    ).toThrow();
  });

  test('debe rechazar demanda promedio negativa', () => {
    expect(() =>
      calcularDemandaProbabilistica({ ...basico, demandaPromedioDiaria: -10 })
    ).toThrow();
  });

  test('debe rechazar desviación estándar = 0', () => {
    expect(() =>
      calcularDemandaProbabilistica({ ...basico, desviacionEstandarDemandaDiaria: 0 })
    ).toThrow();
  });

  test('debe rechazar tiempo de entrega ≤ 0', () => {
    expect(() =>
      calcularDemandaProbabilistica({ ...basico, tiempoEntrega: 0 })
    ).toThrow();
    expect(() =>
      calcularDemandaProbabilistica({ ...basico, tiempoEntrega: -5 })
    ).toThrow();
  });

  test('caso: d̄=100, σ_d=20, L=5, CSL=99%', () => {
    // σ_L = 20 × √5 ≈ 44.7214
    // Z   = Φ⁻¹(0.99) ≈ 2.3263
    // SS  ≈ 2.3263 × 44.7214 ≈ 104.06
    // D_L = 100 × 5 = 500
    // ROP = 604.06
    const resultado = calcularDemandaProbabilistica({
      demandaPromedioDiaria: 100,
      desviacionEstandarDemandaDiaria: 20,
      tiempoEntrega: 5,
      nivelServicio: 99,
    });
    expect(resultado.sigmaDuranteEntrega).toBeCloseTo(44.72, 1);
    expect(resultado.valorZ).toBeCloseTo(2.3263, 3);
    expect(resultado.stockSeguridad).toBeCloseTo(104.06, 1);
    expect(resultado.puntoReorden).toBeCloseTo(604.06, 1);
  });
});