import { calcularTeoriaColas, TeoriaColasInput } from '../../../src';

// Caso M/M/1 de referencia:
//
//   λ = 4 clientes/hora, μ = 5 clientes/hora → ρ = 0.8
//   P0 = 1 − 0.8 = 0.2
//   Lq = 4² / (5·(5−4)) = 16/5 = 3.2
//   L  = 3.2 + 4/5 = 4
//   Wq = 3.2 / 4 = 0.8
//   W  = 0.8 + 1/5 = 1
//   Distribución Pn = (1−ρ)·ρ^n = 0.2·0.8^n

const mm1: TeoriaColasInput = {
  tasaLlegada: 4,
  tasaServicio: 5,
  servidores: 1,
};

// Caso M/M/c de referencia: λ = 10, μ = 5, c = 3 → ρ = λ/(cμ) = 2/3, cρ = 2
//
//   P0 = [ 1 + 2 + 2²/2! + 2³/(3!·(1−2/3)) ]⁻¹ = 1/(1+2+2+4) = 1/9
//   Lq = P0·(cρ)^c·ρ/(c!(1−ρ)²) = (1/9)·8·(2/3)/(6·(1/9)) = 8/9
//   L  = 8/9 + 10/5 = 26/9 ≈ 2.888889
//   Wq = (8/9)/10 = 4/45 ≈ 0.088889
//   W  = 4/45 + 1/5 = 13/45 ≈ 0.288889
//
//   Distribución: n<3: Pn = P0·(cρ)^n/n!; n≥3: Pn = P0·(cρ)^c·ρ^(n−c)/c!

const mmc: TeoriaColasInput = {
  tasaLlegada: 10,
  tasaServicio: 5,
  servidores: 3,
};

const factorial = (n: number): number => {
  let resultado = 1;
  for (let k = 2; k <= n; k += 1) resultado *= k;
  return resultado;
};

describe('Teoría de Colas — estructura del resultado', () => {
  test('M/M/1 devuelve el modelo correcto y las 6 métricas', () => {
    const r = calcularTeoriaColas(mm1);
    expect(r.modelo).toBe('MM1');
    expect(r.c).toBe(1);
    expect(r.lambda).toBe(4);
    expect(r.mu).toBe(5);
    for (const k of ['rho', 'p0', 'lq', 'l', 'wq', 'w']) {
      expect(typeof r[k as keyof typeof r]).toBe('number');
    }
  });

  test('M/M/c está activo con c ≥ 2', () => {
    const r = calcularTeoriaColas(mmc);
    expect(r.modelo).toBe('MMc');
    expect(r.c).toBe(3);
  });

  test('la distribución Pn cubre n = 0..15 con la forma { n, probabilidad }', () => {
    const r = calcularTeoriaColas(mm1);
    expect(r.distribucion).toHaveLength(16);
    expect(r.distribucion[0].n).toBe(0);
    expect(r.distribucion[15].n).toBe(15);
    expect(r.distribucion.every(({ n, probabilidad }) => n >= 0 && probabilidad >= 0)).toBe(true);
  });
});

describe('Teoría de Colas — M/M/1', () => {
  const r = calcularTeoriaColas(mm1);

  test('ρ = λ/μ = 0.8', () => {
    expect(r.rho).toBeCloseTo(0.8, 6);
  });

  test('P0 = 1 − ρ = 0.2', () => {
    expect(r.p0).toBeCloseTo(0.2, 6);
  });

  test('Lq = λ²/(μ(μ−λ)) = 3.2', () => {
    expect(r.lq).toBeCloseTo(3.2, 6);
  });

  test('L = Lq + λ/μ = 4', () => {
    expect(r.l).toBeCloseTo(4, 6);
  });

  test('Wq = Lq/λ = 0.8', () => {
    expect(r.wq).toBeCloseTo(0.8, 6);
  });

  test('W = Wq + 1/μ = 1', () => {
    expect(r.w).toBeCloseTo(1, 6);
  });

  test('la distribución sigue la geométrica Pn = (1−ρ)·ρ^n', () => {
    for (const { n, probabilidad } of r.distribucion) {
      expect(probabilidad).toBeCloseTo(0.2 * Math.pow(0.8, n), 6);
      if (n > 0) {
        expect(probabilidad).toBeLessThan(r.distribucion[n - 1].probabilidad);
      }
    }
  });

  test('las probabilidades Pn suman lo esperado de una geométrica truncada en n = 15', () => {
    const suma = r.distribucion.reduce((acc, p) => acc + p.probabilidad, 0);
    // Truncada en n = 15: 1 − ρ^16
    expect(suma).toBeCloseTo(1 - Math.pow(0.8, 16), 4);
  });
});

