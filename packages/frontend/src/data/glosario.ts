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

export const VARIABLES_EOQFALTANTES: VariableDef[] = [
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
    simbolo: 'B',
    nombre: 'Costo de faltantes',
    descripcion:
      'Costo de escasez por unidad faltante durante un año. Representa el castigo por cada unidad que el cliente espera (venta diferida o backorder).',
  },
  {
    simbolo: 'C',
    nombre: 'Costo unitario',
    descripcion: 'Precio de compra o producción de cada unidad del producto.',
  },
  {
    simbolo: 'Q^*',
    nombre: 'Lote óptimo de pedido',
    descripcion:
      'Pedido que minimiza el costo relevante total anual, ahora mayor que el EOQ puro porque tolerar faltantes reduce el costo de mantener.',
  },
  {
    simbolo: 'S^*',
    nombre: 'Faltante máximo (déficit óptimo)',
    descripcion:
      'Máxima cantidad de unidades pendientes de entrega al final de la fase de escasez (S* = Q*·H/(H+B)).',
  },
  {
    simbolo: 'I_{max}',
    nombre: 'Inventario máximo',
    descripcion:
      'Nivel máximo de stock en mano al recibir el lote, después de liquidar los backorders (Imax = Q* − S*).',
  },
  {
    simbolo: 'TC',
    nombre: 'Costo Relevante Total',
    descripcion:
      'Suma de los costos anuales de ordenar, mantener y faltantes. No incluye la adquisición (DC).',
  },
  {
    simbolo: 'N',
    nombre: 'Número de pedidos por año',
    descripcion: 'Órdenes emitidas al año para cubrir la demanda (N = D / Q*).',
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

export const VARIABLES_EOQDESCUENTOS: VariableDef[] = [
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
    nombre: 'Costo de mantener (fijo)',
    descripcion:
      'Costo de almacenar una unidad durante un año, ingresado directamente en USD/unidad-año.',
  },
  {
    simbolo: 'I',
    nombre: 'Costo de mantener (porcentaje)',
    descripcion:
      'Tasa anual de manejo de inventario aplicada al precio del producto. En este modo H = I × C.',
  },
  {
    simbolo: 'C_j',
    nombre: 'Precio unitario del nivel j',
    descripcion:
      'Precio por unidad que aplica dentro del intervalo de cantidades [q_min, q_max] del nivel j. El precio es menor en los niveles con cantidades más grandes.',
  },
  {
    simbolo: 'q_{min}',
    nombre: 'Cantidad mínima del nivel',
    descripcion: 'Menor cantidad de unidades que da derecho al precio del nivel.',
  },
  {
    simbolo: 'q_{max}',
    nombre: 'Cantidad máxima del nivel',
    descripcion:
      'Mayor cantidad que conserva el precio del nivel. El último nivel no tiene máximo (infinito).',
  },
  {
    simbolo: 'Q^*',
    nombre: 'Lote óptimo del nivel',
    descripcion:
      'Lote calculado con el precio del nivel: Q* = √(2DS/H_j). Si queda fuera del intervalo, se ajusta a q_min o el nivel se descarta.',
  },
  {
    simbolo: 'TC_j',
    nombre: 'Costo total del nivel',
    descripcion:
      'Costo anual del candidato del nivel: TC = (D/Q)S + (Q/2)H_j + D·C_j. El ganador es el nivel con el TC menor.',
  },
];

export const VARIABLES_DEMANDAPROBABILISTICA: VariableDef[] = [
  {
    simbolo: '\\bar{d}',
    nombre: 'Demanda promedio diaria',
    descripcion:
      'Cantidad promedio de unidades demandada por día de trabajo.',
  },
  {
    simbolo: '\\sigma_d',
    nombre: 'Desviación estándar de la demanda diaria',
    descripcion:
      'Medida de la variabilidad día a día de la demanda.',
  },
  {
    simbolo: 'L',
    nombre: 'Tiempo de entrega (Lead Time)',
    descripcion:
      'Días que tarda el proveedor en entregar una orden después de emitirla. Se asume fijo y conocido.',
  },
  {
    simbolo: 'CSL',
    nombre: 'Nivel de servicio',
    descripcion:
      'Probabilidad deseada de no agotar el inventario durante el tiempo de entrega, expresada en porcentaje y estrictamente entre 50% y 99.99%.',
  },
  {
    simbolo: 'Z',
    nombre: 'Valor Z',
    descripcion:
      'Cuantil de la distribución normal estándar para la probabilidad CSL (Z = Φ⁻¹(CSL)). Se obtiene numéricamente con la inversa de la normal.',
  },
  {
    simbolo: 'D_L',
    nombre: 'Demanda durante el tiempo de entrega',
    descripcion:
      'Cantidad esperada que se consume durante el lead time (D_L = d̄ × L).',
  },
  {
    simbolo: '\\sigma_L',
    nombre: 'Desviación estándar durante el tiempo de entrega',
    descripcion:
      'Variabilidad de la demanda acumulada en L días (σ_L = σ_d × √L). Al ser el lead time constante, basta multiplicar la desviación diaria por √L.',
  },
  {
    simbolo: 'SS',
    nombre: 'Stock de Seguridad',
    descripcion:
      'Inventario adicional que protege contra la variabilidad de la demanda durante el lead time (SS = Z × σ_L).',
  },
  {
    simbolo: 'ROP',
    nombre: 'Punto de Reorden',
    descripcion:
      'Nivel de inventario en el que se debe emitir una nueva orden, para cubrir la demanda esperada más el stock de seguridad (ROP = D_L + SS).',
  },
];

