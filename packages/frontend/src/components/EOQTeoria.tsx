import Formula from '@shared/components/Formula';

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Demanda constante',
    detalle:
      'La demanda anual (D) es conocida, uniforme y no presenta estacionalidad ni variabilidad a lo largo del período de planeación.',
  },
  {
    titulo: 'Reposición instantánea',
    detalle:
      'El lote completo Q llega de una sola vez en el momento del pedido; no hay recepciones parciales ni acumulaciones en tránsito.',
  },
  {
    titulo: 'No se admiten faltantes',
    detalle:
      'No se permiten quiebres de inventario ni demanda insatisfecha; el stock nunca llega a cero antes de la reposición.',
  },
  {
    titulo: 'Costos constantes',
    detalle:
      'El costo de ordenar (S) y el costo de mantener (H) son fijos y no dependen del tamaño del lote ni de la cantidad de pedidos.',
  },
  {
    titulo: 'Tiempo de entrega constante',
    detalle:
      'El lead time (L) es conocido y estable, lo que permite fijar un punto de reorden (ROP) confiable entre órdenes sucesivas.',
  },
];

const FORMULAS: { tex: string; nombre: string; acompanante?: string; detalle: string }[] = [
  {
    tex: 'Q^* = \\sqrt{ \\frac{2DS}{H} }',
    nombre: 'Cantidad Económica de Pedido',
    detalle:
      'El lote óptimo que minimiza el costo total anual relevante, donde se equilibran el costo de ordenar y el de mantener.',
  },
  {
    tex: 'TC = \\frac{D}{Q^*}S + \\frac{Q^*}{2}H + DC',
    nombre: 'Costo Total Anual',
    detalle:
      'Suma de los costos anuales de ordenar, mantener y adquirir el inventario para la demanda anual D.',
  },
  {
    tex: 'ROP = d \\cdot L',
    nombre: 'Punto de Reorden',
    acompanante: 'd = \\frac{D}{\\text{días laborables}}',
    detalle:
      'Nivel de inventario en el que se debe emitir una nueva orden para cubrir la demanda durante el tiempo de entrega.',
  },
];

export default function EOQTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el modelo EOQ?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El modelo EOQ (<em>Economic Order Quantity</em>, o Cantidad Económica de Pedido) es una
            herramienta clásica de la gestión de inventarios que determina el tamaño de lote que
            minimiza el costo total anual de mantener inventario. Fue concebido por Ford W. Harris
            en 1913 y divulgado por R. H. Wilson, razón por la cual también se le conoce como modelo
            de Wilson.
          </p>
          <p>
            La idea central del modelo es encontrar el equilibrio entre dos fuerzas de signo
            opuesto: el <strong>costo de ordenar</strong>, que decrece a medida que se emiten menos
            pedidos al año (lotes más grandes), y el <strong>costo de mantener</strong>, que crece
            cuando el inventario promedio aumenta. En el punto de equilibrio de ambas fuerzas se
            obtiene la cantidad óptima de pedido Q*, y con ella las métricas operativas del sistema:
            número de órdenes por año, ciclo de reposición, punto de reorden y costo total anual.
          </p>
          <p>
            Aunque el modelo parte de supuestos simplificadores (demanda constante, reposición
            instantánea, costos fijos), sigue siendo una base teórica fundamental y un punto de
            partida para modelos más sofisticados como el EOQ con faltantes, descuentos por cantidad
            o demanda probabilística.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos del Modelo
        </h2>
        <p className="mb-4 text-sm text-slate-600  dark:text-gray-300">
          La aplicabilidad del modelo EOQ depende de un conjunto de condiciones que delimitan su
          dominio de validez. Estas son las principales:
        </p>
        <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
          {SUPUESTOS.map((s) => (
            <li key={s.titulo}>
              <strong className="text-slate-700 dark:text-gray-100">{s.titulo}: </strong>
              {s.detalle}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Fórmulas Principales
        </h2>
        <p className="mb-6 text-sm text-slate-600  dark:text-gray-300">
          Las expresiones que rigen el modelo. Cada una de ellas se materializa en la vista de la
          calculadora con los valores ingresados.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {FORMULAS.map((f) => (
            <div
              key={f.nombre}
              className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center  dark:border-gray-600 dark:bg-gray-900"
            >
              <h3 className="text-sm font-semibold text-slate-700  dark:text-gray-100">{f.nombre}</h3>
              <div className="w-full text-[1.4rem] text-slate-800  dark:text-slate-100">
                <Formula tex={f.tex} display />
              </div>
              {f.acompanante ? (
                <div className="w-full text-base text-slate-500  dark:text-gray-400">
                  <Formula tex={f.acompanante} display />
                </div>
              ) : null}
              <p className="text-xs leading-relaxed text-slate-500  dark:text-gray-400">{f.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="max-w-4xl text-sm text-slate-400  dark:text-gray-500">
        <p>
          Esta sección es un resumen introductorio de carácter académico y se ofrece como contenido
          de relleno. Puede ampliarse o sustituirse por la investigación propia en fuentes
          especializadas de gestión de operaciones e inventarios.
        </p>
      </aside>
    </article>
  );
}