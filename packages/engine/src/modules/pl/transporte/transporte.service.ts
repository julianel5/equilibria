import { z } from 'zod';
import { proceso, type ProcesoCalculo } from '../../procesos';
import { Frac } from '../simplex/fraction';
import {
  etiquetaMetodo,
  resolverTransporte,
  type AjusteTransporte,
  type CeldaCicloTransporte,
  type ComparacionInicialCore,
  type IteracionTransporteCore,
  type MetodoInicialTransporte,
} from './transporte';

export interface FraccionTransporteJSON {
  num: string;
  den: string;
  tex: string;
  dec: string;
}

export interface CeldaCicloDTO {
  i: number;
  j: number;
  signo: 1 | -1;
  cantidad: FraccionTransporteJSON;
}

export interface IteracionTransporteDTO {
  iteracion: number;
  asignacion: FraccionTransporteJSON[][];
  basicas: boolean[][];
  u: FraccionTransporteJSON[];
  v: FraccionTransporteJSON[];
  reducidos: (FraccionTransporteJSON | null)[][];
  entra: { i: number; j: number } | null;
  ciclo: CeldaCicloDTO[];
  theta: FraccionTransporteJSON | null;
  sale: { i: number; j: number } | null;
  costo: FraccionTransporteJSON;
  optimo: boolean;
}

export interface AsignacionTransporteDTO {
  i: number;
  j: number;
  origen: string;
  destino: string;
  cantidad: FraccionTransporteJSON;
  costoUnitario: FraccionTransporteJSON;
  costo: FraccionTransporteJSON;
  ficticia: boolean;
}

export interface ComparacionInicialDTO {
  metodo: MetodoInicialTransporte;
  etiqueta: string;
  factible: boolean;
  costo: FraccionTransporteJSON | null;
}

export interface TransporteResultado {
  estado: 'optimo' | 'infactible';
  mensaje: string;
  objetivo: 'min' | 'max';
  m: number;
  n: number;
  balanceado: boolean;
  ajuste: AjusteTransporte;
  metodoSolicitado: MetodoInicialTransporte;
  metodoUsado: MetodoInicialTransporte;
  costos: FraccionTransporteJSON[][];
  oferta: FraccionTransporteJSON[];
  demanda: FraccionTransporteJSON[];
  prohibidas: boolean[][];
  origenFicticio: boolean[];
  destinoFicticio: boolean[];
  etiquetasOrigen: string[];
  etiquetasDestino: string[];
  asignacion: FraccionTransporteJSON[][];
  asignaciones: AsignacionTransporteDTO[];
  valorObjetivo: FraccionTransporteJSON;
  comparacionInicial: ComparacionInicialDTO[];
  iteraciones: IteracionTransporteDTO[];
  procesos: ProcesoCalculo[];
}

function ff(f: Frac): FraccionTransporteJSON {
  return { num: f.num.toString(), den: f.den.toString(), tex: f.toTex(), dec: f.toDec() };
}

function sumar(xs: Frac[]): Frac {
  return xs.reduce((acc, x) => acc.add(x), Frac.CERO);
}

function tablaTex(
  asignacion: Frac[][],
  oferta: Frac[],
  demanda: Frac[],
  etiquetasOrigen: string[],
  etiquetasDestino: string[]
): string {
  const cols = asignacion[0]?.length ?? 0;
  const filas: string[] = [];
  filas.push(['', ...etiquetasDestino, '\\text{Oferta}'].join(' & '));
  asignacion.forEach((fila, i) => {
    filas.push(
      [etiquetasOrigen[i], ...fila.map((v) => v.toTex()), oferta[i].toTex()].join(' & ')
    );
  });
  filas.push(['\\text{Demanda}', ...demanda.map((d) => d.toTex()), ''].join(' & '));
  return `\\begin{array}{c|${'c'.repeat(cols)}|c} ${filas.join(' \\\\ \\hline ')} \\end{array}`;
}

function terminosCosto(costos: Frac[][], asignacion: Frac[][]): string {
  const terminos: string[] = [];
  for (let i = 0; i < costos.length; i++) {
    for (let j = 0; j < costos[i].length; j++) {
      const cantidad = asignacion[i][j];
      if (cantidad.esCero) continue;
      const costo = costos[i][j];
      terminos.push(`(${costo.toTex()})\\,(${cantidad.toTex()})`);
    }
  }
  return terminos.length > 0 ? terminos.join(' + ') : '0';
}

