import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PuntoDemandaChart {
  demanda: number;
  densidad: number;
}

interface CurvaDemandaChartProps {
  /** Puntos [{ demanda, densidad }] entregados por el motor. */
  puntos: PuntoDemandaChart[];
  /** Cantidad óptima Q*: frontera entre CSL y el riesgo de faltante. */
  cantidadOptima: number;
  /** Razón crítica (CSL) en [0, 1]. */
  nivelServicio: number;
  /** Distribución usada (para el texto de ayuda). */
  distribucion: 'normal' | 'uniforme';
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

const fmtCantidad = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/**
 * Gráfica del Newsvendor: PDF de la demanda (Normal o Uniforme) con el área a
 * la izquierda de Q* sombreada (nivel de servicio, CSL) y la cola derecha en
 * gris tenue (riesgo de faltante). El gradiente horizontal se recorta en el
 * porcentaje exacto que Q* ocupa sobre el dominio, por lo que la frontera de
 * color coincide con la <ReferenceLine> del óptimo.
 */
export default function CurvaDemandaChart({
  puntos,
  cantidadOptima,
  nivelServicio,
  distribucion,
}: CurvaDemandaChartProps) {
  const dark = useDarkMode();

  // Dominio igual al arreglo generado por el motor (Normal: μ−4σ … μ+4σ;
  // Uniforme: antes de a … después de b).
  const xmin = puntos[0]?.demanda ?? 0;
  const xmax = puntos[puntos.length - 1]?.demanda ?? 1;

  // Porcentaje horizontal donde cae Q* sobre el dominio → recorta el gradiente
  // (para la Uniforme coincide exactamente con CSL porque la CDF es lineal).
  const rawPct =
    xmax > xmin ? ((cantidadOptima - xmin) / (xmax - xmin)) * 100 : 100;
  const stopPct = Math.min(100, Math.max(0, rawPct));

  const gridColor = dark ? '#334155' : '#e2e8f0';
  const tickColor = dark ? '#94a3b8' : '#64748b';
  const tickLineColor = dark ? '#475569' : '#cbd5e1';
  const axisLabelColor = dark ? '#cbd5e1' : '#475569';
  const guideColor = dark ? '#64748b' : '#94a3b8';
  const curvaColor = dark ? '#93c5fd' : '#1d4ed8';
  const servicioColor = dark ? '#60a5fa' : '#2563eb';
  const riesgoColor = dark ? '#475569' : '#9ca3af';

  const cslPct = (nivelServicio * 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const riesgoPct = ((1 - nivelServicio) * 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

  if (puntos.length < 2) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        La distribución no tiene variabilidad (σ = 0): la demanda es conocida con
        certeza y no hay área que sombrear.
      </div>
    );
  }

  return (
    <div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={puntos}
            margin={{ top: 30, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              {/* Gradiente horizontal recortado en Q*: izquierda = CSL sólido,
                  derecha = riesgo de faltante en gris tenue. */}
              <linearGradient id="cslGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={servicioColor} stopOpacity={0.45} />
                <stop offset={`${stopPct}%`} stopColor={servicioColor} stopOpacity={0.4} />
                <stop offset={`${stopPct}%`} stopColor={riesgoColor} stopOpacity={0.18} />
                <stop offset="100%" stopColor={riesgoColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="demanda"
              type="number"
              domain={[xmin, xmax]}
              stroke={tickLineColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={{ stroke: tickLineColor }}
              label={{
                value: 'Demanda',
                position: 'insideBottom',
                offset: -2,
                fill: axisLabelColor,
                fontSize: 13,
              }}
            />
            {/* Eje Y oculto: lo relevante es el área bajo la curva, no la densidad.
                El 20% extra de margen evita que la línea superior del rectángulo
                (Uniforme) se recorte contra el borde del área de trazado. */}
            <YAxis hide domain={[0, (dataMax: number) => dataMax * 1.2]} />

            <Tooltip
              isAnimationActive={false}
              formatter={(value: number) => [value.toFixed(5), 'Densidad']}
              labelFormatter={(v) => `Demanda = ${fmtCantidad(Number(v))}`}
              contentStyle={{
                backgroundColor: dark ? '#1f2937' : '#ffffff',
                border: `1px solid ${dark ? '#4b5563' : '#e2e8f0'}`,
                borderRadius: 8,
                fontSize: 13,
                color: dark ? '#e5e7eb' : '#334155',
              }}
            />

            {/* Curva de la densidad de demanda sombreada hasta Q*. */}
            <Area
              dataKey="densidad"
              name="Densidad"
              stroke={curvaColor}
              strokeWidth={2}
              fill="url(#cslGradient)"
              isAnimationActive={false}
            />

            {/* Límite del óptimo: el punto en que "se compra" el área del CSL. */}
            <ReferenceLine
              x={cantidadOptima}
              ifOverflow="extendDomain"
              stroke={guideColor}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Q* Óptimo = ${fmtCantidad(cantidadOptima)}`,
                position: 'top',
                fill: axisLabelColor,
                fontSize: 14,
                fontWeight: 700,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700  dark:border-blue-900 dark:bg-blue-500/15 dark:text-blue-400">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: servicioColor }}
          />
          Nivel de servicio CSL = {cslPct}%
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600  dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: riesgoColor }}
          />
          Riesgo de faltante = {riesgoPct}%
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500  dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
          PDF{' '}
          {distribucion === 'normal'
            ? 'normal'
            : 'uniforme'}
        </span>
      </div>
    </div>
  );
}