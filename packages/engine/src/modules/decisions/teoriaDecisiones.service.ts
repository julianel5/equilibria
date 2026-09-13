import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Teoría de Decisiones - Matriz de Pagos
// ═══════════════════════════════════════════════════════════════════════════════
//
// Decisión bajo incertidumbre: una matriz de pagos a_ij con las alternativas i
// como filas y los estados de la naturaleza j como columnas. El tipo de análisis
// (tipoAnalisis) determina si la matriz expresa BENEFICIOS (maximizar) o COSTOS
// (minimizar), e invierte la lógica de los 6 criterios:
//
//   Maximax/Minimin   Max_i( max_j a_ij )  o  Min_i( min_j a_ij )   (optimista)
//   Maximin/Minimax   Max_i( min_j a_ij )  o  Min_i( max_j a_ij )   (pesimista/Wald)
//   Laplace           Max/Min del promedio simple de cada fila
//   Hurwicz           α·mejor + (1−α)·peor por fila, ese extremo según el modo
//   Savage            Min_i( max_j r_ij ); r_ij depende del modo:
//                       maximizar: r_ij = max_k a_kj − a_ij
//                       minimizar: r_ij = a_ij − min_k a_kj
//   VME               Max/Min de Σ_j p_j·a_ij (requiere probabilidades)
//
// El motor devuelve no solo el ganador, sino todos los cálculos intermedios por
// alternativa para mostrarlos pedagógicamente en la UI. El VME solo se incluye
// cuando hay probabilidades para todos los estados (sumando exactamente 1).
//
// ═══════════════════════════════════════════════════════════════════════════════

// --- Schema de validación (Zod) ---

export const TeoriaDecisionesInputSchema = z
  .object({
    alternativas: z
      .array(
        z.object({
          nombre: z
            .string()
            .trim()
            .min(1, { message: 'El nombre de cada alternativa no puede estar vacío' }),
          pagos: z.array(z.number()),
        })
      )
      .min(2, { message: 'Se requieren al menos 2 alternativas' }),
    estados: z
      .array(
        z.object({
          nombre: z
            .string()
            .trim()
            .min(1, { message: 'El nombre de cada estado de la naturaleza no puede estar vacío' }),
          probabilidad: z
            .number()
            .min(0, { message: 'Cada probabilidad debe estar entre 0 y 1' })
            .max(1, { message: 'Cada probabilidad debe estar entre 0 y 1' })
            .nullable()
            .optional(),
        })
      )
      .min(2, { message: 'Se requieren al menos 2 estados de la naturaleza' }),
    tipoAnalisis: z
      .enum(['maximizar', 'minimizar'])
      .default('maximizar')
      .describe('Tipo de análisis: maximizar (beneficios/ganancias) o minimizar (costos/pérdidas)'),
    alpha: z
      .number()
      .min(0, { message: 'El coeficiente de optimismo (α) de Hurwicz debe estar entre 0 y 1' })
      .max(1, { message: 'El coeficiente de optimismo (α) de Hurwicz debe estar entre 0 y 1' }),
  })
  .superRefine((data, ctx) => {
    const nCols = data.estados.length;

    // Toda alternativa debe tener un pago por cada estado de la naturaleza.
    data.alternativas.forEach((alt, i) => {
      if (alt.pagos.length !== nCols) {
        ctx.addIssue({
          code: 'custom',
          path: ['alternativas', i, 'pagos'],
          message: `La alternativa "${alt.nombre}" debe tener ${nCols} pago(s), uno por estado de la naturaleza, pero tiene ${alt.pagos.length}.`,
        });
      }
    });

    // Consistencia de probabilidades: o se definen para todos los estados,
    // o para ninguno. Si se definen, deben sumar exactamente 1.
    const probs = data.estados.map((e) => e.probabilidad ?? null);
    const definidas = probs.filter((p): p is number => p !== null);

    if (definidas.length > 0 && definidas.length < nCols) {
      ctx.addIssue({
        code: 'custom',
        path: ['estados'],
        message:
          'Si defines probabilidades, debes definirlas para TODOS los estados de la naturaleza (y deben sumar exactamente 1).',
      });
    }

    if (definidas.length === nCols) {
      const suma = definidas.reduce((acc, p) => acc + p, 0);
      if (Math.abs(suma - 1) > 1e-6) {
        ctx.addIssue({
          code: 'custom',
          path: ['estados'],
          message: `La suma de las probabilidades debe ser exactamente 1 (por ejemplo 0.5 + 0.3 + 0.2) y actualmente suma ${suma.toFixed(6)}.`,
        });
      }
    }
  });