function ajusteTexto(ajuste: AjusteTransporte): string {
  if (ajuste === 'oferta-ficticia') {
    return 'La demanda supera la oferta: se añadió un origen ficticio con costo 0 para equilibrar el modelo.';
  }
  if (ajuste === 'demanda-ficticia') {
    return 'La oferta supera la demanda: se añadió un destino ficticio con costo 0 para equilibrar el modelo.';
  }
  return 'La oferta total coincide con la demanda total: el modelo está balanceado.';
}

function comparacionDTO(c: ComparacionInicialCore): ComparacionInicialDTO {
  return {
    metodo: c.metodo,
    etiqueta: etiquetaMetodo(c.metodo),
    factible: c.factible,
    costo: c.costo ? ff(c.costo) : null,
  };
}

function cicloDTO(ciclo: CeldaCicloTransporte[]): CeldaCicloDTO[] {
  return ciclo.map((c) => ({
    i: c.i,
    j: c.j,
    signo: c.signo,
    cantidad: ff(c.cantidad),
  }));
}

function iteracionDTO(it: IteracionTransporteCore): IteracionTransporteDTO {
  return {
    iteracion: it.iteracion,
    asignacion: it.asignacion.map((fila) => fila.map(ff)),
    basicas: it.basicas.map((fila) => [...fila]),
    u: it.u.map(ff),
    v: it.v.map(ff),
    reducidos: it.reducidos.map((fila) => fila.map((r) => (r ? ff(r) : null))),
    entra: it.entra ? { ...it.entra } : null,
    ciclo: cicloDTO(it.ciclo),
    theta: it.theta ? ff(it.theta) : null,
    sale: it.sale ? { ...it.sale } : null,
    costo: ff(it.costo),
    optimo: it.optimo,
  };
}

export const TransporteInputSchema = z
  .object({
    costos: z
      .array(
        z.array(
          z.number().finite({
            message: 'Los costos unitarios deben ser números finitos.',
          })
        )
      )
      .min(1, { message: 'La matriz de costos requiere al menos un origen.' }),
    oferta: z
      .array(
        z
          .number()
          .finite({ message: 'La oferta debe ser un número finito.' })
          .min(0, { message: 'La oferta no puede ser negativa.' })
      )
      .min(1, { message: 'Se requiere al menos un origen.' }),
    demanda: z
      .array(
        z
          .number()
          .finite({ message: 'La demanda debe ser un número finito.' })
          .min(0, { message: 'La demanda no puede ser negativa.' })
      )
      .min(1, { message: 'Se requiere al menos un destino.' }),
    metodoInicial: z.enum(['noroeste', 'costo-minimo', 'vogel']).default('vogel'),
    objetivo: z.enum(['min', 'max']).default('min'),
    prohibidas: z
      .array(
        z.object({
          origen: z.number().int().min(1, { message: 'El origen debe ser ≥ 1.' }),
          destino: z.number().int().min(1, { message: 'El destino debe ser ≥ 1.' }),
        })
      )
      .default([]),
  })
  .superRefine((data, ctx) => {
    const m = data.costos.length;
    const n = data.costos[0]?.length ?? 0;

    if (n === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['costos', 0],
        message: 'La matriz de costos requiere al menos un destino.',
      });
    }

    data.costos.forEach((fila, i) => {
      if (fila.length !== n) {
        ctx.addIssue({
          code: 'custom',
          path: ['costos', i],
          message: `La fila ${i + 1} debe tener ${n} costos (uno por destino).`,
        });
      }
    });

    if (data.oferta.length !== m) {
      ctx.addIssue({
        code: 'custom',
        path: ['oferta'],
        message: `La oferta debe tener ${m} valores (uno por origen).`,
      });
    }

    if (data.demanda.length !== n) {
      ctx.addIssue({
        code: 'custom',
        path: ['demanda'],
        message: `La demanda debe tener ${n} valores (uno por destino).`,
      });
    }

    data.prohibidas.forEach((p, k) => {
      if (p.origen > m) {
        ctx.addIssue({
          code: 'custom',
          path: ['prohibidas', k, 'origen'],
          message: `El origen ${p.origen} no existe (hay ${m}).`,
        });
      }
      if (p.destino > n) {
        ctx.addIssue({
          code: 'custom',
          path: ['prohibidas', k, 'destino'],
          message: `El destino ${p.destino} no existe (hay ${n}).`,
        });
      }
    });

    const totalOferta = data.oferta.reduce((acc, v) => acc + v, 0);
    const totalDemanda = data.demanda.reduce((acc, v) => acc + v, 0);
    if (totalOferta <= 0 && totalDemanda <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['oferta'],
        message: 'La oferta y la demanda totales deben ser mayores que 0.',
      });
    }
  });

