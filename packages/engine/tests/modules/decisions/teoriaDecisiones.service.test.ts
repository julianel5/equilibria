import { calcularTeoriaDecisiones, TeoriaDecisionesInput } from '../../../src';

// Matriz de referencia (beneficios):
//
//            Estado 1  Estado 2  Estado 3
//   Alt 1     130       260       40
//   Alt 2     240       110       160
//   Alt 3     100       200       300
//
// p = [0.4, 0.3, 0.3]
//
//   Máximos por fila:   [260, 240, 300]
//   Mínimos por fila:   [40,  110, 100]
//   Máximos por col:    [240, 260, 300]
//
//   Maximax   → Alt 3 (300)
//   Maximin   → Alt 2 (110)
//   Laplace   → Alt 3 (200)
//   Hurwicz α = 0.5 → Alt 3 (200)
//   Savage: r:
//     Alt 1 = [110, 0, 260] → máx 260
//     Alt 2 = [0, 150, 140] → máx 150
//     Alt 3 = [140, 60, 0]  → máx 140  → Alt 3 (140)
//   VME:
//     Alt 1 = 130·0.4 + 260·0.3 + 40·0.3 = 142
//     Alt 2 = 240·0.4 + 110·0.3 + 160·0.3 = 177
//     Alt 3 = 100·0.4 + 200·0.3 + 300·0.3 = 190 → Alt 3 (190)

const basico: TeoriaDecisionesInput = {
  alternativas: [
    { nombre: 'Alt 1', pagos: [130, 260, 40] },
    { nombre: 'Alt 2', pagos: [240, 110, 160] },
    { nombre: 'Alt 3', pagos: [100, 200, 300] },
  ],
  estados: [
    { nombre: 'Estado 1', probabilidad: 0.4 },
    { nombre: 'Estado 2', probabilidad: 0.3 },
    { nombre: 'Estado 3', probabilidad: 0.3 },
  ],
  alpha: 0.5,
};

describe('Teoría de Decisiones — estructura del resultado', () => {
  test('devuelve los seis criterios cuando hay probabilidades', () => {
    const r = calcularTeoriaDecisiones(basico);
    expect(r.vmeDisponible).toBe(true);
    expect(r.criterios.map((c) => c.clave)).toEqual([
      'maximax',
      'maximin',
      'laplace',
      'hurwicz',
      'savage',
      'vme',
    ]);
  });

  test('omite el VME cuando no hay probabilidades', () => {
    const r = calcularTeoriaDecisiones({
      ...basico,
      estados: basico.estados.map((e) => ({ ...e, probabilidad: null })),
    });
    expect(r.vmeDisponible).toBe(false);
    expect(r.criterios.map((c) => c.clave)).toEqual([
      'maximax',
      'maximin',
      'laplace',
      'hurwicz',
      'savage',
    ]);
  });

  test('cada criterio incluye el ganador y los valores por alternativa', () => {
    const r = calcularTeoriaDecisiones(basico);
    for (const c of r.criterios) {
      expect(c.valores).toHaveLength(3);
      expect(c.valores.map((v) => v.alternativa)).toEqual(['Alt 1', 'Alt 2', 'Alt 3']);
      expect(c.ganador.indice).toBeGreaterThanOrEqual(0);
      expect(c.ganador.valor).toBeCloseTo(c.valores[c.ganador.indice].valor, 4);
    }
  });

  test('expone los máximos/mínimos por fila y los máximos por columna', () => {
    const r = calcularTeoriaDecisiones(basico);
    expect(r.maximoPorFila).toEqual([260, 240, 300]);
    expect(r.minimoPorFila).toEqual([40, 110, 100]);
    expect(r.maximoPorColumna).toEqual([240, 260, 300]);
  });
});

