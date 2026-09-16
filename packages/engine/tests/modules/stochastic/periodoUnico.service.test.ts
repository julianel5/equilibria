import { calcularPeriodoUnico, generarPuntosDistribucion, PeriodoUnicoInput } from '../../../src';

describe('Periodo Único (Newsvendor)', () => {
  // ▸ Normal: p=25, c=10, v=5 → Cu=15, Co=5, CSL=15/20=0.75
  //   μ=1000, σ=200 → Z=Φ⁻¹(0.75)≈0.6745 → Q*=1000+0.6745·200≈1134.9
  const normal: PeriodoUnicoInput = {
    modoIngreso: 'bienes',
    distribucion: 'normal',
    precioVenta: 25,
    costoCompra: 10,
    valorRescate: 5,
    demandaMedia: 1000,
    desviacionDemanda: 200,
  };

  // ▸ Uniforme: p=30, c=20, v=5 → Cu=10, Co=15, CSL=10/25=0.4
  //   a=100, b=500 → Q*=100+0.4·400=260
  const uniforme: PeriodoUnicoInput = {
    modoIngreso: 'bienes',
    distribucion: 'uniforme',
    precioVenta: 30,
    costoCompra: 20,
    valorRescate: 5,
    limiteInferior: 100,
    limiteSuperior: 500,
  };

  test('normal: calcula Cu, Co y la razón crítica', () => {
    const r = calcularPeriodoUnico(normal);
    expect(r.costoSubestimacion).toBe(15);
    expect(r.costoSobreestimacion).toBe(5);
    expect(r.nivelServicio).toBeCloseTo(0.75, 10);
    expect(r.valorZ).toBeCloseTo(0.6745, 3);
    expect(r.cantidadOptima).toBeCloseTo(1134.9, 1);
  });

  test('normal: genera los 5 procesos del desglose', () => {
    const r = calcularPeriodoUnico(normal);
    expect(r.procesos.map((p) => p.id)).toEqual([
      'periodo-cu',
      'periodo-co',
      'periodo-razon',
      'periodo-z',
      'periodo-q',
    ]);
    const cu = r.procesos[0];
    expect(cu.formula).toBe('C_u = p - c');
    expect(cu.sustitucion).toBe('C_u = 25 - 10');
    expect(cu.resultado).toBe('C_u = 15');
    expect(cu.tipoResultado).toBe('moneda');
    const co = r.procesos[1];
    expect(co.formula).toBe('C_o = c - v');
    expect(co.sustitucion).toBe('C_o = 10 - 5');
    expect(co.resultado).toBe('C_o = 5');
  });

  test('normal: la razón crítica inyecta Cu y Co calculados', () => {
    const r = calcularPeriodoUnico(normal);
    const razon = r.procesos.find((p) => p.id === 'periodo-razon')!;
    expect(razon.formula).toBe('\\mathrm{CSL} = P(D \\le Q^*) = \\frac{C_u}{C_u + C_o}');
    expect(razon.sustitucion).toBe('\\mathrm{CSL} = \\frac{15}{15 + 5}');
    expect(razon.resultado).toBe('\\mathrm{CSL} = P(D \\le Q^*) = 0.75');
  });

  test('normal: muestra la búsqueda de Z y el cálculo de Q*', () => {
    const r = calcularPeriodoUnico(normal);
    const z = r.procesos.find((p) => p.id === 'periodo-z')!;
    expect(z.formula).toBe('Z = \\Phi^{-1}(\\mathrm{CSL})');
    expect(z.sustitucion).toBe('Z = \\Phi^{-1}(0.75)');
    expect(z.resultado).toBe('Z = 0.674');
    const q = r.procesos.find((p) => p.id === 'periodo-q')!;
    expect(q.formula).toBe('Q^* = \\mu + Z\\,\\sigma');
    expect(q.sustitucion).toBe('Q^* = 1000 + (0.674)\\,\\cdot\\,200');
    expect(q.resultado).toBe('Q^* = 1134.9');
    expect(q.tipoResultado).toBe('cantidad');
  });

  test('normal: CSL 0.85 produce Z ≈ 1.036 (estilo del ejemplo)', () => {
    const r = calcularPeriodoUnico({
      modoIngreso: 'bienes',
      distribucion: 'normal',
      precioVenta: 100,
      costoCompra: 15,
      valorRescate: 0,
      demandaMedia: 1000,
      desviacionDemanda: 200,
    });
    expect(r.nivelServicio).toBeCloseTo(0.85, 10);
    expect(r.valorZ).toBeCloseTo(1.0364, 3);
    const q = r.procesos.find((p) => p.id === 'periodo-q')!;
    const z = r.procesos.find((p) => p.id === 'periodo-z')!;
    expect(z.resultado).toBe('Z = 1.036');
    expect(q.sustitucion).toBe('Q^* = 1000 + (1.036)\\,\\cdot\\,200');
    expect(r.cantidadOptima).toBeCloseTo(1207.29, 1);
  });

  test('normal: con σ = 0 la cantidad óptima es la media', () => {
    const r = calcularPeriodoUnico({ ...normal, desviacionDemanda: 0 });
    expect(r.cantidadOptima).toBe(1000);
    expect(r.valorZ).toBeCloseTo(0.6745, 3);
  });

  test('uniforme: calcula Cu, Co, CSL y Q*', () => {
    const r = calcularPeriodoUnico(uniforme);
    expect(r.costoSubestimacion).toBe(10);
    expect(r.costoSobreestimacion).toBe(15);
    expect(r.nivelServicio).toBeCloseTo(0.4, 10);
    expect(r.valorZ).toBeNull();
    expect(r.cantidadOptima).toBe(260);
  });

  test('uniforme: genera procesos sin el paso de Z', () => {
    const r = calcularPeriodoUnico(uniforme);
    expect(r.procesos.map((p) => p.id)).toEqual([
      'periodo-cu',
      'periodo-co',
      'periodo-razon',
      'periodo-q',
    ]);
    const razon = r.procesos.find((p) => p.id === 'periodo-razon')!;
    expect(razon.sustitucion).toBe('\\mathrm{CSL} = \\frac{10}{10 + 15}');
    expect(razon.resultado).toBe('\\mathrm{CSL} = P(D \\le Q^*) = 0.4');
    const q = r.procesos.find((p) => p.id === 'periodo-q')!;
    expect(q.formula).toBe('Q^* = a + \\mathrm{CSL}\\,(b - a)');
    expect(q.sustitucion).toBe('Q^* = 100 + (0.4)\\,(500 - 100)');
    expect(q.resultado).toBe('Q^* = 260');
  });

  test('debe rechazar precio de venta ≤ costo de compra', () => {
    expect(() => calcularPeriodoUnico({ ...normal, precioVenta: 10 })).toThrow();
    expect(() => calcularPeriodoUnico({ ...normal, precioVenta: 8 })).toThrow();
  });

  test('debe rechazar costo de compra ≤ valor de rescate', () => {
    expect(() => calcularPeriodoUnico({ ...normal, valorRescate: 10 })).toThrow();
    expect(() => calcularPeriodoUnico({ ...normal, valorRescate: 12 })).toThrow();
  });

  test('debe rechazar desviación negativa en normal', () => {
    expect(() => calcularPeriodoUnico({ ...normal, desviacionDemanda: -1 })).toThrow();
  });

  test('debe rechazar rango inválido en uniforme', () => {
    expect(() => calcularPeriodoUnico({ ...uniforme, limiteSuperior: 50 })).toThrow();
    expect(() => calcularPeriodoUnico({ ...uniforme, limiteInferior: -5 })).toThrow();
  });

  // ---- Puntos de la distribución (gráfica del Newsvendor) ----

  test('puntos normal: recorre [μ−4σ, μ+4σ] con pico en μ', () => {
    const puntos = generarPuntosDistribucion('normal', { demandaMedia: 1000, desviacionDemanda: 200 });
    expect(puntos.length).toBeGreaterThan(300);
    expect(puntos[0].demanda).toBeCloseTo(200, 0);        // μ − 4σ
    expect(puntos[puntos.length - 1].demanda).toBeCloseTo(1800, 0); // μ + 4σ

    // El pico de la densidad está en la media.
    const pico = puntos.reduce((m, p) => (p.densidad > m.densidad ? p : m), puntos[0]);
    expect(pico.demanda).toBeCloseTo(1000, 0);
    const pdfPico = 1 / (200 * Math.sqrt(2 * Math.PI));
    expect(pico.densidad).toBeCloseTo(pdfPico, 8);

    // La densidad es simétrica alrededor de μ.
    const izq = puntos.find((p) => Math.abs(p.demanda - 600) < 0.01)!;
    const der = puntos.find((p) => Math.abs(p.demanda - 1400) < 0.01)!;
    expect(izq.densidad).toBeCloseTo(der.densidad, 8);

    // El orden es creciente en demanda.
    for (let i = 1; i < puntos.length; i++) {
      expect(puntos[i].demanda).toBeGreaterThan(puntos[i - 1].demanda);
    }
  });

  test('puntos normal: expone μ y σ en el desglose del resultado', () => {
    const r = calcularPeriodoUnico(normal);
    expect(r.puntos.length).toBeGreaterThan(300);
    expect(r.puntos[0].demanda).toBeCloseTo(200, 0);
    expect(r.puntos[r.puntos.length - 1].demanda).toBeCloseTo(1800, 0);
    expect(r.desglose.demandaMedia).toBe(1000);
    expect(r.desglose.desviacionDemanda).toBe(200);
    expect(r.desglose.limiteInferior).toBeUndefined();
  });

  test('puntos uniforme: densidad 1/(b−a) dentro y 0 fuera de [a,b]', () => {
    const puntos = generarPuntosDistribucion('uniforme', { limiteInferior: 100, limiteSuperior: 500 });
    expect(puntos.length).toBeGreaterThan(40);
    // Un 10% de margen antes de a y después de b.
    expect(puntos[0].demanda).toBeCloseTo(100 - 0.1 * 400, 0); // 60
    expect(puntos[puntos.length - 1].demanda).toBeCloseTo(500 + 0.1 * 400, 0); // 540

    const dentro = puntos.filter((p) => p.demanda >= 100 && p.demanda <= 500);
    expect(dentro.length).toBeGreaterThan(0);
    for (const p of dentro) {
      expect(p.densidad).toBeCloseTo(1 / 400, 8);
    }

    const fuera = puntos.filter((p) => p.demanda < 100 || p.demanda > 500);
    expect(fuera.length).toBeGreaterThan(0);
    for (const p of fuera) {
      expect(p.densidad).toBe(0);
    }

    // Q* = a + CSL·(b − a) queda dentro del dominio graficado y del rango.
    const r = calcularPeriodoUnico(uniforme);
    expect(r.cantidadOptima).toBe(260);
    expect(r.desglose.limiteInferior).toBe(100);
    expect(r.desglose.limiteSuperior).toBe(500);
    expect(r.desglose.demandaMedia).toBeUndefined();
    expect(r.puntos[0].demanda).toBeCloseTo(60, 0);
  });

  test('puntos normal: con σ = 0 entrega un único punto pico en μ', () => {
    const puntos = generarPuntosDistribucion('normal', { demandaMedia: 250, desviacionDemanda: 0 });
    expect(puntos).toEqual([{ demanda: 250, densidad: 1 }]);
  });

  // ---- Modo "servicios": costos marginales directos (C_u, C_o) ----

  test('servicios normal: toma Cu y Co directos y omite los pasos p−c / c−v', () => {
    const r = calcularPeriodoUnico({
      modoIngreso: 'servicios',
      distribucion: 'normal',
      costoSubestimacion: 15,
      costoSobreestimacion: 5,
      demandaMedia: 1000,
      desviacionDemanda: 200,
    });
    expect(r.modoIngreso).toBe('servicios');
    expect(r.costoSubestimacion).toBe(15);
    expect(r.costoSobreestimacion).toBe(5);
    expect(r.nivelServicio).toBeCloseTo(0.75, 10);
    expect(r.valorZ).toBeCloseTo(0.6745, 3);
    expect(r.cantidadOptima).toBeCloseTo(1134.9, 1);
    // El arreglo de ProcesosView empieza directamente en la razón crítica.
    expect(r.procesos.map((p) => p.id)).toEqual(['periodo-razon', 'periodo-z', 'periodo-q']);
    expect(r.procesos[0].sustitucion).toBe('\\mathrm{CSL} = \\frac{15}{15 + 5}');
    // No hay valores de p, c, v en el desglose; sí los costos directos.
    expect(r.desglose.precioVenta).toBeUndefined();
    expect(r.desglose.costoCompra).toBeUndefined();
    expect(r.desglose.valorRescate).toBeUndefined();
    expect(r.desglose.costoSubestimacion).toBe(15);
    expect(r.desglose.costoSobreestimacion).toBe(5);
  });

  test('servicios uniforme: razón crítica como primer paso y Q* directa', () => {
    const r = calcularPeriodoUnico({
      modoIngreso: 'servicios',
      distribucion: 'uniforme',
      costoSubestimacion: 10,
      costoSobreestimacion: 15,
      limiteInferior: 100,
      limiteSuperior: 500,
    });
    expect(r.nivelServicio).toBeCloseTo(0.4, 10);
    expect(r.cantidadOptima).toBe(260);
    expect(r.procesos.map((p) => p.id)).toEqual(['periodo-razon', 'periodo-q']);
    const razon = r.procesos[0];
    expect(razon.formula).toBe('\\mathrm{CSL} = P(D \\le Q^*) = \\frac{C_u}{C_u + C_o}');
    expect(razon.sustitucion).toBe('\\mathrm{CSL} = \\frac{10}{10 + 15}');
  });

  test('servicios: rechaza si faltan o son inválidos los costos directos', () => {
    expect(() =>
      calcularPeriodoUnico({
        modoIngreso: 'servicios',
        distribucion: 'normal',
        costoSubestimacion: 15,
        demandaMedia: 1000,
        desviacionDemanda: 200,
      })
    ).toThrow();
    expect(() =>
      calcularPeriodoUnico({
        modoIngreso: 'servicios',
        distribucion: 'normal',
        costoSobreestimacion: 5,
        demandaMedia: 1000,
        desviacionDemanda: 200,
      })
    ).toThrow();
    expect(() =>
      calcularPeriodoUnico({
        modoIngreso: 'servicios',
        distribucion: 'normal',
        costoSubestimacion: 0,
        costoSobreestimacion: 5,
        demandaMedia: 1000,
        desviacionDemanda: 200,
      })
    ).toThrow();
  });
});