export type TeoriaDecisionesInput = z.input<typeof TeoriaDecisionesInputSchema>;

// --- Estructura de resultados ---

export type CriterioClave = 'maximax' | 'maximin' | 'laplace' | 'hurwicz' | 'savage' | 'vme';

export interface CriterioValor {
  indice: number;
  alternativa: string;
  valor: number;
}

export interface CriterioResult {
  clave: CriterioClave;
  nombre: string;       // nombre dinámico según el modo (Maximax/Minimin, etc.)
  formula: string;      // LaTeX dinámico según el modo
  descripcion: string;  // texto pedagógico corto según el modo
  valores: CriterioValor[];                    // valor de cada alternativa bajo este criterio
  ganador: CriterioValor;                      // alternativa ganadora y su valor
  matrizArrepentimiento?: number[][];          // solo Savage: r_ij por fila (alternativa) y columna (estado)
}

export interface TeoriaDecisionesResult {
  criterios: CriterioResult[];
  vmeDisponible: boolean;
  tipoAnalisis: 'maximizar' | 'minimizar';
  maximoPorFila: number[];      // máximos de cada fila
  minimoPorFila: number[];      // mínimos de cada fila
  maximoPorColumna: number[];   // máximos de cada columna
  minimoPorColumna: number[];   // mínimos de cada columna
  matrizArrepentimiento: number[][]; // r_ij para el modo activo
}

// --- Servicio ---

const redondear = (n: number, decimales = 4): number => Math.round(n * 10 ** decimales) / 10 ** decimales;

function indiceExtremo(arr: number[], minimizar: boolean): number {
  let mejor = 0;
  for (let i = 1; i < arr.length; i += 1) {
    const gana = minimizar ? arr[i] < arr[mejor] : arr[i] > arr[mejor];
    if (gana) mejor = i;
  }
  return mejor;
}

function construirCriterio(
  clave: CriterioClave,
  nombre: string,
  formula: string,
  descripcion: string,
  nombres: string[],
  valoresCrudos: number[],
  ganadorIdx: number,
  matrizArrepentimiento?: number[][]
): CriterioResult {
  const valores: CriterioValor[] = valoresCrudos.map((v, i) => ({
    indice: i,
    alternativa: nombres[i],
    valor: redondear(v),
  }));
  return {
    clave,
    nombre,
    formula,
    descripcion,
    valores,
    ganador: valores[ganadorIdx],
    ...(matrizArrepentimiento ? { matrizArrepentimiento } : {}),
  };
}

