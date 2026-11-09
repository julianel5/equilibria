/**
 * Análisis de sensibilidad (post-óptimo) del Simplex, con fracciones exactas.
 *
 * A partir de la base óptima B se calcula:
 *  - Precio sombra de cada restricción: yᵀ = c_B B⁻¹. y_i es el cambio en Z*
 *    por cada unidad adicional de b_i (mientras la base siga siendo óptima).
 *  - Holgura / excedente de cada restricción y si está activa.
 *  - Rango de b_i en el que la base actual sigue siendo factible
 *    (x_B = B⁻¹b ≥ 0), y por lo tanto el precio sombra sigue valiendo.
 *  - Costo reducido y rango de c_j en el que la solución actual sigue siendo
 *    óptima.
 *
 * Las variables artificiales de Gran M no forman parte del análisis: tienen
 * costo 0 aquí (ya cumplieron su papel de base inicial) y no pueden reentrar.
 */
import { Frac } from './fraction';
import { inversa, nombresVariables, type ObjetivoSimplex } from './simplex';

export type TipoRestriccion = 'LE' | 'GE' | 'EQ';

/** Intervalo cerrado; null en un extremo significa ±∞. */
export interface Rango {
  min: Frac | null;
  max: Frac | null;
}

export interface RestriccionSensibilidad {
  indice: number;
  tipo: TipoRestriccion;
  b: Frac;
  /** Lado izquierdo evaluado en la solución óptima. */
  lhs: Frac;
  /** Holgura (≤) o excedente (≥) en la solución óptima; 0 en las igualdades. */
  holgura: Frac;
  /** La restricción se cumple con igualdad en el óptimo. */
  activa: boolean;
  /** Cambio en Z* por unidad adicional de b_i. */
  precioSombra: Frac;
  /** Valores de b_i para los que la base actual sigue siendo factible. */
  rangoB: Rango;
}

export interface VariableSensibilidad {
  indice: number;
  variable: string;
  c: Frac;
  valor: Frac;
  basica: boolean;
  /** c̄_j = c_j − yᵀa_j (0 para las básicas). */
  costoReducido: Frac;
  /** Valores de c_j para los que la solución actual sigue siendo óptima. */
  rangoC: Rango;
}

export interface ResultadoSensibilidad {
  restricciones: RestriccionSensibilidad[];
  variables: VariableSensibilidad[];
  /** Alguna variable básica vale 0: los precios sombra pueden no ser únicos. */
  degenerada: boolean;
}

const masEstricto = (actual: Frac | null, candidato: Frac, cmpSigno: 1 | -1): Frac =>
  actual === null || candidato.cmp(actual) * cmpSigno > 0 ? candidato : actual;

/**
 * Base óptima lista para el análisis post-óptimo: forma estándar, B⁻¹, x_B,
 * columnas actualizadas α = B⁻¹A y costos reducidos con los costos reales
 * (las artificiales que quedaron en 0 se sacan antes con pivotes degenerados).
 */
export function prepararBaseOptima(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex,
  tipos: TipoRestriccion[],
  basicaFinal: string[]
) {
  const n = c.length;
  const m = A.length;
  const variables = nombresVariables(n, m, tipos);
  const tot = variables.length;
  const esMax = objetivo === 'max';

  // Forma estándar (misma construcción que el motor): holguras +1, excesos −1,
  // artificiales +1. Costos: c_j para las decisiones y 0 para el resto.
  const Acomp: Frac[][] = Array.from({ length: m }, () => new Array<Frac>(tot).fill(Frac.CERO));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) Acomp[i][j] = Frac.deDecimal(A[i][j]);
    const k = i + 1;
    if (tipos[i] === 'LE') Acomp[i][variables.indexOf(`S_{${k}}`)] = Frac.UNO;
    if (tipos[i] === 'GE') Acomp[i][variables.indexOf(`E_{${k}}`)] = Frac.UNO.neg();
    if (tipos[i] !== 'LE') Acomp[i][variables.indexOf(`R_{${k}}`)] = Frac.UNO;
  }
  const esArtificial = (j: number) => variables[j].startsWith('R_');
  const costo = variables.map((_, j) => (j < n ? Frac.deDecimal(c[j]) : Frac.CERO));
  // Costos de Gran M (artificiales ∓M), solo para sacar artificiales de la base.
  const M = Frac.deDecimal(1000000);
  const costoGranM = variables.map((_, j) => (esArtificial(j) ? (esMax ? M.neg() : M) : costo[j]));
  const bFrac = b.map((v) => Frac.deDecimal(v));

  /** B⁻¹, yᵀ = c_B B⁻¹, α = B⁻¹A y costos reducidos c̄_j = c_j − yᵀa_j de una base. */
  const evaluarBase = (base: number[], cs: Frac[]) => {
    const BInv = inversa(Acomp.map((fila) => base.map((j) => fila[j])));
    const cB = base.map((j) => cs[j]);
    const y = Array.from({ length: m }, (_, k) => cB.reduce((acc, cb, i) => acc.add(cb.mul(BInv[i][k])), Frac.CERO));
    const alfa = BInv.map((fila) =>
      Array.from({ length: tot }, (_, j) => fila.reduce((acc, v, k) => acc.add(v.mul(Acomp[k][j])), Frac.CERO))
    );
    const reducido = Array.from({ length: tot }, (_, j) =>
      cs[j].sub(y.reduce((acc, yk, k) => acc.add(yk.mul(Acomp[k][j])), Frac.CERO))
    );
    return { BInv, y, alfa, reducido };
  };

  // Si una artificial quedó en la base con valor 0 (óptimo degenerado), se saca
  // con un pivote degenerado: x* no cambia y la columna que entra se elige con
  // la razón dual mínima para conservar la optimalidad. Si la fila no tiene
  // ningún coeficiente no nulo en columnas reales, la restricción es redundante
  // y la artificial se queda.
  const indicesBase = basicaFinal.map((nombre) => variables.indexOf(nombre));
  const signoOpt = esMax ? Frac.UNO : Frac.UNO.neg(); // óptimo ⇔ signoOpt·c̄_j ≤ 0
  for (let r = 0; r < m; r++) {
    if (!esArtificial(indicesBase[r])) continue;
    const { alfa, reducido } = evaluarBase(indicesBase, costoGranM);
    const candidatas = Array.from({ length: tot }, (_, j) => j).filter(
      (j) => !esArtificial(j) && !indicesBase.includes(j) && !alfa[r][j].esCero
    );
    let entra = -1;
    let mejor: Frac | null = null;
    for (const orientacion of [Frac.UNO, Frac.UNO.neg()]) {
      for (const k of candidatas) {
        const a = alfa[r][k].mul(orientacion);
        if (!a.esNegativo) continue;
        const theta = signoOpt.mul(reducido[k]).div(a);
        if (mejor === null || theta.cmp(mejor) < 0) {
          mejor = theta;
          entra = k;
        }
      }
      if (entra !== -1) break;
    }
    if (entra !== -1) indicesBase[r] = entra;
  }

  const { BInv, y, alfa, reducido } = evaluarBase(indicesBase, costo);
  const xB = BInv.map((fila) => fila.reduce((acc, v, k) => acc.add(v.mul(bFrac[k])), Frac.CERO));

  const valor = new Array<Frac>(tot).fill(Frac.CERO);
  indicesBase.forEach((j, r) => (valor[j] = xB[r]));
  const noBasicas = Array.from({ length: tot }, (_, j) => j).filter((j) => !indicesBase.includes(j) && !esArtificial(j));
  return { n, m, variables, tot, esMax, Acomp, costo, bFrac, esArtificial, indicesBase, BInv, y, alfa, reducido, xB, valor, noBasicas };
}

