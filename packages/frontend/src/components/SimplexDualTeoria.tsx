import Formula from '@shared/components/Formula';
import { conSubindices } from '@shared/components/Subindices';

const PASOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Fila saliente',
    detalle:
      'Se elige la fila cuyo valor básico x_B es el más negativo. Esa variable deja la base porque incumple x_B ≥ 0; el objetivo es expulsarla para recuperar la factibilidad primal.',
  },
  {
    titulo: 'Prueba de la razón dual',
    detalle:
      'Sobre la fila saliente se consideran solo las columnas no básicas con coeficiente a_{rj} < 0. Para cada una se calcula la razón (Z_j − C_j) / a_{rj} y entra la que da la razón más pequeña en valor absoluto (con empate, la de menor índice). Así se conserva la dual-factibilidad de la nueva base.',
  },
  {
    titulo: 'Pivoteo',
    detalle:
      'Con el pivote a_{re} se aplica Gauss–Jordan exacto: la fila pivote se divide entre a_{re} y el resto de la columna se anula. También se actualiza la fila de costos reducidos Z_j − C_j.',
  },
  {
    titulo: 'Criterio de parada',
    detalle:
      'Si todos los valores básicos son ≥ 0, la base es primal y dual factible: solución óptima. Si la fila saliente no tiene ningún coeficiente negativo, no existe forma de recuperar la factibilidad primal: el problema es infactible.',
  },
];

const COMPARACION: { clave: string; primal: string; dual: string }[] = [
  {
    clave: 'Punto de partida',
    primal: 'Base primal-factible: todos los valores básicos x_B ≥ 0.',
    dual: 'Base dual-factible: todos los costos reducidos Z_j − C_j cumplen la condición de optimalidad.',
  },
  {
    clave: 'Qué se vigila',
    primal: 'Se mantiene la factibilidad primal y se persigue la optimalidad (dual-factibilidad).',
    dual: 'Se mantiene la optimalidad y se persigue la factibilidad primal (x_B ≥ 0).',
  },
  {
    clave: 'Variable que sale',
    primal: 'Prueba de la razón mínima: el menor cociente b_i / a_{ie} con a_{ie} > 0.',
    dual: 'La fila con el valor básico más negativo.',
  },
  {
    clave: 'Variable que entra',
    primal: 'La columna con el costo reducido más favorable (el más negativo en MAX, el más positivo en MIN).',
    dual: 'Prueba de la razón dual sobre coeficientes negativos de la fila saliente.',
  },
  {
    clave: 'Cuándo conviene',
    primal: 'Problemas con b ≥ 0 y base inicial de holguras factible.',
    dual: 'Cuando el modelo ya es óptimo pero deja de ser factible al cambiar b (re-optimización) o cuando arranca con b negativos.',
  },
];

