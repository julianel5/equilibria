import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EOQPage from './pages/EOQPage';
import EPQPage from './pages/EPQPage';
import EOQFaltantesPage from './pages/EOQFaltantesPage';
import EOQDescuentosPage from './pages/EOQDescuentosPage';
import PuntoReordenPage from './pages/PuntoReordenPage';
import TeoriaDecisionesPage from './pages/TeoriaDecisionesPage';
import TeoriaColasPage from './pages/TeoriaColasPage';
import MetodoGraficoPage from './pages/MetodoGraficoPage';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './hooks/useTheme';

const TITULOS: Record<string, string> = {
  '/': 'Equilibria | Teoría de Inventarios',
  '/inventory/eoq': 'EOQ - Equilibria',
  '/inventory/epq': 'EPQ - Equilibria',
  '/inventory/eoq-faltantes': 'EOQ con Faltantes - Equilibria',
  '/inventory/eoq-descuentos': 'EOQ con Descuentos - Equilibria',
  '/stochastic/punto-reorden': 'Punto de Reorden - Equilibria',
  '/decisiones/matriz-pagos': 'Matriz de Pagos - Equilibria',
  '/stochastic/teoria-colas': 'Teoría de Colas - Equilibria',
  '/pl/metodo-grafico': 'Método Gráfico - Equilibria',
};

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive
      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
      : 'text-slate-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
  }`;

const NAV_LINKS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/inventory/eoq', label: 'EOQ' },
  { to: '/inventory/epq', label: 'EPQ' },
  { to: '/inventory/eoq-faltantes', label: 'Faltantes EOQ' },
  { to: '/inventory/eoq-descuentos', label: 'Descuentos EOQ' },
  { to: '/stochastic/punto-reorden', label: 'Probabilística' },
  { to: '/decisiones/matriz-pagos', label: 'Decisiones' },
  { to: '/stochastic/teoria-colas', label: 'Colas' },
  { to: '/pl/metodo-grafico', label: 'Mét. Gráfico' },
];

export default function App() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.title = TITULOS[location.pathname] ?? 'Equilibria';
  }, [location.pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors duration-150 dark:bg-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          <nav className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between">
              <NavLink
                to="/"
                className="text-xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400"
              >
                Equilibria
              </NavLink>

              {/* Layout de escritorio: visible solo en md+ */}
              <div className="hidden items-center gap-4 md:flex">
                {NAV_LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} className={linkClasses}>
                    {l.label}
                  </NavLink>
                ))}
                <div className="ml-2 lg:ml-3">
                  <ThemeToggle />
                </div>
              </div>

              {/* Controles móviles: toggle de tema + botón hamburguesa */}
              <div className="flex items-center gap-2 md:hidden">
                <ThemeToggle />
                <button
                  type="button"
                  aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
                  aria-expanded={isOpen}
                  onClick={() => setIsOpen((o) => !o)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600  hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                >
                  {isOpen ? (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Menú desplegable móvil */}
            {isOpen && (
              <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 md:hidden dark:border-gray-800">
                {NAV_LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} className={linkClasses} onClick={() => setIsOpen(false)}>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/inventory/eoq" element={<EOQPage />} />
            <Route path="/inventory/epq" element={<EPQPage />} />
            <Route path="/inventory/eoq-faltantes" element={<EOQFaltantesPage />} />
            <Route path="/inventory/eoq-descuentos" element={<EOQDescuentosPage />} />
            <Route path="/stochastic/punto-reorden" element={<PuntoReordenPage />} />
            <Route path="/decisiones/matriz-pagos" element={<TeoriaDecisionesPage />} />
            <Route path="/stochastic/teoria-colas" element={<TeoriaColasPage />} />
            <Route path="/pl/metodo-grafico" element={<MetodoGraficoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}