import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Costo de mantener condicional (H fijo vs. H = I × C)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Los modelos base (EOQ, EPQ y EOQ con Faltantes) permiten expresar el costo de
// mantener (H) de dos formas:
//   - Modo "fijo": H es un costo constante ingresado en USD/unidad-año.
//   - Modo "porcentaje": H = (I / 100) × C, donde I es el porcentaje anual de
//     manejo de inventario aplicado sobre el costo unitario del producto C.
//
// En modo porcentaje, C pasa a ser estrictamente obligatorio (y > 0), porque
// sin el precio del producto no hay forma de calcular H.
// ═══════════════════════════════════════════════════════════════════════════════

export interface CostoMantenerCondicional {
  tipoCostoMantener?: 'fijo' | 'porcentaje';
  costoMantener?: number;          // H (modo fijo)
  costoMantenerPorcentaje?: number; // I (modo porcentaje)
  costoUnitario?: number;          // C
}

/**
 * Validación condicional para los schemas de los modelos base.
 * Delegada como `.superRefine(...)` de cada schema Zod.
 */
export function validarModoCostoMantener(
  data: CostoMantenerCondicional,
  ctx: z.RefinementCtx
) {
  const porcentaje = data.tipoCostoMantener === 'porcentaje';

  if (porcentaje) {
    if (data.costoMantenerPorcentaje === undefined || data.costoMantenerPorcentaje <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['costoMantenerPorcentaje'],
        message: 'El porcentaje (I) del costo de mantener debe ser un número positivo',
      });
    }
    if (data.costoUnitario === undefined || data.costoUnitario <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['costoUnitario'],
        message: 'El costo unitario (C) es obligatorio para calcular el costo de mantener porcentual',
      });
    }
    return;
  }

  // Modo fijo (por defecto): H es obligatorio y positivo; C sigue siendo opcional.
  if (data.costoMantener === undefined || data.costoMantener <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['costoMantener'],
      message: 'El costo de mantener debe ser un número positivo',
    });
  }
  if (data.costoUnitario !== undefined && data.costoUnitario < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['costoUnitario'],
      message: 'El costo unitario no puede ser negativo',
    });
  }
}

/**
 * Deriva el costo de mantener efectivo H a partir del modo seleccionado:
 * fijo → H tal cual; porcentaje → (I / 100) × C.
 * La validación previa garantiza que los campos necesarios existan.
 */
export function resolverCostoMantener(data: CostoMantenerCondicional): number {
  if (data.tipoCostoMantener === 'porcentaje') {
    return ((data.costoMantenerPorcentaje ?? 0) / 100) * (data.costoUnitario ?? 0);
  }
  return data.costoMantener ?? 0;
}