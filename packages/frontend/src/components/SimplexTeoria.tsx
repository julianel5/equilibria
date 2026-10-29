import Formula from '@shared/components/Formula';

const ETAPAS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Forma estándar',
    detalle:
      'Todas las restricciones se escriben como ≤ y se añade una variable de holgura Sᵢ por cada una. Como bᵢ ≥ 0, la base inicial es la identidad formada por las Sᵢ y el primer tableau ya es factible sin fases previas.',
  },
  {
    titulo: 'Criterio de entrada (Zⱼ − Cⱼ)',
    detalle:
      'Con la fila de costos reducidos Zⱼ − Cⱼ = c_BB⁻¹aⱼ − cⱼ, en MAXIMIZACIÓN entra la columna más negativa y se detiene cuando todos son ≥ 0. En MINIMIZACIÓN el criterio se invierte: entra la más positiva y se detiene cuando todos son ≤ 0.',
  },
  {
    titulo: 'Prueba de la razón mínima',
    detalle:
      'Para la columna entrante se divide el lado derecho de cada fila entre su coeficiente. Los denominadores negativos o cero se descartan (la variable saldría a valor negativo o nunca acotaría); la fila con la razón más pequeña entrega la variable que sale. Si no queda ninguna razón válida, el problema es no acotado.',
  },
  {
    titulo: 'Pivote (Gauss–Jordan)',
    detalle:
      'El elemento pivote se convierte en 1 y se anula el resto de su columna con operaciones de fila. Todas las operaciones se hacen con fracciones exactas (BigInt), de modo que cada tableau es irreducible: 28/3 nunca se aproxima a 9.333…',
  },
];

const DIFERENCIAS: { clave: string; tabular: string; revisado: string }[] = [
  {
    clave: 'Estado',
    tabular: 'Todo el sistema de ecuaciones (todas las columnas) actualizado por gauss–Jordan.',
    revisado: 'Solo la base: B⁻¹ u los tiempos computo por iteración.',
  },
  {
    clave: 'Pivote',
    tabular: 'Pivoteo completo: cada fila se refactoriza contra el pivote.',
    revisado: 'No se pivotea: se resuelve yᵀ = c_BB⁻¹ y d = B⁻¹a_e desde cero.',
  },
  {
    clave: 'Entrada',
    tabular: 'Última fila Z_j − C_j visible en el tableau.',
    revisado: 'Costo reducido \bar cⱼ = cⱼ − yᵀ aⱼ calculado con los multiplicadores.',
  },
  {
    clave: 'Cuando conviene',
    tabular: 'Problemas pequeños: didáctico, se ve toda la evolución.',
    revisado: 'Muchas variables y pocas restricciones: aprovecha que B⁻¹ es m×m.',
  },
];

export default function SimplexTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el método Simplex?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El <strong>Simplex</strong> es el algoritmo clásico para resolver programas lineales de
            cualquier dimensión. Parte de un vértice factible (aqui, la base de holguras), examina
            las aristas de la región factible y se mueve iterativamente a un vértice vecino en el que
            la función objetivo mejora, hasta que ningún movimiento produce una mejora: ese vértice
            es el óptimo.
          </p>
          <p>
            Este módulo implementa dos presentaciones del mismo algoritmo, ambas con{' '}
            <strong>aritmética exacta de fracciones</strong> (nunca punto flotante):
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Simplex Tabular</strong>: el tableau o tabla simplex, fila a fila con la fila de
              costos reducidos Z_j − C_j y el pivote resaltado.
            </li>
            <li>
              <strong>Simplex Revisado</strong>: la versión matricial que solo trabaja con la base B,
              su inversa B⁻¹ y los multiplicadores yᵀ = c_BB⁻¹, ideal para ver de dónde sale cada
              costo reducido.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          El método en cuatro etapas
        </h2>
        <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
          {ETAPAS.map((s) => (
            <li key={s.titulo}>
              <strong className="text-slate-700 dark:text-gray-100">{s.titulo}: </strong>
              {s.detalle}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm  dark:border-gray-600 dark:bg-gray-900">
          <p className="mb-1 font-semibold text-slate-700  dark:text-gray-200">
            Forma estándar del módulo
          </p>
          <div className="text-slate-800  dark:text-slate-100">
            <Formula
              tex={
                '\\text{opt } Z = c_1 x_1 + \\dots + c_n x_n \\quad \\text{s.a. } a_{i1}x_1 + \\dots + a_{in}x_n \\leq b_i, \\; x_j \\geq 0'
              }
              display
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Simplex Tabular vs. Simplex Revisado
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400  dark:border-gray-700">
                <th className="py-2 pr-4">Etapa</th>
                <th className="py-2 pr-4">Tabular</th>
                <th className="py-2">Revisado</th>
              </tr>
            </thead>
            <tbody>
              {DIFERENCIAS.map((f) => (
                <tr key={f.clave} className="border-b border-slate-200 last:border-0  dark:border-gray-700">
                  <td className="py-2.5 pr-4 align-top font-semibold text-slate-700  dark:text-gray-100">
                    {f.clave}
                  </td>
                  <td className="py-2.5 pr-4 align-top text-slate-600  dark:text-gray-300">{f.tabular}</td>
                  <td className="py-2.5 align-top text-slate-600  dark:text-gray-300">{f.revisado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-6 shadow-md  dark:border-amber-800 dark:bg-amber-500/10">
        <h2 className="mb-2 text-lg font-semibold text-amber-800  dark:text-amber-300">
          Alcance del módulo
        </h2>
        <p className="text-sm leading-relaxed text-amber-800  dark:text-amber-200">
          El módulo resuelve programas en forma estándar: restricciones{' '}
          <strong>únicamente ≤</strong> con <strong>b_i ≥ 0</strong>. Las restricciones con ≥ o =
          requieren una base artificial y pertenecen al módulo{' '}
          <strong>Dos Fases / Penalización</strong> (fuera de alcance). Si el pivoteo no encuentra
          ninguna razón válida, el motor reporta el problema como <strong>no acotado</strong>.
        </p>
      </section>
    </article>
  );
}