export function analizarSensibilidad(
  c: number[],
  A: number[][],
  b: number[],
  objetivo: ObjetivoSimplex,
  tipos: TipoRestriccion[],
  basicaFinal: string[]
): ResultadoSensibilidad {
  const { n, m, variables, esMax, costo, bFrac, indicesBase, BInv, y, alfa, reducido, xB, valor, noBasicas } = prepararBaseOptima(
    c,
    A,
    b,
    objetivo,
    tipos,
    basicaFinal
  );

  // ---- Restricciones: holgura, precio sombra y rango de b_i ----
  const restricciones: RestriccionSensibilidad[] = Array.from({ length: m }, (_, i) => {
    const lhs = A[i].reduce((acc, a, j) => acc.add(Frac.deDecimal(a).mul(valor[j])), Frac.CERO);
    const diferencia = bFrac[i].sub(lhs);
    const holgura = tipos[i] === 'GE' ? diferencia.neg() : tipos[i] === 'LE' ? diferencia : Frac.CERO;

    // x_B + Δ·β ≥ 0, con β = columna i de B⁻¹.
    let dMin: Frac | null = null;
    let dMax: Frac | null = null;
    for (let r = 0; r < m; r++) {
      const beta = BInv[r][i];
      if (beta.esCero) continue;
      const limite = xB[r].neg().div(beta);
      if (beta.esPositivo) dMin = masEstricto(dMin, limite, 1);
      else dMax = masEstricto(dMax, limite, -1);
    }
    return {
      indice: i,
      tipo: tipos[i],
      b: bFrac[i],
      lhs,
      holgura,
      activa: holgura.esCero,
      precioSombra: y[i],
      rangoB: {
        min: dMin === null ? null : bFrac[i].add(dMin),
        max: dMax === null ? null : bFrac[i].add(dMax),
      },
    };
  });

  // ---- Variables de decisión: costo reducido y rango de c_j ----
  const variablesSens: VariableSensibilidad[] = Array.from({ length: n }, (_, j) => {
    const fila = indicesBase.indexOf(j);
    const basica = fila !== -1;
    let rangoC: Rango;
    if (!basica) {
      // Sigue fuera de la base mientras su costo reducido no se vuelva atractivo:
      // MAX necesita c̄_j ≤ 0, MIN necesita c̄_j ≥ 0  →  límite c_j = yᵀa_j.
      const zj = costo[j].sub(reducido[j]);
      rangoC = esMax ? { min: null, max: zj } : { min: zj, max: null };
    } else {
      // Al cambiar c_j en Δ, cada c̄_k (k no básica) pasa a c̄_k − Δ·α_rk.
      let dMin: Frac | null = null;
      let dMax: Frac | null = null;
      for (const k of noBasicas) {
        const a = alfa[fila][k];
        if (a.esCero) continue;
        const limite = reducido[k].div(a);
        const esCotaInferior = esMax ? a.esPositivo : a.esNegativo;
        if (esCotaInferior) dMin = masEstricto(dMin, limite, 1);
        else dMax = masEstricto(dMax, limite, -1);
      }
      rangoC = {
        min: dMin === null ? null : costo[j].add(dMin),
        max: dMax === null ? null : costo[j].add(dMax),
      };
    }
    return {
      indice: j,
      variable: variables[j],
      c: costo[j],
      valor: valor[j],
      basica,
      costoReducido: basica ? Frac.CERO : reducido[j],
      rangoC,
    };
  });

  return {
    restricciones,
    variables: variablesSens,
    degenerada: xB.some((v) => v.esCero),
  };
}