export const VARIABLES_TEORIADECISIONES: VariableDef[] = [
  {
    simbolo: 'a_{ij}',
    nombre: 'Pago',
    descripcion:
      'Beneficio (o ganancia) que obtiene la alternativa i si se presenta el estado de la naturaleza j.',
  },
  {
    simbolo: 'p_j',
    nombre: 'Probabilidad del estado',
    descripcion:
      'Probabilidad de que se presente el estado de la naturaleza j. Si se definen, deben aplicarse a todos los estados y sumar exactamente 1.',
  },
  {
    simbolo: '\\alpha',
    nombre: 'Coeficiente de optimismo',
    descripcion:
      'Coeficiente de optimismo de Hurwicz, entre 0 y 1. α = 1 es totalmente optimista y α = 0 totalmente pesimista.',
  },
  {
    simbolo: '\\max_j a_{ij}',
    nombre: 'Máximo de la fila',
    descripcion:
      'Mejor pago posible de la alternativa i, usado por Maximax y Hurwicz.',
  },
  {
    simbolo: '\\min_j a_{ij}',
    nombre: 'Mínimo de la fila',
    descripcion:
      'Peor pago posible de la alternativa i, usado por Maximin y Hurwicz.',
  },
  {
    simbolo: 'r_{ij}',
    nombre: 'Arrepentimiento',
    descripcion:
      'Diferencia entre el mejor pago del estado j y el pago de la alternativa i en ese estado. Mide cuánto se pierde por no haber elegido la mejor opción.',
  },
  {
    simbolo: 'VME',
    nombre: 'Valor Monetario Esperado',
    descripcion:
      'Promedio ponderado de los pagos de cada alternativa con las probabilidades de los estados (VME_i = Σ_j p_j · a_ij).',
  },
];

export const VARIABLES_TEORIACOLAS: VariableDef[] = [
  {
    simbolo: '\\lambda',
    nombre: 'Tasa de llegada',
    descripcion:
      'Número promedio de clientes que llegan por unidad de tiempo. Las llegadas se modelan como un proceso de Poisson.',
  },
  {
    simbolo: '\\mu',
    nombre: 'Tasa de servicio',
    descripcion:
      'Número de clientes promedio que un servidor puede atender por unidad de tiempo (1/μ es el tiempo de servicio esperado). Los tiempos de servicio son exponenciales.',
  },
  {
    simbolo: 'c',
    nombre: 'Número de servidores',
    descripcion:
      'Cantidad de servidores en paralelo. Con c = 1 el modelo es M/M/1; con c ≥ 2 es M/M/c.',
  },
  {
    simbolo: '\\rho',
    nombre: 'Factor de utilización',
    descripcion:
      'Fracción del tiempo que cada servidor está ocupado en promedio: ρ = λ/(c·μ). El sistema solo es estable si ρ < 1.',
  },
  {
    simbolo: 'P_0',
    nombre: 'Probabilidad de sistema vacío',
    descripcion:
      'Probabilidad de que no haya clientes en el sistema. En M/M/1 vale P0 = 1 − ρ; en M/M/c se obtiene con la sumatoria de Erlang C.',
  },
  {
    simbolo: 'L_q',
    nombre: 'Clientes en la cola (esperado)',
    descripcion:
      'Número promedio de clientes esperando a ser atendidos (sin contar a los que están en servicio).',
  },
  {
    simbolo: 'L',
    nombre: 'Clientes en el sistema (esperado)',
    descripcion:
      'Número promedio de clientes en el sistema, en cola o en servicio: L = L_q + λ/μ.',
  },
  {
    simbolo: 'W_q',
    nombre: 'Tiempo de espera en la cola',
    descripcion:
      'Tiempo promedio que un cliente espera antes de ser atendido: W_q = L_q / λ. Se mide en las mismas unidades de tiempo de λ y μ.',
  },
  {
    simbolo: 'W',
    nombre: 'Tiempo en el sistema',
    descripcion:
      'Tiempo promedio total que un cliente pasa en la cola y en servicio: W = W_q + 1/μ.',
  },
  {
    simbolo: 'P_n',
    nombre: 'Probabilidad de n clientes',
    descripcion:
      'Probabilidad de que haya exactamente n clientes en el sistema. En un sistema estable decae asintóticamente conforme crece n.',
  },
];