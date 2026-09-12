import Formula from '@shared/components/Formula';

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Demanda constante',
    detalle:
      'La demanda anual (D) es conocida y uniforme durante todo el período de planeación.',
  },
  {
    titulo: 'Precio por niveles (descuentos por cantidad)',
    detalle:
      'El proveedor ofrece un precio unitario C_j distinto según el tamaño del pedido. Cada nivel j aplica dentro de un intervalo de cantidades [q_min, q_max]; en niveles con cantidades mayores el precio es menor.',
  },
  {
    titulo: 'Reabastecimiento instantáneo',
    detalle:
      'Cada orden llega completa de una sola vez (no hay producción ni tiempos de entrega).',
  },
  {
    titulo: 'Costo de mantener en función del precio',
    detalle:
      'En el modo porcentaje, el costo de mantener del nivel j es H_j = I × C_j: como el inventario promedio se valora al precio pagado, el holding baja en los niveles con descuento.',
  },
  {
    titulo: 'Costos de ordenar constantes',
    detalle:
      'El costo fijo por orden S no depende del tamaño del lote ni del nivel de precio.',
  },
  {
    titulo: 'Sin faltantes',
    detalle: 'El stock nunca se agota antes de que llegue la siguiente orden.',
  },
];

const ALGORITMO: string[] = [
  'Para cada nivel j se calcula el lote óptimo local Q* = √(2DS / H_j).',
  'Q* se depura contra el intervalo: si Q* < q_min el candidato se ajusta a Q = q_min; si q_min ≤ Q* ≤ q_max es válido; si Q* > q_max el nivel se descarta.',
  'Para cada candidato válido se evalúa el costo total anual TC = (D/Q)S + (Q/2)H_j + D·C_j.',
  'El lote óptimo final es el candidato con el TC más bajo (fila ganadora en la tabla).',
];

const FORMULAS: { tex: string; nombre: string; detalle: string }[] = [
  {
    tex: 'Q^*_j = \\sqrt{ \\frac{2DS}{H_j} }',
    nombre: 'Lote óptimo local del nivel',
    detalle:
      'Optimiza solo ordenar y mantener dentro del nivel j, sin considerar todavía las restricciones del intervalo.',
  },
  {
    tex: 'H_j = \\begin{cases} H & \\text{modo fijo} \\\\ I \\times C_j & \\text{modo porcentaje} \\end{cases}',
    nombre: 'Costo de mantener efectivo',
    detalle:
      'Constante en modo fijo o proporcional al precio del nivel (H = I × C) cuando se usa la tasa I.',
  },
  {
    tex: 'TC_j = \\frac{D}{Q}S + \\frac{Q}{2}H_j + DC_j',
    nombre: 'Costo total anual del candidato',
    detalle:
      'Incluye ordenar, mantener y el costo de adquisición al precio del nivel. El ganador es el TC_j mínimo.',
  },
  {
    tex: 'Q = \\begin{cases} q_{min} & \\text{si } Q^* < q_{min} \\\\ Q^* & \\text{si } q_{min} \\le Q^* \\le q_{max} \\end{cases}',
    nombre: 'Regla de ajuste del candidato',
    detalle:
      'Si el lote local queda debajo del intervalo, hay que comprar el mínimo para acceder al precio; si lo supera, el nivel se descarta.',
  },
];

export default function EOQDescuentosTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el EOQ con Descuentos por Cantidad?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El modelo EOQ con descuentos por cantidad relaja el supuesto del precio unitario
            constante. Los proveedores suelen bajar el precio por unidad a cambio de pedidos más
            grandes, y el comprador debe decidir <strong>en cuál nivel de precio conviene pedir</strong>.
          </p>
          <p>
            El problema no es trivial porque incluso los niveles con precio bajo pueden ser
            costosos: comprar en cantidades grandes sube el costo de mantener (en especial si el
            holding se calcula como un porcentaje del precio) y reduce el número de pedidos. El
            costo de adquirir (D × C<sub>j</sub>) cae, pero el resto de los costos se mueve en
            dirección opuesta.
          </p>
          <p>
            Por eso el modelo se resuelve <strong>por etapas</strong>: se calcula el lote óptimo
            local de cada nivel, se lo ajusta a los límites del intervalo (o se descarta el nivel
            si el lote calculado supera su máximo), y finalmente se elige el candidato con el
            <strong> costo total anual más bajo</strong>.
          </p>
          <p>
            El costo de mantener puede expresarse como un valor fijo (H) o como un porcentaje del
            precio del nivel (H<sub>j</sub> = I × C<sub>j</sub>). Esta segunda forma refleja con
            más fidelidad que el inventario promedio se valora al precio que realmente se pagó.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Algoritmo de Resolución
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
          {ALGORITMO.map((paso, i) => (
            <li key={i}>{paso}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos del Modelo
        </h2>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
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
          El subíndice j indica que la variable depende del nivel de precio evaluado.
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