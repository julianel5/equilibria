export interface EOQInput {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener?: number;
  costoUnitario?: number;
  tipoCostoMantener?: 'fijo' | 'porcentaje';
  costoMantenerPorcentaje?: number;
  diasLaborables?: number;
  leadTime?: number;
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
}

export interface TeoriaColasInput {
  tasaLlegada: number;
  tasaServicio: number;
  servidores: number;
}

export interface EstadoProbabilidadColas {
  n: number;
  probabilidad: number;
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