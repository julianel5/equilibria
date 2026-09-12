import type { VariableDef } from '@shared/components/Glossary';

export const VARIABLES_EOQ: VariableDef[] = [
  {
    simbolo: 'D',
    nombre: 'Demanda anual',
    descripcion:
      'Cantidad de producto requerida durante un año, en las unidades de medida configuradas.',
  },
  {
    simbolo: 'S',
    nombre: 'Costo fijo por orden',
    descripcion:
      'Costo de preparar o emitir un pedido, independiente del tamaño del lote.',
  },
  {
    simbolo: 'H',
    nombre: 'Costo de mantener',
    descripcion: 'Costo de almacenar una unidad de inventario durante un año.',
  },
  {
    simbolo: 'C',
    nombre: 'Costo unitario',
    descripcion: 'Precio de compra o producción de cada unidad del producto.',
  },
  {
    simbolo: 'Q^*',
    nombre: 'Cantidad Económica de Pedido',
    descripcion: 'Lote óptimo que minimiza el costo total relevante anual.',
  },
  {
    simbolo: 'TC',
    nombre: 'Costo Total Anual',
    descripcion:
      'Suma de los costos anuales de ordenar, mantener y adquisición del inventario.',
  },
  {
    simbolo: 'N',
    nombre: 'Número de pedidos por año',
    descripcion: 'Órdenes emitidas al año para cubrir la demanda (N = D / Q*).',
  },
  {
    simbolo: 'T',
    nombre: 'Ciclo de reposición',
    descripcion: 'Tiempo en días entre dos pedidos consecutivos (T = días laborables / N).',
  },
  {
    simbolo: 'd',
    nombre: 'Demanda diaria',
    descripcion:
      'Consumo promedio por día de trabajo (d = D / días laborables).',
  },
  {
    simbolo: 'L',
    nombre: 'Tiempo de entrega (Lead Time)',
    descripcion:
      'Días que tarda el proveedor en entregar una orden después de emitirla.',
  },
  {
    simbolo: 'ROP',
    nombre: 'Punto de Reorden',
    descripcion:
      'Nivel de inventario en el que se debe emitir una nueva orden (ROP = d × L).',
  },
];

export const VARIABLES_EPQ: VariableDef[] = [
  {
    simbolo: 'D',
    nombre: 'Demanda anual',
    descripcion:
      'Cantidad de producto requerida durante un año, en las unidades de medida configuradas.',
  },
  {
    simbolo: 'P',
    nombre: 'Tasa de producción anual',
    descripcion:
      'Cantidad de unidades que se fabrican al año. Debe ser estrictamente mayor que la demanda (P > D).',
  },
  {
    simbolo: 'S',
    nombre: 'Costo de preparación',
    descripcion:
      'Costo de preparar una corrida de producción, independiente del tamaño del lote.',
  },
  {
    simbolo: 'H',
    nombre: 'Costo de mantener',
    descripcion: 'Costo de almacenar una unidad de inventario durante un año.',
  },
  {
    simbolo: 'C',
    nombre: 'Costo unitario',
    descripcion: 'Precio de compra o producción de cada unidad del producto.',
  },
  {
    simbolo: 'Q^*',
    nombre: 'Lote Económico de Producción',
    descripcion: 'Tamaño óptimo del lote a producir que minimiza el costo total relevante anual.',
  },
  {
    simbolo: 'I_{max}',
    nombre: 'Inventario máximo',
    descripcion:
      'Nivel más alto de inventario alcanzado al terminar la producción del lote (Imax = Q*(1 − D/P)).',
  },
  {
    simbolo: 'TC',
    nombre: 'Costo Total Anual',
    descripcion:
      'Suma de los costos anuales de preparación, mantener y adquisición del inventario.',
  },
  {
    simbolo: 'N',
    nombre: 'Corridas de producción por año',
    descripcion: 'Cantidad de veces que se arranca la línea de producción al año (N = D / Q*).',
  },
  {
    simbolo: 'd',
    nombre: 'Demanda diaria',
    descripcion:
      'Consumo promedio por día de trabajo (d = D / días laborables).',
  },
  {
    simbolo: 'L',
    nombre: 'Tiempo de entrega (Lead Time)',
    descripcion:
      'Días que tarda en llegar un suministro o reacondicionarse la línea después de emitir la orden.',
  },
  {
    simbolo: 'ROP',
    nombre: 'Punto de Reorden',
    descripcion:
      'Nivel de inventario en el que se debe iniciar una nueva corrida (ROP = d × L).',
  },
];