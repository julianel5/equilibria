/**
 * Detección de óptimos múltiples (soluciones óptimas alternativas).
 *
 * En el tableau óptimo, si una variable NO básica tiene costo reducido 0,
 * hacerla entrar a la base no cambia Z*. Si el pivote avanza una distancia
 * θ > 0, se llega a otro vértice óptimo distinto, y todo el segmento entre
 * ambos también es óptimo. Si su columna no tiene coeficientes positivos, se
 * puede avanzar sin límite: hay un rayo (infinitas soluciones óptimas no
 * acotadas) con el mismo Z*.
 *
 * Si todos los candidatos dan θ = 0 (óptimo degenerado) solo cambia la base,
 * no la solución, y no se reporta.
 */
import { Frac } from './fraction';
import type { ObjetivoSimplex } from './simplex';
import { prepararBaseOptima, type TipoRestriccion } from './sensibilidad';

export interface ResultadoOptimosMultiples {
  /** Hay más de una solución óptima. */
  hay: boolean;
  /** Variables no básicas con costo reducido 0 que llevan a otra solución óptima. */
  variables: string[];
  /** Variables de decisión de otro vértice óptimo (null si solo hay un rayo). */
  alternativa: Frac[] | null;
  /** Dirección en la que Z* no cambia y no hay límite (conjunto óptimo no acotado). */
  rayo: Frac[] | null;
}

export function analizarOptimosMultiples(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex,
  tipos: TipoRestriccion[],
  basicaFinal: string[]
): ResultadoOptimosMultiples {
  const { n, m, variables, alfa, reducido, xB, valor, noBasicas, indicesBase } = prepararBaseOptima(
    c,
    A,
    b,
    objetivo,
    tipos,
    basicaFinal
  );

  const resultado: ResultadoOptimosMultiples = { hay: false, variables: [], alternativa: null, rayo: null };
  const actual = valor.slice(0, n);

  for (const k of noBasicas) {
    if (!reducido[k].esCero) continue;

    // Prueba de la razón para la columna k.
    let theta: Frac | null = null;
    for (let r = 0; r < m; r++) {
      const a = alfa[r][k];
      if (!a.esPositivo) continue;
      const razon = xB[r].div(a);
      if (theta === null || razon.cmp(theta) < 0) theta = razon;
    }

    // Dirección del movimiento en las variables de decisión: x_k sube 1 y las
    // básicas cambian −α_rk.
    const direccion = new Array<Frac>(n).fill(Frac.CERO);
    if (k < n) direccion[k] = Frac.UNO;
    indicesBase.forEach((j, r) => {
      if (j < n) direccion[j] = alfa[r][k].neg();
    });
    const mueveDecisiones = direccion.some((d) => !d.esCero);
    if (!mueveDecisiones) continue;

    if (theta === null) {
      resultado.hay = true;
      resultado.variables.push(variables[k]);
      if (!resultado.rayo) resultado.rayo = direccion;
      continue;
    }
    if (theta.esCero) continue; // degenerado: misma solución, otra base

    resultado.hay = true;
    resultado.variables.push(variables[k]);
    if (!resultado.alternativa) resultado.alternativa = actual.map((x, j) => x.add(theta!.mul(direccion[j])));
  }

  return resultado;
}
