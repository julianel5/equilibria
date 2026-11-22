import type { VariableDef } from '@shared/components/Glossary';

const coeficienteObjetivo: VariableDef = {
  simbolo: 'c_j',
  nombre: 'Coeficiente de la función objetivo',
  descripcion: 'Aporte al valor de Z por cada unidad de la variable de decisión j, por ejemplo, su costo o ganancia unitaria.',
};

const coeficienteRestriccion: VariableDef = {
  simbolo: 'a_{ij}',
  nombre: 'Coeficiente de una restricción',
  descripcion: 'Cantidad con que contribuye una unidad de la variable j al lado izquierdo de la restricción i.',
};

const ladoDerecho: VariableDef = {
  simbolo: 'b_i',
  nombre: 'Lado derecho de la restricción',
  descripcion: 'Límite, requerimiento o valor exacto de la restricción i, según se use ≤, ≥ o =.',
};

const objetivo: VariableDef = {
  simbolo: 'Z,\\ Z^*',
  nombre: 'Valor de la función objetivo',
  descripcion: 'Z es el valor del objetivo para una solución dada; Z* es el mejor valor alcanzable.',
};

const modeloLineal: VariableDef[] = [
  {
    simbolo: 'x_j,\\ x^*',
    nombre: 'Variables de decisión y solución óptima',
    descripcion: 'x_j es la cantidad que se decide para la actividad j. El vector x* reúne las cantidades de una solución óptima. En el formulario, cada actividad puede llevar un nombre propio.',
  },
  coeficienteObjetivo,
  coeficienteRestriccion,
  ladoDerecho,
  objetivo,
];

const holgura: VariableDef = {
  simbolo: 'S_i',
  nombre: 'Variable de holgura',
  descripcion: 'Se suma a una restricción ≤ para convertirla en igualdad; mide cuánto falta para llegar al límite.',
};

const exceso: VariableDef = {
  simbolo: 'E_i',
  nombre: 'Variable de exceso',
  descripcion: 'Se resta del lado izquierdo de una restricción ≥ al escribirla como igualdad; mide cuánto se supera el mínimo exigido.',
};

const costosTableau: VariableDef = {
  simbolo: 'Z_j - C_j',
  nombre: 'Costo reducido en el tableau',
  descripcion: 'Z_j es el valor de la columna j según los costos de la base; C_j es su coeficiente en el objetivo. La diferencia, con el signo que usa esta tabla, señala qué columnas pueden mejorar el objetivo.',
};

const variablesBasicas: VariableDef = {
  simbolo: 'x_B,\\ c_B',
  nombre: 'Variables y costos de la base',
  descripcion: 'x_B reúne las variables básicas de la iteración y c_B sus coeficientes en el objetivo. Las variables fuera de la base valen cero en esa solución.',
};

const ladoDerechoTableau: VariableDef = {
  simbolo: 'b',
  nombre: 'Columna derecha del tableau',
  descripcion: 'Contiene los valores de las variables básicas en la iteración actual. Tras los pivotes pueden diferir de los lados derechos originales.',
};

const notacionTableau: VariableDef[] = [
  variablesBasicas,
  ladoDerechoTableau,
  costosTableau,
];

export const VARIABLES_METODO_GRAFICO: VariableDef[] = [
  {
    simbolo: 'x_1,\\ x_2',
    nombre: 'Variables de decisión',
    descripcion: 'Cantidades que se deciden en el problema. Cada punto del plano indica un valor en el eje horizontal (x₁) y otro en el vertical (x₂).',
  },
  coeficienteObjetivo,
  coeficienteRestriccion,
  ladoDerecho,
  objetivo,
  {
    simbolo: '(x_1^*, x_2^*)',
    nombre: 'Solución óptima',
    descripcion: 'Coordenadas de un punto de la región factible que alcanza el mejor valor de Z.',
  },
];