describe('Teoría de Decisiones — criterios', () => {
  const r = calcularTeoriaDecisiones(basico);
  const buscar = (clave: string) => r.criterios.find((c) => c.clave === clave)!;

  test('Maximax elige el máximo de los máximos', () => {
    const c = buscar('maximax');
    expect(c.valores.map((v) => v.valor)).toEqual([260, 240, 300]);
    expect(c.ganador.alternativa).toBe('Alt 3');
    expect(c.ganador.valor).toBe(300);
  });

  test('Maximin (Wald) elige el máximo de los mínimos', () => {
    const c = buscar('maximin');
    expect(c.valores.map((v) => v.valor)).toEqual([40, 110, 100]);
    expect(c.ganador.alternativa).toBe('Alt 2');
    expect(c.ganador.valor).toBe(110);
  });

  test('Laplace promedia cada fila y elige el mayor', () => {
    const c = buscar('laplace');
    expect(c.valores[0].valor).toBeCloseTo(143.3333, 3);
    expect(c.valores[1].valor).toBeCloseTo(170, 3);
    expect(c.valores[2].valor).toBeCloseTo(200, 3);
    expect(c.ganador.alternativa).toBe('Alt 3');
    expect(c.ganador.valor).toBeCloseTo(200, 3);
  });

  test('Hurwicz α=0.5 pondera max y min', () => {
    const c = buscar('hurwicz');
    expect(c.valores.map((v) => v.valor)).toEqual([150, 175, 200]);
    expect(c.ganador.alternativa).toBe('Alt 3');
    expect(c.ganador.valor).toBe(200);
  });

  test('Hurwicz α=1 coincide con Maximax y α=0 con Maximin', () => {
    const rMax = calcularTeoriaDecisiones({ ...basico, alpha: 1 });
    expect(rMax.criterios.find((c) => c.clave === 'hurwicz')!.ganador.valor).toBe(300);

    const rMin = calcularTeoriaDecisiones({ ...basico, alpha: 0 });
    expect(rMin.criterios.find((c) => c.clave === 'hurwicz')!.ganador.valor).toBe(110);
  });

  test('Savage construye la matriz de arrepentimiento y minimiza el máximo', () => {
    const c = buscar('savage');
    expect(c.matrizArrepentimiento).toEqual([
      [110, 0, 260],
      [0, 150, 140],
      [140, 60, 0],
    ]);
    expect(c.valores.map((v) => v.valor)).toEqual([260, 150, 140]);
    expect(c.ganador.alternativa).toBe('Alt 3');
    expect(c.ganador.valor).toBe(140);
  });

  test('VME ponderado con las probabilidades', () => {
    const c = buscar('vme');
    expect(c.valores.map((v) => v.valor)).toEqual([142, 177, 190]);
    expect(c.ganador.alternativa).toBe('Alt 3');
    expect(c.ganador.valor).toBe(190);
  });
});

describe('Teoría de Decisiones — validaciones (Zod)', () => {
  test('rechaza menos de 2 alternativas', () => {
    expect(() =>
      calcularTeoriaDecisiones({
        ...basico,
        alternativas: [{ nombre: 'Única', pagos: [1, 2, 3] }],
      })
    ).toThrow();
  });

  test('rechaza menos de 2 estados', () => {
    expect(() =>
      calcularTeoriaDecisiones({
        ...basico,
        estados: [{ nombre: 'Solo', probabilidad: 1 }],
      })
    ).toThrow();
  });

  test('rechaza filas con cantidad de pagos distinta al número de estados', () => {
    expect(() =>
      calcularTeoriaDecisiones({
        ...basico,
        alternativas: [
          { nombre: 'Alt 1', pagos: [130, 260] },
          { nombre: 'Alt 2', pagos: [240, 110, 160] },
          { nombre: 'Alt 3', pagos: [100, 200, 300] },
        ],
      })
    ).toThrow();
  });

  test('rechaza α fuera de [0, 1]', () => {
    expect(() => calcularTeoriaDecisiones({ ...basico, alpha: -0.1 })).toThrow();
    expect(() => calcularTeoriaDecisiones({ ...basico, alpha: 1.1 })).toThrow();
  });

  test('rechaza probabilidades que no suman 1', () => {
    expect(() =>
      calcularTeoriaDecisiones({
        ...basico,
        estados: [
          { nombre: 'Estado 1', probabilidad: 0.5 },
          { nombre: 'Estado 2', probabilidad: 0.2 },
          { nombre: 'Estado 3', probabilidad: 0.2 },
        ],
      })
    ).toThrow();
  });

  test('tolerancia razonable ante errores de punto flotante (0.3+0.3+0.4)', () => {
    const r = calcularTeoriaDecisiones({
      ...basico,
      estados: [
        { nombre: 'Estado 1', probabilidad: 0.3 },
        { nombre: 'Estado 2', probabilidad: 0.3 },
        { nombre: 'Estado 3', probabilidad: 0.4 },
      ],
    });
    expect(r.vmeDisponible).toBe(true);
  });

  test('rechaza probabilidades definidas solo en algunos estados', () => {
    expect(() =>
      calcularTeoriaDecisiones({
        ...basico,
        estados: [
          { nombre: 'Estado 1', probabilidad: 0.4 },
          { nombre: 'Estado 2', probabilidad: null },
          { nombre: 'Estado 3', probabilidad: 0.6 },
        ],
      })
    ).toThrow();
  });

  test('rechaza probabilidades negativas o mayores que 1', () => {
    expect(() =>
      calcularTeoriaDecisiones({
        ...basico,
        estados: [
          { nombre: 'Estado 1', probabilidad: -0.1 },
          { nombre: 'Estado 2', probabilidad: 0.5 },
          { nombre: 'Estado 3', probabilidad: 0.6 },
        ],
      })
    ).toThrow();
  });
});

