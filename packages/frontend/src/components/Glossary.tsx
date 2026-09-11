import { useEffect } from 'react';
import Formula from './Formula';

interface VariableDef {
  simbolo: string;
  nombre: string;
  descripcion: string;
}

const VARIABLES: VariableDef[] = [
  {
    simbolo: 'D',
    nombre: 'Demanda anual',
    descripcion:
      'Cantidad de producto requerida durante un año, en las unidades de medida configuradas.',
  },
  {
    simbolo: 'S',
    nombre: 'Costo fijo por orden',
    descripcion:
      'Costo de preparar o emitir un pedido, independiente del tamaño del lote.',
  },
  {
    simbolo: 'H',
    nombre: 'Costo de mantener',
    descripcion: 'Costo de almacenar una unidad de inventario durante un año.',
  },
  {
    simbolo: 'C',
    nombre: 'Costo unitario',
    descripcion: 'Precio de compra o producción de cada unidad del producto.',
  },
  {
    simbolo: 'Q^*',
    nombre: 'Cantidad Económica de Pedido',
    descripcion: 'Lote óptimo que minimiza el costo total relevante anual.',
  },
  {
    simbolo: 'TC',
    nombre: 'Costo Total Anual',
    descripcion:
      'Suma de los costos anuales de ordenar, mantener y adquisición del inventario.',
  },
  {
    simbolo: 'N',
    nombre: 'Número de pedidos por año',
    descripcion: 'Órdenes emitidas al año para cubrir la demanda (N = D / Q*).',
  },
  {
    simbolo: 'T',
    nombre: 'Ciclo de reposición',
    descripcion: 'Tiempo en días entre dos pedidos consecutivos (T = 365 / N).',
  },
];

interface GlossaryProps {
  abierto: boolean;
  onClose: () => void;
}

export default function Glossary({ abierto, onClose }: GlossaryProps) {
  useEffect(() => {
    if (!abierto) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Glosario de nomenclatura"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl  dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
            Glosario de Nomenclatura
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400  hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Cerrar glosario"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="divide-y divide-slate-100 px-5 pb-5 dark:divide-gray-700">
          {VARIABLES.map((variable) => (
            <li
              key={variable.simbolo}
              className="grid gap-2 py-3 sm:grid-cols-[140px_1fr] sm:items-baseline"
            >
              <span className="w-fit min-w-[140px] rounded-md bg-blue-50 px-3 py-1 text-center text-slate-800  dark:bg-blue-500/20 dark:text-blue-300">
                <Formula tex={variable.simbolo} />
              </span>
              <div>
                <p className="font-semibold text-slate-700  dark:text-gray-100">{variable.nombre}</p>
                <p className="text-sm text-slate-500  dark:text-gray-400">{variable.descripcion}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}