describe('Teoría de Colas — M/M/c', () => {
  const r = calcularTeoriaColas(mmc);

  test('ρ = λ/(cμ) = 2/3', () => {
    expect(r.rho).toBeCloseTo(2 / 3, 6);
  });

  test('P0 mediante la sumatoria de Erlang C = 1/9', () => {
    expect(r.p0).toBeCloseTo(1 / 9, 6);
  });

  test('Lq = P0·(cρ)^c·ρ/(c!(1−ρ)²) = 8/9', () => {
    expect(r.lq).toBeCloseTo(8 / 9, 6);
  });

  test('L = Lq + λ/μ = 26/9', () => {
    expect(r.l).toBeCloseTo(26 / 9, 6);
  });

  test('Wq = Lq/λ = 4/45', () => {
    expect(r.wq).toBeCloseTo(4 / 45, 6);
  });

  test('W = Wq + 1/μ = 13/45', () => {
    expect(r.w).toBeCloseTo(13 / 45, 6);
  });

  test('la distribución coincide con la fórmula por tramos de Erlang C', () => {
    const p0 = 1 / 9;
    for (const { n, probabilidad } of r.distribucion) {
      const esperada =
        n < 3
          ? (p0 * Math.pow(2, n)) / factorial(n)
          : (p0 * Math.pow(2, 3) * Math.pow(2 / 3, n - 3)) / factorial(3);
      expect(probabilidad).toBeCloseTo(esperada, 6);
    }
  });

  test('la distribución es decreciente a partir de n ≥ c', () => {
    for (let n = 4; n < r.distribucion.length; n += 1) {
      expect(r.distribucion[n].probabilidad).toBeLessThan(r.distribucion[n - 1].probabilidad);
    }
  });

  test('las probabilidades Pn suman casi 1 (truncada en n = 15)', () => {
    const suma = r.distribucion.reduce((acc, p) => acc + p.probabilidad, 0);
    expect(suma).toBeGreaterThan(0.99);
    expect(suma).toBeLessThan(1);
  });
});

describe('Teoría de Colas — M/M/c colapsa a M/M/1 con c = 1', () => {
  test('las métricas con c = 1 son idénticas al modelo M/M/1', () => {
    const r = calcularTeoriaColas({ tasaLlegada: 4, tasaServicio: 5, servidores: 1 });
    expect(r.modelo).toBe('MM1');
    expect(r.rho).toBeCloseTo(0.8, 6);
    expect(r.p0).toBeCloseTo(0.2, 6);
    expect(r.lq).toBeCloseTo(3.2, 6);
    expect(r.w).toBeCloseTo(1, 6);
  });
});

describe('Teoría de Colas — validaciones (Zod)', () => {
  test('rechaza λ ≤ 0', () => {
    expect(() => calcularTeoriaColas({ ...mm1, tasaLlegada: 0 })).toThrow(/mayor que 0/);
    expect(() => calcularTeoriaColas({ ...mm1, tasaLlegada: -1 })).toThrow(/mayor que 0/);
  });

  test('rechaza μ ≤ 0', () => {
    expect(() => calcularTeoriaColas({ ...mm1, tasaServicio: 0 })).toThrow(/mayor que 0/);
    expect(() => calcularTeoriaColas({ ...mm1, tasaServicio: -3 })).toThrow(/mayor que 0/);
  });

  test('rechaza c < 1', () => {
    expect(() => calcularTeoriaColas({ ...mm1, servidores: 0 })).toThrow(/mayor o igual a 1/);
    expect(() => calcularTeoriaColas({ ...mm1, servidores: -2 })).toThrow(/mayor o igual a 1/);
  });

  test('rechaza c no entero', () => {
    expect(() => calcularTeoriaColas({ ...mmc, servidores: 2.5 })).toThrow(/entero/);
  });

  test('acepta c expresado como número entero (2.0)', () => {
    // λ = 9 < c·μ = 10 mantiene estable el sistema con c = 2.0
    expect(() =>
      calcularTeoriaColas({ tasaLlegada: 9, tasaServicio: 5, servidores: 2.0 })
    ).not.toThrow();
  });

  test('rechaza el sistema inestable ρ ≥ 1 con el mensaje estándar', () => {
    // λ = μ → ρ = 1
    expect(() => calcularTeoriaColas({ tasaLlegada: 5, tasaServicio: 5, servidores: 1 })).toThrow(
      'El sistema es inestable (ρ ≥ 1). La tasa de llegada supera la capacidad total de servicio; la cola crecerá infinitamente.'
    );
    // λ > c·μ
    expect(() => calcularTeoriaColas({ tasaLlegada: 16, tasaServicio: 5, servidores: 3 })).toThrow(
      'El sistema es inestable'
    );
  });

  test('el sistema inestable se bloquea con el mensaje de estabilidad', () => {
    expect(() => calcularTeoriaColas({ tasaLlegada: 6, tasaServicio: 5, servidores: 1 })).toThrow(
      'la cola crecerá infinitamente'
    );
  });

  test('acepta un sistema estable en el límite λ = c·μ − ε', () => {
    expect(() =>
      calcularTeoriaColas({ tasaLlegada: 4.999, tasaServicio: 5, servidores: 1 })
    ).not.toThrow();
  });
});

