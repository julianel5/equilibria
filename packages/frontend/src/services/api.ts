export interface EOQInput {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener: number;
  costoUnitario?: number;
}

export interface EOQDesglose {
  demandaAnual: number;
  costoFijoOrden: number;
  costoHoldingUnitario: number;
  costoUnitario: number;
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
  desglose: EOQDesglose;
}

const API_BASE = '/api';

export async function calcularEOQ(input: EOQInput): Promise<EOQResult> {
  const res = await fetch(`${API_BASE}/inventory/eoq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Error en la API');
  }

  return data.data as EOQResult;
}