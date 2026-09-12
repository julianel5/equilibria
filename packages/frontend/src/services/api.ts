export interface EOQInput {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener: number;
  costoUnitario?: number;
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
  costoMantener: number;
  costoUnitario?: number;
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