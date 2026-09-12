import type { ChangeEvent } from 'react';

interface PrefsCardProps {
  unidad: string;
  moneda: string;
  onUnidadChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMonedaChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function PrefsCard({
  unidad,
  moneda,
  onUnidadChange,
  onMonedaChange,
}: PrefsCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
        Preferencias de Visualización
      </h2>
      <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
        Personaliza las unidades de medida y la moneda mostradas en toda la
        pantalla. Se reflejan al instante.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600  dark:text-gray-300">
            Nombre de la unidad de medida
          </span>
          <input
            type="text"
            placeholder="ej. litros, cajas, kg..."
            value={unidad}
            onChange={onUnidadChange}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600  dark:text-gray-300">
            Moneda / Divisa
          </span>
          <input
            type="text"
            placeholder="ej. USD, EUR, COP, $..."
            value={moneda}
            onChange={onMonedaChange}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
          />
        </label>
      </div>
    </section>
  );
}