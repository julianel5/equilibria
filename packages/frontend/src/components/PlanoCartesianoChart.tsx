import { useEffect, useRef, useState } from 'react';
import type { InterseccionDescartadaPL, VerticePL } from '../services/api';

/** Recta efectiva de una restricción del usuario (a·x₁ + b·x₂ = rhs). */
export interface RectaRestriccionPL {
  id: string;
  a: number;
  b: number;
  rhs: number;
  operador: '<=' | '>=' | '=';
}

interface PlanoCartesianoChartProps {
  verticesFactibles: VerticePL[];
  optimos: VerticePL[];
  descartes: InterseccionDescartadaPL[];
  mostrarDescartes: boolean;
  /** Oculta el polígono/área y los vértices para estudiar las rectas sin revelar la solución. */
  mostrarPoligono?: boolean;
  /** Restricciones del usuario; cada recta se dibuja solo si su id está activo. */
  restricciones?: RectaRestriccionPL[];
}

const PALETA_RECTAS = [
  '#ef4444',
  '#22c55e',
  '#a855f7',
  '#f97316',
  '#06b6d4',
  '#eab308',
  '#ec4899',
  '#84cc16',
];

const SIMBOLO_OPERADOR: Record<RectaRestriccionPL['operador'], string> = {
  '<=': '≤',
  '>=': '≥',
  '=': '=',
};

/** Restricciones inyectadas por el motor (perímetro) → nombres de exhibición. */
const NOMBRES_INTERNOS: Record<string, string> = {
  'x2 >= 0': 'Eje X₁',
  'x1 >= 0': 'Eje X₂',
};

/** Id generado por el motor para la caja límite dinámica (x1 <= M, x2 <= M). */
const esCajaLimite = (id: string): boolean => /^x[12] <= \d+(?:\.\d+)?$/.test(id);

/** Nombre legible de una restricción para el tooltip (p. ej. "r2" → "R2", "x2 >= 0" → "Eje X₁"). */
export function nombreRestriccion(id: string): string {
  if (NOMBRES_INTERNOS[id]) return NOMBRES_INTERNOS[id];
  if (esCajaLimite(id)) return 'Límite M';
  return id.toUpperCase();
}

/** Traduce los ids internos que puedan filtrarse dentro de textos libres (p. ej. el motivo). */
export function traducirNombres(texto: string): string {
  let resultado = texto;
  Object.entries(NOMBRES_INTERNOS).forEach(([interno, legible]) => {
    resultado = resultado.split(interno).join(legible);
  });
  return resultado
    .replace(/x[12] <= \d+(?:\.\d+)?/g, 'Límite M')
    .replace(/"r(\d+)"/g, '"R$1"');
}

/** Formato algebraico de una restricción para la leyenda, p. ej. "R1: 2x₁ + 1x₂ ≤ 18". */
function textoRecta(r: RectaRestriccionPL): string {
  const simb = SIMBOLO_OPERADOR[r.operador];
  const rhs = fmtCoordenada(r.rhs);
  const a0 = Math.abs(r.a) < 1e-9;
  const b0 = Math.abs(r.b) < 1e-9;
  if (b0) return a0 ? `${simb} ${rhs}` : `${fmtCoordenada(r.a)}x₁ ${simb} ${rhs}`;
  if (a0) return `${fmtCoordenada(r.b)}x₂ ${simb} ${rhs}`;
  const signo = r.b < 0 ? '−' : '+';
  return `${fmtCoordenada(r.a)}x₁ ${signo} ${fmtCoordenada(Math.abs(r.b))}x₂ ${simb} ${rhs}`;
}

