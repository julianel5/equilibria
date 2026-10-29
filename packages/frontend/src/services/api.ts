import type { NormalizacionUnidades } from '@shared/components/Fase0Unidades';
import type { UnidadTiempo } from '@shared/components/SelectorUnidadTiempo';
import type { PasoProceso } from '@shared/types/procesos';

export interface EOQInput {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener?: number;
  costoUnitario?: number;
  tipoCostoMantener?: 'fijo' | 'porcentaje';
  costoMantenerPorcentaje?: number;
  diasLaborables?: number;
  leadTime?: number;
  unidadDemanda?: UnidadTiempo;
  unidadCostoMantener?: UnidadTiempo;
}

export interface EOQDesglose {
  demandaAnual: number;
  costoFijoOrden: number;
  costoHoldingUnitario: number;
  costoUnitario: number;
  diasLaborables: number;
  leadTime: number;
  demandaDiaria: number;
}

export interface EOQResult {
  cantidadOptima: number;
  costoTotalAnual: number;
  numeroPedidos: number;
  cicloReposicion: number;
  inventarioPromedio: number;
  costoAdquisicion: number;
  costoOrdenar: number;
  costoMantener: number;
  puntoReorden: number;
  conversionUnidades: NormalizacionUnidades;
  procesos: PasoProceso[];
  desglose: EOQDesglose;
}

export interface EPQInput {
  demandaAnual: number;
  tasaProduccion: number;
  costoOrdenar: number;
  costoMantener?: number;
  costoUnitario?: number;
  tipoCostoMantener?: 'fijo' | 'porcentaje';
  costoMantenerPorcentaje?: number;
  diasLaborables?: number;
  leadTime?: number;
  unidadDemanda?: UnidadTiempo;
  unidadCostoMantener?: UnidadTiempo;
}

export interface EPQDesglose {
  demandaAnual: number;
  tasaProduccion: number;
  factorProduccion: number;
  costoFijoOrden: number;
  costoHoldingUnitario: number;
  costoUnitario: number;
  diasLaborables: number;
  leadTime: number;
  demandaDiaria: number;
}

export interface EPQResult {
  cantidadOptima: number;
  inventarioMaximo: number;
  inventarioPromedio: number;
  costoTotalAnual: number;
  numeroProducciones: number;
  cicloProduccion: number;
  costoAdquisicion: number;
  costoOrdenar: number;
  costoMantener: number;
  puntoReorden: number;
  conversionUnidades: NormalizacionUnidades;
  procesos: PasoProceso[];
  desglose: EPQDesglose;
}

export interface EOQFaltantesInput {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener?: number;
  costoFaltantes: number;
  costoUnitario?: number;
  tipoCostoMantener?: 'fijo' | 'porcentaje';
  costoMantenerPorcentaje?: number;
  diasLaborables?: number;
  leadTime?: number;
  unidadDemanda?: UnidadTiempo;
  unidadCostoMantener?: UnidadTiempo;
}

export interface EOQFaltantesDesglose {
  demandaAnual: number;
  costoFijoOrden: number;
  costoHoldingUnitario: number;
  costoFaltantesUnitario: number;
  factorFaltantes: number;
  costoUnitario: number;
  diasLaborables: number;
  leadTime: number;
  demandaDiaria: number;
}

export interface EOQFaltantesResult {
  cantidadOptima: number;
  faltanteMaximo: number;
  inventarioMaximo: number;
  costoTotalAnual: number;
  numeroPedidos: number;
  cicloReposicion: number;
  costoAdquisicion: number;
  costoOrdenar: number;
  costoMantener: number;
  costoFaltantes: number;
  puntoReorden: number;
  conversionUnidades: NormalizacionUnidades;
  procesos: PasoProceso[];
  desglose: EOQFaltantesDesglose;
}

export interface RangoPrecioInput {
  cantidadMinima: number;
  cantidadMaxima?: number;
  costoUnitario: number;
}

export interface EOQDescuentosInput {
  demandaAnual: number;
  costoOrdenar: number;
  tipoCostoMantener: 'fijo' | 'porcentaje';
  costoMantener?: number;
  costoMantenerPorcentaje?: number;
  unidadDemanda?: UnidadTiempo;
  unidadCostoMantener?: UnidadTiempo;
  rangos: RangoPrecioInput[];
}

