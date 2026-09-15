import { Fragment, useEffect, useState } from 'react';
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
import Formula from './Formula';

export interface PuntoCosto {
  cantidad: number;
  ordenar: number;
  mantener: number;
  total: number;
  /** Costo anual de faltantes (solo modelos con déficit autorizado, p. ej. EOQ con Faltantes). */
  costoFaltante?: number;
}

interface CostChartProps {
  data: PuntoCosto[];
  optimalQ: number;
  costoTotalOptimo: number;
  unidad?: string;
  moneda?: string;
  formulaMantener?: string;
  formulaTotal?: string;
  formulaFaltante?: string;
}

const fmt = (n: number, moneda: string) =>
  `${moneda} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

interface RechartState {
  activePayload?: Array<{ payload?: PuntoCosto }>;
}

const SERIES_FORMULAS: Record<string, string> = {
  'Costo de Ordenar': '\\frac{D}{Q}S',
  'Costo de Mantener': '\\frac{Q}{2}H',
  'Costo de Faltantes': '\\frac{Q}{2}B\\left(\\frac{H}{H+B}\\right)^2',
  'Costo Relevante Total': '\\frac{D}{Q}S + \\frac{Q}{2}H',
};

interface StatProps {
  label: string;
  value: string;
  formula?: string;
  dot?: string;
  /** Resalta la tarjeta cuando el cursor PASA por Q* (punto de equilibrio). */
  resaltado?: boolean;
  /** Texto de la insignia de equilibrio (fórmula específica del modelo). */
  badge?: string;
}

function Stat({ label, value, formula, dot, resaltado, badge }: StatProps) {
  return (
    <div
      className={`rounded-md px-3 py-2 shadow-sm transition-all duration-200 ${
        resaltado
          ? 'border border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-500/50 dark:bg-emerald-500/10'
          : 'bg-white dark:bg-gray-800'
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500  dark:text-gray-400">
        {dot ? (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
        ) : null}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800  dark:text-gray-100">
        {value}
      </p>
      <p
        className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all duration-200 ${
          resaltado
            ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-transparent text-transparent'
        }`}
      >
        {badge ?? ''}
      </p>
      {formula ? (
        <p className="mt-0.5 text-xs text-slate-400  dark:text-gray-500">
          <Formula tex={formula} />
        </p>
      ) : null}
    </div>
  );
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

export default function CostChart({
  data,
  optimalQ,
  costoTotalOptimo,
  unidad = 'unidades',
  moneda = 'USD',
  formulaMantener,
  formulaTotal,
  formulaFaltante,
}: CostChartProps) {
  const dark = useDarkMode();
  const [hover, setHover] = useState<PuntoCosto | null>(null);

  const handleMouseMove = (state: RechartState) => {
    setHover(state?.activePayload?.[0]?.payload ?? null);
  };

  const handleMouseLeave = () => setHover(null);

  // La curva de faltantes solo se dibuja si los datos la incluyen (modelos con déficit).
  const tieneFaltante = data.some((p) => p.costoFaltante !== undefined);

  // Redondeo consistente: si el cursor está sobre (o muy cerca de) Q*, se fuerza
  // la tarjeta a mostrar el punto exacto de Q* del dataset, evitando que Recharts
  // elija el vecino más cercano (p. ej. 284 cuando Q* = 283).
  const qOptimoExacto = Math.round(optimalQ);
  const puntoOptimo = data.find((p) => p.cantidad === qOptimoExacto);
  const mostrado =
    hover && puntoOptimo && Math.abs(hover.cantidad - qOptimoExacto) < 1 ? puntoOptimo : hover;
  // Estado de equilibrio: true cuando se está inspeccionando el punto Q*, donde
  // los costos satisfacen la condición matemática del modelo. En el EOQ clásico
  // C_o = C_h; con déficit autorizado el equilibrio es C_o = C_h + C_f.
  const esEquilibrio =
    mostrado !== null &&
    Math.abs(mostrado.cantidad - qOptimoExacto) < 1 &&
    (tieneFaltante
      ? Math.abs(mostrado.ordenar - (mostrado.mantener + (mostrado.costoFaltante ?? 0))) < 1
      : Math.abs(mostrado.ordenar - mostrado.mantener) < 1);
  const textoEquilibrio = tieneFaltante
    ? 'C_o = C_h + C_f · Punto de Equilibrio'
    : 'C_o = C_h · Punto de Equilibrio';

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
            margin={{ top: 25, right: 20, left: 10, bottom: 5 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="cantidad"
              type="number"
              domain={['dataMin', 'dataMax']}
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
                position: 'left',
                fill: axisLabelColor,
                fontSize: 13,
              }}
              width={84}
            />
            <Legend wrapperStyle={{ fontSize: 13, color: tickColor }} />

            {/* Tooltip invisible: habilita cursor vertical y activeDot sin caja visual */}
            <Tooltip
              content={<Fragment />}
              isAnimationActive={false}
              cursor={{ stroke: guideColor, strokeWidth: 1.5, strokeDasharray: '3 3' }}
              wrapperStyle={{ visibility: 'hidden', pointerEvents: 'none' }}
            />

            {/* Línea estandarizada en Q*: marca el punto más bajo de la curva en U */}
            <ReferenceLine
              x={optimalQ}
              ifOverflow="extendDomain"
              stroke="#2563eb"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{ value: 'Q*', position: 'top', fill: 'currentColor', fontSize: 14, fontWeight: 700 }}
            />
            <ReferenceDot
              x={optimalQ}
              y={costoTotalOptimo}
              r={6}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth={2}
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
            {tieneFaltante ? (
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="costoFaltante"
                name="Costo de Faltantes"
                stroke="#d97706"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
              />
            ) : null}
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
        <div className={mostrado ? 'visible' : 'invisible'}>
          <div
            className={`grid grid-cols-2 gap-3 ${
              tieneFaltante ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
            }`}
          >
            <Stat
              label="Cantidad"
              value={`${mostrado?.cantidad.toLocaleString('en-US') ?? 0} ${unidad}`}
              formula="Q"
            />
            <Stat
              label="Costo de Ordenar"
              value={fmt(mostrado?.ordenar ?? 0, moneda)}
              formula={SERIES_FORMULAS['Costo de Ordenar']}
              dot="#ef4444"
              resaltado={esEquilibrio}
              badge={textoEquilibrio}
            />
            <Stat
              label="Costo de Mantener"
              value={fmt(mostrado?.mantener ?? 0, moneda)}
              formula={formulaMantener ?? SERIES_FORMULAS['Costo de Mantener']}
              dot="#10b981"
              resaltado={esEquilibrio}
              badge={textoEquilibrio}
            />
            {tieneFaltante ? (
              <Stat
                label="Costo de Faltantes"
                value={fmt(mostrado?.costoFaltante ?? 0, moneda)}
                formula={formulaFaltante ?? SERIES_FORMULAS['Costo de Faltantes']}
                dot="#d97706"
                resaltado={esEquilibrio}
                badge={textoEquilibrio}
              />
            ) : null}
            <Stat
              label="Costo Relevante Total"
              value={fmt(mostrado?.total ?? 0, moneda)}
              formula={formulaTotal ?? SERIES_FORMULAS['Costo Relevante Total']}
              dot="#2563eb"
            />
          </div>
        </div>

        {!mostrado ? (
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