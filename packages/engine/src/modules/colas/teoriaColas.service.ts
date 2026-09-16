import { z } from 'zod';
import { proceso, type ProcesoCalculo } from '../procesos';

// ═══════════════════════════════════════════════════════════════════════════════
// Teoría de Colas - M/M/1 y M/M/c
// ═══════════════════════════════════════════════════════════════════════════════
//
// Sistema de colas con notación de Kendall M/M/c:
//   - Llegadas Poisson con tasa λ por unidad de tiempo.
//   - Tiempos de servicio exponenciales con tasa μ por servidor.
//   - c servidores en paralelo, población infinita y disciplina FIFO.
//
// Factor de utilización (ocupación por servidor):        ρ = λ / (cμ)
//
// Probabilidad de sistema vacío:
//   M/M/1:  P0 = 1 − ρ
//   M/M/c:  P0 = [ Σ_{k=0}^{c−1} (cρ)^k / k!  +  (cρ)^c / (c! (1−ρ)) ]⁻¹   (Erlang C)
//
// Promedio de clientes en la cola:
//   M/M/1:  Lq = λ² / (μ(μ − λ))
//   M/M/c:  Lq = P0 · (cρ)^c · ρ / (c! (1−ρ)²)
//
// Promedio de clientes en el sistema:  L  = Lq + λ/μ
// Tiempo de espera en la cola:         Wq = Lq / λ
// Tiempo en el sistema:                W  = Wq + 1/μ
//
// Distribución de probabilidad del número de clientes P_n:
//   n < c:  P_n = P0 · (cρ)^n / n!
//   n ≥ c:  P_n = P0 · (cρ)^c · ρ^(n−c) / c!
//   (en M/M/1, con c = 1, esto colapsa a la geométrica P_n = (1−ρ)·ρ^n)
//
// Las fórmulas M/M/c con c = 1 son exactamente las de M/M/1; el motor entrega
// el modelo según el valor de c. La regla de estabilidad (λ < cμ) es obligatoria:
// si ρ ≥ 1 el sistema no alcanza nunca la cola en equilibrio.
// ═══════════════════════════════════════════════════════════════════════════════

// --- Schema de validación (Zod) ---

export const TeoriaColasInputSchema = z
  .object({
    tasaLlegada: z
      .number()
      .positive({ message: 'La tasa de llegada (λ) debe ser mayor que 0.' }),
    tasaServicio: z
      .number()
      .positive({ message: 'La tasa de servicio (μ) debe ser mayor que 0.' }),
    servidores: z
      .number()
      .int({ message: 'El número de servidores (c) debe ser un entero.' })
      .min(1, { message: 'El número de servidores (c) debe ser mayor o igual a 1.' }),
    unidadTiempo: z.enum(['horas', 'minutos', 'dias']).default('horas'),
  })
  .superRefine((data, ctx) => {
    // Regla de estabilidad crítica: la capacidad total (c·μ) debe superar la
    // tasa de llegada λ. Si ρ ≥ 1 la cola crece sin límite.
    if (data.tasaLlegada >= data.servidores * data.tasaServicio) {
      ctx.addIssue({
        code: 'custom',
        path: ['tasaLlegada'],
        message:
          'El sistema es inestable (ρ ≥ 1). La tasa de llegada supera la capacidad total de servicio; la cola crecerá infinitamente.',
      });
    }
  });

export type TeoriaColasInput = z.input<typeof TeoriaColasInputSchema>;

// --- Estructura de resultados ---

export type ModeloColas = 'MM1' | 'MMc';

export type UnidadTiempoColas = 'horas' | 'minutos' | 'dias';

export interface EstadoProbabilidadColas {
  n: number;
  probabilidad: number;
}

/** Conversión pedagógica de un tiempo < 1 a una subunidad (min o seg). */
export interface ConversionTiempoColas {
  valor: number;
  unidad: 'min' | 'seg';
  texto: string;
}