describe('Teoría de Decisiones — empates y nombres editados', () => {
  test('ante empate en el máximo de una fila se conserva la primera aparición', () => {
    const r = calcularTeoriaDecisiones({
      ...basico,
      alternativas: [
        { nombre: 'A', pagos: [10, 10, 5] },
        { nombre: 'B', pagos: [10, 10, 5] },
      ],
      estados: [
        { nombre: 'E1', probabilidad: null },
        { nombre: 'E2', probabilidad: null },
        { nombre: 'E3', probabilidad: null },
      ],
    });
    const maximax = r.criterios.find((c) => c.clave === 'maximax')!;
    expect(maximax.ganador.alternativa).toBe('A');
    expect(maximax.ganador.valor).toBe(10);
  });

  test('respeta los nombres editados por el usuario', () => {
    const r = calcularTeoriaDecisiones({
      ...basico,
      alternativas: [
        { nombre: 'Ampliar planta', pagos: [130, 260, 40] },
        { nombre: 'Subcontratar', pagos: [240, 110, 160] },
        { nombre: 'No hacer nada', pagos: [100, 200, 300] },
      ],
    });
    const maximin = r.criterios.find((c) => c.clave === 'maximin')!;
    expect(maximin.ganador.alternativa).toBe('Subcontratar');
  });

  test('admite pagos negativos (pérdidas) en la matriz de beneficios', () => {
    const r = calcularTeoriaDecisiones({
      alternativas: [
        { nombre: 'A', pagos: [-10, 20] },
        { nombre: 'B', pagos: [0, -5] },
      ],
      estados: [
        { nombre: 'E1', probabilidad: null },
        { nombre: 'E2', probabilidad: null },
      ],
      alpha: 0.5,
    });
    const maximin = r.criterios.find((c) => c.clave === 'maximin')!;
    expect(maximin.valores.map((v) => v.valor)).toEqual([-10, -5]);
    expect(maximin.ganador.alternativa).toBe('B');
  });
});

// Matriz de referencia en modo COSTOS (minimizar):
//
//            Estado 1  Estado 2  Estado 3
//   Alt 1       8        15        20
//   Alt 2      12         9        13
//   Alt 3       6        18        25
//
// p = [0.4, 0.3, 0.3], α = 0.5
//
//   Mínimos por fila:   [8, 9, 6]
//   Máximos por fila:   [20, 13, 25]
//   Mínimos por col:    [6, 9, 13]
//   Máximos por col:    [12, 18, 25]
//
//   Minimin  → Alt 3 (6)
//   Minimax  → Alt 2 (13)
//   Laplace  → Alt 2 (34/3 ≈ 11.3333)
//   Hurwicz  → Alt 2 (0.5·9 + 0.5·13 = 11)
//   Savage: r = C − minCol:
//     Alt 1 = [2, 6, 7]  → máx 7
//     Alt 2 = [6, 0, 0]  → máx 6  → Alt 2 (6)
//     Alt 3 = [0, 9, 12] → máx 12
//   VME:
//     Alt 1 = 8·0.4 + 15·0.3 + 20·0.3 = 13.7
//     Alt 2 = 12·0.4 + 9·0.3 + 13·0.3 = 11.4 → Alt 2 (11.4)
//     Alt 3 = 6·0.4 + 18·0.3 + 25·0.3 = 15.3

