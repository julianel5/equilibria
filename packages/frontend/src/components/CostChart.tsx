import { Fragment, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../hooks/useTheme';
import Formula from './Formula';

export interface PuntoCosto {
  cantidad: number;
  ordenar: number;
  mantener: number;
  total: number;
}

interface CostChartProps {
  data: PuntoCosto[];
  qOptimo: number;
  costoTotalOptimo: number;
  unidad?: string;
  moneda?: string;
}

const fmt = (n: number, moneda: string) =>
  `${moneda} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

interface RechartState {
  activePayload?: Array<{ payload?: PuntoCosto }>;
}

const SERIES_FORMULAS: Record<string, string> = {
  'Costo de Ordenar': '\\frac{D}{Q}S',
  'Costo de Mantener': '\\frac{Q}{2}H',
  'Costo Relevante Total': '\\frac{D}{Q}S + \\frac{Q}{2}H',
};

interface StatProps {
  label: string;
  value: string;
  formula?: string;
  dot?: string;
}

function Stat({ label, value, formula, dot }: StatProps) {
  return (
    <div className="rounded-md bg-white px-3 py-2 shadow-sm  dark:bg-gray-800">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
        {dot ? (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
        ) : null}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800  dark:text-gray-100">
        {value}
      </p>
      {formula ? (
        <p className="mt-0.5 text-xs text-slate-400  dark:text-gray-500">
          <Formula tex={formula} />
        </p>
      ) : null}
    </div>
  );
}

export default function CostChart({
  data,
  qOptimo,
  costoTotalOptimo,
  unidad = 'unidades',
  moneda = 'USD',
}: CostChartProps) {
  const { dark } = useTheme();
  const [hover, setHover] = useState<PuntoCosto | null>(null);

  const handleMouseMove = (state: RechartState) => {
    setHover(state?.activePayload?.[0]?.payload ?? null);
  };

  const handleMouseLeave = () => setHover(null);

  // Paleta de ejes y cuadrícula según el tema. Las curvas de costos NO cambian.
  const gridColor = dark ? '#334155' : '#e2e8f0';
  const tickColor = dark ? '#94a3b8' : '#64748b';
  const tickLineColor = dark ? '#475569' : '#cbd5e1';
  const axisLabelColor = dark ? '#cbd5e1' : '#475569';
  const guideColor = dark ? '#64748b' : '#94a3b8';

  return (
    <div>
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="cantidad"
              stroke={tickLineColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={{ stroke: tickLineColor }}
              label={{
                value: 'Cantidad (Q)',
                position: 'insideBottom',
                offset: -2,
                fill: axisLabelColor,
                fontSize: 13,
              }}
            />
            <YAxis
              stroke={tickLineColor}
              domain={['auto', 'auto']}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={{ stroke: tickLineColor }}
              tickFormatter={(v: number) => fmt(v, moneda)}
              label={{
                value: `Costo (${moneda})`,
                angle: -90,
                position: 'insideLeft',
                fill: axisLabelColor,
                fontSize: 13,
                offset: 8,
              }}
              width={70}
            />
            <Legend wrapperStyle={{ fontSize: 13, color: tickColor }} />

            {/* Tooltip invisible: habilita cursor vertical y activeDot sin caja visual */}
            <Tooltip
              content={<Fragment />}
              isAnimationActive={false}
              cursor={{ stroke: guideColor, strokeWidth: 1.5, strokeDasharray: '3 3' }}
              wrapperStyle={{ visibility: 'hidden', pointerEvents: 'none' }}
            />

            <ReferenceLine
              x={qOptimo}
              stroke="#2563eb"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceDot
              x={qOptimo}
              y={costoTotalOptimo}
              r={7}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth={2}
              label={{
                value: 'Q*',
                position: 'top',
                fill: '#2563eb',
                fontSize: 14,
                fontWeight: 700,
              }}
            />

            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="ordenar"
              name="Costo de Ordenar"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="mantener"
              name="Costo de Mantener"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="total"
              name="Costo Relevante Total"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/*
        Panel estático de datos. La grilla siempre está montada (invisible sin hover)
        para reservar la misma altura y evitar layout shift al pasar el cursor.
      */}
      <div className="relative mt-4 min-h-[7.5rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm  dark:border-gray-700 dark:bg-gray-900">
        <div className={hover ? 'visible' : 'invisible'}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Cantidad"
              value={`${hover?.cantidad.toLocaleString('en-US') ?? 0} ${unidad}`}
              formula="Q"
            />
            <Stat
              label="Costo de Ordenar"
              value={fmt(hover?.ordenar ?? 0, moneda)}
              formula={SERIES_FORMULAS['Costo de Ordenar']}
              dot="#ef4444"
            />
            <Stat
              label="Costo de Mantener"
              value={fmt(hover?.mantener ?? 0, moneda)}
              formula={SERIES_FORMULAS['Costo de Mantener']}
              dot="#10b981"
            />
            <Stat
              label="Costo Relevante Total"
              value={fmt(hover?.total ?? 0, moneda)}
              formula={SERIES_FORMULAS['Costo Relevante Total']}
              dot="#2563eb"
            />
          </div>
        </div>

        {!hover ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm italic text-slate-400  dark:text-gray-500">
              Pasa el cursor sobre la gráfica para inspeccionar los costos detallados.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}