export type TransporteInput = z.input<typeof TransporteInputSchema>;

export function calcularTransporte(input: TransporteInput): TransporteResultado {
  const validado = TransporteInputSchema.parse(input);
  const mOriginal = validado.costos.length;
  const nOriginal = validado.costos[0].length;

  const prohibidas = Array.from({ length: mOriginal }, () =>
    new Array<boolean>(nOriginal).fill(false)
  );
  validado.prohibidas.forEach((p) => {
    prohibidas[p.origen - 1][p.destino - 1] = true;
  });

  const core = resolverTransporte({
    costos: validado.costos.map((fila) => fila.map(Frac.deDecimal)),
    oferta: validado.oferta.map(Frac.deDecimal),
    demanda: validado.demanda.map(Frac.deDecimal),
    prohibidas,
    metodoInicial: validado.metodoInicial,
    maximizar: validado.objetivo === 'max',
  });

  const etiquetasOrigen = Array.from({ length: core.m }, (_, i) => `O_{${i + 1}}`);
  const etiquetasDestino = Array.from({ length: core.n }, (_, j) => `D_{${j + 1}}`);

  const asignaciones: AsignacionTransporteDTO[] = [];
  for (let i = 0; i < core.m; i++) {
    for (let j = 0; j < core.n; j++) {
      const cantidad = core.asignacion[i][j];
      if (cantidad.esCero) continue;
      const unitario = core.costosOriginales[i][j];
      asignaciones.push({
        i,
        j,
        origen: etiquetasOrigen[i],
        destino: etiquetasDestino[j],
        cantidad: ff(cantidad),
        costoUnitario: ff(unitario),
        costo: ff(unitario.mul(cantidad)),
        ficticia: core.origenFicticio[i] || core.destinoFicticio[j],
      });
    }
  }

  const procesos: ProcesoCalculo[] = [];

  const totalOferta = sumar(core.oferta);
  const totalDemanda = sumar(core.demanda);
  procesos.push(
    proceso({
      id: 'transporte-modelo',
      titulo: 'Modelo de transporte',
      simbolo: 'Z',
      formula:
        `${core.maximizar ? '\\max' : '\\min'}\\; Z = \\sum_{i=1}^{${core.m}}\\sum_{j=1}^{${core.n}} c_{ij}x_{ij}` +
        `\\quad \\text{s.a.}\\quad \\sum_{j=1}^{${core.n}} x_{ij} = O_i,\\;\\; \\sum_{i=1}^{${core.m}} x_{ij} = D_j,\\;\\; x_{ij}\\ge 0`,
      sustitucion:
        `O = (${core.oferta.map((v) => v.toTex()).join(',\\; ')}),\\;\\; ` +
        `D = (${core.demanda.map((v) => v.toTex()).join(',\\; ')}),\\;\\; ` +
        `\\sum O_i = ${totalOferta.toTex()},\\; \\sum D_j = ${totalDemanda.toTex()}`,
      resultado: `\\text{${ajusteTexto(core.ajuste)}}`,
      tipoResultado: 'texto',
    })
  );

  const comparacion: ComparacionInicialDTO[] = core.comparacion.map(comparacionDTO);
  const comparacionTexto = comparacion
    .map((c) =>
      c.factible
        ? `${c.etiqueta}: Z_0 = ${c.costo!.tex}`
        : `${c.etiqueta}: \\text{no factible con las rutas permitidas}`
    )
    .join(';\\;\\; ');

  procesos.push(
    proceso({
      id: 'transporte-inicial',
      titulo: `Solución inicial — ${etiquetaMetodo(core.metodoUsado)}`,
      simbolo: 'Z_0',
      formula: tablaTex(
        core.iteraciones[0]?.asignacion ?? core.asignacion,
        core.oferta,
        core.demanda,
        etiquetasOrigen,
        etiquetasDestino
      ),
      sustitucion: comparacionTexto,
      resultado: `Z_0 = ${core.iteraciones[0]?.costo.toTex() ?? core.costo.toTex()}`,
      tipoResultado: 'texto',
    })
  );

  core.iteraciones.forEach((it) => {
    const tabla = tablaTex(
      it.asignacion,
      core.oferta,
      core.demanda,
      etiquetasOrigen,
      etiquetasDestino
    );
    if (it.entra === null) {
      procesos.push(
        proceso({
          id: `transporte-optimo-${it.iteracion}`,
          titulo: 'Criterio de optimalidad (MODI)',
          simbolo: 'd_{ij}',
          formula: `${tabla}\\;\\; d_{ij} = c_{ij} - u_i - v_j \\ge 0`,
          sustitucion:
            `u = (${it.u.map((v) => v.toTex()).join(',\\; ')}),\\;\\; ` +
            `v = (${it.v.map((v) => v.toTex()).join(',\\; ')})`,
          resultado: `\\text{Todos los costos reducidos son } \\ge 0 \\Rightarrow Z^* = ${it.costo.toTex()}.`,
          tipoResultado: 'texto',
        })
      );
      return;
    }

    const entra = `x_{${it.entra.i + 1}${it.entra.j + 1}}`;
    const sale = it.sale ? `x_{${it.sale.i + 1}${it.sale.j + 1}}` : '\\text{ninguna}';
    const reducido = it.reducidos[it.entra.i][it.entra.j];
    const cicloTexto = it.ciclo
      .map(
        (c) =>
          `${c.signo === 1 ? '+' : '-'}x_{${c.i + 1}${c.j + 1}}`
      )
      .join(' ');

    procesos.push(
      proceso({
        id: `transporte-iteracion-${it.iteracion}`,
        titulo: `MODI — Iteración ${it.iteracion + 1}`,
        simbolo: 'd_{ij}',
        formula: tabla,
        sustitucion:
          `u = (${it.u.map((v) => v.toTex()).join(',\\; ')}),\\;\\; ` +
          `v = (${it.v.map((v) => v.toTex()).join(',\\; ')});\\;\\; ` +
          `\\text{Entra } ${entra} \\text{ con } d_{ij} = ${reducido ? reducido.toTex() : '0'}.\\;\\; ` +
          `\\text{Ciclo: } ${cicloTexto}`,
        resultado:
          `\\text{Varía } \\theta = ${it.theta?.toTex() ?? '0'};\\; \\text{sale } ${sale};\\; Z = ${it.costo.toTex()}.`,
        tipoResultado: 'texto',
      })
    );
  });

  const asignacionTexto =
    asignaciones.length > 0
      ? asignaciones
          .map(
            (a) =>
              `${a.origen}\\to ${a.destino}:\\; x = ${a.cantidad.tex}`
          )
          .join(',\\;\\; ')
      : '\\text{Sin asignaciones}';

  procesos.push(
    proceso({
      id: 'transporte-final',
      titulo: 'Solución óptima del transporte',
      simbolo: 'Z^*',
      formula: asignacionTexto,
      sustitucion:
        core.estado === 'optimo'
          ? `Z^* = ${terminosCosto(core.costosOriginales, core.asignacion)}`
          : '\\text{El modelo no alcanzó una solución óptima certificada.}',
      resultado: `Z^* = ${core.costo.toTex()}`,
      tipoResultado: 'texto',
    })
  );

  return {
    estado: core.estado,
    mensaje: core.mensaje,
    objetivo: core.maximizar ? 'max' : 'min',
    m: core.m,
    n: core.n,
    balanceado: core.balanceado,
    ajuste: core.ajuste,
    metodoSolicitado: core.metodoSolicitado,
    metodoUsado: core.metodoUsado,
    costos: core.costosOriginales.map((fila) => fila.map(ff)),
    oferta: core.oferta.map(ff),
    demanda: core.demanda.map(ff),
    prohibidas: core.prohibidas.map((fila) => [...fila]),
    origenFicticio: [...core.origenFicticio],
    destinoFicticio: [...core.destinoFicticio],
    etiquetasOrigen,
    etiquetasDestino,
    asignacion: core.asignacion.map((fila) => fila.map(ff)),
    asignaciones,
    valorObjetivo: ff(core.costo),
    comparacionInicial: comparacion,
    iteraciones: core.iteraciones.map(iteracionDTO),
    procesos,
  };
}
