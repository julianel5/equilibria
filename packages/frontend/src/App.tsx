import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EOQPage from './pages/EOQPage';
import EPQPage from './pages/EPQPage';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './hooks/useTheme';

const TITULOS: Record<string, string> = {
  '/': 'Equilibria | Teoría de Inventarios',
  '/inventory/eoq': 'EOQ - Equilibria',
  '/inventory/epq': 'EPQ - Equilibria',
};

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive
      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
      : 'text-slate-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
  }`;

export default function App() {
  const location = useLocation();

  useEffect(() => {
    document.title = TITULOS[location.pathname] ?? 'Equilibria';
  }, [location.pathname]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors duration-150 dark:bg-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <NavLink
              to="/"
              className="text-xl font-extrabold tracking-tight text-blue-600  dark:text-blue-400"
            >
              Equilibria
            </NavLink>
            <div className="flex items-center gap-1">
              <NavLink to="/" end className={linkClasses}>
                Inicio
              </NavLink>
              <NavLink to="/inventory/eoq" className={linkClasses}>
                EOQ
              </NavLink>
              <NavLink to="/inventory/epq" className={linkClasses}>
                EPQ
              </NavLink>
              <div className="ml-2 lg:ml-3">
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/inventory/eoq" element={<EOQPage />} />
            <Route path="/inventory/epq" element={<EPQPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}