import { z } from 'zod';
import { Frac } from '../simplex/fraction';
import { resolverAsignacion, type PasoAsignacion, type ResultadoAsignacion } from './assignmentEngine';

const MAX_DIMENSION = 10;

const numeroExacto = z.string().trim().max(80).transform((texto, ctx) => {
  const fraccion = /^([+-]?\d+)\/([+-]?\d+)$/.exec(texto);
  if (fraccion && BigInt(fraccion[2]) !== 0n) return new Frac(fraccion[1], fraccion[2]);

  const decimal = /^([+-]?)(\d*)(?:[.,](\d+))?$/.exec(texto);
  if (decimal && (decimal[2] || decimal[3])) {
    const parteDecimal = decimal[3] ?? '';
    return new Frac(`${decimal[1]}${decimal[2] || '0'}${parteDecimal}`, 10n ** BigInt(parteDecimal.length));
  }

  ctx.addIssue({ code: 'custom', message: 'Escribe un entero, decimal o fracción con denominador distinto de cero.' });
  return z.NEVER;
});

export const AsignacionInputSchema = z.object({
  costos: z.array(z.array(numeroExacto).min(1).max(MAX_DIMENSION)).min(1).max(MAX_DIMENSION),
  objetivo: z.enum(['min', 'max']).default('min'),
  prohibidas: z.array(z.object({
    origen: z.number().int().min(1).max(MAX_DIMENSION),
    destino: z.number().int().min(1).max(MAX_DIMENSION),
  })).max(MAX_DIMENSION ** 2).default([]),
}).superRefine(({ costos, prohibidas }, ctx) => {
  const n = costos[0]?.length ?? 0;
  costos.forEach((fila, i) => {
    if (fila.length !== n) {
      ctx.addIssue({ code: 'custom', path: ['costos', i], message: `La fila ${i + 1} debe tener ${n} valores.` });
    }
  });
  prohibidas.forEach(({ origen, destino }, i) => {
    if (origen > costos.length || destino > n) {
      ctx.addIssue({ code: 'custom', path: ['prohibidas', i], message: 'La celda prohibida está fuera de la matriz.' });
    }
  });
});

export type AsignacionInput = z.input<typeof AsignacionInputSchema>;

export interface FraccionAsignacionDTO {
  num: string;
  den: string;
  tex: string;
}

export type AsignacionResultado = ResultadoAsignacion<FraccionAsignacionDTO>;

function fraccionDTO(valor: Frac): FraccionAsignacionDTO {
  return { num: valor.num.toString(), den: valor.den.toString(), tex: valor.toTex() };
}

function pasoDTO({ matriz, ...paso }: PasoAsignacion<Frac>): PasoAsignacion<FraccionAsignacionDTO> {
  const base = { matriz: matriz.map(fila => fila.map(valor => valor === null ? null : fraccionDTO(valor))) };
  switch (paso.tipo) {
    case 'conversion':
      return { ...base, ...paso, maximo: paso.maximo === null ? null : fraccionDTO(paso.maximo) };
    case 'filas':
    case 'columnas':
      return { ...base, ...paso, minimos: paso.minimos.map(fraccionDTO) };
    case 'ajuste':
      return { ...base, ...paso, minimo: fraccionDTO(paso.minimo) };
    default:
      return { ...base, ...paso };
  }
}

export function calcularAsignacion(input: AsignacionInput): AsignacionResultado {
  const { costos, objetivo, prohibidas } = AsignacionInputSchema.parse(input);
  const matriz: (Frac | null)[][] = costos;
  prohibidas.forEach(({ origen, destino }) => { matriz[origen - 1][destino - 1] = null; });
  const resultado = resolverAsignacion(matriz, objetivo);
  return {
    ...resultado,
    valorObjetivo: resultado.valorObjetivo === null ? null : fraccionDTO(resultado.valorObjetivo),
    asignaciones: resultado.asignaciones.map(({ valor, ...celda }) => ({ ...celda, valor: fraccionDTO(valor) })),
    pasos: resultado.pasos.map(pasoDTO),
  };
}