export interface TiempoConUnidadColas {
  texto: string; // p. ej. "0.4167 horas" (valor + unidad base)
  conversion: ConversionTiempoColas | null; // p. ej. { texto: "25 min" }
}

export interface UnidadTiempoColasResult {
  unidad: UnidadTiempoColas;
  tasa: string; // p. ej. "clientes / hora"
  wq: TiempoConUnidadColas;
  w: TiempoConUnidadColas;
}

export interface TeoriaColasResult {
  modelo: ModeloColas;   // 'MM1' si c == 1, 'MMc' en caso contrario
  lambda: number;        // tasa de llegada (devuelta para referencia en la UI)
  mu: number;            // tasa de servicio por servidor
  c: number;             // número de servidores
  rho: number;           // factor de utilización ρ = λ/(cμ)
  p0: number;            // probabilidad de sistema vacío P0
  lq: number;            // promedio de clientes en la cola Lq
  l: number;             // promedio de clientes en el sistema L
  wq: number;            // tiempo promedio de espera en la cola Wq
  w: number;             // tiempo promedio en el sistema W
  distribucion: EstadoProbabilidadColas[]; // P_n para n = 0..N_MAX
  unidadTiempo: UnidadTiempoColasResult;   // etiquetas y conversiones para la UI
  procesos: ProcesoCalculo[];              // Pestaña "Procesos": desglose paso a paso
}

// --- Servicio ---

const N_MAX = 15;

const redondear = (n: number, decimales = 6): number =>
  Math.round(n * 10 ** decimales) / 10 ** decimales;

const fmtCorto = (n: number, max = 4): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

const ETIQUETAS_UNIDAD: Record<
  UnidadTiempoColas,
  { base: string; baseSingular: string; tasa: string }
> = {
  horas: { base: 'horas', baseSingular: 'hora', tasa: 'clientes / hora' },
  minutos: { base: 'minutos', baseSingular: 'minuto', tasa: 'clientes / minuto' },
  dias: { base: 'días', baseSingular: 'día', tasa: 'clientes / día' },
};

const textoBase = (valor: number, unidad: UnidadTiempoColas): string => {
  const etiqueta = valor === 1 ? ETIQUETAS_UNIDAD[unidad].baseSingular : ETIQUETAS_UNIDAD[unidad].base;
  return `${fmtCorto(valor)} ${etiqueta}`;
};

const textoSubUnidad = (valor: number): string => `${fmtCorto(valor, 1)}`;

function convertirSubUnidad(valor: number, unidad: UnidadTiempoColas): ConversionTiempoColas | null {
  if (unidad === 'horas') {
    if (valor >= 1) return null;
    const minutos = valor * 60;
    if (minutos >= 1) {
      const v = redondear(minutos, 1);
      return { valor: v, unidad: 'min', texto: `${textoSubUnidad(v)} min` };
    }
    const segundos = valor * 3600;
    const v = redondear(segundos, 1);
    return { valor: v, unidad: 'seg', texto: `${textoSubUnidad(v)} seg` };
  }
  if (unidad === 'minutos') {
    if (valor >= 1) return null;
    const segundos = valor * 60;
    const v = redondear(segundos, 1);
    return { valor: v, unidad: 'seg', texto: `${textoSubUnidad(v)} seg` };
  }
  // 'dias': no se indica conversión (la subunidad natural sería las horas y no se pide).
  return null;
}

function factorial(n: number): number {
  let resultado = 1;
  for (let k = 2; k <= n; k += 1) resultado *= k;
  return resultado;
}

interface MetricasColas {
  rho: number;
  p0: number;
  lq: number;
  l: number;
  wq: number;
  w: number;
}

export function calcularMM1(lambda: number, mu: number): MetricasColas {
  const rho = lambda / mu;
  const p0 = 1 - rho;
  const lq = (lambda * lambda) / (mu * (mu - lambda));
  const l = lq + lambda / mu;
  const wq = lq / lambda;
  const w = wq + 1 / mu;
  return { rho, p0, lq, l, wq, w };
}

