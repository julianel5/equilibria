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

          <div
            aria-disabled="true"
            className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5  dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500  dark:bg-gray-700 dark:text-gray-400">
              Próximamente
            </span>
            <p className="text-base font-bold text-slate-400  dark:text-gray-500">
              Método Simplex y Simplex Revisado
            </p>
            <p className="mt-1 text-sm text-slate-400  dark:text-gray-500">
              Algoritmo algebraico y matricial para maximización y minimización.
            </p>
            <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-slate-400  dark:bg-gray-800 dark:text-gray-400">
              <Formula tex="B^{-1}A_j" />
            </div>
          </div>

          <div
            aria-disabled="true"
            className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5  dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500  dark:bg-gray-700 dark:text-gray-400">
              Próximamente
            </span>
            <p className="text-base font-bold text-slate-400  dark:text-gray-500">
              Penalización y Dos Fases (Charnes)
            </p>
            <p className="mt-1 text-sm text-slate-400  dark:text-gray-500">
              Variables artificiales y solución inicial factible.
            </p>
            <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-slate-400  dark:bg-gray-800 dark:text-gray-400">
              <Formula tex="\max Z = cX - M \sum R_i" />
            </div>
          </div>

          <div
            aria-disabled="true"
            className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5  dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500  dark:bg-gray-700 dark:text-gray-400">
              Próximamente
            </span>
            <p className="text-base font-bold text-slate-400  dark:text-gray-500">
              Simplex Dual y Algoritmo de Lemke
            </p>
            <p className="mt-1 text-sm text-slate-400  dark:text-gray-500">
              Optimización desde la super-optimalidad y complementariedad.
            </p>
            <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-slate-400  dark:bg-gray-800 dark:text-gray-400">
              <Formula tex="y^T A \ge c^T" />
            </div>
          </div>

          <div
            aria-disabled="true"
            className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5  dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500  dark:bg-gray-700 dark:text-gray-400">
              Próximamente
            </span>
            <p className="text-base font-bold text-slate-400  dark:text-gray-500">
              Análisis de Sensibilidad
            </p>
            <p className="mt-1 text-sm text-slate-400  dark:text-gray-500">
              Rangos de optimalidad y holguras.
            </p>
            <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-slate-400  dark:bg-gray-800 dark:text-gray-400">
              <Formula tex="c_B B^{-1} b" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Modelos de Distribución y Redes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            aria-disabled="true"
            className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5  dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500  dark:bg-gray-700 dark:text-gray-400">
              Próximamente
            </span>
            <p className="text-base font-bold text-slate-400  dark:text-gray-500">Modelos de Transporte</p>
            <p className="mt-1 text-sm text-slate-400  dark:text-gray-500">
              Esquina Noroeste, Costo Mínimo y Aproximación de Vogel.
            </p>
            <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-slate-400  dark:bg-gray-800 dark:text-gray-400">
              <Formula tex="\sum_{i} \sum_{j} c_{ij}x_{ij}" />
            </div>
          </div>

          <div
            aria-disabled="true"
            className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5  dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500  dark:bg-gray-700 dark:text-gray-400">
              Próximamente
            </span>
            <p className="text-base font-bold text-slate-400  dark:text-gray-500">
              Problema de Asignación (Algoritmo Húngaro)
            </p>
            <p className="mt-1 text-sm text-slate-400  dark:text-gray-500">
              Asignación pura (1 a 1) para maximización y minimización.
            </p>
            <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-slate-400  dark:bg-gray-800 dark:text-gray-400">
              <Formula tex="x_{ij} \in \{0,1\}" />
            </div>
          </div>
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
            <p className="text-base font-bold text-blue-600  dark:text-blue-400">Demanda Probabilística</p>
            <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
              Punto de Reorden y Stock de Seguridad
            </p>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-slate-600  dark:bg-blue-500/20 dark:text-blue-300">
              <Formula tex="ROP = \bar{d}L + Z\sigma_d\sqrt{L}" />
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