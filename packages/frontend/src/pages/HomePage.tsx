import { NavLink } from 'react-router-dom';
import Formula from '@shared/components/Formula';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800  dark:text-gray-100">
          Equilibria — Modelos de Investigación de Operaciones
        </h1>
        <p className="mt-2 text-slate-500  dark:text-gray-400">
          Resolución, visualización y análisis de modelos de Investigación de
          Operaciones.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Teoría de Inventarios
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NavLink
            to="/inventory/eoq"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">EOQ</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Cantidad Económica de Pedido
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="Q^* = \sqrt{ \frac{2DS}{H} }" />
            </div>
          </NavLink>

          <NavLink
            to="/inventory/epq"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">EPQ</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Lote Económico de Producción
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="Q^* = \sqrt{ \frac{2DS}{H(1 - \frac{D}{P})} }" />
            </div>
          </NavLink>

          <NavLink
            to="/inventory/eoq-faltantes"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">EOQ con Faltantes</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Déficit autorizado (backorders)
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="Q^* = \sqrt{ \frac{2DS}{H} } \times \sqrt{ \frac{H+B}{B} }" />
            </div>
          </NavLink>

          <NavLink
            to="/inventory/eoq-descuentos"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">EOQ con Descuentos</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Descuentos por cantidad (niveles de precio)
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="TC_j = \frac{D}{Q}S + \frac{Q}{2}H_j + DC_j" />
            </div>
          </NavLink>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Programación Lineal
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NavLink
            to="/pl/metodo-grafico"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">
              Método Gráfico y Enumerativo
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Resolución visual, puntos extremos y evaluación de vértices.
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="\max Z = C^T X" />
            </div>
          </NavLink>

          <NavLink
            to="/pl/simplex"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">
              Método Simplex y Simplex Revisado
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Algoritmo algebraico y matricial para maximización y minimización.
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="B^{-1}A_j" />
            </div>
          </NavLink>

          <NavLink
            to="/pl/penalizacion"
            className="rounded-lg border border-amber-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-amber-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-amber-600  dark:text-amber-400">
              Método de Penalización (Gran M)
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Variables artificiales y penalización simbólica para restricciones ≥ e =.
            </p>
            <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-slate-600  dark:bg-amber-500/20 dark:text-amber-300">
              <Formula tex="\max Z = cX - M \sum R_i" />
            </div>
          </NavLink>

          <NavLink
            to="/pl/sensibilidad"
            className="rounded-lg border border-emerald-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-emerald-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-emerald-600  dark:text-emerald-400">
              Análisis de Sensibilidad
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Precios sombra, holguras y rangos de optimalidad de b y c, con simulador de cambios.
            </p>
            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-slate-600  dark:bg-emerald-500/20 dark:text-emerald-300">
              <Formula tex="y^T = c_B B^{-1}" />
            </div>
          </NavLink>

          <NavLink
            to="/pl/dual"
            className="rounded-lg border border-violet-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-violet-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-violet-600  dark:text-violet-400">
              Simplex Dual
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Optimización desde la super-optimalidad: base dual-factible y pivoteo dual.
            </p>
            <div className="mt-3 rounded-md bg-violet-50 px-3 py-2 text-slate-600  dark:bg-violet-500/20 dark:text-violet-300">
              <Formula tex="y^T A \ge c^T" />
            </div>
          </NavLink>

          <NavLink
            to="/pl/lemke"
            className="rounded-lg border border-sky-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-sky-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-sky-600  dark:text-sky-400">
              Algoritmo de Lemke
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Pivoteo complementario para LCP y programación cuadrática vía KKT.
            </p>
            <div className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-slate-600  dark:bg-sky-500/20 dark:text-sky-300">
              <Formula tex="w = Mz + q,\quad w^T z = 0" />
            </div>
          </NavLink>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Modelos de Distribución y Redes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NavLink
            to="/pl/transporte"
            className="rounded-lg border border-orange-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-orange-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-orange-600  dark:text-orange-400">Modelos de Transporte</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Esquina Noroeste, Costo Mínimo y Aproximación de Vogel con MODI/UV.
            </p>
            <div className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-slate-600  dark:bg-orange-500/20 dark:text-orange-300">
              <Formula tex="\sum_{i} \sum_{j} c_{ij}x_{ij}" />
            </div>
          </NavLink>

          <NavLink
            to="/pl/asignacion"
            className="rounded-lg border border-teal-200 bg-white p-5 shadow-md hover:scale-[1.02] dark:border-teal-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-teal-600 dark:text-teal-400">
              Problema de Asignación (Algoritmo Húngaro)
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Asignación uno a uno con costos o beneficios y traza exacta de cada reducción.
            </p>
            <div className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-slate-600 dark:bg-teal-500/20 dark:text-teal-300">
              <Formula tex="x_{ij} \in \{0,1\}" />
            </div>
          </NavLink>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Modelos Estocásticos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NavLink
            to="/stochastic/punto-reorden"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">
              Punto de Reorden (ROP)
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Punto de Reorden y Stock de Seguridad
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="ROP = \bar{d}L + Z\sigma_d\sqrt{L}" />
            </div>
          </NavLink>

          <NavLink
            to="/stochastic/periodo-unico"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">
              Periodo Único (Newsvendor)
            </p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Compra única con costos de exceso y escasez
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="P(D \le Q^*) = \frac{C_u}{C_u + C_o}" />
            </div>
          </NavLink>

          <NavLink
            to="/stochastic/teoria-colas"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">Teoría de Colas</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Sistemas estocásticos M/M/1 y M/M/c
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="L = L_q + \frac{\lambda}{\mu}" />
            </div>
          </NavLink>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Toma de Decisiones
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NavLink
            to="/decisiones/matriz-pagos"
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-md  hover:scale-[1.02] dark:border-blue-900 dark:bg-gray-800"
          >
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">Matriz de Pagos</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Criterios de decisión bajo incertidumbre
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="VME_i = \sum_j p_j \, a_{ij}" />
            </div>
          </NavLink>
        </div>
      </section>
    </div>
  );
}
