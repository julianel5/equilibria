import Formula from '@shared/components/Formula';

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Demanda constante',
    detalle:
      'La demanda anual (D) es conocida y uniforme durante todo el período de planeación.',
  },
  {
    titulo: 'Reabastecimiento instantáneo',
    detalle:
      'Cada orden llega completa de una sola vez. La diferencia con el EOQ es que, al llegar, el lote Q también cubre los backorders acumulados: S* unidades salen de inmediato y quedan Imax = Q − S* en mano.',
  },
  {
    titulo: 'Faltantes autorizados',
    detalle:
      'El stock puede agotarse deliberadamente. Los faltantes se acumulan como ventas diferidas (backorders) hasta alcanzar el déficit óptimo S*, momento en el que llega el siguiente pedido.',
  },
  {
    titulo: 'Costo de escasez unitario',
    detalle:
      'Cada unidad faltante durante un año genera un costo B (pérdida de venta, penalizaciones, costo administrativo del backorder).',
  },
  {
    titulo: 'Costos constantes',
    detalle:
      'El costo de ordenar (S), el costo de mantener (H) y el costo de faltantes (B) son fijos y no dependen del tamaño del lote.',
  },
  {
    titulo: 'Precio unitario constante',
    detalle:
      'No hay descuentos por cantidad: el costo de compra por unidad C es el mismo para cualquier tamaño de pedido.',
  },
];

const FORMULAS: { tex: string; nombre: string; detalle: string }[] = [
  {
    tex: 'Q^* = \\sqrt{ \\frac{2DS}{H} } \\times \\sqrt{ \\frac{H+B}{B} }',
    nombre: 'Lote óptimo de pedido',
    detalle:
      'Generaliza el EOQ. El factor √((H+B)/B) > 1 aumenta el lote: conviene pedir más y tolerar escasez para pagar menos holding.',
  },
  {
    tex: 'S^* = Q^* \\times \\left( \\frac{H}{H+B} \\right)',
    nombre: 'Faltante máximo (déficit óptimo)',
    detalle:
      'Cantidad de backorders esperados al final de la fase de escasez. Si H es alto conviene faltar poco; si B es alto conviene faltar menos aún.',
  },
  {
    tex: 'I_{max} = Q^* - S^*',
    nombre: 'Inventario máximo',
    detalle:
      'Stock en mano al llegar el pedido, tras liquidar los faltantes pendientes. Imax = Q*·B/(H+B).',
  },
  {
    tex: 'C_h = \\frac{(I_{max})^2}{2Q^*} \\cdot H',
    nombre: 'Costo de mantener',
    detalle:
      'El inventario en mano promedio es Imax²/(2Q*): el stock solo existe durante la fracción Imax/Q* del ciclo.',
  },
  {
    tex: 'C_f = \\frac{(S^*)^2}{2Q^*} \\cdot B',
    nombre: 'Costo de faltantes',
    detalle:
      'El déficit promedio es S*²/(2Q*), porque el faltante solo existe durante la fracción S*/Q* del ciclo.',
  },
  {
    tex: 'C_o = \\frac{D}{Q^*} \\cdot S',
    nombre: 'Costo de ordenar',
    detalle: 'Costo fijo por orden multiplicado por el número de pedidos del año.',
  },
  {
    tex: 'TC = C_o + C_h + C_f',
    nombre: 'Costo Relevante Total',
    detalle:
      'Suma del equilibrio financiero del modelo. No incluye la adquisición D·C, que no depende de Q.',
  },
];

export default function EOQFaltantesTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el EOQ con Faltantes Planeados?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El modelo EOQ con faltantes planeados (también llamado <em>déficit autorizado</em> o
            EOQ con <em>backorders</em>) relaja uno de los supuestos más estrictos del modelo
            básico: que el stock nunca se agote. Aquí se <strong>permite deliberadamente</strong>{' '}
            que el inventario llegue a cero y que la demanda insatisfecha se acumule como pedidos
            pendientes de entrega (ventas diferidas).
          </p>
          <p>
            La idea central es que mantener inventario cuesta dinero (H por unidad-año) y no
            siempre vale la pena cargarlo todo el ciclo. Si el costo de mantener una unidad es
            alto y el costo de tolerar cierta escasez (B) es bajo, conviene pedir lotes más
            grandes, dejar que el stock se agote y concentrar la entrega de los backorders cuando
            llegue el siguiente pedido.
          </p>
          <p>
            Cuando el pedido Q llega, una parte S* cubre los faltantes acumulados y el resto
            <strong> Imax = Q − S*</strong> queda disponible de inmediato. Durante el ciclo, la
            demanda va consumiendo I<sub>max</sub> hasta agotarlo; a partir de ese momento
            comienzan a acumularse los backorders, que crecen desde 0 hasta S*, cerrando el ciclo.
          </p>
          <p>
            Como el inventario en mano solo existe durante una fracción del ciclo y en promedio es
            menor, el <strong>costo de mantener se reduce</strong> y el lote óptimo Q* resulta
            mayor que el EOQ puro. El beneficio neto se observa en el Costo Relevante Total:
            el modelo autoriza un déficit óptimo S* que equilibra exactamente lo que se ahorra en
            holding con lo que cuesta la escasez.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos del Modelo
        </h2>
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
          Los costos de mantener y de faltantes se ponderan por la fracción del ciclo en que cada
          uno existe.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {FORMULAS.map((f) => (
            <div
              key={f.nombre}
              className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center  dark:border-gray-600 dark:bg-gray-900"
            >
              <h3 className="text-sm font-semibold text-slate-700  dark:text-gray-100">{f.nombre}</h3>
              <div className="w-full text-[1.4rem] text-slate-800  dark:text-slate-100">
                <Formula tex={f.tex} display />
              </div>
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