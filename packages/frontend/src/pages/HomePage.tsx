import { NavLink } from 'react-router-dom';
import Formula from '@shared/components/Formula';

const proximos = [
  'Faltantes Planeados',
  'Descuentos por Cantidad',
  'Demanda Probabilística',
  'Toma de Decisiones',
  'Teoría de Colas',
];

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

          {proximos.map((m) => (
            <div
              key={m}
              className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 p-5 opacity-60  dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="text-base font-semibold text-slate-500  dark:text-gray-400">{m}</p>
              <p className="mt-1 text-xs text-slate-400  dark:text-gray-500">Próximamente</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}