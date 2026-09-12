import Formula from '@shared/components/Formula';

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Demanda constante',
    detalle:
      'La demanda anual (D) es conocida y uniforme durante todo el período de planeación.',
  },
  {
    titulo: 'Producción continua a tasa finita',
    detalle:
      'El lote no llega por completo de una vez: se fabrica de forma continua a una tasa P, que debe superar a la demanda (P > D) para que el inventario pueda acumularse.',
  },
  {
    titulo: 'Tasa de producción mayor que la demanda',
    detalle:
      'Si P ≤ D no existe acumulación neta y el modelo pierde sentido. Por eso la regla P > D es una condición de viabilidad.',
  },
  {
    titulo: 'Adaptación gradual del inventario',
    detalle:
      'Durante la producción el inventario crece a razón (P − D) y, una vez terminada la corrida, se consume a la tasa D. El nivel máximo se alcanza justo al terminar de producir el lote.',
  },
  {
    titulo: 'Costos constantes',
    detalle:
      'El costo de preparación (S) y el costo de mantener (H) son fijos y no dependen del tamaño del lote.',
  },
  {
    titulo: 'No se admiten faltantes',
    detalle:
      'El stock nunca se agota antes de que inicie la siguiente corrida de producción.',
  },
];

const FORMULAS: { tex: string; nombre: string; detalle: string }[] = [
  {
    tex: 'Q^* = \\sqrt{ \\frac{2DS}{H\\left(1-\\frac{D}{P}\\right)} }',
    nombre: 'Lote Económico de Producción',
    detalle:
      'Tamaño óptimo del lote a fabricar. Es mayor que el EOQ porque el inventario se acumula de forma gradual, no instantánea.',
  },
  {
    tex: 'I_{max} = Q^* \\left(1 - \\frac{D}{P}\\right)',
    nombre: 'Inventario máximo',
    detalle:
      'Máximo stock alcanzado al terminar la corrida. Representa la fracción del lote que la demanda aún no ha consumido.',
  },
  {
    tex: 'C_h = \\frac{I_{max}}{2}H = \\frac{Q^*}{2}H\\left(1-\\frac{D}{P}\\right)',
    nombre: 'Costo de mantener',
    detalle:
      'Costo de holding anual, calculado sobre el inventario promedio del ciclo.',
  },
  {
    tex: 'ROP = d \\cdot L',
    nombre: 'Punto de Reorden',
    detalle:
      'Nivel de inventario en el que se debe iniciar una nueva corrida, con d = D / días laborables.',
  },
];

export default function EPQTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el modelo EPQ?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El modelo EPQ (<em>Economic Production Quantity</em>, o Lote Económico de Producción)
            generaliza el EOQ para el caso en que el inventario es fabricado internamente en lugar
            de ser comprado a un proveedor y recibido de forma instantánea. Fue desarrollado por
            E. W. Taft en 1918 para dar respuesta a la situación, frecuente en manufactura, en la
            que el reabastecimiento ocurre <strong>de manera gradual</strong>.
          </p>
          <p>
            La diferencia central con el EOQ es el ritmo de llegada del lote. En el EOQ el pedido
            completo Q se incorpora al almacén de golpe; en el EPQ, el lote Q se va produciendo
            durante un intervalo de tiempo a una tasa finita P (unidades/año). Mientras la línea
            produce, simultáneamente la demanda se sigue consumiendo, por lo que el inventario
            crece solo a la tasa neta (P − D). Al terminar la corrida, el inventario llega a su
            máximo I<sub>max</sub> y comienza a descender a medida que solo la demanda lo agota.
          </p>
          <p>
            Como el nivel máximo de stock es menor, el costo de mantener resulta inferior al del
            caso de reposición instantánea. Esto hace que el lote óptimo de producción Q* sea en
            general mayor que el EOQ equivalente y que la métrica de referencia en este modelo sea
            el <strong>inventario máximo</strong>, no el inventario promedio.
          </p>
          <p>
            Para que el sistema sea viable, la tasa de producción P debe ser <strong>estrictamente
            mayor</strong> que la demanda D; de lo contrario, la línea no logra reponer el consumo
            y el inventario se agotaría. Esta condición se valida en la calculadora.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos del Modelo
        </h2>
        <p className="mb-4 text-sm text-slate-600  dark:text-gray-300">
          El EPQ comparte la mayoría de supuestos del EOQ, con la salvedad del reabastecimiento:
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
          El factor (1 − D/P) modula el efecto del reabastecimiento gradual sobre el inventario y,
          por tanto, sobre los costos de mantener.
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