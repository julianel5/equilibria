import Formula from '@shared/components/Formula';

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Demanda de una sola oportunidad',
    detalle:
      'El producto se ordena una única vez antes de conocer la demanda real (periódico, temporada, moda, alimentos frescos). No hay reposición durante el período.',
  },
  {
    titulo: 'Excedente liquidado al final',
    detalle:
      'Las unidades no vendidas se descuentan al valor de rescate v al cierre del período. Si v es alto, pedir de más duele poco y la cantidad óptima sube.',
  },
  {
    titulo: 'Costo de falta = utilidad perdida',
    detalle:
      'Cada unidad demandada sin stock representa el margen C_u = p − c que se deja de ganar. No hay ventas diferidas: el cliente se pierde.',
  },
  {
    titulo: 'Costo de exceso explícito',
    detalle:
      'Cada unidad no vendida cuesta C_o = c − v. La decisión óptima no busca cero sobrantes ni cero faltantes, sino equilibrar ambos costos.',
  },
  {
    titulo: 'Distribución de demanda conocida',
    detalle:
      'La demanda del período sigue una distribución de probabilidad conocida (en esta herramienta: normal o uniforme), usada para traducir la razón crítica en cantidad.',
  },
];

const FORMULAS: { tex: string; nombre: string; detalle: string }[] = [
  {
    tex: 'C_u = p - c',
    nombre: 'Costo de subestimación (escasez)',
    detalle:
      'La utilidad que se pierde por cada unidad demandada que no se pudo vender por falta de stock. Es el margen del producto.',
  },
  {
    tex: 'C_o = c - v',
    nombre: 'Costo de sobreestimación (exceso)',
    detalle:
      'La pérdida por cada unidad ordenada y no vendida: lo que se pagó menos lo que se recupera al liquidarla.',
  },
  {
    tex: 'P(D \\le Q^*) = \\frac{C_u}{C_u + C_o}',
    nombre: 'Razón crítica (nivel de servicio)',
    detalle:
      'El nivel de servicio óptimo. Se ordena la cantidad que deja a la izquierda (probabilidad acumulada) exactamente esa proporción.',
  },
  {
    tex: 'Q^* = \\mu + Z\\,\\sigma',
    nombre: 'Cantidad óptima (demanda normal)',
    detalle:
      'Con demanda normal, la razón crítica se traduce al cuantil Z = Φ⁻¹(CSL) y la cantidad crece con la media y la variabilidad.',
  },
  {
    tex: 'Q^* = a + \\mathrm{CSL}\\,(b - a)',
    nombre: 'Cantidad óptima (demanda uniforme)',
    detalle:
      'Con demanda uniforme en [a, b], la cantidad óptima recorre el rango proporcionalmente a la razón crítica.',
  },
];

export default function PeriodoUnicoTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el modelo de Periodo Único (Newsvendor)?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            Hay productos que solo pueden venderse durante una temporada o un ciclo corto: el
            periódico del día, un artículo de moda, un componente de fecha de caducidad. La decisión
            central es cuánto ordenar <em>antes</em> de conocer la demanda, sin oportunidad de
            reordenar.
          </p>
          <p>
            Si se piden pocas unidades se pierden ventas y utilidad; si se piden demasiadas, las
            sobrantes deben liquidarse con pérdida. El modelo <strong>newsvendor</strong> resuelve
            ese dilema comparando el <strong>costo de subestimación</strong> (C_u, por cada unidad
            que falta) con el <strong>costo de sobreestimación</strong> (C_o, por cada unidad que
            sobra).
          </p>
          <p>
            La solución no es un punto medio arbitrario: la cantidad óptima Q* se escoge de modo que
            la probabilidad de que la demanda no la supere sea exactamente la{' '}
            <strong>razón crítica</strong> C_u / (C_u + C_o). A mayor margen de venta (C_u alto),
            conviene pedir más; a mayor castigo por el excedente (C_o alto), conviene pedir menos.
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
          Las expresiones que rigen el modelo. La pestaña "Procesos" del módulo las desglosa paso a
          paso con la sustitución numérica.
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

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Cómo se decide la cantidad con la razón crítica
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            La razón crítica CSL se interpreta como la probabilidad de no quedarse sin stock: la
            acumulada de la demanda hasta Q*. Si CSL = 0.85, la política ordena la cantidad tal que
            el 85% de los escenarios de demanda queden cubiertos y solo un 15% quiebren stock.
          </p>
          <p>
            Según la distribución elegida, esa probabilidad se convierte en unidades: con demanda
            normal se busca el cuantil Z (Z = Φ⁻¹(CSL)) y se aplica Q* = μ + Z·σ; con demanda
            uniforme entre a y b basta con recorrer el rango: Q* = a + CSL·(b − a). En ambos casos
            la cantidad óptima coincide con la que minimiza el costo total esperado del período.
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