const notacionPivoteoPrimal: VariableDef[] = [
  {
    simbolo: 'B,\\ B^{-1}',
    nombre: 'Matriz de la base y su inversa',
    descripcion: 'B se forma con las columnas de las variables básicas. Su inversa permite calcular los valores básicos y las columnas transformadas en el Simplex Revisado.',
  },
  {
    simbolo: 'b_B,\\ y',
    nombre: 'Valores básicos y multiplicadores',
    descripcion: 'b_B = B⁻¹b da los valores básicos actuales a partir del lado derecho original. El vector y contiene los multiplicadores de las restricciones según los costos de la base.',
  },
  {
    simbolo: 'a_e,\\ d',
    nombre: 'Columna entrante y dirección',
    descripcion: 'a_e es la columna de la variable entrante antes de transformarla. d = B⁻¹a_e indica cómo cambian los valores básicos al aumentar esa variable.',
  },
  {
    simbolo: 'b_i/a_{ie}',
    nombre: 'Razón mínima',
    descripcion: 'En el tableau se divide el valor básico de la fila i entre el coeficiente positivo de la columna entrante e. La menor razón determina la fila que sale.',
  },
];

export const VARIABLES_SIMPLEX: VariableDef[] = [
  ...modeloLineal,
  holgura,
  ...notacionTableau,
  ...notacionPivoteoPrimal,
];

export const VARIABLES_GRAN_M: VariableDef[] = [
  ...modeloLineal,
  holgura,
  exceso,
  {
    simbolo: 'R_i',
    nombre: 'Variable artificial',
    descripcion: 'Se agrega a una restricción ≥ o = para poder iniciar el método. Todas las artificiales deben valer cero en una solución factible del problema original.',
  },
  {
    simbolo: 'M',
    nombre: 'Penalización de las artificiales',
    descripcion: 'Magnitud positiva muy grande: se resta M por unidad artificial al maximizar y se suma al minimizar. La vista algebraica conserva M como símbolo.',
  },
  ...notacionTableau,
  ...notacionPivoteoPrimal,
  {
    simbolo: 'a+bM',
    nombre: 'Valor en la vista algebraica',
    descripcion: 'a es la parte constante y b el coeficiente de M en el valor mostrado. Aquí b no se refiere a la columna derecha del tableau.',
  },
];

export const VARIABLES_SENSIBILIDAD: VariableDef[] = [
  ...modeloLineal,
  {
    simbolo: 'y_i',
    nombre: 'Precio sombra',
    descripcion: 'Cambio en Z* por cada unidad adicional en el lado derecho de la restricción i, dentro de su rango y si el resto del modelo permanece fijo.',
  },
  {
    simbolo: '\\bar c_j',
    nombre: 'Costo reducido',
    descripcion: 'Diferencia entre el coeficiente c_j y el valor de la columna j a precios sombra. Para una variable no básica indica cuánto tendría que mejorar c_j para que pueda entrar en una base óptima.',
  },
  {
    simbolo: 'b_i,\\ c_j\\ \\text{(rangos)}',
    nombre: 'Rangos de factibilidad y optimalidad',
    descripcion: 'El rango de b_i conserva factible la base óptima; el rango de c_j conserva óptima la base. Cada rango supone que solo cambia ese dato.',
  },
  {
    simbolo: '\\Delta b,\\ \\Delta c',
    nombre: 'Variación simulada',
    descripcion: 'Diferencia entre el valor nuevo y el original del lado derecho o del coeficiente objetivo que se está probando.',
  },
  {
    simbolo: '\\lvert b_i-(Ax)_i\\rvert',
    nombre: 'Holgura o excedente',
    descripcion: 'Para ≤, es el límite menos el valor alcanzado; para ≥ se toma la diferencia al revés. Si es cero, la restricción está activa.',
  },
];

export const VARIABLES_SIMPLEX_DUAL: VariableDef[] = [
  ...modeloLineal,
  holgura,
  exceso,
  ...notacionTableau,
  {
    simbolo: 'y_i,\\ W',
    nombre: 'Variable y objetivo del problema dual',
    descripcion: 'y_i es la variable dual asociada a la restricción i del primal; en el óptimo se interpreta como precio sombra. W es el valor de la función objetivo dual.',
  },
  {
    simbolo: 'r,\\ e,\\ a_{rj}',
    nombre: 'Fila saliente y columna entrante',
    descripcion: 'r es la fila de la variable que sale; e es la columna que entra. a_{rj} es el coeficiente de la columna j en esa fila, que se usa en la prueba de razón dual.',
  },
];

