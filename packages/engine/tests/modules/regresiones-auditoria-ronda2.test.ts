import {
  calcularEOQ, calcularEPQ, calcularEOQFaltantes, calcularEOQDescuentos,
  calcularTeoriaColas, calcularPeriodoUnico, calcularTeoriaDecisiones, TransporteInputSchema, ErrorValidacion,
} from '../../src';

describe('Regresiones de auditoría — Ronda 2', () => {
  it('C06: convierte juntas demanda y producción mensuales cuando H es anual', () => {
    const r = calcularEPQ({
      demandaAnual: 100, tasaProduccion: 200, unidadDemanda: 'mensual',
      unidadCostoMantener: 'anual', costoOrdenar: 1, costoMantener: 10,
    });
    expect(r.desglose).toMatchObject({ demandaAnual: 1200, tasaProduccion: 2400, factorProduccion: 0.5 });
    expect(Number.isFinite(r.cantidadOptima) && r.cantidadOptima > 0).toBe(true);
    expect(r.conversionUnidades.pasos).toEqual(expect.arrayContaining([
      expect.objectContaining({ variable: 'P', factor: 12, valorAnual: 2400 }),
    ]));
  });

  const entrada = { demandaAnual: 1, costoOrdenar: 1, costoMantener: 100 };
  it.each([
    ['EOQ', () => calcularEOQ(entrada)],
    ['EPQ', () => calcularEPQ({ ...entrada, tasaProduccion: 2 })],
    ['Faltantes', () => calcularEOQFaltantes({ ...entrada, costoFaltantes: 100 })],
  ] as const)('C07: %s conserva un lote positivo y costos finitos', (_, calcular) => {
    const r = calcular();
    expect(r.cantidadOptima).toBeGreaterThan(0);
    expect(Number.isFinite(r.costoTotalAnual)).toBe(true);
    expect(JSON.parse(JSON.stringify(r)).costoTotalAnual).not.toBeNull();
  });

  it('C08: evalúa el techo de ambos tramos finitos', () => {
    const r = calcularEOQDescuentos({
      demandaAnual: 1000, costoOrdenar: 50, tipoCostoMantener: 'fijo', costoMantener: 2,
      rangos: [
        { cantidadMinima: 1, cantidadMaxima: 10, costoUnitario: 10 },
        { cantidadMinima: 11, cantidadMaxima: 20, costoUnitario: 9 },
      ],
    });
    expect(r.rangos.map(n => n.qAjustado)).toEqual([10, 20]);
    expect(r.loteOptimo).toBe(20);
    expect(r.costoTotalOptimo).toBe(11520);
  });

  it('C08: un costo fuera del rango representable devuelve un error de validación', () => {
    expect(() => calcularEOQDescuentos({
      demandaAnual: 1e307, costoOrdenar: 1, tipoCostoMantener: 'fijo', costoMantener: 2,
      rangos: [
        { cantidadMinima: 1, cantidadMaxima: 10, costoUnitario: 100 },
        { cantidadMinima: 11, cantidadMaxima: 20, costoUnitario: 90 },
      ],
    })).toThrow(ErrorValidacion);
  });

  it('C09: M/M/171 estable da probabilidades y métricas positivas finitas', () => {
    const r = calcularTeoriaColas({ tasaLlegada: 160, tasaServicio: 1, servidores: 171 });
    for (const v of [r.p0, r.lq, r.l, r.wq, r.w]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
    expect(r.l).toBeGreaterThan(160);
  });

  it('C09: la recurrencia reescalada mantiene Lq finita aunque P0 quede por debajo de Number', () => {
    const r = calcularTeoriaColas({ tasaLlegada: 900, tasaServicio: 1, servidores: 901 });
    expect(r.p0).toBe(0); // No representable en doble precisión, no un cero matemático.
    expect(r.lq).toBeGreaterThan(800);
    expect(Number.isFinite(r.w)).toBe(true);
    expect(JSON.stringify(r.procesos)).not.toMatch(/NaN|Infinity/);
  });

  it('C10: el cuantil normal negativo produce un pedido cero y explica el ajuste', () => {
    const r = calcularPeriodoUnico({
      modoIngreso: 'servicios', distribucion: 'normal', costoSubestimacion: 1,
      costoSobreestimacion: 9, demandaMedia: 1, desviacionDemanda: 4,
    });
    expect(r.cantidadOptima).toBe(0);
    expect(r.procesos.some(p => /no negatividad/i.test(p.titulo))).toBe(true);
  });

  it('C11: Savage elige B sin borrar diferencias pequeñas antes de comparar', () => {
    const r = calcularTeoriaDecisiones({
      tipoAnalisis: 'maximizar', alternativas: [{ nombre: 'A', pagos: [0, 1] }, { nombre: 'B', pagos: [0.00004, 1] }],
      estados: [{ nombre: 'E1' }, { nombre: 'E2' }], alpha: 0.5,
    }).criterios.find(c => c.clave === 'savage');
    expect(r?.ganador.alternativa).toBe('B');
    expect(r?.matrizArrepentimiento?.[0][0]).toBe(0.00004);
  });

  it.each([2.5, 0, -1])('C12: el contrato rechaza una dimensión inválida %s sin RangeError', dimension => {
    expect(() => TransporteInputSchema.safeParse({ costos: dimension, oferta: [1], demanda: [1] })).not.toThrow();
    expect(TransporteInputSchema.safeParse({ costos: dimension, oferta: [1], demanda: [1] }).success).toBe(false);
  });

  it('C12: el contrato limita filas y columnas al máximo de 15 antes de resolver', () => {
    const fila = Array<number>(16).fill(1);
    expect(TransporteInputSchema.safeParse({ costos: [fila], oferta: [16], demanda: fila }).success).toBe(false);
    expect(TransporteInputSchema.safeParse({ costos: fila.map(x => [x]), oferta: fila, demanda: [16] }).success).toBe(false);
  });
});
