import { z } from 'zod';
import { Frac } from './simplex/fraction';
import { ErrorValidacion } from '../errorValidacion';

export const FuncionObjetivoPLSchema = z.object({
  tipo: z.enum(['MAX', 'MIN'], { message: "El tipo de optimización debe ser 'MAX' o 'MIN'." }),
  c1: z.number().finite(),
  c2: z.number().finite(),
});

export const RestriccionPLSchema = z.object({
  id: z.string().trim().min(1, { message: 'El id de cada restricción no puede estar vacío.' }),
  x1: z.number().finite(),
  x2: z.number().finite(),
  operador: z.enum(['<=', '>=', '=']),
  rhs: z.number().finite(),
});

export const MetodoGraficoInputSchema = z.object({
  funcionObjetivo: FuncionObjetivoPLSchema,
  restricciones: z.array(RestriccionPLSchema).min(1, { message: 'Se requiere al menos una restricción.' }),
});
export type MetodoGraficoInput = z.input<typeof MetodoGraficoInputSchema>;
export type TipoOptimizacionPL = 'MAX' | 'MIN';
export type FuncionObjetivoPL = z.infer<typeof FuncionObjetivoPLSchema>;
export type RestriccionPL = z.infer<typeof RestriccionPLSchema>;
export type LineaEfectivaPLResult = RestriccionPL;

export interface VerticePL {
  x1: number;
  x2: number;
  z: number;
  esVerticeOptimo: boolean;
  lineas: [string, string];
}

export interface InterseccionDescartadaPL {
  restriccionA: string;
  restriccionB: string;
  lineas: [string, string];
  violada: string | null;
  punto?: { x1: number; x2: number };
  motivo: string;
}

export interface MetodoGraficoResult {
  estado: 'optimo';
  funcionObjetivo: FuncionObjetivoPL;
  valorZ: number;
  verticeOptimo: VerticePL | VerticePL[];
  multiplesOptimos: boolean;
  rayoOptimo: boolean;
  verticesFactibles: VerticePL[];
  interseccionesDescartadas: InterseccionDescartadaPL[];
  lineasEfectivas: LineaEfectivaPLResult[];
}

type Vector = [Frac, Frac];
interface Recta {
  id: string;
  normal: Vector;
  rhs: Frac;
  operador: RestriccionPL['operador'];
}
interface Punto {
  coordenadas: Vector;
  lineas: [string, string];
}

const producto = ([a, b]: Vector, [x, y]: Vector) => a.mul(x).add(b.mul(y));
const resta = ([x, y]: Vector, [a, b]: Vector): Vector => [x.sub(a), y.sub(b)];
const cruz = ([x, y]: Vector, [a, b]: Vector) => x.mul(b).sub(y.mul(a));

function interseccion(l: Recta, r: Recta): Vector | null {
  const det = cruz(l.normal, r.normal);
  if (det.esCero) return null;
  return [
    cruz([l.rhs, l.normal[1]], [r.rhs, r.normal[1]]).div(det),
    cruz([l.normal[0], l.rhs], [r.normal[0], r.rhs]).div(det),
  ];
}

function cumple(l: Recta, v: Vector, rhs: Frac): boolean {
  const cmp = producto(l.normal, v).cmp(rhs);
  return l.operador === '<=' ? cmp <= 0 : l.operador === '>=' ? cmp >= 0 : cmp === 0;
}

/** El cono está en el primer cuadrante: basta probar ejes y rayos de borde. */
function direccionesRecesion(rectas: Recta[]): Vector[] {
  return rectas.flatMap(({ normal: [a, b] }): Vector[] => [[b, a.neg()], [b.neg(), a]])
    .filter(d => d.some(v => !v.esCero) && rectas.every(l => cumple(l, d, Frac.CERO)));
}

function ordenarPoligono(puntos: Punto[]): Punto[] {
  const ordenados = [...puntos].sort((p, q) =>
    p.coordenadas[0].cmp(q.coordenadas[0]) || p.coordenadas[1].cmp(q.coordenadas[1]));
  if (ordenados.length <= 2) return ordenados;
  const mitad = (orden: Punto[]) => {
    const pila: Punto[] = [];
    for (const p of orden) {
      while (pila.length >= 2) {
        const a = pila[pila.length - 2].coordenadas;
        const b = pila[pila.length - 1].coordenadas;
        if (cruz(resta(b, a), resta(p.coordenadas, a)).esPositivo) break;
        pila.pop();
      }
      pila.push(p);
    }
    return pila.slice(0, -1);
  };
  return [...mitad(ordenados), ...mitad([...ordenados].reverse())];
}

