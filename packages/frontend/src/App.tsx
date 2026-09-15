import { useEffect, useRef, useState } from 'react';
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

type LinkNav = { nombre: string; ruta: string };
type GrupoNav = { titulo: string; links: LinkNav[] };

/** Configuración declarativa del menú: categorías → enlaces. */
const NAV_GRUPOS: GrupoNav[] = [
  {
    titulo: 'Inventarios',
    links: [
      { nombre: 'EOQ', ruta: '/inventory/eoq' },
      { nombre: 'EPQ', ruta: '/inventory/epq' },
      { nombre: 'Faltantes EOQ', ruta: '/inventory/eoq-faltantes' },
      { nombre: 'Descuentos EOQ', ruta: '/inventory/eoq-descuentos' },
    ],
  },
  {
    titulo: 'Prog. Lineal',
    links: [{ nombre: 'Mét. Gráfico', ruta: '/pl/metodo-grafico' }],
  },
  {
    titulo: 'Estocásticos',
    links: [
      { nombre: 'Probabilística', ruta: '/stochastic/punto-reorden' },
      { nombre: 'Colas', ruta: '/stochastic/teoria-colas' },
    ],
  },
  {
    titulo: 'Decisiones',
    links: [{ nombre: 'Matriz de Pagos', ruta: '/decisiones/matriz-pagos' }],
  },
];

const clasesEnlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
      : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400'
  }`;

const clasesLinkHijo = ({ isActive }: { isActive: boolean }) =>
  `block w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
      : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400'
  }`;

function clasesCategoria(activa: boolean, abierta: boolean): string {
  const base = 'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors';
  if (activa || abierta) {
    return `${base} bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400`;
  }
  return `${base} text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400`;
}

function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function App() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const [acordeonAbierto, setAcordeonAbierto] = useState<Set<string>>(new Set());
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = TITULOS[location.pathname] ?? 'Equilibria';
  }, [location.pathname]);

  useEffect(() => {
    setIsOpen(false);
    setGrupoAbierto(null);
  }, [location.pathname]);

  // Cierra el dropdown de escritorio al hacer clic fuera de la barra.
  useEffect(() => {
    if (!grupoAbierto) return undefined;
    const alHacerClicFuera = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setGrupoAbierto(null);
    };
    document.addEventListener('pointerdown', alHacerClicFuera);
    return () => document.removeEventListener('pointerdown', alHacerClicFuera);
  }, [grupoAbierto]);

  // Al abrir el menú móvil, deja expandido el acordeón de la sección activa.
  useEffect(() => {
    if (isOpen) {
      const grupoActivo = NAV_GRUPOS.find((g) => g.links.some((l) => location.pathname === l.ruta));
      setAcordeonAbierto(grupoActivo ? new Set([grupoActivo.titulo]) : new Set());
    } else {
      setAcordeonAbierto(new Set());
    }
  }, [isOpen, location.pathname]);

  const toggleAcordeon = (titulo: string) => {
    setAcordeonAbierto((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(titulo)) siguiente.delete(titulo);
      else siguiente.add(titulo);
      return siguiente;
    });
  };

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

              {/* Layout de escritorio: dropdowns por categoría, visible en md+ */}
              <div ref={navRef} className="hidden items-center gap-1 md:flex">
                <NavLink to="/" end className={clasesEnlace}>
                  Inicio
                </NavLink>
                {NAV_GRUPOS.map((g) => {
                  const abierta = grupoAbierto === g.titulo;
                  const activa = g.links.some((l) => location.pathname === l.ruta);
                  return (
                    <div key={g.titulo} className="relative">
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={abierta}
                        onClick={() => setGrupoAbierto((prev) => (prev === g.titulo ? null : g.titulo))}
                        className={clasesCategoria(activa, abierta)}
                      >
                        {g.titulo}
                        <ChevronDown className={`transition-transform duration-150 ${abierta ? 'rotate-180' : ''}`} />
                      </button>
                      {abierta && (
                        <div
                          role="menu"
                          className="absolute left-0 z-50 mt-2 flex w-52 flex-col gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                        >
                          {g.links.map((l) => (
                            <NavLink key={l.ruta} to={l.ruta} role="menuitem" className={clasesLinkHijo}>
                              {l.nombre}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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

            {/* Menú móvil: acordeones por categoría */}
            {isOpen && (
              <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 md:hidden dark:border-gray-800">
                <NavLink to="/" end className={clasesEnlace} onClick={() => setIsOpen(false)}>
                  Inicio
                </NavLink>
                {NAV_GRUPOS.map((g) => {
                  const abierto = acordeonAbierto.has(g.titulo);
                  return (
                    <div key={g.titulo}>
                      <button
                        type="button"
                        aria-expanded={abierto}
                        onClick={() => toggleAcordeon(g.titulo)}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                      >
                        {g.titulo}
                        <ChevronDown className={`transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`} />
                      </button>
                      {abierto && (
                        <div className="ml-2 flex flex-col gap-1 border-l border-slate-200 py-1 pl-2 dark:border-gray-700">
                          {g.links.map((l) => (
                            <NavLink key={l.ruta} to={l.ruta} className={clasesLinkHijo} onClick={() => setIsOpen(false)}>
                              {l.nombre}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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