import { Fragment, useEffect, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface NormalDistributionChartProps {
  /** Valor Z = Φ⁻¹(CSL) en que parte el riesgo de faltante. */
  valorZ: number;
  /** Nivel de servicio CSL en porcentaje (p. ej. 95 para 95%). */
  nivelServicio: number;
}

const NORMALIZACION = 1 / Math.sqrt(2 * Math.PI);

const densidadNormal = (x: number) => NORMALIZACION * Math.exp(-0.5 * x * x);

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

export default function NormalDistributionChart({
  valorZ,
  nivelServicio,
}: NormalDistributionChartProps) {
  const dark = useDarkMode();

  const alpha = 100 - nivelServicio;

  // Dominio en desviaciones estándar: cobre toda la campana y deje cola visible
  // a la derecha de Z (hasta al menos una desviación más allá).
  const xmin = -4.5;
  const xmax = Math.max(4.5, valorZ + 1);

  const puntos: { x: number; f: number; servicio: number; riesgo: number }[] = [];
  const paso = 0.05;
  for (let x = xmin; x <= xmax; x += paso) {
    const f = densidadNormal(x);
    const esRiesgo = x >= valorZ - 1e-9;
    puntos.push({
      x: Math.round(x * 1000) / 1000,
      f,
      servicio: esRiesgo ? 0 : f,
      riesgo: esRiesgo ? f : 0,
    });
  }

  const gridColor = dark ? '#334155' : '#e2e8f0';
  const tickColor = dark ? '#94a3b8' : '#64748b';
  const tickLineColor = dark ? '#475569' : '#cbd5e1';
  const axisLabelColor = dark ? '#cbd5e1' : '#475569';
  const guideColor = dark ? '#64748b' : '#94a3b8';
  const curvaColor = dark ? '#93c5fd' : '#1d4ed8';
  const servicioColor = dark ? '#60a5fa' : '#2563eb';
  const riesgoColor = dark ? '#f87171' : '#ef4444';

  return (
    <div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={puntos}
            margin={{ top: 25, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="servicioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={servicioColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={servicioColor} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="riesgoFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={riesgoColor} stopOpacity={0.45} />
                <stop offset="100%" stopColor={riesgoColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[xmin, xmax]}
              stroke={tickLineColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={{ stroke: tickLineColor }}
              label={{
                value: 'z (desviaciones estándar)',
                position: 'insideBottom',
                offset: -2,
                fill: axisLabelColor,
                fontSize: 13,
              }}
            />
            <YAxis
              stroke={tickLineColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={{ stroke: tickLineColor }}
              label={{
                value: 'Densidad',
                angle: -90,
                position: 'left',
                fill: axisLabelColor,
                fontSize: 13,
              }}
              width={55}
            />

            {/* Tooltip invisible: evita caja visual sin desactivar el cursor de la gráfica */}
            <Tooltip
              content={<Fragment />}
              isAnimationActive={false}
              cursor={{ stroke: guideColor, strokeWidth: 1.5, strokeDasharray: '3 3' }}
              wrapperStyle={{ visibility: 'hidden', pointerEvents: 'none' }}
            />

            {/* Zona izquierda: nivel de servicio asegurado */}
            <Area
              dataKey="servicio"
              name="Nivel de servicio (CSL)"
              stackId="zona"
              fill="url(#servicioFill)"
              stroke="none"
              isAnimationActive={false}
            />
            {/* Cola derecha: riesgo α = 1 − CSL */}
            <Area
              dataKey="riesgo"
              name="Riesgo de faltante (α)"
              stackId="zona"
              fill="url(#riesgoFill)"
              stroke="none"
              isAnimationActive={false}
            />
            {/* Curva de la densidad normal estándar */}
            <Line
              dataKey="f"
              name="Densidad Normal"
              stroke={curvaColor}
              strokeWidth={2}
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />

            {/* Línea de división en Z */}
            <ReferenceLine
              x={valorZ}
              ifOverflow="extendDomain"
              stroke={guideColor}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Z = ${valorZ.toFixed(4)}`,
                position: 'top',
                fill: axisLabelColor,
                fontSize: 14,
                fontWeight: 700,
              }}
            />

            <Legend wrapperStyle={{ fontSize: 13, color: tickColor }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2  dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
            Valor Z
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800  dark:text-gray-100">
            {valorZ.toLocaleString('en-US', { maximumFractionDigits: 4 })}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2  dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
            Nivel de servicio
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-blue-600  dark:text-blue-400">
            {nivelServicio.toLocaleString('en-US', { maximumFractionDigits: 2 })}%
            <span className="text-sm font-semibold text-blue-500/70"> (zona azul)</span>
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2  dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
            Riesgo de faltante α
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-red-600  dark:text-red-400">
            {alpha.toLocaleString('en-US', { maximumFractionDigits: 2 })}%
            <span className="text-sm font-semibold text-red-500/70"> (cola roja)</span>
          </p>
        </div>
      </div>
    </div>
  );
}