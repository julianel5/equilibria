export interface EOQRequest {
  demandaAnual: number;
  costoOrdenar: number;
  costoMantener: number;
  costoUnitario?: number;
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
    desglose: {
      demandaAnual: number;
      costoFijoOrden: number;
      costoHoldingUnitario: number;
      costoUnitario: number;
    };
  };
  error?: string;
}
