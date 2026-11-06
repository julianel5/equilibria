import Formula from '@shared/components/Formula';
import { conSubindices } from '@shared/components/Subindices';

const ETAPAS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Forma estándar ampliada',
    detalle:
      'Las restricciones ≥ se convierten restando una variable de exceso Eᵢ y añadiendo una variable artificial Rᵢ; las restricciones = añaden directamente una variable artificial Rᵢ. Cada artificial recibe un coeficiente penalizador M en la función objetivo: -M·Rᵢ para MAX y +M·Rᵢ para MIN, forzando a las artificiales a salir de la base.',
  },
  {
    titulo: 'Costo reducido con Gran M',
    detalle:
      'Los costos reducidos se calculan como Zⱼ − Cⱼ = c_{B}B⁻¹aⱼ − cⱼ, donde las variables artificiales tienen costo Cⱼ = ±M. Para MAX, entra la columna con Zⱼ − Cⱼ más negativo (incluyendo el efecto de M); para MIN, entra la más positiva. El óptimo se alcanza cuando se satisface el criterio correspondiente y ninguna artificial permanece positiva en la base.',
  },
  {
    titulo: 'Prueba de la razón mínima',
    detalle:
      'Para la columna entrante se divide el lado derecho de cada fila entre su coeficiente. Los denominadores negativos o cero se descartan. La fila con la razón más pequeña entrega la variable que sale. Si una variable artificial sale, su columna se elimina de futuros cálculos (ya no puede volver a entrar).',
  },
  {
    titulo: 'Pivote (Gauss–Jordan)',
    detalle:
      'El elemento pivote se convierte en 1 y se anula el resto de su columna con operaciones de fila. Todas las operaciones se hacen con fracciones exactas (BigInt), de modo que cada tableau es irreducible: 28/3 nunca se aproxima a 9.333…',
  },
];

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Proporcionalidad',
    detalle:
      'La contribución de cada variable a la función objetivo y al uso de recursos es estrictamente proporcional a su valor. La penalización M·Rᵢ es lineal en Rᵢ, por lo que el supuesto se mantiene para las artificiales también.',
  },
  {
    titulo: 'Aditividad',
    detalle:
      'El valor total de la función objetivo es la suma de las contribuciones individuales, incluyendo los términos de penalización ±M·Rᵢ de cada variable artificial.',
  },
  {
    titulo: 'Divisibilidad',
    detalle:
      'Las variables de decisión, incluidas las artificiales y de exceso/holgura, pueden tomar valores fraccionarios continuos.',
  },
  {
    titulo: 'Certidumbre',
    detalle:
      'Los parámetros del modelo (cⱼ, bᵢ, aᵢⱼ, M) son constantes conocidos con certeza. M debe elegirse lo suficientemente grande para que su efecto domine cualquier otro coeficiente.',
  },
  {
    titulo: 'No negatividad',
    detalle:
      'Todas las variables de decisión, de exceso, de holgura y artificiales son ≥ 0. Una artificial positiva en el tableau final indica que el problema original no tiene solución factible.',
  },
  {
    titulo: 'Elección de M',
    detalle:
      'M debe ser un número positivo lo suficientemente grande. En la implementación se usa un M simbólico grande; si al finalizar alguna artificial sigue en base con valor positivo, el problema original es infactible.',
  },
];

export default function GranMTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el Método de Penalización (Gran M)?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El <strong>Método de Penalización (Gran M)</strong> es una extensión del Simplex para
            resolver programas lineales que incluyen restricciones de tipo ≥ o =, donde no existe
            una base factible inmediata (no hay variable de holgura que pueda iniciar la base de
            identidad).
          </p>
          <p>
            Para superar esto, se añade una <strong>variable artificial Rᵢ</strong> a cada restricción
            que lo necesite, dotándola de un coeficiente penalizador <strong>M</strong> en la función
            objetivo. Así, el algoritmo se ve "obligado" a expulsar las artificiales de la base
            porque mantenerlas encarece (en MAX) o encarece (en MIN) el valor de Z.
          </p>
          <p>
            Este módulo implementa el Gran M con <strong>aritmética exacta de fracciones</strong>
            (nunca punto flotante) en sus dos presentaciones:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Gran M Tabular</strong>: el tableau completo, fila a fila, con las variables
              artificiales marcadas y su coeficiente de penalización M visible en Zⱼ − Cⱼ.
            </li>
            <li>
              <strong>Gran M Revisado</strong>: la versión matricial que trabaja con la base B, su
              inversa B⁻¹ y los multiplicadores yᵀ = c<sub>B</sub>B⁻¹, incluyendo el costo M de las
              artificiales en los costos reducidos.
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
              {conSubindices(s.detalle)}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm  dark:border-gray-600 dark:bg-gray-900">
          <p className="mb-1 font-semibold text-slate-700  dark:text-gray-200">
            Forma estándar ampliada (con Gran M)
          </p>
          <div className="text-slate-800  dark:text-slate-100">
            <Formula
              tex={
                '\\text{opt } Z = \\sum_{j=1}^{n} c_j x_j \\pm M \\sum_{i=1}^{k} R_i \\quad \\text{s.a. } \\sum_{j=1}^{n} a_{ij}x_j \\geq b_i \\text{ (o } =\\text{)}, \\; x_j \\geq 0, \\; R_i \\geq 0'
              }
              display
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos del Método de Penalización (Gran M)
        </h2>
        <p className="mb-4 text-sm text-slate-600  dark:text-gray-300">
          Un modelo resuelto con Gran M es válido solo cuando el problema real cumple las siguientes
          hipótesis, propias de la Programación Lineal y de la introducción de variables artificiales:
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

      <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-6 shadow-md  dark:border-amber-800 dark:bg-amber-500/10">
        <h2 className="mb-2 text-lg font-semibold text-amber-800  dark:text-amber-300">
          Interpretación del resultado
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-amber-800  dark:text-amber-200">
          <li>
            Si al finalizar <strong>ninguna variable artificial Rᵢ permanece en la base con valor
            positivo</strong>, se obtiene una solución factible y óptima del problema original.
          </li>
          <li>
            Si al finalizar <strong>alguna artificial Rᵢ sigue en la base con valor positivo</strong>,
            el problema original <strong>no tiene solución factible</strong> (el conjunto factible
            original es vacío).
          </li>
          <li>
            Las artificiales que salen de la base durante las iteraciones <strong>no pueden volver a
            entrar</strong> en iteraciones subsiguientes.
          </li>
        </ul>
      </section>

      <aside className="max-w-4xl text-sm text-slate-400  dark:text-gray-500">
        <p>
          Esta sección es un resumen introductorio de carácter académico y se ofrece como contenido
          de apoyo. Puede ampliarse con la investigación propia en fuentes especializadas de
          Investigación de Operaciones.
        </p>
      </aside>
    </article>
  );
}