export function calcularMMc(lambda: number, mu: number, c: number): MetricasColas {
  const rho = lambda / (c * mu);
  const cRho = c * rho;

  // P0 = [ Σ_{k=0}^{c−1} (cρ)^k / k! + (cρ)^c / (c!(1−ρ)) ]⁻¹
  let suma = 0;
  for (let k = 0; k < c; k += 1) {
    suma += Math.pow(cRho, k) / factorial(k);
  }
  const colaErlang = Math.pow(cRho, c) / (factorial(c) * (1 - rho));
  const p0 = 1 / (suma + colaErlang);

  const lq = (p0 * Math.pow(cRho, c) * rho) / (factorial(c) * (1 - rho) * (1 - rho));
  const l = lq + lambda / mu;
  const wq = lq / lambda;
  const w = wq + 1 / mu;
  return { rho, p0, lq, l, wq, w };
}

// ───────────────────────────────────────────────────────────────────────────────
// Procesos paso a paso (contrato global `PasoProceso` → `ProcesoCalculo`)
// ───────────────────────────────────────────────────────────────────────────────
//
// Genera los pasos de las métricas base de la cola:
//   λ, μ (tasas efectivas), ρ (utilización), P0 (Erlang C), Lq, L, Wq y W.
// La sustitución de P0 en M/M/c expande la sumatoria término a término cuando
// c es pequeño (c ≤ 5) para que se aprecie la aritmética del denominador.

/** Formatea con hasta 6 decimales para reflejar los valores redondeados. */
const fmt = (n: number): string => String(Math.round(n * 1_000_000) / 1_000_000);

interface DatosProcesosColas {
  modelo: ModeloColas;
  lambda: number;
  mu: number;
  c: number;
  rho: number;
  p0: number;
  lq: number;
  l: number;
  wq: number;
  w: number;
  unidad: UnidadTiempoColas;
}

/** Fracción KaTeX que expresa una tasa "clientes por unidad de tiempo". */
function tasaTexto(unidadSingular: string): string {
  return `\\frac{\\text{clientes}}{\\text{${unidadSingular}}}`;
}

/**
 * Expande el denominador de P0 para M/M/c:
 *  - c ≤ 5: todos los términos de la sumatoria + el término de Erlang C.
 *  - c  > 5: los primeros términos + \cdots + el término de Erlang C.
 */
function expansionP0(c: number, rho: number): { sustitucion: string; denominador: string } {
  const cRho = c * rho;
  const r = fmt(cRho);
  const terminos: string[] = [];
  const valores: string[] = [];
  for (let k = 0; k < c; k += 1) {
    terminos.push(`\\frac{${r}^{${k}}}{${k}!}`);
    valores.push(fmt(Math.pow(cRho, k) / factorial(k)));
  }
  const ultimo = `\\frac{${r}^{${c}}}{${c}!\\left(1-${fmt(rho)}\\right)}`;
  valores.push(fmt(Math.pow(cRho, c) / (factorial(c) * (1 - rho))));

  const visibles = c <= 5 ? terminos.concat([ultimo]) : terminos.slice(0, 3).concat(['\\cdots', ultimo]);
  const valoresVisibles = c <= 5 ? valores : valores.slice(0, 3).concat(['\\cdots', valores[valores.length - 1]]);
  const sustitucion = `P_0 = \\left[ ${visibles.join(' + ')} \\right]^{-1}`;
  const denominador = `P_0 = \\frac{1}{${valoresVisibles.join(' + ')}}`;
  return { sustitucion, denominador };
}

