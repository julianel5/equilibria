import Formula from '@shared/components/Formula';

const FORMULAS_MM1: { nombre: string; tex: string; detalle: string }[] = [
  {
    nombre: 'Utilización',
    tex: '\\rho = \\frac{\\lambda}{\\mu}',
    detalle:
      'Fracción de tiempo que el único servidor está ocupado. El sistema es estable solo si ρ < 1.',
  },
  {
    nombre: 'Probabilidad de sistema vacío',
    tex: 'P_0 = 1 - \\rho',
    detalle: 'Probabilidad de que no haya clientes en el sistema.',
  },
  {
    nombre: 'Clientes en la cola',
    tex: 'L_q = \\frac{\\lambda^2}{\\mu(\\mu - \\lambda)}',
    detalle: 'Número promedio de clientes esperando a ser atendidos.',
  },
  {
    nombre: 'Clientes en el sistema',
    tex: 'L = L_q + \\frac{\\lambda}{\\mu}',
    detalle: 'Clientes en cola más los que están en servicio, en promedio.',
  },
  {
    nombre: 'Tiempo de espera en la cola',
    tex: 'W_q = \\frac{L_q}{\\lambda}',
    detalle: 'Tiempo promedio que un cliente espera antes de ser atendido (ley de Little).',
  },
  {
    nombre: 'Tiempo en el sistema',
    tex: 'W = W_q + \\frac{1}{\\mu}',
    detalle: 'Tiempo promedio total (espera + servicio) de un cliente.',
  },
];

const FORMULAS_MMC: { nombre: string; tex: string; detalle: string }[] = [
  {
    nombre: 'Utilización por servidor',
    tex: '\\rho = \\frac{\\lambda}{c \\mu}',
    detalle:
      'Con c servidores la capacidad total es c·μ. La estabilidad exige λ < c·μ, es decir ρ < 1.',
  },
  {
    nombre: 'Probabilidad de sistema vacío (Erlang C)',
    tex: 'P_0 = \\left[ \\sum_{k=0}^{c-1} \\frac{(c\\rho)^k}{k!} + \\frac{(c\\rho)^c}{c\\,!(1-\\rho)} \\right]^{-1}',
    detalle:
      'Sumatoria estándar de Erlang C: los primeros c−1 términos cubren los estados con todos los servidores libres y el último la cola.',
  },
  {
    nombre: 'Clientes en la cola',
    tex: 'L_q = \\frac{P_0 \\, (c\\rho)^c \\, \\rho}{c\\,! \\, (1-\\rho)^2}',
    detalle: 'Número promedio de clientes esperando detrás de las c estaciones ocupadas.',
  },
  {
    nombre: 'Clientes en el sistema',
    tex: 'L = L_q + \\frac{\\lambda}{\\mu}',
    detalle: 'El término λ/μ es el número esperado de clientes atendidos en cada instante.',
  },
  {
    nombre: 'Tiempos W_q y W',
    tex: 'W_q = \\frac{L_q}{\\lambda} \\qquad W = W_q + \\frac{1}{\\mu}',
    detalle:
      'Por la ley de Little, W_q = L_q/λ. El tiempo en el sistema suma el servicio esperado 1/μ.',
  },
];

