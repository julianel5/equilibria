import { z } from 'zod';

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

export interface EstadoProbabilidadColas {
  n: number;
  probabilidad: number;
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
}

// --- Servicio ---

const N_MAX = 15;

const redondear = (n: number, decimales = 6): number =>
  Math.round(n * 10 ** decimales) / 10 ** decimales;

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

  return {
    modelo,
    lambda,
    mu,
    c,
    rho: redondear(metricas.rho),
    p0: redondear(metricas.p0),
    lq: redondear(metricas.lq),
    l: redondear(metricas.l),
    wq: redondear(metricas.wq),
    w: redondear(metricas.w),
    distribucion,
  };
}