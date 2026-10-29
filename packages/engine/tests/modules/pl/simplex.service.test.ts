import {
  calcularSimplex,
  SimplexInputSchema,
  Frac,
  type SimplexInput,
  type SimplexResultado,
  type FraccionJSON,
} from '../../../src';

const num = (f: FraccionJSON): number => Number(f.num) / Number(f.den);

describe('Frac (fracciones exactas)', () => {
  it('convierte decimales a fracciones irreducibles', () => {
    expect(Frac.deDecimal(0.5).toString()).toBe('1/2');
    expect(Frac.deDecimal(2.25).toString()).toBe('9/4');
    expect(Frac.deDecimal(-0.75).toString()).toBe('-3/4');
    expect(Frac.deDecimal(7).toString()).toBe('7');
  });

  it('opera con aritmética entera exacta', () => {
    const a = new Frac(1, 3);
    const b = new Frac(1, 6);
    expect(a.add(b).toString()).toBe('1/2');
    expect(b.sub(a).toString()).toBe('-1/6');
    expect(a.mul(new Frac(3)).toString()).toBe('1');
    expect(a.div(b).toString()).toBe('2');
    expect(a.inv().toString()).toBe('3');
  });

  it('normaliza signo y reduce', () => {
    const f = new Frac(4, -6);
    expect(f.num).toBe(-2n);
    expect(f.den).toBe(3n);
    expect(f.esNegativo).toBe(true);
  });

  it('genera representación LaTeX y decimal', () => {
    const f = new Frac(-28, 3);
    expect(f.toTex()).toBe('-\\frac{28}{3}');
    expect(f.toDec()).toBe('-9.333333');
    expect(new Frac(5, 1).toTex()).toBe('5');
  });
});

describe('Simplex Tabular', () => {
  // max Z = 10x1 + 8x2  s.a.  x1 + 2x2 <= 36 ; 5x1 + x2 <= 60 ; x1,x2 >= 0
  // Optimo: x1=28/3, x2=40/3, Z=200
  const input: SimplexInput = {
    metodo: 'tabular',
    objetivo: 'max',
    funcionObjetivo: [10, 8],
    restricciones: [
      { coeficientes: [1, 2], tipo: 'LE', b: 36 },
      { coeficientes: [5, 1], tipo: 'LE', b: 60 },
    ],
  };

  let res: SimplexResultado;
  beforeAll(() => {
    res = calcularSimplex(input);
  });

  it('encuentra el óptimo exacto con fracciones', () => {
    expect(res.estado).toBe('optimo');
    expect(res.valorObjetivo.tex).toBe('200');
    expect(num(res.solucion[0])).toBeCloseTo(28 / 3, 10);
    expect(res.solucion[0].tex).toBe('\\frac{28}{3}');
    expect(res.solucion[1].tex).toBe('\\frac{40}{3}');
    expect(res.holguras.map(num)).toEqual([0, 0]);
  });

  it('aplica GAUSS-JORDAN con fracciones irreducibles en cada pivote', () => {
    // Iteración inicial: fila de costos reducidos Z_j - C_j = -C = [-10,-8,0,0]
    const inicial = res.tablas[0];
    expect(inicial.reducidos.map((f) => f.tex)).toEqual(['-10', '-8', '0', '0']);
    expect(inicial.z.tex).toBe('0');
    expect(inicial.ratios).toBeNull();

    // Primera pivote: entra x1 (Z1-C1=-10 mÃ¡s negativa), fila razÃ³n 60/5.
    const pivote1 = res.tablas[1];
    expect(pivote1.columnaEntrante).toBe(0);
    expect(pivote1.filaSaliente).toBe(1);
    expect((pivote1.ratios ?? []).some((r) => r.numerador.tex === '60' && r.denominador.tex === '5')).toBe(true);
    expect(pivote1.pivote?.tex).toBe('5');
    expect(pivote1.basica).toEqual(['S_{1}', 'x_{1}']);
    expect(pivote1.z.tex).toBe('120');

    // Segunda pivote: entra x2 y se optimiza (Z=200).
    const pivote2 = res.tablas[2];
    expect(pivote2.columnaEntrante).toBe(1);
    expect(pivote2.basica).toEqual(['x_{2}', 'x_{1}']);
    expect(pivote2.z.tex).toBe('200');
    expect(res.basicaFinal).toEqual(['x_{2}', 'x_{1}']);
  });

  it('descarta denominadores negativos o cero en la prueba de la razón mínima', () => {
    // La iteraciÃ³n 2 usa sÃ³lo la fila 0 (24/(9/5)); la fila 1 (12/(1/5)) se descarta...
    // En este problema todos los denominadores son positivos; verificamos que no
    // haya razones con denominador <= 0 marcadas como activas.
    for (const t of res.tablas) {
      for (const r of t.ratios ?? []) {
        if (r.descartada) {
          expect(num(r.denominador)).toBeLessThanOrEqual(0);
        } else {
          expect(r.razon).not.toBeNull();
        }
      }
    }
  });

  it('genera los procesos pedagógicos (Estandarización + Tableaus)', () => {
    const titulos = res.procesos.map((p) => p.titulo);
    expect(titulos[0]).toBe('Estandarización');
    expect(titulos.filter((t) => t.includes('Tableau')).length).toBe(3);
    expect(res.procesos.some((p) => p.formula.includes('\\begin{array}{c|cccc|c}'))).toBe(true);
    expect(res.procesos.map((p) => p.simbolo).filter(Boolean).length).toBeGreaterThan(0);
  });

  it('serializa como JSON sin BigInt', () => {
    const ser = JSON.stringify(res);
    expect(ser).toContain('"num"');
    expect(ser).toContain('"tex"');
    expect(() => JSON.parse(ser)).not.toThrow();
    // Los pivotes muestran fracciones, no decimales.
    expect(JSON.stringify(res.valorObjetivo)).toContain('"200"');
  });
});