/** Construye el arreglo de procesos de la cola (λ/μ, ρ, P0, Lq, L, Wq, W). */
export function construirProcesosColas(d: DatosProcesosColas): ProcesoCalculo[] {
  const etiqueta = ETIQUETAS_UNIDAD[d.unidad];
  const tasa = tasaTexto(etiqueta.baseSingular);
  const unidadTiempoResultado = etiqueta.base;
  const esMM1 = d.modelo === 'MM1';
  const cRho = d.c * d.rho;
  const cRhoTexto = fmt(cRho);

  const procesos: ProcesoCalculo[] = [];

  // 1. Tasas efectivas λ y μ (ya en la unidad base seleccionada).
  procesos.push(
    proceso({
      id: 'colas-tasas',
      titulo: 'Tasas efectivas',
      simbolo: '\\lambda, \\mu',
      formula: `\\lambda = ${tasa}, \\quad \\mu = ${tasa}`,
      sustitucion: `\\lambda = ${fmt(d.lambda)}, \\quad \\mu = ${fmt(d.mu)}`,
      resultado: `\\lambda = ${fmt(d.lambda)}\\, ${tasa}, \\quad \\mu = ${fmt(d.mu)}\\, ${tasa}`,
      tipoResultado: 'texto',
    })
  );

  // 2. Factor de utilización ρ = λ / (c·μ).
  procesos.push(
    proceso({
      id: 'colas-rho',
      titulo: 'Factor de utilización',
      simbolo: '\\rho',
      formula: '\\rho = \\frac{\\lambda}{c\\, \\mu}',
      sustitucion: `\\rho = \\frac{${fmt(d.lambda)}}{${d.c} \\cdot ${fmt(d.mu)}}`,
      resultado: `\\rho = ${fmt(d.rho)}`,
      tipoResultado: 'texto',
    })
  );

  // 3. Probabilidad de sistema vacío P0.
  if (esMM1) {
    procesos.push(
      proceso({
        id: 'colas-p0',
        titulo: 'Probabilidad de sistema vacío',
        simbolo: 'P_0',
        formula: 'P_0 = 1 - \\rho',
        sustitucion: `P_0 = 1 - ${fmt(d.rho)}`,
        resultado: `P_0 = ${fmt(d.p0)}`,
        tipoResultado: 'texto',
      })
    );
  } else {
    const { sustitucion, denominador } = expansionP0(d.c, d.rho);
    procesos.push(
      proceso({
        id: 'colas-p0',
        titulo: 'Probabilidad de sistema vacío',
        simbolo: 'P_0',
        formula:
          'P_0 = \\left[ \\sum_{n=0}^{c-1} \\frac{(c\\rho)^{n}}{n!} + \\frac{(c\\rho)^{c}}{c!\\,(1-\\rho)} \\right]^{-1}',
        sustitucion,
        resultado: `${denominador} = ${fmt(d.p0)}`,
        tipoResultado: 'texto',
      })
    );
  }

  // 4. Clientes en cola Lq.
  procesos.push(
    proceso({
      id: 'colas-lq',
      titulo: 'Clientes en cola',
      simbolo: 'L_q',
      formula: esMM1
        ? 'L_q = \\frac{\\lambda^2}{\\mu\\,(\\mu - \\lambda)}'
        : 'L_q = \\frac{P_0\\, (c\\rho)^{c}\\, \\rho}{c!\\,(1-\\rho)^2}',
      sustitucion: esMM1
        ? `L_q = \\frac{${fmt(d.lambda)}^{2}}{${fmt(d.mu)}\\,\\left(${fmt(d.mu)} - ${fmt(d.lambda)}\\right)}`
        : `L_q = \\frac{${fmt(d.p0)} \\cdot ${cRhoTexto}^{${d.c}} \\cdot ${fmt(d.rho)}}{${d.c}!\\,(1-${fmt(d.rho)})^2}`,
      resultado: `L_q = ${fmt(d.lq)}`,
      tipoResultado: 'cantidad',
    })
  );

  // 5. Clientes en el sistema L.
  procesos.push(
    proceso({
      id: 'colas-l',
      titulo: 'Clientes en el sistema',
      simbolo: 'L',
      formula: 'L = L_q + \\frac{\\lambda}{\\mu}',
      sustitucion: `L = ${fmt(d.lq)} + \\frac{${fmt(d.lambda)}}{${fmt(d.mu)}}`,
      resultado: `L = ${fmt(d.l)}`,
      tipoResultado: 'cantidad',
    })
  );

  // 6. Tiempo de espera en cola Wq.
  procesos.push(
    proceso({
      id: 'colas-wq',
      titulo: 'Tiempo de espera en cola',
      simbolo: 'W_q',
      formula: 'W_q = \\frac{L_q}{\\lambda}',
      sustitucion: `W_q = \\frac{${fmt(d.lq)}}{${fmt(d.lambda)}}`,
      resultado: `W_q = ${fmt(d.wq)}`,
      tipoResultado: 'tiempo',
      unidad: unidadTiempoResultado,
    })
  );

  // 7. Tiempo en el sistema W.
  procesos.push(
    proceso({
      id: 'colas-w',
      titulo: 'Tiempo en el sistema',
      simbolo: 'W',
      formula: 'W = W_q + \\frac{1}{\\mu}',
      sustitucion: `W = ${fmt(d.wq)} + \\frac{1}{${fmt(d.mu)}}`,
      resultado: `W = ${fmt(d.w)}`,
      tipoResultado: 'tiempo',
      unidad: unidadTiempoResultado,
    })
  );

  return procesos;
}

