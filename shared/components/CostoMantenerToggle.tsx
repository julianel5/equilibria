import type { ChangeEvent } from 'react';
import Formula from './Formula';

export type ModoMantener = 'fijo' | 'porcentaje';

interface CostoMantenerToggleProps {
  modo: ModoMantener;
  onModoChange: (modo: ModoMantener) => void;
  costoMantener: string;
  onCostoMantenerChange: (e: ChangeEvent<HTMLInputElement>) => void;
  costoMantenerPorcentaje: string;
  onCostoMantenerPorcentajeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  unidad: string;
  moneda: string;
  fieldErrors?: Record<string, string>;
  hintPorcentaje?: string;
}

const inputClases =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const botonModo = (activo: boolean) =>
  `rounded px-3 py-1.5 text-sm ${
    activo
      ? 'bg-white font-semibold text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
      : 'font-medium text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'
  }`;

export default function CostoMantenerToggle({
  modo,
  onModoChange,
  costoMantener,
  onCostoMantenerChange,
  costoMantenerPorcentaje,
  onCostoMantenerPorcentajeChange,
  unidad,
  moneda,
  fieldErrors = {},
  hintPorcentaje = 'porcentaje anual del precio (H = I × C)',
}: CostoMantenerToggleProps) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
        Costo de mantener
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1  dark:bg-gray-900">
        <button
          type="button"
          onClick={() => onModoChange('fijo')}
          className={botonModo(modo === 'fijo')}
        >
          Fijo (H)
        </button>
        <button
          type="button"
          onClick={() => onModoChange('porcentaje')}
          className={botonModo(modo === 'porcentaje')}
        >
          Porcentaje (I)
        </button>
      </div>
      <div className="mt-3">
        <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
          {modo === 'fijo' ? 'Costo de mantener' : 'Costo de mantener (%)'}
          <span className="text-slate-400  dark:text-gray-500">
            <Formula tex={modo === 'fijo' ? 'H' : 'I'} />
          </span>
        </label>
        <input
          type="number"
          min="0.01"
          step="any"
          required
          value={modo === 'fijo' ? costoMantener : costoMantenerPorcentaje}
          onChange={modo === 'fijo' ? onCostoMantenerChange : onCostoMantenerPorcentajeChange}
          className={inputClases}
        />
        <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
          {modo === 'fijo' ? `${moneda} / ${unidad}-año` : hintPorcentaje}
        </span>
        {fieldErrors.costoMantener ? (
          <span role="alert" className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400">
            {fieldErrors.costoMantener}
          </span>
        ) : null}
        {fieldErrors.costoMantenerPorcentaje ? (
          <span role="alert" className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400">
            {fieldErrors.costoMantenerPorcentaje}
          </span>
        ) : null}
      </div>
    </div>
  );
}