import { useEffect } from 'react';
import Formula from './Formula';

export interface VariableDef {
  simbolo: string;
  nombre: string;
  descripcion: string;
}

interface GlossaryProps {
  abierto: boolean;
  onClose: () => void;
  variables: VariableDef[];
}

export default function Glossary({ abierto, onClose, variables }: GlossaryProps) {
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
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
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
          {variables.map((variable) => (
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

export function GlossaryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm  hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
      aria-label="Abrir glosario de nomenclatura"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.471-.75.451-1.451 1.066-1.451 1.798v.065M12 19h.01" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
      </svg>
      Glosario
    </button>
  );
}