describe('Simplex Revisado (matricial)', () => {
  const input: SimplexInput = {
    metodo: 'revisado',
    objetivo: 'max',
    funcionObjetivo: [10, 8],
    restricciones: [
      { coeficientes: [1, 2], tipo: 'LE', b: 36 },
      { coeficientes: [5, 1], tipo: 'LE', b: 60 },
    ],
  };

  let res: SimplexResultado;
  beforeAll(() => {
    res = calcularSimplex(input);
  });

  it('converge al mismo óptimo exacto', () => {
    expect(res.estado).toBe('optimo');
    expect(res.valorObjetivo.tex).toBe('200');
    expect(res.solucion[0].tex).toBe('\\frac{28}{3}');
    expect(res.solucion[1].tex).toBe('\\frac{40}{3}');
  });

  it('computa y^T = c_B B^{-1} y costos reducidos en cada iteración', () => {
    const it0 = res.revisado[0];
    // Base inicial de holguras: B = I, cB = [0,0] -> y^T = [0,0]. Aún sin pivoteo.
    expect(it0.y.map(num)).toEqual([0, 0]);
    expect(it0.BInv.map((fil) => fil.map(num))).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(it0.columnaEntrante).toBeNull();
    expect(it0.z.tex).toBe('0');
    const crX1 = it0.costosReducidos.find((c) => c.variable === 'x_{1}')!;
    expect(num(crX1.cr)).toBe(10);

    // La primera entrada decide x1 (cr > 0 en max) y sale la holgura S_2.
    const pivote1 = res.revisado[1];
    expect(pivote1.columnaEntrante).toBe(0);
    expect(pivote1.variableEntrante).toBe('x_{1}');
    expect(pivote1.filaSaliente).toBe(1);
    expect(pivote1.variableSaliente).toBe('S_{2}');
    expect(pivote1.basica).toEqual(['S_{1}', 'x_{1}']);
    expect(pivote1.z.tex).toBe('120');

    // El último snapshot registra el pivote que llevó a Z*=200.
    const ultimo = res.revisado[res.revisado.length - 1];
    expect(num(ultimo.z)).toBe(200);
    expect(ultimo.columnaEntrante).toBe(1);
    expect(ultimo.variableEntrante).toBe('x_{2}');
    expect(ultimo.variableSaliente).toBe('S_{1}');
    expect(ultimo.basica).toEqual(['x_{2}', 'x_{1}']);
  });

  it('genera procesos con la multiplicación matricial y la razón mínima', () => {
    const titulos = res.procesos.map((p) => p.titulo);
    expect(titulos.some((t) => t.includes('Revisado'))).toBe(true);
    const primerRev = res.procesos.find((p) => p.titulo.includes('Revisado — Iteración 1'))!;
    expect(primerRev.formula).toContain('y^T = c_B B^{-1}');
    expect(primerRev.formula).toContain('\\begin{bmatrix}');
    expect(primerRev.resultado).toContain('\\text{Sale }');
  });
});

describe('Problema de minimización', () => {
  // min Z = -x2  s.a.  x1 + x2 <= 4 ; x2 <= 2  ->  opt x1=0, x2=2, Z=-2
  it('usa el criterio invertido de optimalidad y reporta el valor correcto', () => {
    const res = calcularSimplex({
      metodo: 'tabular',
      objetivo: 'min',
      funcionObjetivo: [0, -1],
      restricciones: [
        { coeficientes: [1, 1], b: 4 },
        { coeficientes: [0, 1], b: 2 },
      ],
    });
    expect(res.estado).toBe('optimo');
    expect(res.valorObjetivo.tex).toBe('-2');
    expect(res.solucion.map(num)).toEqual([0, 2]);
  });
});

describe('Problema no acotado', () => {
  it('detecta ausencia de razones válidas', () => {
    const res = calcularSimplex({
      metodo: 'tabular',
      objetivo: 'max',
      funcionObjetivo: [1, 2],
      restricciones: [{ coeficientes: [1, 0], b: 5 }],
    });
    expect(res.estado).toBe('no-acotado');
    expect(res.procesos.some((p) => p.titulo.includes('no acotado'))).toBe(true);
  });
});

describe('Validaciones del esquema', () => {
  const base = {
    funcionObjetivo: [10, 8],
    restricciones: [
      { coeficientes: [1, 2], b: 36 },
      { coeficientes: [5, 1], b: 60 },
    ],
  };

  it('rechaza restricciones >= o = apuntando a Dos Fases / Penalización', () => {
    for (const tipo of ['GE', 'EQ'] as const) {
      let error = '';
      try {
        calcularSimplex({
          ...base,
          restricciones: [{ ...base.restricciones[0], tipo }],
        });
      } catch (e) {
        error = e instanceof Error ? e.message : '';
      }
      expect(error).toContain('Dos Fases');
    }
  });

  it('rechaza b negativos', () => {
    let error = '';
    try {
      calcularSimplex({
        ...base,
        restricciones: [{ coeficientes: [1, 2], b: -1 }],
      });
    } catch (e) {
      error = e instanceof Error ? e.message : '';
    }
    expect(error).toContain('≥ 0');
  });

  it('rechaza filas con número de coeficientes distinto a n', () => {
    const parsed = SimplexInputSchema.safeParse({
      ...base,
      restricciones: [{ coeficientes: [1, 2, 3], b: 36 }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message.includes('coeficientes'))).toBe(true);
    }
  });
});