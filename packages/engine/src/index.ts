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
export {
  UNIDADES_TIEMPO,
  ETIQUETAS_UNIDAD_TIEMPO,
  PERIODO_DE_UNIDAD,
  FACTOR_UNIDADES_A_ANO,
  normalizarAAño,
  construirNormalizacion,
} from './modules/inventory/unidadesTiempo';
export type {
  UnidadTiempo,
  NormalizacionUnidades,
  PasoNormalizacion,
} from './modules/inventory/unidadesTiempo';
export { calcularDemandaProbabilistica, inversaNormalEstandar } from './modules/stochastic/demandaProbabilistica.service';
export type {
  DemandaProbabilisticaInput,
  DemandaProbabilisticaResult,
} from './modules/stochastic/demandaProbabilistica.service';
export { DemandaProbabilisticaInputSchema } from './modules/stochastic/demandaProbabilistica.service';
export { calcularPeriodoUnico, generarPuntosDistribucion } from './modules/stochastic/periodoUnico.service';
export type { PeriodoUnicoInput, PeriodoUnicoResult, PuntoDistribucion } from './modules/stochastic/periodoUnico.service';
export { PeriodoUnicoInputSchema } from './modules/stochastic/periodoUnico.service';
export { calcularTeoriaDecisiones } from './modules/decisions/teoriaDecisiones.service';
export type {
  TeoriaDecisionesInput,
  TeoriaDecisionesResult,
  CriterioResult,
  CriterioValor,
  CriterioClave,
} from './modules/decisions/teoriaDecisiones.service';
export { TeoriaDecisionesInputSchema } from './modules/decisions/teoriaDecisiones.service';
export { calcularTeoriaColas, calcularMM1, calcularMMc } from './modules/colas/teoriaColas.service';
export type {
  TeoriaColasInput,
  TeoriaColasResult,
  ModeloColas,
  EstadoProbabilidadColas,
  AnalisisCostosColas,
  BasePenalizacionColas,
} from './modules/colas/teoriaColas.service';
export { TeoriaColasInputSchema } from './modules/colas/teoriaColas.service';
export { calcularMetodoGrafico } from './modules/pl/metodoGrafico.service';
export type {
  MetodoGraficoInput,
  MetodoGraficoResult,
  TipoOptimizacionPL,
  FuncionObjetivoPL,
  RestriccionPL,
  VerticePL,
  InterseccionDescartadaPL,
} from './modules/pl/metodoGrafico.service';
export { MetodoGraficoInputSchema } from './modules/pl/metodoGrafico.service';
export { calcularSimplex } from './modules/pl/simplex/simplex.service';
export type {
  SimplexInput,
  SimplexResultado,
  FraccionJSON,
  TablaTabularDTO,
  IteracionRevisadaDTO,
} from './modules/pl/simplex/simplex.service';
export { SimplexInputSchema } from './modules/pl/simplex/simplex.service';
export { calcularSimplexCore } from './modules/pl/simplex/simplex';
export { Frac } from './modules/pl/simplex/fraction';
