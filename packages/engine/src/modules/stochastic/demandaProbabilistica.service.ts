import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Demanda Probabilística - Punto de Reorden con Stock de Seguridad
// ═══════════════════════════════════════════════════════════════════════════════
//
// Modelo de inventario con demanda variable (normal) y lead time constante.
// La demanda diaria sigue una distribución normal con media d̄ y desviación
// estándar σ_d. Como el lead time L es fijo y conocido, la demanda acumulada
// durante el lead time también es normal:
//
//   D_L  = d̄ × L            (demanda esperada durante el lead time)
//   σ_L  = σ_d × √L         (desviación estándar durante el lead time)
//
// Dado un nivel de servicio CSL (probabilidad de no agotarse durante el lead
// time), el stock de seguridad y el punto de reorden son:
//
//   Z    = Φ⁻¹(CSL)         (cuantil de la normal estándar)
//   SS   = Z × σ_L          (stock de seguridad)
//   ROP  = D_L + SS         (punto de reorden)
//
// ═══════════════════════════════════════════════════════════════════════════════

// --- Inversa de la distribución normal estándar (Φ⁻¹) ---
//
// Aproximación numérica de alta precisión (error relativo < 1.15e-9) basada en
// el esquema de Beasley–Springer–Moro y refinada con los coeficientes de Peter
// Acklam. Es una función matemática continua (una aproximación racional) y NO un
// arreglo de valores precalculados, por lo que admite cualquier CSL en (0, 1).

const LOW = 0.02425;
const HIGH = 1 - LOW;

const A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
const B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
const C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

export function inversaNormalEstandar(p: number): number {
  if (p < LOW) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
  }

  if (p <= HIGH) {
    const q = p - 0.5;
    const r = q * q;
    return (((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q /
      (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
    ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
}

// --- Schema de validación (Zod) ---

export const DemandaProbabilisticaInputSchema = z.object({
  demandaPromedioDiaria: z.number()
    .positive({ message: 'La demanda promedio diaria debe ser un número positivo' })
    .describe('Demanda promedio diaria (d̄) en unidades por día'),
  desviacionEstandarDemandaDiaria: z.number()
    .positive({ message: 'La desviación estándar de la demanda diaria debe ser un número positivo' })
    .describe('Desviación estándar de la demanda diaria (σ_d)'),
  tiempoEntrega: z.number()
    .positive({ message: 'El tiempo de entrega (L) debe ser mayor que cero' })
    .describe('Tiempo de entrega en días (L)'),
  nivelServicio: z.number()
    .refine(
      (v) => v > 50 && v < 99.99,
      { message: 'El nivel de servicio (CSL) debe ser estrictamente mayor a 50% y menor a 99.99%' }
    )
    .describe('Nivel de servicio CSL en porcentaje (estrictamente entre 50 y 99.99)'),
});

export type DemandaProbabilisticaInput = z.infer<typeof DemandaProbabilisticaInputSchema>;

// --- Resultado ---

export interface DemandaProbabilisticaResult {
  valorZ: number;                // Z = Φ⁻¹(CSL) - cuantil de la normal estándar (4 decimales)
  demandaDuranteEntrega: number; // D_L = d̄ × L - demanda esperada durante el lead time
  sigmaDuranteEntrega: number;   // σ_L = σ_d × √L - desviación estándar durante el lead time
  stockSeguridad: number;        // SS = Z × σ_L - stock de seguridad
  puntoReorden: number;          // ROP = D_L + SS - punto de reorden
  desglose: {
    demandaPromedioDiaria: number;
    desviacionEstandarDemandaDiaria: number;
    tiempoEntrega: number;
    nivelServicio: number;
    valorZExacto: number;        // Z sin redondear (para la gráfica y desglose fino)
  };
}

// --- Servicio ---

export function calcularDemandaProbabilistica(
  input: DemandaProbabilisticaInput
): DemandaProbabilisticaResult {
  const validated = DemandaProbabilisticaInputSchema.parse(input);

  const dBar = validated.demandaPromedioDiaria;
  const sigmaD = validated.desviacionEstandarDemandaDiaria;
  const L = validated.tiempoEntrega;
  const csl = validated.nivelServicio;

  // ═══════════════════════════════════════════════════════════════════════════
  // Z = Φ⁻¹(CSL/100)   Cuantil de la normal estándar para el CSL dado.
  // ═══════════════════════════════════════════════════════════════════════════
  const Z = inversaNormalEstandar(csl / 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // σ_L = σ_d × √L     Variabilidad de la demanda acumulada en L días.
  // ═══════════════════════════════════════════════════════════════════════════
  const sigmaL = sigmaD * Math.sqrt(L);

  // ═══════════════════════════════════════════════════════════════════════════
  // D_L = d̄ × L        Demanda esperada durante el lead time.
  // SS  = Z × σ_L      Stock de seguridad.
  // ROP = D_L + SS     Punto de reorden.
  // ═══════════════════════════════════════════════════════════════════════════
  const demandaL = dBar * L;
  const stockSeguridad = Z * sigmaL;
  const puntoReorden = demandaL + stockSeguridad;

  return {
    valorZ: Math.round(Z * 10000) / 10000,
    demandaDuranteEntrega: Math.round(demandaL * 100) / 100,
    sigmaDuranteEntrega: Math.round(sigmaL * 100) / 100,
    stockSeguridad: Math.round(stockSeguridad * 100) / 100,
    puntoReorden: Math.round(puntoReorden * 100) / 100,
    desglose: {
      demandaPromedioDiaria: dBar,
      desviacionEstandarDemandaDiaria: sigmaD,
      tiempoEntrega: L,
      nivelServicio: csl,
      valorZExacto: Z,
    },
  };
}