export interface RangoEvaluacion {
  cantidadMinima: number;
  cantidadMaxima: number | null;
  costoUnitario: number;
  costoMantenerEfectivo: number;
  qOriginal: number;
  qAjustado: number | null;
  descartado: boolean;
  costoOrdenar: number | null;
  costoMantener: number | null;
  costoProducto: number | null;
  costoTotal: number | null;
  esGanador: boolean;
}

export interface EOQDescuentosResult {
  loteOptimo: number;
  costoTotalOptimo: number;
  tipoCostoMantener: 'fijo' | 'porcentaje';
  costoMantener: number | null;
  costoMantenerPorcentaje: number | null;
  rangoGanador: {
    cantidadMinima: number;
    cantidadMaxima: number | null;
    costoUnitario: number;
  };
  rangos: RangoEvaluacion[];
  conversionUnidades: NormalizacionUnidades;
  procesos: PasoProceso[];
  desglose: {
    demandaAnual: number;
    costoFijoOrden: number;
  };
}

export interface DemandaProbabilisticaInput {
  demandaPromedioDiaria: number;
  desviacionEstandarDemandaDiaria: number;
  tiempoEntrega: number;
  nivelServicio: number;
}

export interface DemandaProbabilisticaResult {
  valorZ: number;
  demandaDuranteEntrega: number;
  sigmaDuranteEntrega: number;
  stockSeguridad: number;
  puntoReorden: number;
  desglose: {
    demandaPromedioDiaria: number;
    desviacionEstandarDemandaDiaria: number;
    tiempoEntrega: number;
    nivelServicio: number;
    valorZExacto: number;
  };
  procesos: PasoProceso[];
}

export interface PeriodoUnicoInput {
  modoIngreso?: 'bienes' | 'servicios';
  distribucion: 'normal' | 'uniforme';
  precioVenta?: number;
  costoCompra?: number;
  valorRescate?: number;
  costoSubestimacion?: number;
  costoSobreestimacion?: number;
  demandaMedia?: number;
  desviacionDemanda?: number;
  limiteInferior?: number;
  limiteSuperior?: number;
}

export interface PuntoDistribucion {
  demanda: number;
  densidad: number;
}

export interface PeriodoUnicoResult {
  modoIngreso: 'bienes' | 'servicios';
  distribucion: 'normal' | 'uniforme';
  costoSubestimacion: number;
  costoSobreestimacion: number;
  nivelServicio: number;
  valorZ: number | null;
  cantidadOptima: number;
  desglose: {
    precioVenta?: number;
    costoCompra?: number;
    valorRescate?: number;
    costoSubestimacion?: number;
    costoSobreestimacion?: number;
    valorZExacto: number | null;
    demandaMedia?: number;
    desviacionDemanda?: number;
    limiteInferior?: number;
    limiteSuperior?: number;
  };
  puntos: PuntoDistribucion[];
  procesos: PasoProceso[];
}

export interface TeoriaDecisionesInput {
  alternativas: { nombre: string; pagos: number[] }[];
  estados: { nombre: string; probabilidad: number | null }[];
  tipoAnalisis: 'maximizar' | 'minimizar';
  alpha: number;
}

export interface CriterioValor {
  indice: number;
  alternativa: string;
  valor: number;
}

export interface CriterioResult {
  clave: 'maximax' | 'maximin' | 'laplace' | 'hurwicz' | 'savage' | 'vme';
  nombre: string;
  formula: string;
  descripcion: string;
  valores: CriterioValor[];
  ganador: CriterioValor;
  matrizArrepentimiento?: number[][];
}

export interface TeoriaDecisionesResult {
  criterios: CriterioResult[];
  vmeDisponible: boolean;
  tipoAnalisis: 'maximizar' | 'minimizar';
  maximoPorFila: number[];
  minimoPorFila: number[];
  maximoPorColumna: number[];
  minimoPorColumna: number[];
  matrizArrepentimiento: number[][];
  procesos: PasoProceso[];
}

export type UnidadTiempoColas = 'horas' | 'minutos' | 'dias';

export type BasePenalizacionColas = 'sistema' | 'fila';

