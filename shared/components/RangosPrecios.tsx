import Formula from './Formula';

export interface RangoPrecio {
  cantidadMinima: string;
  cantidadMaxima: string;
  costoUnitario: string;
}

interface RangosPreciosProps {
  rangos: RangoPrecio[];
  onChange: (rangos: RangoPrecio[]) => void;
  unidad: string;
  moneda: string;
  fieldErrors?: Record<string, string>;
}

const inputClases =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

const errorClases = 'mt-1 block text-xs font-semibold text-red-600 dark:text-red-400';

export default function RangosPrecios({
  rangos,
  onChange,
  unidad,
  moneda,
  fieldErrors = {},
}: RangosPreciosProps) {
  const actualizar = (idx: number, campo: keyof RangoPrecio, valor: string) =>
    onChange(rangos.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)));

  const agregar = () => {
    const prev = rangos[rangos.length - 1];
    const prevMax = Number(prev.cantidadMaxima);
    const siguienteMinimo = Number.isFinite(prevMax)
      ? String(prevMax + 1)
      : String((Number(prev.cantidadMinima) || 0) + 1);
    onChange([
      ...rangos,
      {
        cantidadMinima: siguienteMinimo,
        cantidadMaxima: '',
        costoUnitario: prev.costoUnitario,
      },
    ]);
  };

  const eliminar = (idx: number) => {
    if (rangos.length <= 2) return;
    onChange(rangos.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_1fr_2.25rem] gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          Mínimo · <Formula tex="q_{min}" />
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          Máximo · <Formula tex="q_{max}" />
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          Precio · <Formula tex="C" />
        </span>
      </div>

      {rangos.map((rango, idx) => {
        const esUltimo = idx === rangos.length - 1;
        return (
          <div key={idx} className="space-y-1">
            <div className="grid grid-cols-[1fr_1fr_1fr_2.25rem] items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                required
                value={rango.cantidadMinima}
                onChange={(e) => actualizar(idx, 'cantidadMinima', e.target.value)}
                className={inputClases}
                aria-label={`Cantidad mínima del nivel ${idx + 1}`}
              />
              <input
                type="number"
                min="0"
                step="any"
                required={!esUltimo}
                placeholder={esUltimo ? '∞ (vacío)' : undefined}
                value={rango.cantidadMaxima}
                onChange={(e) => actualizar(idx, 'cantidadMaxima', e.target.value)}
                className={inputClases}
                aria-label={`Cantidad máxima del nivel ${idx + 1}`}
              />
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={rango.costoUnitario}
                onChange={(e) => actualizar(idx, 'costoUnitario', e.target.value)}
                className={inputClases}
                aria-label={`Precio unitario del nivel ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => eliminar(idx)}
                disabled={rangos.length <= 2}
                aria-label={`Eliminar nivel ${idx + 1}`}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-500  hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M14.78 5.22a.75.75 0 0 1 0 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 1.06-1.06L10 8.94l3.72-3.72a.75.75 0 0 1 1.06 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            {fieldErrors[`rangos.${idx}.cantidadMinima`] ? (
              <p role="alert" className={errorClases}>
                {fieldErrors[`rangos.${idx}.cantidadMinima`]}
              </p>
            ) : null}
            {fieldErrors[`rangos.${idx}.cantidadMaxima`] ? (
              <p role="alert" className={errorClases}>
                {fieldErrors[`rangos.${idx}.cantidadMaxima`]}
              </p>
            ) : null}
            {fieldErrors[`rangos.${idx}.costoUnitario`] ? (
              <p role="alert" className={errorClases}>
                {fieldErrors[`rangos.${idx}.costoUnitario`]}
              </p>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        onClick={agregar}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-400 px-3 py-1.5 text-sm font-semibold text-blue-600  hover:bg-blue-50 dark:border-blue-500/60 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Agregar nivel de precio
      </button>

      <p className="text-xs text-slate-400 dark:text-gray-500">
        El último nivel puede dejar la cantidad máxima en blanco (significa «infinito»). Unidades
        en {unidad} y precios en {moneda}.
      </p>
    </div>
  );
}