export default function SimplexDualTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el Simplex Dual?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            Todo programa lineal tiene asociado un <strong>problema dual</strong>. Para el primal en
            forma de minimización
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800  dark:border-gray-600 dark:bg-gray-900 dark:text-slate-100">
            <Formula
              tex={
                '\\min\\; Z = c^{T}x \\quad \\text{s.a. } Ax \\geq b, \\; x \\geq 0'
              }
              display
            />
            <Formula
              tex={
                '\\max\\; W = b^{T}y \\quad \\text{s.a. } A^{T}y \\leq c, \\; y \\geq 0'
              }
              display
            />
          </div>
          <p>
            El <strong>Simplex Dual</strong> no resuelve el dual, sino el primal desde el otro lado:
            arranca con una base que ya es <strong>óptima para el dual</strong> (todos los costos
            reducidos satisfacen la condición de optimalidad) pero que puede ser{' '}
            <strong>infactible para el primal</strong> (algún valor básico negativo). El pivoteo dual
            intercambia variables conservando la optimalidad hasta que la factibilidad primal se
            recupera.
          </p>
          <p>
            Por la dualidad fuerte, si el algoritmo termina con todos los valores básicos ≥ 0, la
            solución es óptima para ambos problemas y los multiplicadores de la base son los precios
            sombra del primal. Todo el cálculo se hace con{' '}
            <strong>fracciones exactas</strong> (BigInt), nunca con punto flotante.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Condiciones de arranque (supuestos)
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El módulo normaliza internamente a un problema de <strong>minimización</strong>: si el
            modelo es de maximización se usa c′ = −c y al final se recupera Z = −Z′. La base inicial
            está formada por las holguras y excesos, de modo que la condición de dual-factibilidad se
            traduce en:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Minimización:</strong> todos los coeficientes de la función objetivo deben ser{' '}
              <Formula tex="c_j \geq 0" />.
            </li>
            <li>
              <strong>Maximización:</strong> todos los coeficientes deben ser{' '}
              <Formula tex="c_j \leq 0" />.
            </li>
          </ul>
          <p>
            El lado derecho b<sub>i</sub> sí puede ser negativo: precisamente esos valores negativos
            son los que hacen que la base inicial sea primal-infeasible y dan sentido al método. Si la
            base inicial no es dual-factible, el motor lo reporta como{' '}
            <strong>no-dual-factible</strong> y sugiere usar Simplex primal o Dos Fases para llegar
            primero a una base válida.
          </p>
          <p>
            Las restricciones <strong>≤</strong> usan una holgura S<sub>i</sub>; las{' '}
            <strong>≥</strong> se multiplican por −1 y usan un exceso E<sub>i</sub>; las{' '}
            <strong>igualdades</strong> se desdoblan en una fila ≥ y una fila ≤, de modo que ambas
            juntas imponen A x = b sin perder la dual-factibilidad.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          El algoritmo en cuatro pasos
        </h2>
        <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
          {PASOS.map((p) => (
            <li key={p.titulo}>
              <strong className="text-slate-700 dark:text-gray-100">{p.titulo}: </strong>
              {conSubindices(p.detalle)}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm  dark:border-gray-600 dark:bg-gray-900">
          <p className="mb-1 font-semibold text-slate-700  dark:text-gray-200">
            Prueba de la razón dual
          </p>
          <div className="text-slate-800  dark:text-slate-100">
            <Formula
              tex={
                'e = \\arg\\min_{j:\\, a_{rj} < 0} \\frac{Z_j - C_j}{a_{rj}}'
              }
              display
            />
          </div>
          <p className="mt-2 text-xs text-slate-500  dark:text-gray-400">
            La condición de optimalidad se conserva porque el cociente de dos cantidades negativas es
            positivo: la nueva fila de costos reducidos sigue cumpliendo Z<sub>j</sub> − C
            <sub>j</sub> ≤ 0 en la forma de minimización.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Simplex Dual vs. Simplex Primal
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400  dark:border-gray-700">
                <th className="py-2 pr-4">Aspecto</th>
                <th className="py-2 pr-4">Simplex Primal</th>
                <th className="py-2">Simplex Dual</th>
              </tr>
            </thead>
            <tbody>
              {COMPARACION.map((f) => (
                <tr key={f.clave} className="border-b border-slate-200 last:border-0  dark:border-gray-700">
                  <td className="py-2.5 pr-4 align-top font-semibold text-slate-700  dark:text-gray-100">
                    {f.clave}
                  </td>
                  <td className="py-2.5 pr-4 align-top text-slate-600  dark:text-gray-300">
                    {conSubindices(f.primal)}
                  </td>
                  <td className="py-2.5 align-top text-slate-600  dark:text-gray-300">
                    {conSubindices(f.dual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-6 shadow-md  dark:border-amber-800 dark:bg-amber-500/10">
        <h2 className="mb-2 text-lg font-semibold text-amber-800  dark:text-amber-300">
          Alcance y supuestos del módulo
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-800  dark:text-amber-200">
          <li>
            Acepta restricciones <strong>≤, ≥ e =</strong>, con b<sub>i</sub> de cualquier signo, y
            objetivos de maximización o minimización.
          </li>
          <li>
            La base inicial debe ser <strong>dual-factible</strong>. No se ejecuta una fase I: si no lo
            es, el resultado es <strong>no-dual-factible</strong> y hay que recurrir a Simplex primal o
            Dos Fases.
          </li>
          <li>
            Si en la fila saliente no hay coeficientes negativos, el primal es{' '}
            <strong>infactible</strong> (el dual sería no acotado); el motor lo informa con ese estado.
          </li>
          <li>
            Al mantenerse la dual-factibilidad, un problema con óptimo finito no puede volverse no
            acotado durante el pivoteo dual.
          </li>
          <li>
            La UI limita el tamaño a 12 variables y usa fracciones exactas en todo el proceso, por lo
            que los óptimos y las tablas son irreducibles.
          </li>
        </ul>
      </section>
    </article>
  );
}
