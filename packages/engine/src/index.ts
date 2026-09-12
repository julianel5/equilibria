export { calcularEOQ, generarCurvaTC } from './modules/inventory/eoq.service';
export type { EOQInput, EOQResult, SensitivityDataPoint } from './modules/inventory/eoq.service';
export { EOQInputSchema } from './modules/inventory/eoq.service';
export { calcularEPQ } from './modules/inventory/epq.service';
export type { EPQInput, EPQResult } from './modules/inventory/epq.service';
export { EPQInputSchema, EPQValidatedSchema } from './modules/inventory/epq.service';
export { calcularEOQFaltantes } from './modules/inventory/eoqFaltantes.service';
export type { EOQFaltantesInput, EOQFaltantesResult } from './modules/inventory/eoqFaltantes.service';
export { EOQFaltantesInputSchema } from './modules/inventory/eoqFaltantes.service';
export { calcularEOQDescuentos } from './modules/inventory/eoqDescuentos.service';
export type {
  EOQDescuentosInput,
  EOQDescuentosResult,
  RangoEvaluacion,
} from './modules/inventory/eoqDescuentos.service';
export { EOQDescuentosInputSchema, RangoPrecioSchema } from './modules/inventory/eoqDescuentos.service';