interface HoverInfo {
  px: number;
  py: number;
  titulo: string;
  detalle: string;
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

function redondear(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function fmtCoordenada(n: number): string {
  const r = redondear(n);
  return Number.isInteger(r) ? String(r) : String(r);
}

function pasoBonito(v: number): number {
  const exp = Math.floor(Math.log10(v));
  const base = v / 10 ** exp;
  if (base <= 1) return 1 * 10 ** exp;
  if (base <= 2) return 2 * 10 ** exp;
  if (base <= 5) return 5 * 10 ** exp;
  return 10 * 10 ** exp;
}

function dominio(maximo: number, minimo: number): { min: number; max: number; paso: number; ticks: number[] } {
  const rango = maximo - minimo;
  const m = rango <= 0 ? 10 : rango * 1.18;
  const esc = 10 ** Math.floor(Math.log10(m));
  const base = m / esc;
  let lim: number;
  if (base <= 1) lim = 1;
  else if (base <= 2) lim = 2;
  else if (base <= 2.5) lim = 2.5;
  else if (base <= 5) lim = 5;
  else lim = 10;
  const max = lim * esc;
  const paso = pasoBonito(max / 5);

  const ticks: number[] = [];
  let t = Math.ceil(minimo / paso) * paso;
  while (t <= max + 1e-9) {
    ticks.push(redondear(t));
    t += paso;
  }
  if (ticks.length === 0) ticks.push(0);
  return { min: minimo, max, paso, ticks };
}

const ANCHO = 640;
const ALTO = 440;
const MRG = { top: 32, right: 30, bottom: 52, left: 68 };
const PLOT_W = ANCHO - MRG.left - MRG.right;
const PLOT_H = ALTO - MRG.top - MRG.bottom;

export default function PlanoCartesianoChart({
  verticesFactibles,
  optimos,
  descartes,
  mostrarDescartes,
  mostrarPoligono = true,
  restricciones = [],
}: PlanoCartesianoChartProps) {
  const dark = useDarkMode();
  const contRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [lineasActivas, setLineasActivas] = useState<ReadonlySet<string>>(
    () => new Set(restricciones.map((r) => r.id))
  );

  // Por defecto todas las restricciones están activas; al volver a resolver se preservan
  // los toggles del usuario y se añaden automáticamente las restricciones nuevas.
  useEffect(() => {
    setLineasActivas((prev) => {
      const ids = restricciones.map((r) => r.id);
      const completo =
        ids.length > 0 && ids.length === prev.size && ids.every((id) => prev.has(id));
      if (completo) return prev;
      const proximo = new Set(prev);
      ids.forEach((id) => proximo.add(id));
      return proximo;
    });
  }, [restricciones]);

  const alternarRecta = (id: string, activo: boolean) =>
    setLineasActivas((prev) => {
      const proximo = new Set(prev);
      if (activo) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });

  const mostrarTodas = () => setLineasActivas(new Set(restricciones.map((r) => r.id)));
  const ocultarTodas = () => setLineasActivas(new Set());

  const esOptimo = (v: VerticePL) =>
    optimos.some((o) => Math.abs(o.x1 - v.x1) < 1e-6 && Math.abs(o.x2 - v.x2) < 1e-6);

  // Puntos de descartes visibles: solo los que quedan cerca de la región real.
  // Los cruces contra la caja límite dinámica (coordenadas del orden de M) se
  // omiten para no deformar la escala del plano.
  const rxMin = Math.min(...verticesFactibles.map((v) => v.x1));
  const rxMax = Math.max(...verticesFactibles.map((v) => v.x1));
  const ryMin = Math.min(...verticesFactibles.map((v) => v.x2));
  const ryMax = Math.max(...verticesFactibles.map((v) => v.x2));
  const spanX = Math.max(1e-9, rxMax - rxMin);
  const spanY = Math.max(1e-9, ryMax - ryMin);
  const margen = 1.5 * Math.max(spanX, spanY);

  const descartesVisibles = mostrarDescartes
    ? descartes
        .filter((d): d is InterseccionDescartadaPL & { punto: { x1: number; x2: number } } => !!d.punto)
        .map((d) => ({ desc: d, punto: d.punto }))
        .filter(
          ({ punto }) =>
            punto.x1 >= rxMin - margen &&
            punto.x1 <= rxMax + margen &&
            punto.x2 >= ryMin - margen &&
            punto.x2 <= ryMax + margen
        )
    : [];
  const puntosDescartes = descartesVisibles.map((d) => d.punto);

  const todasX = [
    ...verticesFactibles.map((v) => v.x1),
    ...puntosDescartes.map((p) => p.x1),
  ];
  const todasY = [
    ...verticesFactibles.map((v) => v.x2),
    ...puntosDescartes.map((p) => p.x2),
  ];

  const minX = Math.min(0, ...todasX);
  const minY = Math.min(0, ...todasY);
  const maxX = Math.max(0, ...todasX);
  const maxY = Math.max(0, ...todasY);

  const dx = dominio(maxX, minX);
  const dy = dominio(maxY, minY);

  const scaleX = (x: number) => MRG.left + ((x - dx.min) / (dx.max - dx.min)) * PLOT_W;
  const scaleY = (y: number) => MRG.top + ((dy.max - y) / (dy.max - dy.min)) * PLOT_H;

  const poligono = verticesFactibles;
  const puntos = poligono.map((v) => `${redondear(scaleX(v.x1))},${redondear(scaleY(v.x2))}`).join(' ');

  const gridColor = dark ? '#334155' : '#e2e8f0';
  const axisColor = dark ? '#475569' : '#94a3b8';
  const tickColor = dark ? '#94a3b8' : '#64748b';
  const polyFill = dark ? 'rgba(96,165,250,0.22)' : 'rgba(37,99,235,0.18)';
  const polyStroke = dark ? '#60a5fa' : '#2563eb';
  const vertexFill = dark ? '#60a5fa' : '#2563eb';
  const optimumFill = '#f59e0b';
  const discardFill = dark ? '#cbd5e1' : '#94a3b8';
  const axisLabelFill = dark ? '#f8fafc' : '#0f172a';

  const mostrarTooltip = (px: number, py: number, titulo: string, detalle: string) => {
    const rect = contRef.current?.getBoundingClientRect();
    if (!rect) return;
    const escala = rect.width / ANCHO;
    setHover({ px: px * escala, py: py * escala, titulo, detalle });
  };

  const infoVertice = (v: VerticePL) => ({
    titulo: `Vértice (${fmtCoordenada(v.x1)}, ${fmtCoordenada(v.x2)})`,
    detalle: `Z = ${fmtCoordenada(v.z)}${esOptimo(v) ? '  ·  óptimo' : ''}`,
  });

  const infoDescarte = (d: InterseccionDescartadaPL) => ({
    titulo: `Cruce: ${nombreRestriccion(d.restriccionA)} × ${nombreRestriccion(d.restriccionB)}`,
    detalle: traducirNombres(d.motivo),
  });

  const hoverVertice = (v: VerticePL) => () => {
    const info = infoVertice(v);
    mostrarTooltip(scaleX(v.x1), scaleY(v.x2), info.titulo, info.detalle);
  };

  const hoverDescarte = (d: InterseccionDescartadaPL) => () => {
    const info = infoDescarte(d);
    mostrarTooltip(scaleX(d.punto!.x1), scaleY(d.punto!.x2), info.titulo, info.detalle);
  };

  const leyenda =
    restricciones.length > 0 ? (
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3  dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500  dark:text-gray-400">
            Restricciones
          </p>
          <div className="flex gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={mostrarTodas}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-600  hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={ocultarTodas}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-600  hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Ninguna
            </button>
          </div>
        </div>
        <ul className="mt-2 space-y-1.5">
          {restricciones.map((r, i) => {
            const activo = lineasActivas.has(r.id);
            const color = PALETA_RECTAS[i % PALETA_RECTAS.length];
            return (
              <li key={r.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600  dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => alternarRecta(r.id, e.target.checked)}
                    aria-label={`Mostrar restricción ${r.id}`}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold uppercase text-slate-700  dark:text-gray-200">
                    {r.id}:
                  </span>
                  <span className="tabular-nums">{textoRecta(r)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <>
    <div ref={contRef} className="relative" role="img" aria-label="Plano cartesiano con la región factible del método gráfico">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="mx-auto w-full"
        style={{ maxWidth: 720 }}
      >
        {/* Retícula */}
        {dx.ticks.map((t) => (
          <g key={`gx${t}`}>
            <line x1={scaleX(t)} y1={MRG.top} x2={scaleX(t)} y2={MRG.top + PLOT_H} stroke={gridColor} strokeWidth={1} />
            {t !== 0 ? (
              <text x={scaleX(t)} y={MRG.top + PLOT_H + 20} textAnchor="middle" fill={tickColor} fontSize={11}>
                {fmtCoordenada(t)}
              </text>
            ) : null}
          </g>
        ))}
        {dy.ticks.map((t) => (
          <g key={`gy${t}`}>
            <line x1={MRG.left} y1={scaleY(t)} x2={MRG.left + PLOT_W} y2={scaleY(t)} stroke={gridColor} strokeWidth={1} />
            {t !== 0 ? (
              <text x={MRG.left - 8} y={scaleY(t) + 4} textAnchor="end" fill={tickColor} fontSize={11}>
                {fmtCoordenada(t)}
              </text>
            ) : null}
          </g>
        ))}

        {/* Ejes */}
        <line x1={MRG.left} y1={scaleY(0)} x2={MRG.left + PLOT_W} y2={scaleY(0)} stroke={axisColor} strokeWidth={1.5} />
        <line x1={scaleX(0)} y1={MRG.top} x2={scaleX(0)} y2={MRG.top + PLOT_H} stroke={axisColor} strokeWidth={1.5} />
        <text
          x={MRG.left}
          y={MRG.top - 14}
          textAnchor="middle"
          fill={axisLabelFill}
          fontSize={16}
          fontWeight={700}
        >
          x₂
        </text>
        <text
          x={MRG.left + PLOT_W}
          y={scaleY(0) + 42}
          textAnchor="middle"
          fill={axisLabelFill}
          fontSize={16}
          fontWeight={700}
        >
          x₁
        </text>

        <defs>
          <clipPath id="clip-plano-metodo-grafico">
            <rect x={MRG.left} y={MRG.top} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* Rectas de las restricciones (se activan/desactivan en la leyenda) */}
        <g clipPath="url(#clip-plano-metodo-grafico)">
          {restricciones.map((r, i) => {
            if (!lineasActivas.has(r.id)) return null;
            const color = PALETA_RECTAS[i % PALETA_RECTAS.length];
            if (Math.abs(r.b) > 1e-9) {
              const yEn = (x: number) => (r.rhs - r.a * x) / r.b;
              return (
                <line
                  key={r.id}
                  x1={scaleX(dx.min)}
                  y1={scaleY(yEn(dx.min))}
                  x2={scaleX(dx.max)}
                  y2={scaleY(yEn(dx.max))}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              );
            }
            if (Math.abs(r.a) > 1e-9) {
              const xv = r.rhs / r.a;
              return (
                <line
                  key={r.id}
                  x1={scaleX(xv)}
                  y1={MRG.top}
                  x2={scaleX(xv)}
                  y2={MRG.top + PLOT_H}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              );
            }
            return null;
          })}
        </g>

        {/* Región factible: polígono convexo ordenado trigonométricamente */}
        {mostrarPoligono && poligono.length >= 3 ? (
          <polygon
            aria-label="Región factible"
            points={puntos}
            fill={polyFill}
            stroke={polyStroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : null}
        {mostrarPoligono && poligono.length === 2 ? (
          <polyline
            aria-label="Región factible"
            points={puntos}
            fill="none"
            stroke={polyStroke}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Puntos descartados (opcional) */}
        {descartesVisibles.map(({ desc, punto }, i) => (
          <circle
            key={`d${i}`}
            cx={scaleX(punto.x1)}
            cy={scaleY(punto.x2)}
            r={4}
            fill={discardFill}
            fillOpacity={0.5}
            stroke={discardFill}
            strokeWidth={1}
            strokeDasharray="3 2"
            onMouseEnter={hoverDescarte(desc)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* Vértices factibles (se ocultan con la región para no revelar la solución) */}
        {mostrarPoligono
          ? poligono.map((v) => {
              const opt = esOptimo(v);
              return (
                <g key={`v${v.x1}-${v.x2}`}>
                  <circle
                    cx={scaleX(v.x1)}
                    cy={scaleY(v.x2)}
                    r={opt ? 6.5 : 4.5}
                    fill={opt ? optimumFill : vertexFill}
                    stroke={dark ? '#1e293b' : '#f8fafc'}
                    strokeWidth={2}
                    onMouseEnter={hoverVertice(v)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <text
                    x={scaleX(v.x1) + (opt ? 9 : 7)}
                    y={scaleY(v.x2) - (opt ? 7 : 5)}
                    fill={tickColor}
                    fontSize={11}
                    fontWeight={opt ? 700 : 400}
                  >
                    ({fmtCoordenada(v.x1)}, {fmtCoordenada(v.x2)})
                  </text>
                </g>
              );
            })
          : null}
      </svg>

      {/* Tooltip */}
      {hover ? (
        <div
          style={{ left: hover.px, top: hover.py }}
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          <p className="font-semibold text-slate-700 dark:text-gray-100">{hover.titulo}</p>
          <p className="mt-0.5 tabular-nums text-slate-500 dark:text-gray-400">{hover.detalle}</p>
        </div>
      ) : null}
    </div>

    {/* Leyenda interactiva de restricciones */}
    {leyenda}
    </>
  );
}