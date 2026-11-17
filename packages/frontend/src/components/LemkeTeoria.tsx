import Formula from '@shared/components/Formula';
import { conSubindices } from '@shared/components/Subindices';

const PASOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Variable artificial z_0',
    detalle:
      'Se añade la columna de unos z_0 al sistema w = q + Mz + e z_0 y se la deja entrar con el mayor valor que mantiene w ≥ 0: z_0 = −mín_i q_i. Con eso el tableau inicial es factible.',
  },
  {
    titulo: 'Pivoteo complementario',
    detalle:
      'Si sale de la base w_i, entra z_i; si sale z_i, entra w_i. Es decir, la variable entrante es siempre el complemento de la que acaba de salir, lo que preserva la estructura w_i z_i = 0.',
  },
  {
    titulo: 'Prueba de la razón',
    detalle:
      'La fila que sale es la del menor cociente valor básico / coeficiente positivo de la columna entrante. En caso de empate se aplica la regla lexicográfica: se comparan los cocientes auxiliares de una matriz identidad que se pivotea junto al sistema, lo que evita ciclos.',
  },
  {
    titulo: 'Terminación',
    detalle:
      'Si z_0 abandona la base, se obtiene una solución complementaria. Si la columna entrante no tiene coeficientes positivos, aparece un rayo terminal: el algoritmo no encuentra solución complementaria por ese camino.',
  },
];

export default function LemkeTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es un LCP?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El <strong>Problema de Complementariedad Lineal</strong> (LCP) busca dos vectores w y z que
            satisfagan
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800  dark:border-gray-600 dark:bg-gray-900 dark:text-slate-100">
            <Formula tex={'w = Mz + q, \\qquad w \\geq 0, \\; z \\geq 0, \\; w^{T}z = 0'} display />
          </div>
          <p>
            La condición <Formula tex="w^{T}z = 0" /> con ambos vectores no negativos equivale a{' '}
            <strong>complementariedad por pares</strong>: para cada índice i,{' '}
            <Formula tex="w_i z_i = 0" />. Es decir, de cada pareja (w<sub>i</sub>, z<sub>i</sub>) al
            menos una debe ser cero; nunca ambas pueden ser positivas.
          </p>
          <p>
            Muchos problemas de optimización —equilibrio, juegos, programación cuadrática— se formulan
            como un LCP. A diferencia de un programa lineal, aquí no hay función objetivo: se buscan
            puntos que cumplan simultáneamente las ecuaciones lineales y la complementariedad.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          El algoritmo de Lemke
        </h2>
        <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
          {PASOS.map((p) => (
            <li key={p.titulo}>
              <strong className="text-slate-700 dark:text-gray-100">{conSubindices(p.titulo)}: </strong>
              {conSubindices(p.detalle)}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm  dark:border-gray-600 dark:bg-gray-900">
          <p className="mb-1 font-semibold text-slate-700  dark:text-gray-200">
            Forma aumentada del pivoteo
          </p>
          <div className="text-slate-800  dark:text-slate-100">
            <Formula tex={'w - Mz - e\\,z_0 = q, \\qquad z_0 \\geq 0'} display />
          </div>
          <p className="mt-2 text-xs text-slate-500  dark:text-gray-400">
            La columna artificial z<sub>0</sub> es el «parámetro de homotopía» que permite empezar en
            una solución trivial no complementaria y avanzar hasta una complementaria.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          De la programación cuadrática al LCP (KKT)
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>El módulo resuelve el programa cuadrático convexo</p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800  dark:border-gray-600 dark:bg-gray-900 dark:text-slate-100">
            <Formula
              tex={
                '\\min\\; \\tfrac{1}{2}x^{T}Qx + c^{T}x \\quad \\text{s.a. } Ax \\geq b, \\; x \\geq 0'
              }
              display
            />
          </div>
          <p>
            Con multiplicadores λ ≥ 0 para las restricciones y μ ≥ 0 para la no negatividad, las
            condiciones de <strong>Karush–Kuhn–Tucker</strong> son
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800  dark:border-gray-600 dark:bg-gray-900 dark:text-slate-100">
            <Formula
              tex={
                'Qx + c - A^{T}\\lambda - \\mu = 0, \\qquad s = Ax - b \\geq 0, \\qquad ' +
                '\\mu^{T}x = 0, \\qquad \\lambda^{T}s = 0'
              }
              display
            />
          </div>
          <p>
            Definiendo z = (x, λ), w = (μ, s) y
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800  dark:border-gray-600 dark:bg-gray-900 dark:text-slate-100">
            <Formula
              tex={
                'M = \\begin{bmatrix} Q & -A^{T} \\\\ A & 0 \\end{bmatrix}, \\qquad ' +
                'q = \\begin{bmatrix} c \\\\ -b \\end{bmatrix}'
              }
              display
            />
          </div>
          <p>
            las condiciones KKT se escriben exactamente como el LCP{' '}
            <Formula tex="w = Mz + q,\; w,z \geq 0,\; w^{T}z = 0" />. Así, resolver el QP equivale a
            resolver un LCP de tamaño n + m, que es lo que hace Lemke.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Cómo leer los resultados
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600  dark:text-gray-300">
          <li>
            <strong>Tabla de complementariedad:</strong> para cada i muestra z<sub>i</sub>, w
            <sub>i</sub> y su producto. La solución es válida cuando todos los productos son cero y
            ambos vectores son no negativos.
          </li>
          <li>
            <strong>Residuo w − (Mz + q):</strong> debe ser el vector cero; si no lo es, la solución
            no satisface las ecuaciones del LCP.
          </li>
          <li>
            <strong>En modo QP:</strong> z = (x, λ) y w = (μ, s). Las primeras n componentes de z son
            la solución x<sup>*</sup>, las m siguientes son los multiplicadores λ; las holguras son s =
            Ax − b y μ = Qx + c − A<sup>T</sup>λ.
          </li>
          <li>
            <strong>Verificación KKT:</strong> el módulo comprueba la estacionariedad
            Qx + c − A<sup>T</sup>λ − μ = 0 junto con las dos condiciones de complementariedad.
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-6 shadow-md  dark:border-amber-800 dark:bg-amber-500/10">
        <h2 className="mb-2 text-lg font-semibold text-amber-800  dark:text-amber-300">
          Alcance y supuestos del módulo
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-800  dark:text-amber-200">
          <li>
            En modo <strong>QP</strong> la matriz Q debe ser <strong>simétrica</strong>; la validación
            rechaza diferencias mayores que 10<sup>−9</sup>.
          </li>
          <li>
            Si Q es semidefinida positiva (QP convexo), el punto KKT que encuentra Lemke es un{' '}
            <strong>óptimo global</strong>. El módulo no verifica la convexidad: en un QP no convexo el
            resultado es un punto estacionario, no necesariamente el mínimo global.
          </li>
          <li>
            Lemke <strong>no garantiza solución para todo LCP</strong>. Si aparece un rayo terminal, el
            estado es <strong>sin solución</strong> por ese camino; puede existir otra solución
            complementaria, pero este arranque no la alcanza.
          </li>
          <li>
            El modo LCP acepta M de hasta 20×20 en el motor (8×8 en la UI) y el modo QP hasta 20
            variables más 20 restricciones.
          </li>
          <li>
            Toda la aritmética es exacta con fracciones (BigInt), incluida la regla lexicográfica; no
            se usan tolerancias numéricas en el pivoteo.
          </li>
        </ul>
      </section>
    </article>
  );
}
