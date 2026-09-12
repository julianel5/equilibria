export interface EOQRequest {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener: number;
  costoUnitario?: number;
  diasLaborables?: number;
  leadTime?: number;
}

export interface EPQRequest {
  demandaAnual: number;
  tasaProduccion: number;
  costoOrdenar: number;
  costoMantener: number;
  costoUnitario?: number;
  diasLaborables?: number;
  leadTime?: number;
}

export interface EPQResponse {
  success: boolean;
  data?: {
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
    desglose: {
      demandaAnual: number;
      tasaProduccion: number;
      factorProduccion: number;
      costoFijoOrden: number;
      costoHoldingUnitario: number;
      costoUnitario: number;
      diasLaborables: number;
      leadTime: number;
      demandaDiaria: number;
    };
  };
  error?: string;
}

export interface EOQResponse {
  success: boolean;
  data?: {
    cantidadOptima: number;
    costoTotalAnual: number;
    numeroPedidos: number;
    cicloReposicion: number;
    inventarioPromedio: number;
    costoAdquisicion: number;
    costoOrdenar: number;
    costoMantener: number;
    puntoReorden: number;
    desglose: {
      demandaAnual: number;
      costoFijoOrden: number;
      costoHoldingUnitario: number;
      costoUnitario: number;
      diasLaborables: number;
      leadTime: number;
      demandaDiaria: number;
    };
  };
  error?: string;
}

export interface EOQFaltantesRequest {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener: number;
  costoFaltantes: number;
  costoUnitario?: number;
  diasLaborables?: number;
  leadTime?: number;
}

export interface EOQFaltantesResponse {
  success: boolean;
  data?: {
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
    desglose: {
      demandaAnual: number;
      costoFijoOrden: number;
      costoHoldingUnitario: number;
      costoFaltantesUnitario: number;
      factorFaltantes: number;
      costoUnitario: number;
      diasLaborables: number;
      leadTime: number;
      demandaDiaria: number;
    };
  };
  error?: string;
}

export interface EOQDescuentosRangoRequest {
  cantidadMinima: number;
  cantidadMaxima?: number;
  costoUnitario: number;
}

export interface EOQDescuentosRequest {
  demandaAnual: number;
  costoOrdenar: number;
  tipoCostoMantener: 'fijo' | 'porcentaje';
  costoMantener?: number;
  costoMantenerPorcentaje?: number;
  rangos: EOQDescuentosRangoRequest[];
}

export interface EOQDescuentosResponse {
  success: boolean;
  data?: {
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
    rangos: Array<{
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
    }>;
    desglose: {
      demandaAnual: number;
      costoFijoOrden: number;
    };
  };
  error?: string;
}