describe('Teoría de Decisiones — modo Minimizar (costos)', () => {
  const costos: TeoriaDecisionesInput = {
    alternativas: [
      { nombre: 'Alt 1', pagos: [8, 15, 20] },
      { nombre: 'Alt 2', pagos: [12, 9, 13] },
      { nombre: 'Alt 3', pagos: [6, 18, 25] },
    ],
    estados: [
      { nombre: 'E1', probabilidad: 0.4 },
      { nombre: 'E2', probabilidad: 0.3 },
      { nombre: 'E3', probabilidad: 0.3 },
    ],
    tipoAnalisis: 'minimizar',
    alpha: 0.5,
  };

  test('expone tipoAnalisis y los mínimos por columna', () => {
    const r = calcularTeoriaDecisiones(costos);
    expect(r.tipoAnalisis).toBe('minimizar');
    expect(r.minimoPorColumna).toEqual([6, 9, 13]);
    expect(r.minimoPorFila).toEqual([8, 9, 6]);
  });

  test('Maximax pasa a Minimin: elige el menor de los mínimos', () => {
    const r = calcularTeoriaDecisiones(costos);
    const c = r.criterios.find((c) => c.clave === 'maximax')!;
    expect(c.nombre).toBe('Minimin');
    expect(c.formula).toContain('\\min');
    expect(c.valores.map((v) => v.valor)).toEqual([8, 9, 6]);
    expect(c.ganador.alternativa).toBe('Alt 3');
    expect(c.ganador.valor).toBe(6);
  });

  test('Maximin pasa a Minimax (Wald): minimiza el mayor costo', () => {
    const r = calcularTeoriaDecisiones(costos);
    const c = r.criterios.find((c) => c.clave === 'maximin')!;
    expect(c.nombre).toBe('Minimax (Wald)');
    expect(c.formula).toContain('\\max_j a_{ij} \\right)');
    expect(c.valores.map((v) => v.valor)).toEqual([20, 13, 25]);
    expect(c.ganador.alternativa).toBe('Alt 2');
    expect(c.ganador.valor).toBe(13);
  });

  test('Laplace elige el menor costo promedio', () => {
    const r = calcularTeoriaDecisiones(costos);
    const c = r.criterios.find((c) => c.clave === 'laplace')!;
    expect(c.valores.map((v) => v.valor)).toEqual([14.3333, 11.3333, 16.3333]);
    expect(c.ganador.alternativa).toBe('Alt 2');
    expect(c.ganador.valor).toBeCloseTo(11.3333, 3);
  });

  test('Hurwicz en costos pondera α·mínimo + (1−α)·máximo y elige el menor', () => {
    const r = calcularTeoriaDecisiones(costos);
    const c = r.criterios.find((c) => c.clave === 'hurwicz')!;
    expect(c.valores.map((v) => v.valor)).toEqual([14, 11, 15.5]);
    expect(c.ganador.alternativa).toBe('Alt 2');
    expect(c.ganador.valor).toBe(11);
    expect(c.formula).toContain('\\min_j a_{ij} + (1-\\alpha) \\cdot \\max_j a_{ij}');
  });

  test('Savage en costos: r_ij = costo − mínimo del estado', () => {
    const r = calcularTeoriaDecisiones(costos);
    const c = r.criterios.find((c) => c.clave === 'savage')!;
    expect(c.matrizArrepentimiento).toEqual([
      [2, 6, 7],
      [6, 0, 0],
      [0, 9, 12],
    ]);
    expect(c.valores.map((v) => v.valor)).toEqual([7, 6, 12]);
    expect(c.ganador.alternativa).toBe('Alt 2');
    expect(c.ganador.valor).toBe(6);
  });

  test('VME pasa a Costo Esperado: elige el menor', () => {
    const r = calcularTeoriaDecisiones(costos);
    const c = r.criterios.find((c) => c.clave === 'vme')!;
    expect(c.nombre).toBe('VME (Costo Esperado)');
    expect(c.valores.map((v) => v.valor)).toEqual([13.7, 11.4, 15.3]);
    expect(c.ganador.alternativa).toBe('Alt 2');
    expect(c.ganador.valor).toBe(11.4);
  });

  test('Hurwicz α=0 en costos coincide con Minimax y α=1 con Minimin', () => {
    const r0 = calcularTeoriaDecisiones({ ...costos, alpha: 0 });
    expect(r0.criterios.find((c) => c.clave === 'hurwicz')!.ganador.valor).toBe(13);

    const r1 = calcularTeoriaDecisiones({ ...costos, alpha: 1 });
    expect(r1.criterios.find((c) => c.clave === 'hurwicz')!.ganador.valor).toBe(6);
  });

  test('dualidad: maximizar(P) reproduce los ganadores de minimizar(−P)', () => {
    const maximizar = calcularTeoriaDecisiones({
      alternativas: [
        { nombre: 'A1', pagos: [130, 260, 40] },
        { nombre: 'A2', pagos: [240, 110, 160] },
        { nombre: 'A3', pagos: [100, 200, 300] },
      ],
      estados: [
        { nombre: 'E1', probabilidad: 0.4 },
        { nombre: 'E2', probabilidad: 0.3 },
        { nombre: 'E3', probabilidad: 0.3 },
      ],
      tipoAnalisis: 'maximizar',
      alpha: 0.5,
    });
    const minimizar = calcularTeoriaDecisiones({
      alternativas: [
        { nombre: 'A1', pagos: [-130, -260, -40] },
        { nombre: 'A2', pagos: [-240, -110, -160] },
        { nombre: 'A3', pagos: [-100, -200, -300] },
      ],
      estados: [
        { nombre: 'E1', probabilidad: 0.4 },
        { nombre: 'E2', probabilidad: 0.3 },
        { nombre: 'E3', probabilidad: 0.3 },
      ],
      tipoAnalisis: 'minimizar',
      alpha: 0.5,
    });

    for (const clave of ['maximax', 'maximin', 'laplace', 'hurwicz', 'savage', 'vme']) {
      const gMax = maximizar.criterios.find((c) => c.clave === clave)!.ganador;
      const gMin = minimizar.criterios.find((c) => c.clave === clave)!.ganador;
      expect(gMin.alternativa).toBe(gMax.alternativa);
      // El arrepentimiento de Savage es invariante al signo (r_ij = C_ij − min(C_kj)
      // con C = −P es idéntico a r_ij = max(P_kj) − P_ij); el resto de criterios son
      // homogéneos y su valor queda negado.
      if (clave === 'savage') {
        expect(gMin.valor).toBeCloseTo(gMax.valor, 4);
      } else {
        expect(gMin.valor).toBeCloseTo(-gMax.valor, 4);
      }
    }
  });

  test('por defecto el tipo de análisis es maximizar', () => {
    const r = calcularTeoriaDecisiones(costos && { ...costos, tipoAnalisis: undefined as never });
    expect(r.tipoAnalisis).toBe('maximizar');
    expect(r.criterios.find((c) => c.clave === 'maximax')!.nombre).toBe('Maximax');
    expect(r.criterios.find((c) => c.clave === 'maximin')!.nombre).toBe('Maximin (Wald)');
    expect(r.criterios.find((c) => c.clave === 'vme')!.nombre).toBe('VME (Valor Monetario Esperado)');
  });
});

