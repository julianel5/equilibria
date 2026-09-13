import Formula from '@shared/components/Formula';

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Demanda variable y conocida',
    detalle:
      'La demanda diaria no es constante: sigue una distribución normal con media d̄ y desviación estándar σ_d, valores que deben estimarse a partir del historial.',
  },
  {
    titulo: 'Lead time constante',
    detalle:
      'El tiempo de entrega (L) es fijo y conocido. De no serlo, la desviación durante el lead time incorporaría además la variabilidad del propio L, y el modelo dejaría de aplicar.',
  },
  {
    titulo: 'Demanda independiente entre días',
    detalle:
      'La demanda de cada día es independiente de la de los demás días. Bajo esta condición, la demanda acumulada en L días es normal con media d̄·L y desviación σ_d·√L.',
  },
  {
    titulo: 'Nivel de servicio definido por la gerencia',
    detalle:
      'El CSL es una decisión de negocio: refleja el porcentaje de ciclos de reposición en los que se espera no agotar existencias. A mayor CSL, mayor stock de seguridad y mayor costo de mantener.',
  },
  {
    titulo: 'Costo de faltante no explícito',
    detalle:
      'El modelo no cuantifica el costo de cada faltante; en lugar de ello fija una probabilidad de quiebre α = 1 − CSL como política.',
  },
];

const FORMULAS: { tex: string; nombre: string; acompanante?: string; detalle: string }[] = [
  {
    tex: 'Z = \\Phi^{-1}(CSL)',
    nombre: 'Valor Z',
    detalle:
      'Cuantil de la distribución normal estándar que deja a la izquierda una probabilidad igual al CSL. Se obtiene con la inversa numérica de la normal estándar.',
  },
  {
    tex: '\\sigma_L = \\sigma_d \\sqrt{L}',
    nombre: 'Desviación durante el lead time',
    detalle:
      'Variabilidad de la demanda total en los L días de entrega. Como el lead time es fijo, la desviación de la suma es σ_d por la raíz de L.',
  },
  {
    tex: 'SS = Z \\cdot \\sigma_L',
    nombre: 'Stock de Seguridad',
    detalle:
      'Inventario adicional por encima de la demanda esperada que proporciona la protección exigida por el CSL.',
  },
  {
    tex: 'D_L = \\bar{d} \\cdot L',
    nombre: 'Demanda durante el lead time',
    acompanante: 'ROP = D_L + SS',
    detalle:
      'Demanda esperada mientras el pedido está en tránsito. El punto de reorden se coloca en esta demanda más el stock de seguridad.',
  },
];

export default function PuntoReordenTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el Punto de Reorden con demanda probabilística?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            En los modelos EOQ clásicos se asume que la demanda es constante, y el punto de
            reorden se calcula simplemente como <em>d × L</em>. En la práctica, sin embargo, la
            demanda fluctúa día a día y existe un riesgo de que, mientras el pedido está en
            tránsito, la demanda supere el stock disponible.
          </p>
          <p>
            Este modelo captura esa incertidumbre asumiendo que la demanda diaria sigue una
            distribución normal. La gerencia decide un <strong>nivel de servicio (CSL)</strong>:
            la probabilidad de no agotar existencias durante un ciclo de reposición. Ese CSL se
            traduce en un <strong>valor Z</strong> (cuantil de la normal estándar), que a su vez
            determina el <strong>stock de seguridad</strong>.
          </p>
          <p>
            El <strong>punto de reorden</strong> escoge el nivel de inventario en el que se debe
            emitir una nueva orden: cubre la demanda esperada durante el lead time más un colchón
            de seguridad proporcional a la variabilidad de la demanda y al nivel de servicio
            exigido. Con un CSL más alto, crece el stock de seguridad, y con él el costo de
            mantener inventario.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos del Modelo
        </h2>
        <p className="mb-4 text-sm text-slate-600  dark:text-gray-300">
          La validez del modelo depende de las siguientes condiciones:
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
          Las expresiones que rigen el modelo. Los resultados se reflejan en la calculadora y en
          la gráfica de la distribución normal.
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

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Cómo se obtiene el valor Z
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El valor Z no proviene de una tabla de consulta: la plataforma lo calcula con la
            <strong> inversa de la distribución normal estándar</strong>, una aproximación
            numérica (variante de Beasley–Springer–Moro con refinamiento de Acklam) que evalúa la
            función continua Φ⁻¹ con precisión del orden de 1e-9. Así, cualquier nivel de servicio
            dentro del rango permitido (estrictamente entre 50% y 99.99%) produce su valor Z
            exacto, sin interpolaciones.
          </p>
          <p>
            La gráfica de la campana ilustra la lectura: el área bajo la curva a la izquierda de
            Z (zona azul) es exactamente el CSL, y el área a la derecha (cola roja) es el riesgo
            de faltante α = 1 − CSL.
          </p>
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