export default function TeoriaColasTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es un sistema de colas?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            Un <strong>sistema de colas</strong> describe clientes que llegan a una instalación,
            esperan su turno si los servidores están ocupados, reciben servicio y se retiran. La
            <strong> notación de Kendall</strong> <em>M/M/c</em> sintetiza los supuestos:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>M: llegadas.</strong> Los clientes llegan según un proceso de Poisson con
              tasa λ (los tiempos entre llegadas son exponenciales e independientes).
            </li>
            <li>
              <strong>M: servicio.</strong> Los tiempos de servicio son exponenciales de tasa μ
              (duración promedio 1/μ).
            </li>
            <li>
              <strong>c: servidores.</strong> c servidores idénticos en paralelo. Con c = 1 el
              modelo es <em>M/M/1</em>; con c ≥ 2 es <em>M/M/c</em>.
            </li>
            <li>
              <strong>Supuestos adicionales:</strong> población infinita, disciplina de servicio
              <strong> FIFO</strong> (primero en llegar, primero en ser servido) y cola con
              capacidad ilimitada.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Métricas del modelo M/M/1
        </h2>
        <p className="mb-4 text-sm text-slate-500  dark:text-gray-400">
          Un servidor atiende una única cola. Con λ &lt; μ el sistema alcanza el equilibrio y los
          promedios son finitos.
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {FORMULAS_MM1.map((f) => (
            <div
              key={f.nombre}
              className="rounded-md border border-slate-200 bg-slate-50 p-3  dark:border-gray-600 dark:bg-gray-900"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500  dark:text-gray-400">
                {f.nombre}
              </dt>
              <dd className="mt-2 rounded-md bg-white px-3 py-2  dark:bg-gray-800">
                <Formula tex={f.tex} />
              </dd>
              <dd className="mt-1.5 text-xs leading-relaxed text-slate-500  dark:text-gray-400">
                {f.detalle}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Métricas del modelo M/M/c
        </h2>
        <p className="mb-4 text-sm text-slate-500  dark:text-gray-400">
          Con c servidores, cada uno de tasa μ, la capacidad total es c·μ. Las fórmulas de
          Erlang C generalizan las de M/M/1 (de hecho, con c = 1 se recuperan exactamente).
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {FORMULAS_MMC.map((f) => (
            <div
              key={f.nombre}
              className="rounded-md border border-slate-200 bg-slate-50 p-3  dark:border-gray-600 dark:bg-gray-900"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500  dark:text-gray-400">
                {f.nombre}
              </dt>
              <dd className="mt-2 rounded-md bg-white px-3 py-2  dark:bg-gray-800">
                <Formula tex={f.tex} />
              </dd>
              <dd className="mt-1.5 text-xs leading-relaxed text-slate-500  dark:text-gray-400">
                {f.detalle}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Distribución de probabilidad P(n)
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            La probabilidad de encontrar exactamente n clientes en el sistema tiene una forma
            diferente antes y después del número de servidores:
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3  dark:border-gray-600 dark:bg-gray-900">
            <Formula tex="n < c: \\quad P_n = P_0 \\, \\frac{(c\\rho)^n}{n\\,!}" />
            <Formula tex="n \\ge c: \\quad P_n = P_0 \\, \\frac{(c\\rho)^c \\, \\rho^{\\,n-c}}{c\\,!}" />
          </div>
          <p>
            En M/M/1 (c = 1) esta expresión colapsa en la distribución geométrica:{' '}
            <Formula tex="P_n = (1-\\rho)\\, \\rho^{n}" />. Como ρ &lt; 1, cada término se hace
            más pequeño conforme crece n: la probabilidad <strong>decae asintóticamente</strong> y
            la gráfica de barras lo muestra claramente.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6  dark:border-amber-500/40 dark:bg-amber-500/10">
        <h2 className="mb-3 text-lg font-semibold text-amber-800  dark:text-amber-200">
          La estabilidad del sistema
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-amber-800/90  dark:text-amber-100/90">
          <p>
            El resultado <em>no existe</em> si la tasa de llegada iguala o supera la capacidad
            total de servicio. Recuerda que:
          </p>
          <div className="rounded-md bg-white px-4 py-3  dark:bg-gray-900">
            <Formula tex="\\rho = \\frac{\\lambda}{c \\mu} < 1 \\;\\Longleftrightarrow\\; \\lambda < c \\mu" />
          </div>
          <p>
            Si ρ ≥ 1 los servidores nunca logran ponerse al día: la cola crecerá infinitamente y
            los promedios L_q, L, W_q y W divergen. Por eso la calculadora bloquea esos valores con
            un mensaje de sistema inestable.
          </p>
        </div>
      </section>
    </article>
  );
}