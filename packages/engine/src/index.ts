export { calcularEOQ, generarCurvaTC } from './modules/inventory/eoq.service';
export { ErrorValidacion } from './modules/errorValidacion';
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
  SensibilidadDTO,
  RangoDTO,
  OptimosMultiplesDTO,
} from './modules/pl/simplex/simplex.service';
export { analizarSensibilidad } from './modules/pl/simplex/sensibilidad';
export { analizarOptimosMultiples } from './modules/pl/simplex/optimosMultiples';
export { SimplexInputSchema } from './modules/pl/simplex/simplex.service';
export { calcularSimplexCore } from './modules/pl/simplex/simplex';
export { Frac } from './modules/pl/simplex/fraction';
export { calcularSimplexDual } from './modules/pl/simplex/simplexDual.service';
export type {
  SimplexDualInput,
  SimplexDualResultado,
  IteracionDualDTO,
  RazonDualDTO,
} from './modules/pl/simplex/simplexDual.service';
export { SimplexDualInputSchema } from './modules/pl/simplex/simplexDual.service';
export { calcularSimplexDualCore } from './modules/pl/simplex/simplexDual';
export type {
  ResultadoSimplexDualCore,
  IteracionDual,
  RazonDual,
} from './modules/pl/simplex/simplexDual';
export { calcularLemke } from './modules/pl/lemke/lemke.service';
export type {
  LemkeInput,
  LemkeResultado,
  IteracionLemkeDTO,
  RazonLemkeDTO,
  QPResumenDTO,
  ComplementariedadDTO,
} from './modules/pl/lemke/lemke.service';
export { LemkeInputSchema } from './modules/pl/lemke/lemke.service';
export { resolverLemke } from './modules/pl/lemke/lemke';
export type {
  ResultadoLemkeCore,
  IteracionLemke,
  RazonLemke,
  EstadoLemke,
} from './modules/pl/lemke/lemke';
export { calcularTransporte } from './modules/pl/transporte/transporte.service';
export type {
  TransporteInput,
  TransporteResultado,
  IteracionTransporteDTO,
  AsignacionTransporteDTO,
  ComparacionInicialDTO,
  CeldaCicloDTO,
  FraccionTransporteJSON,
} from './modules/pl/transporte/transporte.service';
export { TransporteInputSchema } from './modules/pl/transporte/transporte.service';
export { calcularAsignacion, AsignacionInputSchema } from './modules/pl/asignacion/asignacion.service';
export type { AsignacionInput, AsignacionResultado, FraccionAsignacionDTO } from './modules/pl/asignacion/asignacion.service';
export { resolverAsignacion } from './modules/pl/asignacion/assignmentEngine';
export type { CeldaAsignacion, MatrizAsignacion, PasoAsignacion, ResultadoAsignacion } from './modules/pl/asignacion/assignmentEngine';
export { resolverTransporte, etiquetaMetodo } from './modules/pl/transporte/transporte';
export type {
  ResultadoTransporteCore,
  IteracionTransporteCore,
  ComparacionInicialCore,
  MetodoInicialTransporte,
  AjusteTransporte,
  CeldaTransporte,
  CeldaCicloTransporte,
} from './modules/pl/transporte/transporte';