export const VARIABLES_LEMKE: VariableDef[] = [
  {
    simbolo: 'z_i,\\ w_i',
    nombre: 'Variables complementarias',
    descripcion: 'Ambas son no negativas y al menos una de cada pareja debe valer cero. Los vectores z y w reúnen todas las parejas.',
  },
  {
    simbolo: 'M,\\ q',
    nombre: 'Matriz y vector del sistema',
    descripcion: 'M es la matriz que multiplica a z y q es el vector constante en w = Mz + q. Aquí M no es la penalización del método Gran M.',
  },
  {
    simbolo: 'z_0,\\ e',
    nombre: 'Variable artificial y vector de unos',
    descripcion: 'Si q tiene valores negativos, Lemke introduce z₀ con la columna e para hacer factible el arranque. La artificial debe salir de la base para obtener la solución original.',
  },
  ladoDerechoTableau,
  {
    simbolo: 'b_i/a_{ie}',
    nombre: 'Razón de pivote',
    descripcion: 'Divide el valor básico de la fila i entre el coeficiente positivo de la columna entrante e. En esta prueba, e es un índice de columna, no el vector de unos.',
  },
  {
    simbolo: 'x,\\ Q,\\ c',
    nombre: 'Variables y objetivo cuadrático',
    descripcion: 'x reúne las variables de decisión, Q contiene los coeficientes de la parte cuadrática y c los de la parte lineal.',
  },
  {
    simbolo: 'A,\\ b',
    nombre: 'Restricciones del modelo cuadrático',
    descripcion: 'A contiene los coeficientes de las restricciones y b sus lados derechos, en la forma Ax ≥ b.',
  },
  {
    simbolo: '\\lambda,\\ \\mu,\\ s',
    nombre: 'Multiplicadores y excedente del modelo cuadrático',
    descripcion: 'λ corresponde a Ax ≥ b y μ a la no negatividad de x. El excedente s = Ax − b mide cuánto se supera cada mínimo. En el sistema complementario se agrupan como z = (x, λ) y w = (μ, s).',
  },
];

export const VARIABLES_TRANSPORTE: VariableDef[] = [
  {
    simbolo: 'i,\\ j,\\ m,\\ n',
    nombre: 'Índices y tamaño de la red',
    descripcion: 'i identifica un origen entre los m disponibles y j un destino entre los n disponibles.',
  },
  {
    simbolo: 'x_{ij},\\ c_{ij}',
    nombre: 'Cantidad enviada y costo por ruta',
    descripcion: 'x_{ij} es la cantidad que se envía del origen i al destino j; c_{ij} es el costo (o beneficio) por cada unidad enviada en esa ruta.',
  },
  {
    simbolo: 'O_i,\\ D_j',
    nombre: 'Oferta y demanda',
    descripcion: 'O_i es la cantidad disponible en el origen i y D_j la cantidad requerida en el destino j.',
  },
  objetivo,
  {
    simbolo: 'u_i,\\ v_j',
    nombre: 'Potenciales MODI',
    descripcion: 'Valores asociados al origen i y al destino j que se calculan a partir de las rutas básicas para evaluar las demás rutas.',
  },
  {
    simbolo: 'd_{ij}',
    nombre: 'Costo reducido de una ruta',
    descripcion: 'Es c_{ij} − u_i − v_j; en la tabla de minimización, un valor negativo en una ruta no básica permitida indica una oportunidad de mejora.',
  },
  {
    simbolo: '\\theta',
    nombre: 'Cantidad que se reasigna',
    descripcion: 'Es la menor asignación en las celdas marcadas con menos del ciclo MODI. Indica cuánto se puede reasignar sin dejar envíos negativos.',
  },
];
