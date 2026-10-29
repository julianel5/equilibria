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

export const VARIABLES_PERIODOUNICO: VariableDef[] = [
  {
    simbolo: 'p',
    nombre: 'Precio de venta',
    descripcion:
      'Precio de venta unitario del producto. Determina junto con el costo de compra la utilidad por unidad vendida (C_u = p − c).',
  },
  {
    simbolo: 'c',
    nombre: 'Costo de compra',
    descripcion:
      'Costo de compra unitario pagado al proveedor. Es el costo de cada unidad ordenada al inicio del período.',
  },
  {
    simbolo: 'v',
    nombre: 'Valor de rescate',
    descripcion:
      'Valor que se recupera por cada unidad no vendida al final del período (salvamento, liquidación o reventa). Debe ser menor al costo de compra (v < c).',
  },
  {
    simbolo: 'C_u',
    nombre: 'Costo de subestimación (escasez)',
    descripcion:
      'Costo de quedarse corto: la utilidad que se pierde por cada unidad demandada que no se pudo satisfacer (C_u = p − c).',
  },
  {
    simbolo: 'C_o',
    nombre: 'Costo de sobreestimación (exceso)',
    descripcion:
      'Costo de pedir de más: la pérdida por cada unidad comprada y no vendida al final del período (C_o = c − v).',
  },
  {
    simbolo: 'P(D \\leq Q^*)',
    nombre: 'Razón crítica (nivel de servicio)',
    descripcion:
      'Probabilidad de que la demanda no supere la cantidad óptima. La política del newsvendor la fija en C_u / (C_u + C_o): balance exacto entre el costo de faltar y el de sobrar.',
  },
  {
    simbolo: 'Z',
    nombre: 'Valor Z',
    descripcion:
      'Cuantil de la normal estándar para la razón crítica (Z = Φ⁻¹(CSL)). Se usa solo cuando la demanda sigue una distribución normal para convertir P(D ≤ Q*) en Q* = μ + Z·σ.',
  },
  {
    simbolo: 'Q^*',
    nombre: 'Cantidad óptima de pedido',
    descripcion:
      'Cantidad a ordenar al inicio del período. Con demanda normal vale Q* = μ + Z·σ; con demanda uniforme en [a, b], Q* = a + CSL·(b − a).',
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
  {
    simbolo: 'C_s',
    nombre: 'Costo de servicio por servidor',
    descripcion:
      'Costo de operación de un servidor por unidad de tiempo. El costo total de servicio es CS = s · C_s.',
  },
  {
    simbolo: 'C_w',
    nombre: 'Costo de espera',
    descripcion:
      'Costo de tener un cliente esperando (por unidad de medida de L o L_q). Penaliza todo el sistema (L) o solo la fila (L_q).',
  },
  {
    simbolo: 'CT',
    nombre: 'Costo total del sistema',
    descripcion:
      'Costo total esperado de la cola: CT = CS + CW, donde CS = s · C_s y CW = Base · C_w.',
  },
];

export const VARIABLES_SIMPLEX: VariableDef[] = [
  {
    simbolo: 'x_j',
    nombre: 'Variable de decisión',
    descripcion:
      'Variable j del problema: la cantidad a decidir. Todos los cálculos usan fracciones exactas (nunca punto flotante).',
  },
  {
    simbolo: 'c_j',
    nombre: 'Coeficiente de la función objetivo',
    descripcion:
      'Contribución al valor de Z por unidad de la variable x_j en max Z = Σ c_j x_j (o min).',
  },
  {
    simbolo: 'S_i',
    nombre: 'Variable de holgura',
    descripcion:
      'Variable que absorbe la diferencia entre el lado izquierdo y el b derecho de la restricción i cuando es ≤: a_{i1}x_1 + … + S_i = b_i.',
  },
  {
    simbolo: 'b_i',
    nombre: 'Término independiente',
    descripcion:
      'Lado derecho de la restricción i. En este módulo debe cumplir b_i ≥ 0 y todas las restricciones deben ser de tipo ≤.',
  },
  {
    simbolo: 'Z_j - C_j',
    nombre: 'Costo reducido (fila del tabular)',
    descripcion:
      'Última fila del tableau: Z_j − C_j = c_B B^{-1} a_j − c_j. En MAX entra la columna más negativa y el óptimo exige todos ≥ 0; en MIN el criterio se invierte.',
  },
  {
    simbolo: 'B^{-1}',
    nombre: 'Inversa de la base',
    descripcion:
      'Inversa exacta (Gauss–Jordan) de la matriz formada por las columnas básicas. Es el corazón del Simplex Revisado.',
  },
  {
    simbolo: 'y^T',
    nombre: 'Multiplicadores del Simplex',
    descripcion:
      'Vector y^T = c_B B^{-1} que permite calcular los costos reducidos \bar c_j = c_j − y^T a_j sin reconstruir todo el tableau.',
  },
  {
    simbolo: 'x^*',
    nombre: 'Solución óptima',
    descripcion:
      'Valores de las variables de decisión en el punto extremo óptimo; los que no están en la base valen 0.',
  },
  {
    simbolo: 'Z^*',
    nombre: 'Valor óptimo',
    descripcion:
      'Mejor valor finito de la función objetivo. Si ninguna prueba de la razón mínima encuentra denominador positivo, el problema es no acotado.',
  },
];