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