export interface AnalisisCostosColas {
  cs: number;
  cw: number;
  base: BasePenalizacionColas;
  baseValor: number;
  csTotal: number;
  cwTotal: number;
  ct: number;
}

export interface TeoriaColasInput {
  tasaLlegada: number;
  tasaServicio: number;
  servidores: number;
  unidadTiempo?: UnidadTiempoColas;
  analisisCostos?: boolean;
  costoServicio?: number;
  costoEspera?: number;
  basePenalizacion?: BasePenalizacionColas;
}

export interface EstadoProbabilidadColas {
  n: number;
  probabilidad: number;
}

export interface ConversionTiempoColas {
  valor: number;
  unidad: 'min' | 'seg';
  texto: string;
}

export interface TiempoConUnidadColas {
  texto: string;
  conversion: ConversionTiempoColas | null;
}

export interface UnidadTiempoColasResult {
  unidad: UnidadTiempoColas;
  tasa: string;
  wq: TiempoConUnidadColas;
  w: TiempoConUnidadColas;
}

export interface TeoriaColasResult {
  modelo: 'MM1' | 'MMc';
  lambda: number;
  mu: number;
  c: number;
  rho: number;
  p0: number;
  lq: number;
  l: number;
  wq: number;
  w: number;
  distribucion: EstadoProbabilidadColas[];
  unidadTiempo: UnidadTiempoColasResult;
  procesos: PasoProceso[];
  analisisCostos: AnalisisCostosColas | null;
}

export type TipoOptimizacionPL = 'MAX' | 'MIN';

export interface FuncionObjetivoPL {
  tipo: TipoOptimizacionPL;
  c1: number;
  c2: number;
}

export type OperadorPL = '<=' | '>=' | '=';

export interface RestriccionPL {
  id: string;
  x1: number;
  x2: number;
  operador: OperadorPL;
  rhs: number;
}

export interface MetodoGraficoInput {
  funcionObjetivo: FuncionObjetivoPL;
  restricciones: RestriccionPL[];
}

export interface VerticePL {
  x1: number;
  x2: number;
  z: number;
  esVerticeOptimo: boolean;
  /** Referencia de las dos rectas (id) cuya intersección genera este vértice. */
  lineas: [string, string];
}

export interface InterseccionDescartadaPL {
  restriccionA: string;
  restriccionB: string;
  /** Referencia de las dos rectas (id) del cruce (recta1, recta2). */
  lineas: [string, string];
  /** Id de la restricción violada por el punto; null si no hubo intersección única. */
  violada: string | null;
  motivo: string;
  punto?: { x1: number; x2: number };
}

export interface LineaEfectivaPL {
  id: string;
  x1: number;
  x2: number;
  operador: OperadorPL;
  rhs: number;
}

export interface MetodoGraficoResult {
  funcionObjetivo: FuncionObjetivoPL;
  verticeOptimo: VerticePL | VerticePL[];
  valorZ: number;
  multiplesOptimos: boolean;
  verticesFactibles: VerticePL[];
  interseccionesDescartadas: InterseccionDescartadaPL[];
  lineasEfectivas: LineaEfectivaPL[];
}

export type ObjetivoSimplex = 'max' | 'min';
export type MetodoSimplex = 'tabular' | 'revisado';
export type TipoRestriccionSimplex = 'LE' | 'GE' | 'EQ';

export interface RestriccionSimplexInput {
  coeficientes: number[];
  tipo?: TipoRestriccionSimplex;
  b: number;
}

export interface SimplexInput {
  metodo?: MetodoSimplex;
  objetivo?: ObjetivoSimplex;
  funcionObjetivo: number[];
  restricciones: RestriccionSimplexInput[];
}

export interface FraccionJSON {
  num: string;
  den: string;
  tex: string;
  dec: string;
}

export interface RazonTabularDTO {
  fila: number;
  variable: string;
  numerador: FraccionJSON;
  denominador: FraccionJSON;
  razon: FraccionJSON | null;
  descartada: boolean;
}

export interface TablaTabularDTO {
  iteracion: number;
  variables: string[];
  basica: string[];
  filas: FraccionJSON[][];
  rhs: FraccionJSON[];
  reducidos: FraccionJSON[];
  z: FraccionJSON;
  columnaEntrante: number | null;
  filaSaliente: number | null;
  pivote: FraccionJSON | null;
  ratios: RazonTabularDTO[] | null;
}

