import Formula from '@shared/components/Formula';

const CRITERIOS: { nombre: string; tex: string; detalle: string }[] = [
  {
    nombre: 'Maximax',
    tex: '\\text{Max}_i \\left( \\max_j a_{ij} \\right)',
    detalle:
      'Criterio optimista: supone que siempre se presentará el mejor estado. Elige la alternativa con el mayor de los máximos de cada fila.',
  },
  {
    nombre: 'Maximin (Wald)',
    tex: '\\text{Max}_i \\left( \\min_j a_{ij} \\right)',
    detalle:
      'Criterio pesimista: se prepara para el peor escenario. Elige la alternativa cuyo peor pago (mínimo de la fila) sea el mayor.',
  },
  {
    nombre: 'Laplace',
    tex: '\\text{Max}_i \\left( \\frac{1}{n} \\sum_{j} a_{ij} \\right)',
    detalle:
      'Principio de la razón insuficiente: sin información, todos los estados son igualmente probables. Elige la alternativa de mayor promedio simple.',
  },
  {
    nombre: 'Hurwicz',
    tex: '\\alpha \\cdot \\max_j a_{ij} + (1-\\alpha) \\cdot \\min_j a_{ij}',
    detalle:
      'Compromiso entre el optimismo y el pesimismo. Cada fila se pondera por el coeficiente α (0 ≤ α ≤ 1); α = 1 coincide con Maximax y α = 0 con Maximin.',
  },
  {
    nombre: 'Savage (Minimax Regret)',
    tex: '\\text{Min}_i \\left( \\max_j r_{ij} \\right) \\qquad r_{ij} = \\max_k a_{kj} - a_{ij}',
    detalle:
      'Minimiza el arrepentimiento máximo. El arrepentimiento r_ij es lo que se pierde en el estado j por no haber elegido la mejor alternativa para ese estado.',
  },
  {
    nombre: 'VME (Valor Monetario Esperado)',
    tex: '\\text{Max}_i \\left( \\sum_{j} p_j \\cdot a_{ij} \\right)',
    detalle:
      'Cuando el decisor puede asignar probabilidades a los estados, se promedia ponderadamente cada fila. Requiere que las probabilidades sumen exactamente 1.',
  },
];

export default function TeoriaDecisionesTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es la Matriz de Pagos?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            Cuando un decisor debe elegir entre varias alternativas y el resultado de cada una
            depende de un <strong>estado de la naturaleza</strong> que no puede controlar ni
            predecir con certeza, estamos ante una <strong>decisión bajo incertidumbre</strong>.
          </p>
          <p>
            La <strong>matriz de pagos</strong> organiza la información: cada <em>fila</em> es un
            curso de acción (alternativa) y cada <em>columna</em> es un estado de la naturaleza.
            Cada celda contiene el <strong>pago</strong> (beneficio) que se obtendría si se elige
            la fila y se presenta el estado de la columna. En el modelo clásico se asume que los
            pagos ya están expresados en beneficios (si fueran costos, basta cambiarlos de signo o
            invertir los criterios max/min).
          </p>
          <p>
            No existe una única respuesta "correcta": distintos criterios reflejan distintas
            actitudes frente al riesgo. Maximax es optimista, Maximin es pesimista, Laplace asume
            ignorancia total, Hurwicz pondera optimismo y pesimismo según un coeficiente α,
            Savage minimiza el mayor arrepentimiento y el VME aprovecha probabilidades conocidas.
            Por eso este módulo muestra <em>todos</em> los criterios y el ganador de cada uno.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos del Modelo
        </h2>
        <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
          <li>
            <strong className="text-slate-700 dark:text-gray-100">Pagos en beneficios: </strong>
            las celdas representan ganancias; los criterios de mayor-es-mejor aplican directamente.
          </li>
          <li>
            <strong className="text-slate-700 dark:text-gray-100">Estados mutuamente excluyentes: </strong>
            exactamente uno de los estados de la naturaleza se presentará.
          </li>
          <li>
            <strong className="text-slate-700 dark:text-gray-100">Conocimiento de alternativas y estados: </strong>
            todas las alternativas y todos los estados posibles son conocidos y se enumeran por completo.
          </li>
          <li>
            <strong className="text-slate-700 dark:text-gray-100">Probabilidades opcionales: </strong>
            si se definen, deben asignarse a <em>todos</em> los estados, cada una entre 0 y 1, y sumar
            exactamente 1. Solo entonces se habilitan los cálculos de VME.
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Criterios de Evaluación
        </h2>
        <p className="mb-6 text-sm text-slate-600  dark:text-gray-300">
          Cada criterio produce una puntuación por alternativa; la tabla de resultados muestra el
          valor de cada fila y resalta a la ganadora.
        </p>
        <p className="mb-6 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Si la matriz expresa <strong>costos</strong> y el tipo de análisis es{' '}
          <strong>Minimizar</strong>, la lógica se invierte: Maximax pasa a ser{' '}
          <strong>Minimin</strong> (elige el costo mínimo de los mínimos), Maximin pasa a ser{' '}
          <strong>Minimax</strong> (minimiza el mayor costo), Laplace y VME eligen el menor
          promedio/costo esperado, y el arrepentimiento de Savage mide cuánto te pasas del costo
          óptimo de cada estado. Las etiquetas y fórmulas de los resultados se adaptan
          automáticamente.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {CRITERIOS.map((c) => (
            <div
              key={c.nombre}
              className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center  dark:border-gray-600 dark:bg-gray-900"
            >
              <h3 className="text-sm font-semibold text-slate-700  dark:text-gray-100">{c.nombre}</h3>
              <div className="w-full text-[1.25rem] text-slate-800  dark:text-slate-100">
                <Formula tex={c.tex} display />
              </div>
              <p className="text-xs leading-relaxed text-slate-500  dark:text-gray-400">{c.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="max-w-4xl text-sm text-slate-400  dark:text-gray-500">
        <p>
          Esta sección es un resumen introductorio de carácter académico y se ofrece como contenido
          de relleno. Puede ampliarse o sustituirse por la investigación propia en fuentes
          especializadas de teoría de la decisión.
        </p>
      </aside>
    </article>
  );
}