/**
 * Problemas típicos de Programación Lineal que se pueden auto-rellenar en las
 * páginas de Simplex y Gran M. Los problemas del "Taller de Investigación de
 * Operaciones (ING01203)" se incluyen ya formulados: el contexto trae el
 * enunciado en texto plano, la definición de variables y el modelo.
 */
export interface ProblemaTipico {
  id: string;
  nombre: string;
  descripcion: string;
  contexto: string;
  objetivo: 'max' | 'min';
  metodo: 'tabular' | 'revisado';
  variables: string[];
  /** Qué representa cada variable, en el mismo orden (se muestra en los resultados). */
  etiquetas: string[];
  coeficientesObjetivo: string[];
  restricciones: { coeficientes: string[]; operador: 'LE' | 'GE' | 'EQ'; b: string }[];
}

export const PROBLEMAS_TIPICOS: ProblemaTipico[] = [
  {
    id: 'agro-tech',
    nombre: 'Agro-Tech (Fertilizantes)',
    descripcion: 'Planificación de producción de fertilizantes 5-5-10 y 5-10-5',
    contexto: `Tom Anderson, gerente de producción de la Agro-tech necesita planear la combinación de fertilizantes para el siguiente mes y no tiene claro cómo va a proceder para elaborar el plan. La Agro-Tech es una compañía pequeña de productos químicos que fabrica entre otros artículos dos tipos de fertilizante que se elaboran combinando ingredientes que se compran con proveedores externos. Cada mes, Tom tiene que planear la cantidad de cada fertilizante que debe producirse. Su plan debe tomar en consideración el costo de los ingredientes, el precio de venta de los fertilizantes, cualesquier pedido que deba surtirse y las restricciones impuestas al uso de los recursos de la compañía, mano de obra, materias primas o tiempo de máquina. El proceso de planeación para este mes es más difícil que lo normal. Por lo general la Agro-Tech fabrica fertilizantes de acuerdo con los pedidos de los clientes pero este mes los fertilizantes van a venderse a través de un mayorista. Esto complica las cosas porque Tom tiene que elaborar un programa de producción que conduzca a las mayores utilidades posibles para la Agro-Tech, al mismo tiempo que se utiliza sólo la cantidad de ingredientes que están disponibles para el mes.

Los dos fertilizantes que la Agro-Tech fabrica son las mezclas denominadas 5-5-10 y 5-10-5. En cada caso, el primer valor se refiere al porcentaje que el producto final tiene de nitrato químico, el segundo valor se refiere al porcentaje de fosfato que aparece en el producto final y el tercer valor da el porcentaje de potasio. El fertilizante se estabiliza con un material de relleno como podría ser barro. Por ejemplo, el 5-5-10 está elaborado con 5% de nitrato, 5% de fosfato y 10% de potasio y el 80% restante es barro. El mayorista comprará cualquier cantidad de ambos fertilizantes que la Agro-Tech pueda fabricar. Esta dispuesto a pagar $71.50 por tonelada del 5-5-10 y $69 por tonelada del 5-10-5. Este mes, la disponibilidad y costos de materias primas son 1100 toneladas de nitrato a $200 por tonelada, 1800 toneladas de fosfato a $80 cada una y 2000 toneladas de potasio a $160 cada una. El relleno esta disponible en cantidades ilimitadas al precio de $10 por tonelada, pero para los otros tres ingredientes sólo se dispone de las cantidades mencionadas antes. No hay restricciones para el uso de la mano de obra ni tampoco para el empleo de la maquinaria durante el mes, pero se tiene un costo de $15 por tonelada por concepto de mezclado de los fertilizantes. La pregunta que Tom debe resolver es ¿cómo utilizar los recursos escasos (nitrato, fosfato y potasio) de que dispone Agro-Tech, de manera que se obtengan las mayores utilidades para la compañía?`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2'],
    etiquetas: ['Fertilizante 5-5-10 (ton)', 'Fertilizante 5-10-5 (ton)'],
    coeficientesObjetivo: ['18.5', '20'],
    restricciones: [
      { coeficientes: ['0.05', '0.05'], operador: 'LE', b: '1100' },
      { coeficientes: ['0.05', '0.1'], operador: 'LE', b: '1800' },
      { coeficientes: ['0.1', '0.05'], operador: 'LE', b: '2000' },
    ],
  },
  {
    id: 'mc-camisetas',
    nombre: 'MC (Camisetas)',
    descripcion: 'Producción de camisetas colegiales y empresariales con restricciones de tiempo, pedido especial y producción mínima.',
    contexto: `MC confecciona dos tipos de camisetas en cada período de producción: Colegiales y Empresariales. El costo de producción de cada camiseta colegial es de $2 y de cada camiseta empresarial es de $3. Para confeccionar las camisetas hay disponibles 600 horas durante el período de producción, advirtiendo que el procesamiento de cada camiseta colegial es 2 horas y cada camiseta empresarial una hora. Se debe cumplir con un pedido especial para un cliente durante el período de producción de al menos 125 camisetas colegiales y la producción total de ambos tipos de camisetas debe ser como mínimo de 350 unidades.`,
    objetivo: 'min',
    metodo: 'tabular',
    variables: ['X1', 'X2'],
    etiquetas: ['Camisetas colegiales', 'Camisetas empresariales'],
    coeficientesObjetivo: ['2', '3'],
    restricciones: [
      { coeficientes: ['2', '1'], operador: 'LE', b: '600' },
      { coeficientes: ['1', '0'], operador: 'GE', b: '125' },
      { coeficientes: ['1', '1'], operador: 'GE', b: '350' },
    ],
  },
  {
    id: 'imc-inversion',
    nombre: 'IMC (Cartera de inversión)',
    descripcion: 'Reparto de $100.000 entre acciones y bonos municipales para maximizar el rendimiento anual.',
    contexto: `IMC es una compañía de manejo de efectivo que está considerando invertir $100.000 en una o más de las siguientes opciones, con la tasa anticipada de rendimiento que se muestra:

- Acciones preferenciales: 9%
- Acciones comunes: 8%
- Acciones estatales: 7%
- Bonos municipales: 6%

La gerencia de IMC ha impuesto las siguientes pautas de inversión:
1. La inversión en bonos municipales debe ser de al menos $20.000.
2. La inversión en bonos municipales no debe exceder el 20% de la inversión total en acciones, más $50.000.
3. La inversión total en acciones no debe ser mayor al 60% de la inversión total.
4. La inversión total no debe exceder los fondos disponibles.

Como administrador de la cartera, quiere determinar la estrategia de inversión que maximice el rendimiento total anual esperado sin violar ningún lineamiento de inversión.

Variables de decisión (en $):
X1 = acciones preferenciales, X2 = acciones comunes, X3 = acciones estatales, X4 = bonos municipales.

Modelo:
Max Z = 0.09X1 + 0.08X2 + 0.07X3 + 0.06X4
X4 >= 20000
X4 <= 0.2(X1 + X2 + X3) + 50000  ->  -0.2X1 - 0.2X2 - 0.2X3 + X4 <= 50000
X1 + X2 + X3 <= 0.6(X1 + X2 + X3 + X4)  ->  0.4X1 + 0.4X2 + 0.4X3 - 0.6X4 <= 0
X1 + X2 + X3 + X4 <= 100000`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2', 'X3', 'X4'],
    etiquetas: ['Acciones preferenciales ($)', 'Acciones comunes ($)', 'Acciones estatales ($)', 'Bonos municipales ($)'],
    coeficientesObjetivo: ['0.09', '0.08', '0.07', '0.06'],
    restricciones: [
      { coeficientes: ['0', '0', '0', '1'], operador: 'GE', b: '20000' },
      { coeficientes: ['-0.2', '-0.2', '-0.2', '1'], operador: 'LE', b: '50000' },
      { coeficientes: ['0.4', '0.4', '0.4', '-0.6'], operador: 'LE', b: '0' },
      { coeficientes: ['1', '1', '1', '1'], operador: 'LE', b: '100000' },
    ],
  },
  {
    id: 'productos-r-t',
    nombre: 'Productos R y T (Colado)',
    descripcion: 'Producción de R y T eligiendo material y si el colado de T se compra o se hace en planta.',
    contexto: `Se fabrican dos productos, R y T. Cada producto se procesa en los departamentos de colado, maquinado y ensamble. El colado del producto T puede comprarse a $6 la pieza y después procesarse en las máquinas y ensamblarse. Si el colado no se compra, el producto T se hace a partir de 2 kg de material K y se cuela en la planta.

El producto R puede hacerse ya sea con 4 kg de material L o con 5 kg de material K. Se dispone de 2000 kg de material L y de 10000 kg de material K para el siguiente período de producción. El material L cuesta 10 centavos el kg y el material K cuesta 20 centavos el kg. El departamento de colado puede colar 3000 unidades del producto R o del producto T en el siguiente período de producción.

Se dispone de 200 horas de tiempo de máquina durante el siguiente período. El maquinado del producto R hecho con el material K requiere 10 minutos; el del producto R hecho con el material L requiere 8 minutos; el del producto T requiere 6 minutos. El departamento de ensamble puede armar 2000 unidades del producto R, o 4000 unidades del producto T, o cualquier combinación.

Los costos variables de colado suman $1 por unidad. Los costos variables de maquinado son de $0.20 por minuto. Los costos variables de ensamble son nulos. El producto R se vende a $10 y el producto T se vende a $12.

Variables de decisión (unidades):
X1 = R hecho con material L
X2 = R hecho con material K
X3 = T con colado comprado
X4 = T colado en planta (con material K)

Utilidad por unidad (precio - material - colado - maquinado):
X1: 10 - 0.40 - 1 - 1.60 = 7.00
X2: 10 - 1.00 - 1 - 2.00 = 6.00
X3: 12 - 6 (colado comprado) - 1.20 = 4.80
X4: 12 - 0.40 - 1 - 1.20 = 9.40

Modelo:
Max Z = 7X1 + 6X2 + 4.8X3 + 9.4X4
Material L: 4X1 <= 2000
Material K: 5X2 + 2X4 <= 10000
Colado: X1 + X2 + X4 <= 3000
Maquinado (minutos): 8X1 + 10X2 + 6X3 + 6X4 <= 12000
Ensamble: X1/2000 + X2/2000 + X3/4000 + X4/4000 <= 1  ->  2X1 + 2X2 + X3 + X4 <= 4000`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2', 'X3', 'X4'],
    etiquetas: ['R hecho con material L', 'R hecho con material K', 'T con colado comprado', 'T colado en planta'],
    coeficientesObjetivo: ['7', '6', '4.8', '9.4'],
    restricciones: [
      { coeficientes: ['4', '0', '0', '0'], operador: 'LE', b: '2000' },
      { coeficientes: ['0', '5', '0', '2'], operador: 'LE', b: '10000' },
      { coeficientes: ['1', '1', '0', '1'], operador: 'LE', b: '3000' },
      { coeficientes: ['8', '10', '6', '6'], operador: 'LE', b: '12000' },
      { coeficientes: ['2', '2', '1', '1'], operador: 'LE', b: '4000' },
    ],
  },
  {
    id: 'corte-papel',
    nombre: 'Corte de rollos de papel',
    descripcion: 'Patrones de corte de rollos de 75 cm y 90 cm para cubrir la demanda con la mínima pérdida.',
    contexto: `Una industria que fabrica papel y lo distribuye en rollos de largos diferentes debe determinar la mejor forma de realizar el proceso de corte. Los rollos de papel que se producen tienen un ancho de 75 cm y de 90 cm; sin embargo, los clientes demandan rollos según la siguiente lista:

- Requerimiento 1: ancho 25 cm, largo 50 metros
- Requerimiento 2: ancho 35 cm, largo 60 metros
- Requerimiento 3: ancho 40 cm, largo 70 metros

Al cortar los rollos se incurre en una pérdida de material que depende de la forma en que se corten los rollos originales. Se desea determinar la forma de efectuar el corte de manera que se satisfaga la demanda y se minimice la pérdida total de material.

Variables de decisión: Xj = metros de largo cortados con el patrón j.
Patrones del rollo de 75 cm (anchos que se obtienen y pérdida):
X1: 3 de 25 (pérdida 0 cm)
X2: 1 de 25 + 1 de 35 (pérdida 15 cm)
X3: 1 de 25 + 1 de 40 (pérdida 10 cm)
X4: 2 de 35 (pérdida 5 cm)
X5: 1 de 35 + 1 de 40 (pérdida 0 cm)
Patrones del rollo de 90 cm:
X6: 3 de 25 (pérdida 15 cm)
X7: 2 de 25 + 1 de 35 (pérdida 5 cm)
X8: 2 de 25 + 1 de 40 (pérdida 0 cm)
X9: 2 de 35 (pérdida 20 cm)
X10: 1 de 35 + 1 de 40 (pérdida 15 cm)
X11: 2 de 40 (pérdida 10 cm)

Modelo (pérdida en cm x metro):
Min Z = 0X1 + 15X2 + 10X3 + 5X4 + 0X5 + 15X6 + 5X7 + 0X8 + 20X9 + 15X10 + 10X11
Ancho 25 cm: 3X1 + X2 + X3 + 3X6 + 2X7 + 2X8 = 50
Ancho 35 cm: X2 + 2X4 + X5 + X7 + 2X9 + X10 = 60
Ancho 40 cm: X3 + X5 + X8 + 2X11 = 70
(Se usan igualdades para no producir de más, ya que el sobrante también sería pérdida.)`,
    objetivo: 'min',
    metodo: 'tabular',
    variables: ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10', 'X11'],
    etiquetas: ['Patrón 1 · 75 cm: 3×25 (m)', 'Patrón 2 · 75 cm: 25+35 (m)', 'Patrón 3 · 75 cm: 25+40 (m)', 'Patrón 4 · 75 cm: 2×35 (m)', 'Patrón 5 · 75 cm: 35+40 (m)', 'Patrón 6 · 90 cm: 3×25 (m)', 'Patrón 7 · 90 cm: 2×25+35 (m)', 'Patrón 8 · 90 cm: 2×25+40 (m)', 'Patrón 9 · 90 cm: 2×35 (m)', 'Patrón 10 · 90 cm: 35+40 (m)', 'Patrón 11 · 90 cm: 2×40 (m)'],
    coeficientesObjetivo: ['0', '15', '10', '5', '0', '15', '5', '0', '20', '15', '10'],
    restricciones: [
      { coeficientes: ['3', '1', '1', '0', '0', '3', '2', '2', '0', '0', '0'], operador: 'EQ', b: '50' },
      { coeficientes: ['0', '1', '0', '2', '1', '0', '1', '0', '2', '1', '0'], operador: 'EQ', b: '60' },
      { coeficientes: ['0', '0', '1', '0', '1', '0', '0', '1', '0', '0', '2'], operador: 'EQ', b: '70' },
    ],
  },
  {
    id: 'banco-asb',
    nombre: 'Banco ASB (Préstamos)',
    descripcion: 'Asignación de US$1.000.000 a préstamos hipotecarios, personales y automotrices.',
    contexto: `El banco ASB dispone de US$1.000.000 en fondos nuevos que debe asignar a préstamos hipotecarios (H), personales (P) y automotrices (A). Las tasas de interés anual para los tres tipos de préstamo son: 7% para hipotecarios, 12% para personales y 9% para automotrices.

El comité de planeación del banco ha decidido que al menos el 40% de los nuevos fondos deben asignarse a préstamos hipotecarios. Además, el comité ha especificado que la cantidad asignada a préstamos personales no puede exceder el 60% de la cantidad asignada a préstamos automotrices.

Variables de decisión (US$): X1 = hipotecarios (H), X2 = personales (P), X3 = automotrices (A).

Modelo:
Max Z = 0.07X1 + 0.12X2 + 0.09X3
Fondos: X1 + X2 + X3 <= 1000000
Hipotecarios >= 40% de los fondos: X1 >= 0.4(X1 + X2 + X3)  ->  0.6X1 - 0.4X2 - 0.4X3 >= 0
Personales <= 60% de automotrices: X2 <= 0.6X3  ->  X2 - 0.6X3 <= 0`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2', 'X3'],
    etiquetas: ['Préstamos hipotecarios (US$)', 'Préstamos personales (US$)', 'Préstamos automotrices (US$)'],
    coeficientesObjetivo: ['0.07', '0.12', '0.09'],
    restricciones: [
      { coeficientes: ['1', '1', '1'], operador: 'LE', b: '1000000' },
      { coeficientes: ['0.6', '-0.4', '-0.4'], operador: 'GE', b: '0' },
      { coeficientes: ['0', '1', '-0.6'], operador: 'LE', b: '0' },
    ],
  },
  {
    id: 'mezcla-cafe',
    nombre: 'Mezcla de café X y XX',
    descripcion: 'Mezcla de café colombiano, brasilero y mexicano con requisitos de resistencia, acidez y cafeína.',
    contexto: `Una compañía cafetera mezcla café colombiano, brasilero y mexicano para sacar dos marcas de café al mercado: Café X y Café XX. Las características de la mezcla incluyen: resistencia (R), acidez (A) y porcentaje de cafeína (% C).

Características de cada café (precio de costo por libra, índice de resistencia, índice de acidez, % de cafeína, libras disponibles):
- Colombiano: $52000; R = 8; A = 3; C = 2.5%; 20000 lb
- Brasilero: $50000; R = 6; A = 4; C = 2.0%; 40000 lb
- Mexicano: $48000; R = 5; A = 3.5; C = 1.5%; 15000 lb

Requerimientos de cada marca (precio de venta por libra, mínimo de resistencia, máximo de acidez, máximo % de cafeína, libras demandadas):
- Café X: $72000; R >= 6.5; A <= 3.8; C <= 2.2%; 35000 lb
- Café XX: $75000; R >= 6.0; A <= 3.5; C <= 2.0%; 25000 lb

Presente el modelo matemático de PL que optimice la producción.

Variables de decisión (libras):
X1 = colombiano en X, X2 = brasilero en X, X3 = mexicano en X
X4 = colombiano en XX, X5 = brasilero en XX, X6 = mexicano en XX

Utilidad por libra = precio de venta - costo.

Modelo:
Max Z = 20000X1 + 22000X2 + 24000X3 + 23000X4 + 25000X5 + 27000X6
Disponibilidad: X1 + X4 <= 20000;  X2 + X5 <= 40000;  X3 + X6 <= 15000
Demanda: X1 + X2 + X3 <= 35000;  X4 + X5 + X6 <= 25000
Café X:
  Resistencia: 8X1 + 6X2 + 5X3 >= 6.5(X1 + X2 + X3)  ->  1.5X1 - 0.5X2 - 1.5X3 >= 0
  Acidez: 3X1 + 4X2 + 3.5X3 <= 3.8(X1 + X2 + X3)  ->  -0.8X1 + 0.2X2 - 0.3X3 <= 0
  Cafeína: 2.5X1 + 2X2 + 1.5X3 <= 2.2(X1 + X2 + X3)  ->  0.3X1 - 0.2X2 - 0.7X3 <= 0
Café XX:
  Resistencia: 8X4 + 6X5 + 5X6 >= 6(X4 + X5 + X6)  ->  2X4 - X6 >= 0
  Acidez: 3X4 + 4X5 + 3.5X6 <= 3.5(X4 + X5 + X6)  ->  -0.5X4 + 0.5X5 <= 0
  Cafeína: 2.5X4 + 2X5 + 1.5X6 <= 2(X4 + X5 + X6)  ->  0.5X4 - 0.5X6 <= 0`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2', 'X3', 'X4', 'X5', 'X6'],
    etiquetas: ['Colombiano en café X (lb)', 'Brasilero en café X (lb)', 'Mexicano en café X (lb)', 'Colombiano en café XX (lb)', 'Brasilero en café XX (lb)', 'Mexicano en café XX (lb)'],
    coeficientesObjetivo: ['20000', '22000', '24000', '23000', '25000', '27000'],
    restricciones: [
      { coeficientes: ['1', '0', '0', '1', '0', '0'], operador: 'LE', b: '20000' },
      { coeficientes: ['0', '1', '0', '0', '1', '0'], operador: 'LE', b: '40000' },
      { coeficientes: ['0', '0', '1', '0', '0', '1'], operador: 'LE', b: '15000' },
      { coeficientes: ['1', '1', '1', '0', '0', '0'], operador: 'LE', b: '35000' },
      { coeficientes: ['0', '0', '0', '1', '1', '1'], operador: 'LE', b: '25000' },
      { coeficientes: ['1.5', '-0.5', '-1.5', '0', '0', '0'], operador: 'GE', b: '0' },
      { coeficientes: ['-0.8', '0.2', '-0.3', '0', '0', '0'], operador: 'LE', b: '0' },
      { coeficientes: ['0.3', '-0.2', '-0.7', '0', '0', '0'], operador: 'LE', b: '0' },
      { coeficientes: ['0', '0', '0', '2', '0', '-1'], operador: 'GE', b: '0' },
      { coeficientes: ['0', '0', '0', '-0.5', '0.5', '0'], operador: 'LE', b: '0' },
      { coeficientes: ['0', '0', '0', '0.5', '0', '-0.5'], operador: 'LE', b: '0' },
    ],
  },
  {
    id: 'sammy-golf',
    nombre: 'Sammy (Bolsas de golf)',
    descripcion: 'Producción de bolsas estándar y de lujo con cuatro operaciones de capacidad limitada.',
    contexto: `Sammy, un pequeño fabricante de suministros para golf, produce dos tipos de bolsas de golf: la estándar y la de lujo. Todas las bolsas que se puedan fabricar en los próximos tres meses se pueden vender. Los requerimientos de tiempo de producción (horas por bolsa) para las cuatro operaciones requeridas y la ganancia por bolsa son:

- Estándar: corte y teñido 7/10; costura 1/2; terminado 1; inspección y empaque 1/10; ganancia $10
- De lujo: corte y teñido 1; costura 5/6; terminado 2/3; inspección y empaque 1/4; ganancia $9

Horas disponibles en tres meses: corte y teñido 630; costura 600; terminado 708; inspección y empaque 135.

Si la compañía desea maximizar la contribución a la ganancia total, ¿qué modelo matemático se debe plantear?

Variables de decisión: X1 = bolsas estándar, X2 = bolsas de lujo.

Modelo:
Max Z = 10X1 + 9X2
Corte y teñido: 0.7X1 + X2 <= 630
Costura: (1/2)X1 + (5/6)X2 <= 600  ->  multiplicando por 6: 3X1 + 5X2 <= 3600
Terminado: X1 + (2/3)X2 <= 708  ->  multiplicando por 3: 3X1 + 2X2 <= 2124
Inspección y empaque: 0.1X1 + 0.25X2 <= 135
(Las restricciones con 5/6 y 2/3 se multiplican por 6 y por 3 para trabajar con coeficientes exactos.)`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2'],
    etiquetas: ['Bolsas estándar', 'Bolsas de lujo'],
    coeficientesObjetivo: ['10', '9'],
    restricciones: [
      { coeficientes: ['0.7', '1'], operador: 'LE', b: '630' },
      { coeficientes: ['3', '5'], operador: 'LE', b: '3600' },
      { coeficientes: ['3', '2'], operador: 'LE', b: '2124' },
      { coeficientes: ['0.1', '0.25'], operador: 'LE', b: '135' },
    ],
  },
  {
    id: 'planes-inversion',
    nombre: 'Planes de inversión A y B',
    descripcion: 'Inversión de $100.000 durante tres años combinando un plan anual (12%) y uno bianual (60%).',
    contexto: `Usted dispone de $100.000 para invertir y tiene dos planes disponibles: el A y el B. El plan A garantiza que por cada peso invertido obtendrá una utilidad del 12% al final de un año (este lapso no puede fraccionarse). El plan B garantiza que por cada peso invertido obtendrá una utilidad del 60% al final de un período de dos años (este lapso no puede fraccionarse). Formular el modelo matemático de programación lineal que genere la mejor utilidad por el dinero durante un período de tres años.

Variables de decisión ($ invertidos al inicio de cada año):
X1 = plan A en el año 1, X2 = plan B en el año 1
X3 = plan A en el año 2, X4 = plan B en el año 2
X5 = plan A en el año 3
(Un plan B iniciado en el año 3 terminaría después del horizonte, por eso no se incluye.)

Se reinvierte todo el dinero disponible al inicio de cada año.

Modelo:
Max Z = 0.12X1 + 0.6X2 + 0.12X3 + 0.6X4 + 0.12X5   (utilidad total)
Año 1: X1 + X2 = 100000
Año 2: X3 + X4 = 1.12X1  ->  -1.12X1 + X3 + X4 = 0
Año 3: X5 = 1.12X3 + 1.6X2  ->  -1.6X2 - 1.12X3 + X5 = 0`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2', 'X3', 'X4', 'X5'],
    etiquetas: ['Plan A en el año 1 ($)', 'Plan B en el año 1 ($)', 'Plan A en el año 2 ($)', 'Plan B en el año 2 ($)', 'Plan A en el año 3 ($)'],
    coeficientesObjetivo: ['0.12', '0.6', '0.12', '0.6', '0.12'],
    restricciones: [
      { coeficientes: ['1', '1', '0', '0', '0'], operador: 'EQ', b: '100000' },
      { coeficientes: ['-1.12', '0', '1', '1', '0'], operador: 'EQ', b: '0' },
      { coeficientes: ['0', '-1.6', '-1.12', '0', '1'], operador: 'EQ', b: '0' },
    ],
  },
  {
    id: 'refineria-gasol',
    nombre: 'Refinería Gasol',
    descripcion: 'Mezcla de tres componentes de petróleo en gasolina Regular y Extra con especificaciones de calidad.',
    contexto: `La refinería Gasol produce periódicamente 2 tipos de gasolina: Regular y Extra, mezclando 3 componentes de petróleo. La empresa quiere determinar cómo mezclar los 3 componentes en los 2 productos para alcanzar el máximo de ganancias.

La gasolina Regular se vende a $0.50 por galón y la Extra a $0.54 por galón. Hay disponibles 5.000 galones del Componente 1 a $0.25 por galón, 10.000 galones del Componente 2 a $0.30 por galón y 10.000 galones del Componente 3 a $0.42 por galón.

Los compromisos actuales con distribuidores exigen producir por lo menos 10.000 galones de gasolina Regular en cada período. Además, las especificaciones por galón de cada producto son:
- Regular: a lo sumo 30% de Componente 1, por lo menos 40% de Componente 2 y a lo sumo 20% de Componente 3.
- Extra: por lo menos 25% de Componente 1, a lo sumo 40% de Componente 2 y por lo menos 30% de Componente 3.

Formular el modelo matemático de programación lineal que optimice la producción de Gasol.

Variables de decisión (galones):
X1, X2, X3 = componentes 1, 2 y 3 en la gasolina Regular
X4, X5, X6 = componentes 1, 2 y 3 en la gasolina Extra

Ganancia por galón = precio de venta - costo del componente.

Modelo:
Max Z = 0.25X1 + 0.20X2 + 0.08X3 + 0.29X4 + 0.24X5 + 0.12X6
Disponibilidad: X1 + X4 <= 5000;  X2 + X5 <= 10000;  X3 + X6 <= 10000
Producción mínima de Regular: X1 + X2 + X3 >= 10000
Regular:
  C1 <= 30%: 0.7X1 - 0.3X2 - 0.3X3 <= 0
  C2 >= 40%: -0.4X1 + 0.6X2 - 0.4X3 >= 0
  C3 <= 20%: -0.2X1 - 0.2X2 + 0.8X3 <= 0
Extra:
  C1 >= 25%: 0.75X4 - 0.25X5 - 0.25X6 >= 0
  C2 <= 40%: -0.4X4 + 0.6X5 - 0.4X6 <= 0
  C3 >= 30%: -0.3X4 - 0.3X5 + 0.7X6 >= 0`,
    objetivo: 'max',
    metodo: 'tabular',
    variables: ['X1', 'X2', 'X3', 'X4', 'X5', 'X6'],
    etiquetas: ['Componente 1 en Regular (gal)', 'Componente 2 en Regular (gal)', 'Componente 3 en Regular (gal)', 'Componente 1 en Extra (gal)', 'Componente 2 en Extra (gal)', 'Componente 3 en Extra (gal)'],
    coeficientesObjetivo: ['0.25', '0.2', '0.08', '0.29', '0.24', '0.12'],
    restricciones: [
      { coeficientes: ['1', '0', '0', '1', '0', '0'], operador: 'LE', b: '5000' },
      { coeficientes: ['0', '1', '0', '0', '1', '0'], operador: 'LE', b: '10000' },
      { coeficientes: ['0', '0', '1', '0', '0', '1'], operador: 'LE', b: '10000' },
      { coeficientes: ['1', '1', '1', '0', '0', '0'], operador: 'GE', b: '10000' },
      { coeficientes: ['0.7', '-0.3', '-0.3', '0', '0', '0'], operador: 'LE', b: '0' },
      { coeficientes: ['-0.4', '0.6', '-0.4', '0', '0', '0'], operador: 'GE', b: '0' },
      { coeficientes: ['-0.2', '-0.2', '0.8', '0', '0', '0'], operador: 'LE', b: '0' },
      { coeficientes: ['0', '0', '0', '0.75', '-0.25', '-0.25'], operador: 'GE', b: '0' },
      { coeficientes: ['0', '0', '0', '-0.4', '0.6', '-0.4'], operador: 'LE', b: '0' },
      { coeficientes: ['0', '0', '0', '-0.3', '-0.3', '0.7'], operador: 'GE', b: '0' },
    ],
  },
  {
    id: 'alimento-guau',
    nombre: 'Alimento GUAU',
    descripcion: 'Mezcla de suplementos A y B al mínimo costo cumpliendo proteína y carbohidratos.',
    contexto: `Usted debe decidir cuál es la mezcla óptima para desarrollar un alimento para animales llamado GUAU. Se combinaron y se sometieron a prueba dos ingredientes básicos y se determinó que cada lata de GUAU debe contener por lo menos 30 unidades de proteína y por lo menos 80 unidades de carbohidratos. Estos dos nutrientes están disponibles en dos marcas competidoras de suplementos para animales.

El costo por kilogramo del suplemento marca A es de $9 y el de la marca B es de $15. Un kilogramo de la marca A agregado a cada lote de producción de GUAU proporciona 1 unidad de proteína y 1 unidad de carbohidrato a cada lata. Un kilogramo de la marca B proporciona 2 unidades de proteína y 4 unidades de carbohidrato a cada lata. Usted desea satisfacer estas normas de nutrientes mínimos y, al mismo tiempo, mantener los costos de los suplementos al mínimo.

Variables de decisión: X1 = kg de suplemento marca A, X2 = kg de suplemento marca B.

Modelo:
Min Z = 9X1 + 15X2
Proteína: X1 + 2X2 >= 30
Carbohidratos: X1 + 4X2 >= 80`,
    objetivo: 'min',
    metodo: 'tabular',
    variables: ['X1', 'X2'],
    etiquetas: ['Suplemento marca A (kg)', 'Suplemento marca B (kg)'],
    coeficientesObjetivo: ['9', '15'],
    restricciones: [
      { coeficientes: ['1', '2'], operador: 'GE', b: '30' },
      { coeficientes: ['1', '4'], operador: 'GE', b: '80' },
    ],
  },
];