function distribucionMM1(rho: number): EstadoProbabilidadColas[] {
  return Array.from({ length: N_MAX + 1 }, (_, n) => ({
    n,
    probabilidad: redondear((1 - rho) * Math.pow(rho, n)),
  }));
}

function distribucionMMc(p0: number, c: number, rho: number): EstadoProbabilidadColas[] {
  const cRho = c * rho;
  return Array.from({ length: N_MAX + 1 }, (_, n) => {
    let probabilidad: number;
    if (n < c) {
      probabilidad = (p0 * Math.pow(cRho, n)) / factorial(n);
    } else {
      probabilidad = (p0 * Math.pow(cRho, c) * Math.pow(rho, n - c)) / factorial(c);
    }
    return { n, probabilidad: redondear(probabilidad) };
  });
}

export function calcularTeoriaColas(input: TeoriaColasInput): TeoriaColasResult {
  const validated = TeoriaColasInputSchema.parse(input);

  const lambda = validated.tasaLlegada;
  const mu = validated.tasaServicio;
  const c = validated.servidores;
  const modelo: ModeloColas = c === 1 ? 'MM1' : 'MMc';

  const metricas = modelo === 'MM1' ? calcularMM1(lambda, mu) : calcularMMc(lambda, mu, c);
  const distribucion =
    modelo === 'MM1' ? distribucionMM1(metricas.rho) : distribucionMMc(metricas.p0, c, metricas.rho);

  const unidad = validated.unidadTiempo;
  const wq = redondear(metricas.wq);
  const w = redondear(metricas.w);

  return {
    modelo,
    lambda,
    mu,
    c,
    rho: redondear(metricas.rho),
    p0: redondear(metricas.p0),
    lq: redondear(metricas.lq),
    l: redondear(metricas.l),
    wq,
    w,
    distribucion,
    unidadTiempo: {
      unidad,
      tasa: ETIQUETAS_UNIDAD[unidad].tasa,
      wq: { texto: textoBase(wq, unidad), conversion: convertirSubUnidad(wq, unidad) },
      w: { texto: textoBase(w, unidad), conversion: convertirSubUnidad(w, unidad) },
    },
    procesos: construirProcesosColas({
      modelo,
      lambda,
      mu,
      c,
      rho: metricas.rho,
      p0: metricas.p0,
      lq: metricas.lq,
      l: metricas.l,
      wq: metricas.wq,
      w: metricas.w,
      unidad,
    }),
  };
}