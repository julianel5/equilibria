import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggle}
      className="inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-slate-300 bg-slate-100 px-1 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-blue-500"
    >
      <span
        className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white text-amber-500 shadow transition-transform duration-200 dark:bg-gray-700 dark:text-yellow-300 ${
          dark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {dark ? (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </span>
    </button>
  );
}