describe('Teoría de Colas — Unidad de tiempo y conversiones', () => {
  test('usa "horas" por defecto con su etiqueta de tasas', () => {
    const r = calcularTeoriaColas({ tasaLlegada: 10, tasaServicio: 12, servidores: 1 });
    expect(r.unidadTiempo.unidad).toBe('horas');
    expect(r.unidadTiempo.tasa).toBe('clientes / hora');
  });

  test('Wq y W muestran el valor con la unidad base (horas)', () => {
    // λ=10, μ=12 → Wq=0.416667, W=0.5
    const r = calcularTeoriaColas({ tasaLlegada: 10, tasaServicio: 12, servidores: 1 });
    expect(r.unidadTiempo.wq.texto).toBe('0.4167 horas');
    expect(r.unidadTiempo.w.texto).toBe('0.5 horas');
  });

  test('convierte Wq y W < 1 hora a su equivalente en minutos', () => {
    const r = calcularTeoriaColas({ tasaLlegada: 10, tasaServicio: 12, servidores: 1 });
    expect(r.unidadTiempo.wq.conversion?.texto).toBe('25 min');
    expect(r.unidadTiempo.w.conversion?.texto).toBe('30 min');
  });

  test('convierte tiempos muy pequeños a segundos', () => {
    // λ=10, μ=100 → Wq=0.001111 h (4 s), W=0.011111 h (40 s)
    const r = calcularTeoriaColas({ tasaLlegada: 10, tasaServicio: 100, servidores: 1 });
    expect(r.unidadTiempo.wq.conversion?.unidad).toBe('seg');
    expect(r.unidadTiempo.wq.conversion?.texto).toBe('4 seg');
    expect(r.unidadTiempo.w.conversion?.texto).toBe('40 seg');
  });

  test('no muestra conversión si W ≥ 1 en la unidad base y usa singular', () => {
    // λ=4, μ=5 → W=1 hora exacta, Wq=0.8 horas (48 min)
    const r = calcularTeoriaColas({ tasaLlegada: 4, tasaServicio: 5, servidores: 1 });
    expect(r.unidadTiempo.w.texto).toBe('1 hora');
    expect(r.unidadTiempo.w.conversion).toBeNull();
    expect(r.unidadTiempo.wq.conversion?.texto).toBe('48 min');
  });

  test('con unidad minutos convierte los valores < 1 a segundos', () => {
    // λ=0.25, μ=1 → Wq=0.3333 min (20 s), W=1.3333 min (sin conversión)
    const r = calcularTeoriaColas({
      tasaLlegada: 0.25,
      tasaServicio: 1,
      servidores: 1,
      unidadTiempo: 'minutos',
    });
    expect(r.unidadTiempo.tasa).toBe('clientes / minuto');
    expect(r.unidadTiempo.wq.texto).toBe('0.3333 minutos');
    expect(r.unidadTiempo.wq.conversion?.texto).toBe('20 seg');
    expect(r.unidadTiempo.w.texto).toBe('1.3333 minutos');
    expect(r.unidadTiempo.w.conversion).toBeNull();
  });

  test('con unidad días no se genera conversión a subunidades', () => {
    const r = calcularTeoriaColas({
      tasaLlegada: 10,
      tasaServicio: 5,
      servidores: 3,
      unidadTiempo: 'dias',
    });
    expect(r.unidadTiempo.tasa).toBe('clientes / día');
    expect(r.unidadTiempo.wq.texto).toBe('0.0889 días');
    expect(r.unidadTiempo.wq.conversion).toBeNull();
    expect(r.unidadTiempo.w.conversion).toBeNull();
  });
});