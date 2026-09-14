import Formula from '@shared/components/Formula';

const SUPUESTOS: { titulo: string; detalle: string }[] = [
  {
    titulo: 'Proporcionalidad',
    detalle:
      'La contribución de cada variable a la función objetivo y al uso de recursos es estrictamente proporcional a su valor. No existen costos fijos, economías de escala ni rendimientos no lineales: duplicar una variable duplica su aporte a Z y a cada recurso.',
  },
  {
    titulo: 'Aditividad',
    detalle:
      'El valor total de la función objetivo y el uso total de recursos es la suma de las contribuciones individuales de cada variable. No hay sinergias, interferencias ni efectos cruzados: cada término a₁x₁ y a₂x₂ se suma sin depender de los demás.',
  },
  {
    titulo: 'Divisibilidad',
    detalle:
      'Las variables de decisión pueden tomar valores fraccionarios continuos; no están restringidas a números enteros. Por eso la solución puede ubicarse en cualquier punto del plano, no solo en coordenadas enteras.',
  },
  {
    titulo: 'Certidumbre',
    detalle:
      'Los parámetros del modelo (cⱼ, bᵢ, aᵢⱼ) son constantes conocidas con certeza. No hay incertidumbre probabilística en los coeficientes de la función objetivo ni en los lados derechos de las restricciones.',
  },
];

const GLOSARIO: { termino: string; definicion: string; tex?: string }[] = [
  {
    termino: 'Región Factible',
    definicion:
      'Conjunto de todos los puntos del plano que satisfacen simultáneamente todas las restricciones del modelo, incluidas las de no negatividad. Gráficamente es un polígono convexo: si el problema es de dos variables, cualquier recta es un hiperplano que divide al plano en dos semiespacios, y la región factible es la intersección de todos los semiespacios permitidos.',
    tex: 'S = \\{ (x_1, x_2) \\in \\mathbb{R}^2 \\; : \\; x_1, x_2 \\geq 0, \\; a_{i1}x_1 + a_{i2}x_2 \\leq b_i \\}',
  },
  {
    termino: 'Punto Extremo (Vértice)',
    definicion:
      'Punto de la región factible que no puede expresarse como combinación convexa estrictamente de otros dos puntos distintos de la región. En dos dimensiones coincide con la intersección de dos restricciones activas. El Teorema Fundamental de la Programación Lineal garantiza que, si existe un óptimo finito, este se alcanza en al menos un punto extremo (o en todo un segmento entre dos de ellos).',
  },
  {
    termino: 'Restricción Activa',
    definicion:
      'Restricción que pasa exactamente por el punto evaluado, es decir, que se cumple con holgura cero. En el vértice óptimo la restricción activa satisface su lado derecho con igualdad: bᵢ − (aᵢ₁x₁ + aᵢ₂x₂) = 0. Por el contrario, si la holgura es estrictamente positiva la restricción se llama laxa o inactiva en ese punto.',
    tex: 'a_{i1}x_1^* + a_{i2}x_2^* = b_i \\quad \\Longleftrightarrow \\quad \\text{holgura } y_i = 0',
  },
];

export default function MetodoGraficoTeoria() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          ¿Qué es el método gráfico?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600  dark:text-gray-300">
          <p>
            El método gráfico es la herramienta más intuitiva para resolver un modelo de{' '}
            <strong>Programación Lineal (PL)</strong> cuando el problema involucra únicamente dos
            variables de decisión. Consiste en dibujar en el plano cartesiano cada restricción como
            una recta, identificar la región que satisface todas las restricciones a la vez y
            desplazar la recta de la función objetivo hasta que toca el último punto factible.
          </p>
          <p>
            Una vez dibujada la región factible, la solución óptima se encuentra evaluando la
            función objetivo en cada <em>punto extremo</em> (vértice) del polígono: el valor de Z se
            optimiza comparando las Z de todos los vértices. La calculadora de esta sección automatiza
            el proceso de intersección de rectas, la identificación de vértices y el descarte de los
            cruces que quedan fuera de la región.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Supuestos de la Programación Lineal
        </h2>
        <p className="mb-4 text-sm text-slate-600  dark:text-gray-300">
          Un modelo de PL es válido solo cuando el problema real puede describirse mediante las
          siguientes hipótesis. Son las condiciones que garantizan que las herramientas lineales
          capturen fielmente el comportamiento del sistema:
        </p>
        <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600  dark:text-gray-300">
          {SUPUESTOS.map((s) => (
            <li key={s.titulo}>
              <strong className="text-slate-700 dark:text-gray-100">{s.titulo}: </strong>
              {s.detalle}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm  dark:border-gray-600 dark:bg-gray-900">
          <p className="mb-1 font-semibold text-slate-700  dark:text-gray-200">
            Modelo económico del método gráfico
          </p>
          <div className="text-slate-800  dark:text-slate-100">
            <Formula tex={'\\max\\; Z = c_1 x_1 + c_2 x_2'} display />
          </div>
          <div className="mt-1 text-slate-800  dark:text-slate-100">
            <Formula tex={'\\text{s.a.}\\; a_{i1}x_1 + a_{i2}x_2 \\leq b_i, \\quad x_1, x_2 \\geq 0'} display />
          </div>
          <p className="mt-2 text-xs text-slate-500  dark:text-gray-400">
            cⱼ: coeficiente de utilidad o costo de la variable j · bᵢ: disponibilidad del recurso i ·
            aᵢⱼ: consumo del recurso i por unidad de la variable j.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Glosario Geométrico
        </h2>
        <p className="mb-5 text-sm text-slate-600  dark:text-gray-300">
          Los conceptos que conectan el álgebra del modelo con el dibujo del plano cartesiano:
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {GLOSARIO.map((g) => (
            <div
              key={g.termino}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-5  dark:border-gray-600 dark:bg-gray-900"
            >
              <h3 className="text-sm font-semibold text-slate-700  dark:text-gray-100">{g.termino}</h3>
              {g.tex ? (
                <div className="w-full text-[1.05rem] text-slate-800  dark:text-slate-100">
                  <Formula tex={g.tex} display />
                </div>
              ) : null}
              <p className="text-xs leading-relaxed text-slate-500  dark:text-gray-400">
                {g.definicion}
              </p>
            </div>
          ))}
        </div>
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