export function calcularTeoriaDecisiones(input: TeoriaDecisionesInput): TeoriaDecisionesResult {
  const validated = TeoriaDecisionesInputSchema.parse(input);

  const esCostos = validated.tipoAnalisis === 'minimizar';
  const alternativas = validated.alternativas.map((a) => a.nombre.trim());
  const pagos = validated.alternativas.map((a) => a.pagos);
  const nCols = validated.estados.length;

  // ═══════════════════════════════════════════════════════════════════════════
  // Máximos/mínimos por fila y por columna (cálculos base compartidos).
  // En modo costos, "el mejor" de una fila es su mínimo y "el peor" su máximo.
  // ═══════════════════════════════════════════════════════════════════════════
  const maximoPorFila = pagos.map((fila) => Math.max(...fila));
  const minimoPorFila = pagos.map((fila) => Math.min(...fila));
  const maximoPorColumna = Array.from({ length: nCols }, (_, j) =>
    Math.max(...pagos.map((fila) => fila[j]))
  );
  const minimoPorColumna = Array.from({ length: nCols }, (_, j) =>
    Math.min(...pagos.map((fila) => fila[j]))
  );

  const probs = validated.estados.map((e) => e.probabilidad ?? null);
  const vmeDisponible = probs.every((p): p is number => p !== null);

  // ═══════════════════════════════════════════════════════════════════════════
  // Matriz de arrepentimiento (Savage):
  //   maximizar: r_ij = max_k a_kj − a_ij  (cuánto pierdes frente al mejor beneficio)
  //   minimizar: r_ij = a_ij − min_k a_kj  (cuánto te pasas del costo óptimo del estado)
  // ═══════════════════════════════════════════════════════════════════════════
  const matrizArrepentimiento = esCostos
    ? pagos.map((fila) => fila.map((costo, j) => redondear(costo - minimoPorColumna[j])))
    : pagos.map((fila) => fila.map((pago, j) => redondear(maximoPorColumna[j] - pago)));

  const criterios: CriterioResult[] = [];

  // 1) Maximax / Minimin (optimista)
  const nomO = esCostos ? 'Minimin' : 'Maximax';
  const valO = esCostos ? minimoPorFila : maximoPorFila;
  const iO = indiceExtremo(valO, esCostos);
  criterios.push(
    construirCriterio(
      'maximax',
      nomO,
      esCostos ? '\\text{Min}_i \\left( \\min_j a_{ij} \\right)' : '\\text{Max}_i \\left( \\max_j a_{ij} \\right)',
      esCostos
        ? 'Criterio optimista en costos: si todo sale bien, cada alternativa incurre en su menor costo; se elige la de costo mínimo entre esos mínimos (el mejor de los mejores escenarios).'
        : 'Criterio optimista: elige la alternativa con el mayor de los máximos de cada fila (el mejor de los mejores escenarios).',
      alternativas,
      valO,
      iO
    )
  );

  // 2) Maximin / Minimax (Wald, pesimista)
  const nomW = esCostos ? 'Minimax (Wald)' : 'Maximin (Wald)';
  const valW = esCostos ? maximoPorFila : minimoPorFila;
  const iW = indiceExtremo(valW, esCostos);
  criterios.push(
    construirCriterio(
      'maximin',
      nomW,
      esCostos ? '\\text{Min}_i \\left( \\max_j a_{ij} \\right)' : '\\text{Max}_i \\left( \\min_j a_{ij} \\right)',
      esCostos
        ? 'Criterio pesimista en costos: el peor escenario de una alternativa es su máximo costo; se elige la alternativa que minimiza ese costo máximo (garantiza el peor resultado posible).'
        : 'Criterio pesimista: elige la alternativa con el mayor de los mínimos de cada fila (garantiza el peor resultado posible).',
      alternativas,
      valW,
      iW
    )
  );

  // 3) Laplace (equiprobable)
  const laplace = pagos.map((fila) => fila.reduce((acc, p) => acc + p, 0) / nCols);
  const iLaplace = indiceExtremo(laplace, esCostos);
  criterios.push(
    construirCriterio(
      'laplace',
      'Laplace',
      esCostos
        ? '\\text{Min}_i \\left( \\frac{1}{n} \\sum_{j} a_{ij} \\right)'
        : '\\text{Max}_i \\left( \\frac{1}{n} \\sum_{j} a_{ij} \\right)',
      esCostos
        ? 'Los estados son igualmente probables: elige la alternativa con el menor costo promedio de cada fila.'
        : 'Los estados son igualmente probables: elige la alternativa con el promedio simple más alto de cada fila.',
      alternativas,
      laplace,
      iLaplace
    )
  );

  // 4) Hurwicz (coeficiente de optimismo α)
  const hurwicz = esCostos
    ? pagos.map((_, i) => validated.alpha * minimoPorFila[i] + (1 - validated.alpha) * maximoPorFila[i])
    : pagos.map((_, i) => validated.alpha * maximoPorFila[i] + (1 - validated.alpha) * minimoPorFila[i]);
  const iHurwicz = indiceExtremo(hurwicz, esCostos);
  criterios.push(
    construirCriterio(
      'hurwicz',
      'Hurwicz',
      esCostos
        ? `\\alpha \\cdot \\min_j a_{ij} + (1-\\alpha) \\cdot \\max_j a_{ij} \\quad (\\alpha = ${validated.alpha})`
        : `\\alpha \\cdot \\max_j a_{ij} + (1-\\alpha) \\cdot \\min_j a_{ij} \\quad (\\alpha = ${validated.alpha})`,
      esCostos
        ? 'Criterio de compromiso en costos: para cada fila el mejor valor es el mínimo y el peor el máximo. Se pondera con α (optimismo) y 1−α (pesimismo), y se elige la alternativa de menor resultado.'
        : 'Criterio de compromiso ponderado entre el optimismo (α) y el pesimismo (1−α). Elige la alternativa con el mayor valor de Hurwicz.',
      alternativas,
      hurwicz,
      iHurwicz
    )
  );

  // 5) Savage (Minimax Regret)
  const savagValores = matrizArrepentimiento.map((fila) => Math.max(...fila));
  const iSavag = indiceExtremo(savagValores, true); // siempre se minimiza el arrepentimiento máximo
  criterios.push(
    construirCriterio(
      'savage',
      'Savage (Minimax Regret)',
      esCostos
        ? '\\text{Min}_i \\left( \\max_j r_{ij} \\right) \\qquad r_{ij} = a_{ij} - \\min_k a_{kj}'
        : '\\text{Min}_i \\left( \\max_j r_{ij} \\right) \\qquad r_{ij} = \\max_k a_{kj} - a_{ij}',
      esCostos
        ? 'Minimiza el mayor arrepentimiento: r_ij mide cuánto te pasas del costo óptimo (mínimo) de cada estado. Se elige la alternativa con el menor de esos arrepentimientos máximos.'
        : 'Minimiza el mayor arrepentimiento posible, donde el arrepentimiento r_ij es cuánto perdiste por no haber elegido la mejor alternativa para cada estado.',
      alternativas,
      savagValores,
      iSavag,
      matrizArrepentimiento
    )
  );

  // 6) VME / Costo Esperado (solo si hay probabilidades definidas para todos los estados)
  if (vmeDisponible) {
    const vme = pagos.map((fila) =>
      fila.reduce((acc, pago, j) => acc + pago * (probs[j] as number), 0)
    );
    const iVme = indiceExtremo(vme, esCostos);
    criterios.push(
      construirCriterio(
        'vme',
        esCostos ? 'VME (Costo Esperado)' : 'VME (Valor Monetario Esperado)',
        esCostos
          ? '\\text{Min}_i \\left( \\sum_{j} p_j \\, a_{ij} \\right)'
          : '\\text{Max}_i \\left( \\sum_{j} p_j \\, a_{ij} \\right)',
        esCostos
          ? 'Promedia ponderadamente los costos de cada alternativa con las probabilidades de los estados y elige la de menor costo esperado.'
          : 'Promedia ponderadamente los pagos de cada alternativa con las probabilidades de los estados de la naturaleza.',
        alternativas,
        vme,
        iVme
      )
    );
  }

  return {
    criterios,
    vmeDisponible,
    tipoAnalisis: validated.tipoAnalisis,
    maximoPorFila,
    minimoPorFila,
    maximoPorColumna,
    minimoPorColumna,
    matrizArrepentimiento,
  };
}