export interface CostoReducidoDTO {
  variable: string;
  cj: FraccionJSON;
  cr: FraccionJSON;
  aj: FraccionJSON[];
}

export interface RazonRevisadoDTO {
  fila: number;
  variable: string;
  valorBase: FraccionJSON;
  d: FraccionJSON;
  razon: FraccionJSON | null;
  descartada: boolean;
}

export interface IteracionRevisadaDTO {
  iteracion: number;
  basica: string[];
  B: FraccionJSON[][];
  BInv: FraccionJSON[][];
  cB: FraccionJSON[];
  y: FraccionJSON[];
  bi: FraccionJSON[];
  costosReducidos: CostoReducidoDTO[];
  columnaEntrante: number | null;
  variableEntrante: string | null;
  d: FraccionJSON[];
  ratios: RazonRevisadoDTO[] | null;
  filaSaliente: number | null;
  variableSaliente: string | null;
  z: FraccionJSON;
}

export interface SimplexResultado {
  metodo: MetodoSimplex;
  objetivo: ObjetivoSimplex;
  n: number;
  m: number;
  estado: 'optimo' | 'no-acotado';
  variables: string[];
  basicaFinal: string[];
  solucion: FraccionJSON[];
  holguras: FraccionJSON[];
  valorObjetivo: FraccionJSON;
  tablas: TablaTabularDTO[];
  revisado: IteracionRevisadaDTO[];
  procesos: PasoProceso[];
}

const API_BASE = '/api';

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  issues: ApiIssue[];

  constructor(message: string, issues: ApiIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}

async function parseResponse(res: Response): Promise<{ data: unknown; error?: string; issues?: ApiIssue[] }> {
  const data = (await res.json()) as {
    data?: unknown;
    error?: string;
    issues?: ApiIssue[];
  };

  if (!res.ok) {
    const issues = Array.isArray(data.issues) ? data.issues : [];
    throw new ApiError(data.error || 'Error en la API', issues);
  }

  return { data: data.data };
}

export async function calcularEOQ(input: EOQInput): Promise<EOQResult> {
  const res = await fetch(`${API_BASE}/inventory/eoq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as EOQResult;
}

export async function calcularEPQ(input: EPQInput): Promise<EPQResult> {
  const res = await fetch(`${API_BASE}/inventory/epq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as EPQResult;
}

export async function calcularEOQFaltantes(input: EOQFaltantesInput): Promise<EOQFaltantesResult> {
  const res = await fetch(`${API_BASE}/inventory/eoq-faltantes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as EOQFaltantesResult;
}

export async function calcularEOQDescuentos(input: EOQDescuentosInput): Promise<EOQDescuentosResult> {
  const res = await fetch(`${API_BASE}/inventory/eoq-descuentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as EOQDescuentosResult;
}

export async function calcularDemandaProbabilistica(
  input: DemandaProbabilisticaInput
): Promise<DemandaProbabilisticaResult> {
  const res = await fetch(`${API_BASE}/stochastic/punto-reorden`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as DemandaProbabilisticaResult;
}

export async function calcularPeriodoUnico(input: PeriodoUnicoInput): Promise<PeriodoUnicoResult> {
  const res = await fetch(`${API_BASE}/stochastic/periodo-unico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as PeriodoUnicoResult;
}

export async function calcularTeoriaDecisiones(input: TeoriaDecisionesInput): Promise<TeoriaDecisionesResult> {
  const res = await fetch(`${API_BASE}/decisiones/evaluar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as TeoriaDecisionesResult;
}

export async function calcularTeoriaColas(input: TeoriaColasInput): Promise<TeoriaColasResult> {
  const res = await fetch(`${API_BASE}/colas/evaluar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as TeoriaColasResult;
}

export async function calcularMetodoGrafico(input: MetodoGraficoInput): Promise<MetodoGraficoResult> {
  const res = await fetch(`${API_BASE}/pl/grafico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as MetodoGraficoResult;
}

export async function calcularSimplex(input: SimplexInput): Promise<SimplexResultado> {
  const res = await fetch(`${API_BASE}/pl/simplex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const { data } = await parseResponse(res);
  return data as SimplexResultado;
}