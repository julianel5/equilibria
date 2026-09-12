export interface PestanaDef {
  clave: string;
  etiqueta: string;
}

interface TabsPanelProps {
  pestanas: readonly PestanaDef[];
  activa: string;
  onCambio: (clave: string) => void;
  ariaLabel?: string;
}

export default function TabsPanel({
  pestanas,
  activa,
  onCambio,
  ariaLabel = 'Secciones del modelo',
}: TabsPanelProps) {
  return (
    <nav
      className="flex gap-6 border-b border-slate-200 dark:border-gray-700"
      aria-label={ariaLabel}
      role="tablist"
    >
      {pestanas.map((p) => {
        const esActiva = p.clave === activa;
        return (
          <button
            key={p.clave}
            role="tab"
            aria-selected={esActiva}
            onClick={() => onCambio(p.clave)}
            className={`-mb-px border-b-2 pb-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400/60 ${
              esActiva
                ? 'border-blue-500 font-semibold text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {p.etiqueta}
          </button>
        );
      })}
    </nav>
  );
}