/** El contrato de dibujo usa number; las pruebas matemáticas anteriores no. */
function coordenada(v: Frac): number {
  const n = v.toNumber();
  if (!Number.isFinite(n)) throw new ErrorValidacion('El valor exacto excede el rango numérico del gráfico.');
  return n;
}

const puntoDTO = ([x, y]: Vector) => ({ x1: coordenada(x), x2: coordenada(y) });

export function calcularMetodoGrafico(input: MetodoGraficoInput): MetodoGraficoResult {
  const { funcionObjetivo, restricciones } = MetodoGraficoInputSchema.parse(input);
  const reales: RestriccionPL[] = [
    ...restricciones,
    { id: 'x1 >= 0', x1: 1, x2: 0, operador: '>=', rhs: 0 },
    { id: 'x2 >= 0', x1: 0, x2: 1, operador: '>=', rhs: 0 },
  ];
  const rectas: Recta[] = reales.map(({ id, x1, x2, operador, rhs }) => ({
    id, normal: [Frac.deDecimal(x1), Frac.deDecimal(x2)], operador, rhs: Frac.deDecimal(rhs),
  }));
  const puntos = new Map<string, Punto>();
  const descartadas: { base: InterseccionDescartadaPL; punto?: Vector }[] = [];
  for (let i = 0; i < rectas.length; i++) {
    for (let j = i + 1; j < rectas.length; j++) {
      const l = rectas[i], r = rectas[j];
      const lineas: [string, string] = [l.id, r.id];
      const par = { restriccionA: l.id, restriccionB: r.id, lineas };
      const p = interseccion(l, r);
      if (!p) {
        descartadas.push({ base: { ...par, violada: null, motivo: 'Las restricciones son paralelas o coincidentes: no definen una intersección única.' } });
        continue;
      }
      const violada = rectas.find(a => !cumple(a, p, a.rhs));
      if (violada) {
        descartadas.push({ base: { ...par, violada: violada.id, motivo: `El punto violó la restricción "${violada.id}".` }, punto: p });
      } else {
        const clave = p.map(v => v.toString()).join(',');
        if (!puntos.has(clave)) puntos.set(clave, { coordenadas: p, lineas });
      }
    }
  }

  // La no negatividad hace que el poliedro sea apuntado: si no es vacío, tiene un vértice.
  if (puntos.size === 0) throw new ErrorValidacion('El problema es infactible (no tiene área de solución)');
  const c: Vector = [Frac.deDecimal(funcionObjetivo.c1), Frac.deDecimal(funcionObjetivo.c2)];
  const signoOpt = funcionObjetivo.tipo === 'MAX' ? 1 : -1;
  const rayos = direccionesRecesion(rectas);
  if (rayos.some(d => producto(c, d).signo === signoOpt)) throw new ErrorValidacion('La solución es no acotada');

  const vertices = ordenarPoligono([...puntos.values()]).map(p => ({ ...p, z: producto(c, p.coordenadas) }));
  const mejor = vertices.reduce((z, v) => v.z.cmp(z) === signoOpt ? v.z : z, vertices[0].z);
  const verticesFactibles = vertices.map(v => ({
    ...puntoDTO(v.coordenadas), lineas: v.lineas, z: coordenada(v.z), esVerticeOptimo: v.z.equals(mejor),
  }));
  const optimos = verticesFactibles.filter(v => v.esVerticeOptimo);
  const rayoOptimo = rayos.some(d => producto(c, d).esCero);
  const multiplesOptimos = optimos.length > 1 || rayoOptimo;

  // Mantener los límites de dibujo del DTO anterior. No intervienen en la
  // enumeración, la factibilidad, el objetivo ni la detección de rayos.
  const interceptos = restricciones.flatMap(r => [r.x1, r.x2].filter(a => a > 0).map(a => r.rhs / a));
  const escala = interceptos.reduce((max, x) => Number.isFinite(x) ? Math.max(max, x) : max, 0);
  const limiteDibujo = Math.max(1e6, Math.min(Number.MAX_VALUE / 100, escala) * 100);
  const lineasEfectivas: RestriccionPL[] = [
    ...reales,
    { id: `x1 <= ${limiteDibujo}`, x1: 1, x2: 0, operador: '<=', rhs: limiteDibujo },
    { id: `x2 <= ${limiteDibujo}`, x1: 0, x2: 1, operador: '<=', rhs: limiteDibujo },
  ];

  return {
    estado: 'optimo', funcionObjetivo, valorZ: coordenada(mejor),
    verticeOptimo: multiplesOptimos ? optimos : optimos[0], multiplesOptimos, rayoOptimo, verticesFactibles,
    interseccionesDescartadas: descartadas.map(({ base, punto }) => punto ? { ...base, punto: puntoDTO(punto) } : base),
    lineasEfectivas,
  };
}
