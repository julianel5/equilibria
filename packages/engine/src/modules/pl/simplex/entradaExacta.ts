import { z } from 'zod';
import { Frac } from './fraction';

/** Compatibilidad con clientes numéricos; el texto no pasa por IEEE 754. */
const mensajeNumero = 'Escribe un entero, decimal o fracción con denominador distinto de cero.';

export const entradaExacta = z.union([
  z.number().finite(),
  z.string().trim().min(1, { message: mensajeNumero }).max(120),
]).transform((valor, ctx) => {
  if (typeof valor === 'number') return Frac.deDecimal(valor);
  const fraccion = /^([+-]?\d+)\/([+-]?\d+)$/.exec(valor);
  if (fraccion && BigInt(fraccion[2]) !== 0n) return new Frac(fraccion[1], fraccion[2]);
  const decimal = /^([+-]?)(\d*)(?:[.,](\d*))?(?:[eE]([+-]?\d{1,3}))?$/.exec(valor);
  if (decimal && (decimal[2] || decimal[3])) {
    const decimales = decimal[3] ?? '';
    const num = BigInt(`${decimal[1]}${decimal[2] || '0'}${decimales}`);
    const escala = BigInt(decimales.length) - BigInt(decimal[4] ?? '0');
    return escala < 0n ? new Frac(num * 10n ** -escala) : new Frac(num, 10n ** escala);
  }
  ctx.addIssue({ code: 'custom', message: mensajeNumero });
  return z.NEVER;
});

/** Los índices se convierten a number solo después de validar que son enteros seguros. */
export const indicePositivo = entradaExacta.transform((valor, ctx) => {
  if (valor.den === 1n && valor.num >= 1n && valor.num <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(valor.num);
  }
  ctx.addIssue({ code: 'custom', message: 'El índice debe ser un entero positivo.' });
  return z.NEVER;
});
