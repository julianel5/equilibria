import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ProbabilidadEstadosChartProps {
  distribucion: { n: number; probabilidad: number }[];
  modelo: 'MM1' | 'MMc';
  rho: number;
  p0: number;
}

/** Detecta el modo oscuro observando la clase `dark` en <html> (independiente del frontend). */
function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => setDark(root.classList.contains('dark'));
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

const fmtProb = (p: number) =>
  p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });

export default function ProbabilidadEstadosChart({
  distribucion,
  modelo,
  rho,
  p0,
}: ProbabilidadEstadosChartProps) {
  const dark = useDarkMode();

  const gridColor = dark ? '#334155' : '#e2e8f0';
  const tickColor = dark ? '#94a3b8' : '#64748b';
  const tickLineColor = dark ? '#475569' : '#cbd5e1';
  const axisLabelColor = dark ? '#cbd5e1' : '#475569';
  const barColor = dark ? '#60a5fa' : '#2563eb';
  const hoverColor = dark ? '#334155' : '#f1f5f9';

  const datos = distribucion.map(({ n, probabilidad }) => ({ n, Pn: probabilidad }));

  return (
    <div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="n"
              type="number"
              domain={[0, 'dataMax']}
              stroke={tickLineColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={{ stroke: tickLineColor }}
              allowDecimals={false}
              label={{
                value: 'Clientes en el sistema (n)',
                position: 'insideBottom',
                offset: -2,
                fill: axisLabelColor,
                fontSize: 13,
              }}
            />
            <YAxis
              dataKey="Pn"
              stroke={tickLineColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={{ stroke: tickLineColor }}
              tickFormatter={(v: number) => Number(v).toFixed(3)}
              label={{
                value: 'Probabilidad P_n',
                angle: -90,
                position: 'insideLeft',
                fill: axisLabelColor,
                fontSize: 13,
              }}
              width={70}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const punto = payload[0]?.payload as { n: number; Pn: number } | undefined;
                if (!punto) return null;
                return (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-gray-600 dark:bg-gray-800">
                    <p className="font-semibold text-slate-700 dark:text-gray-100">
                      n = {punto.n} clientes
                    </p>
                    <p className="mt-0.5 tabular-nums text-slate-500 dark:text-gray-400">
                      P({punto.n}) = {fmtProb(punto.Pn)}
                    </p>
                  </div>
                );
              }}
              cursor={{ fill: hoverColor }}
            />
            <Bar dataKey="Pn" name="Probabilidad" fill={barColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2  dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
            Modelo
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800  dark:text-gray-100">
            {modelo === 'MM1' ? 'M/M/1' : 'M/M/c'}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2  dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
            P(0) sistema vacío
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-blue-600  dark:text-blue-400">
            {fmtProb(p0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2  dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
            Utilización ρ
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800  dark:text-gray-100">
            {Number(rho).toFixed(4)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400  dark:text-gray-500">
        En un sistema estable (ρ &lt; 1) la probabilidad P(n) decae asintóticamente conforme
        crece el número de clientes: la cola casi nunca alcanza tamaños extremos.
      </p>
    </div>
  );
}