describe('Teoría de Decisiones — procesos paso a paso', () => {
  const r = calcularTeoriaDecisiones(basico);
  const buscar = (id: string) => r.procesos.find((p) => p.id === id);

  test('genera una tarjeta por alternativa y una de decisión por criterio', () => {
    // maximax, maximin, laplace, hurwicz (4 c/u) + savage (3+2) + vme (4) = 25
    expect(r.procesos.map((p) => p.id)).toEqual([
      'decision-maximax-alt-0',
      'decision-maximax-alt-1',
      'decision-maximax-alt-2',
      'decision-maximax-ganador',
      'decision-maximin-alt-0',
      'decision-maximin-alt-1',
      'decision-maximin-alt-2',
      'decision-maximin-ganador',
      'decision-laplace-alt-0',
      'decision-laplace-alt-1',
      'decision-laplace-alt-2',
      'decision-laplace-ganador',
      'decision-hurwicz-alt-0',
      'decision-hurwicz-alt-1',
      'decision-hurwicz-alt-2',
      'decision-hurwicz-ganador',
      'decision-savage-referencia',
      'decision-savage-alt-0',
      'decision-savage-alt-1',
      'decision-savage-alt-2',
      'decision-savage-ganador',
      'decision-vme-alt-0',
      'decision-vme-alt-1',
      'decision-vme-alt-2',
      'decision-vme-ganador',
    ]);
  });

  test('Maximax: evalúa cada fila y declara al ganador', () => {
    const alt0 = buscar('decision-maximax-alt-0')!;
    expect(alt0.titulo).toBe('Maximax · Alt 1');
    expect(alt0.formula).toBe('\\max_j a_{ij}');
    expect(alt0.sustitucion).toBe('\\max\\left(130, 260, 40\\right)');
    expect(alt0.resultado).toBe('= 260');

    const ganador = buscar('decision-maximax-ganador')!;
    expect(ganador.sustitucion).toBe('\\max\\left(260, 240, 300\\right)');
    expect(ganador.resultado).toContain('\\text{Ganador: } \\text{Alt 3}\\;(300)');
  });

  test('Maximin: toma el mínimo de cada fila y luego el mayor', () => {
    const alt2 = buscar('decision-maximin-alt-2')!;
    expect(alt2.formula).toBe('\\min_j a_{ij}');
    expect(alt2.sustitucion).toBe('\\min\\left(100, 200, 300\\right)');
    expect(alt2.resultado).toBe('= 100');

    const ganador = buscar('decision-maximin-ganador')!;
    expect(ganador.sustitucion).toBe('\\min\\left(40, 110, 100\\right)');
    expect(ganador.resultado).toContain('\\text{Ganador: } \\text{Alt 2}\\;(110)');
  });

  test('Laplace promedia la fila con el número de estados', () => {
    const alt0 = buscar('decision-laplace-alt-0')!;
    expect(alt0.sustitucion).toBe('\\frac{130 + 260 + 40}{3}');
    expect(alt0.resultado).toBe('= 143.33');
  });

  test('Hurwicz pondera máximo y mínimo con α', () => {
    const alt0 = buscar('decision-hurwicz-alt-0')!;
    expect(alt0.sustitucion).toBe('0.5 \\cdot 260 + 0.5 \\cdot 40');
    expect(alt0.resultado).toBe('= 150');
  });

  test('Savage muestra la referencia por columna antes del arrepentimiento', () => {
    const ref = buscar('decision-savage-referencia')!;
    expect(ref.formula).toBe('M_j = \\max_k a_{kj}');
    expect(ref.sustitucion).toBe(
      'M_j = \\max\\left(\\left[130, 240, 100\\right],\\; \\left[260, 110, 200\\right],\\; \\left[40, 160, 300\\right]\\right)'
    );
    expect(ref.resultado).toBe('M_j = [240, 260, 300]');

    const alt0 = buscar('decision-savage-alt-0')!;
    expect(alt0.titulo).toBe('Savage (Minimax Regret) · Arrepentimiento');
    expect(alt0.sustitucion).toBe('\\max\\left(|240 - 130|, |260 - 260|, |300 - 40|\\right)');
    expect(alt0.resultado).toBe('= 260');

    const ganador = buscar('decision-savage-ganador')!;
    expect(ganador.sustitucion).toBe('\\min\\left(260, 150, 140\\right)');
    expect(ganador.resultado).toContain('\\text{Ganador: } \\text{Alt 3}\\;(140)');
  });

  test('VME pondera cada pago con su probabilidad', () => {
    const alt0 = buscar('decision-vme-alt-0')!;
    expect(alt0.sustitucion).toBe(
      '\\left(0.4\\right)\\left(130\\right) + \\left(0.3\\right)\\left(260\\right) + \\left(0.3\\right)\\left(40\\right)'
    );
    expect(alt0.resultado).toBe('= 142');
    expect(alt0.formula).toBe('VE(d_i) = \\sum_{j} p_j \\cdot a_{ij}');

    const ganador = buscar('decision-vme-ganador')!;
    expect(ganador.sustitucion).toBe('\\max\\left(142, 177, 190\\right)');
    expect(ganador.resultado).toContain('\\text{Ganador: } \\text{Alt 3}\\;(190)');
  });

  test('sin probabilidades se omiten los pasos del VME', () => {
    const sinVme = calcularTeoriaDecisiones({
      ...basico,
      estados: basico.estados.map((e) => ({ ...e, probabilidad: null })),
    });
    expect(sinVme.procesos.length).toBe(21);
    expect(sinVme.procesos.some((p) => p.id.startsWith('decision-vme'))).toBe(false);
  });

  test('modo costos invierte la referencia de Savage y los criterios', () => {
    const costo = calcularTeoriaDecisiones({
      alternativas: [
        { nombre: 'Alt 1', pagos: [8, 15, 20] },
        { nombre: 'Alt 2', pagos: [12, 9, 13] },
        { nombre: 'Alt 3', pagos: [6, 18, 25] },
      ],
      estados: [
        { nombre: 'E1', probabilidad: 0.4 },
        { nombre: 'E2', probabilidad: 0.3 },
        { nombre: 'E3', probabilidad: 0.3 },
      ],
      tipoAnalisis: 'minimizar',
      alpha: 0.5,
    });
    const buscarC = (id: string) => costo.procesos.find((p) => p.id === id)!;

    const minimin = buscarC('decision-maximax-alt-0');
    expect(minimin.titulo).toBe('Minimin · Alt 1');
    expect(minimin.formula).toBe('\\min_j a_{ij}');
    expect(minimin.sustitucion).toBe('\\min\\left(8, 15, 20\\right)');
    expect(minimin.resultado).toBe('= 8');
    expect(buscarC('decision-maximax-ganador').resultado).toContain(
      '\\text{Ganador: } \\text{Alt 3}\\;(6)'
    );

    const minimax = buscarC('decision-maximin-ganador');
    expect(minimax.sustitucion).toBe('\\max\\left(20, 13, 25\\right)');
    expect(minimax.resultado).toContain('\\text{Ganador: } \\text{Alt 2}\\;(13)');

    const ref = buscarC('decision-savage-referencia');
    expect(ref.formula).toBe('m_j = \\min_k a_{kj}');
    expect(ref.resultado).toBe('m_j = [6, 9, 13]');

    const alt0 = buscarC('decision-savage-alt-0');
    expect(alt0.formula).toBe('m_j \\text{ (referencia)}: r_{ij} = a_{ij} - m_j');
    expect(alt0.sustitucion).toBe('\\max\\left(|8 - 6|, |15 - 9|, |20 - 13|\\right)');
    expect(alt0.resultado).toBe('= 7');

    const savGanador = buscarC('decision-savage-ganador');
    expect(savGanador.sustitucion).toBe('\\min\\left(7, 6, 12\\right)');
    expect(savGanador.resultado).toContain('\\text{Ganador: } \\text{Alt 2}\\;(6)');

    const vme = buscarC('decision-vme-ganador');
    expect(vme.sustitucion).toBe('\\min\\left(13.7, 11.4, 15.3\\right)');
    expect(vme.resultado).toContain('\\text{Ganador: } \\text{Alt 2}\\;(11.4)');
  });
});