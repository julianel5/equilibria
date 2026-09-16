import { useState, type JSX } from 'react';

export interface ArbolDecisionProps {
  alternativas: string[];
  estados: string[];
  matriz: number[][];
  /** Índice de la alternativa ganadora (opcional): resalta y poda. */
  indiceOptimo?: number | null;
  ancho?: number;
  alto?: number;
}

const VERDE_RAMA = '#059669';
const VERDE_TEXTO = '#047857';
const GRIS_RAMA = '#cbd5e1';
const GRIS_TEXTO = '#94a3b8';
const NEUTRO_RAMA = '#94a3b8';
const NEUTRO_TEXTO = '#1e293b';
const ROJO_PODA = '#dc2626';
const AZUL_RAIZ = '#1d4ed8';

function fmtPago(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

/** Halo blanco: hace legibles las etiquetas que cruzan las líneas. */
const HALO = { paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 } as const;

/**
 * Árbol de decisión dinámico en SVG (top-down).
 * Geometría: raíz cuadrada en el centro superior, un nodo de evento (círculo)
 * por alternativa repartiendo el ancho, y una hoja por estado bajo cada círculo.
 * Por defecto se dibuja en estado neutro; con el interruptor "Mostrar decisión
 * recomendada" activo y `indiceOptimo` presente, la rama ganadora se engrosa en
 * verde y las perdedoras quedan atenuadas en gris con una marca roja de poda.
 */
export default function ArbolDecision({
  alternativas,
  estados,
  matriz,
  indiceOptimo = null,
  ancho = 800,
  alto = 400,
}: ArbolDecisionProps): JSX.Element {
  const [mostrarResolucion, setMostrarResolucion] = useState(false);
  const M = alternativas.length;
  const N = estados.length;
  const anchoTotal = Math.max(ancho, M * N * 40);
  const altoTotal = alto;

  const pasoAlternativa = anchoTotal / M;
  const pasoEstado = pasoAlternativa / N;

  const raizX = anchoTotal / 2;
  const raizY = 50;
  const nodoY = 200;
  const hojaY = 350;
  const radio = 14;
  const mediaCaja = 18;

  const xCirculo = (i: number) => (i + 0.5) * pasoAlternativa;
  const xHoja = (i: number, j: number) => xCirculo(i) + (j - (N - 1) / 2) * pasoEstado;
  const hayPoda = indiceOptimo !== null && indiceOptimo !== undefined;
  const resuelto = hayPoda && mostrarResolucion;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end">
        <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-slate-600  dark:text-gray-300">
          <span>Mostrar decisión recomendada (Poda)</span>
          <button
            type="button"
            role="switch"
            aria-checked={mostrarResolucion}
            disabled={!hayPoda}
            onClick={() => setMostrarResolucion((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              mostrarResolucion ? 'bg-emerald-600' : 'bg-slate-300  dark:bg-gray-600'
            } ${hayPoda ? '' : 'cursor-not-allowed opacity-50'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                mostrarResolucion ? 'translate-x-[19px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </label>
      </div>

      <svg
        role="img"
        aria-label="Árbol de decisión"
        width={anchoTotal}
        height={altoTotal}
        viewBox={`0 0 ${anchoTotal} ${altoTotal}`}
        className="max-w-none"
      >
        <title>Árbol de decisión de la matriz de pagos</title>

        <rect
          x={raizX - mediaCaja}
          y={raizY - mediaCaja}
          width={mediaCaja * 2}
          height={mediaCaja * 2}
          fill={AZUL_RAIZ}
          rx="4"
        />
        <text
          x={raizX}
          y={raizY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="600"
          fill="#ffffff"
        >
          Decisión
        </text>

        {alternativas.map((alt, i) => {
          const ganadora = resuelto && i === indiceOptimo;
          const podada = resuelto && !ganadora;
          const colorRama = ganadora ? VERDE_RAMA : resuelto ? NEUTRO_RAMA : '#475569';
          const colorTexto = ganadora ? VERDE_TEXTO : resuelto ? GRIS_TEXTO : NEUTRO_TEXTO;
          const grosorRama = ganadora ? 3 : 1.5;

          const x0 = raizX;
          const y0 = raizY + mediaCaja;
          const x1 = xCirculo(i);
          const y1 = nodoY - radio;
          const midX = (x0 + x1) / 2;
          const midY = (y0 + y1) / 2;

          return (
            <g key={i}>
              <g opacity={podada ? 0.45 : 1}>
                <line
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  stroke={colorRama}
                  strokeWidth={grosorRama}
                />
                <circle
                  cx={x1}
                  cy={nodoY}
                  r={radio}
                  fill={ganadora ? VERDE_RAMA : '#ffffff'}
                  stroke={colorRama}
                  strokeWidth={ganadora ? 2.5 : 1.5}
                />
                <text
                  x={midX}
                  y={midY - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={ganadora ? '600' : '400'}
                  fill={colorTexto}
                  style={HALO}
                >
                  {alt}
                </text>

                {estados.map((estado, j) => {
                  const xL = xHoja(i, j);
                  const punto = matriz[i]?.[j];
                  const cpago = fmtPago(punto);
                  const midLX = (x1 + xL) / 2;
                  const midLY = (nodoY + radio + (hojaY - 4)) / 2;
                  return (
                    <g key={j}>
                      <line
                        x1={x1}
                        y1={nodoY + radio}
                        x2={xL}
                        y2={hojaY - 4}
                        stroke={podada ? GRIS_RAMA : colorRama}
                        strokeWidth={ganadora ? 2 : 1.25}
                        strokeDasharray={podada ? '3 2' : 'none'}
                      />
                      <text
                        x={midLX}
                        y={midLY - 4}
                        textAnchor="middle"
                        fontSize="9.5"
                        fill={colorTexto}
                        style={HALO}
                      >
                        {estado}
                      </text>
                      <text
                        x={xL}
                        y={hojaY + 16}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={ganadora ? '600' : '400'}
                        fill={colorTexto}
                      >
                        {cpago}
                      </text>
                    </g>
                  );
                })}
              </g>

              {podada ? (
                <g strokeLinecap="round" className="pointer-events-none">
                  <line x1={midX - 5} y1={midY - 5} x2={midX + 5} y2={midY + 5} stroke={ROJO_PODA} strokeWidth="2" />
                  <line x1={midX - 5} y1={midY + 5} x2={midX + 5} y2={midY - 5} stroke={ROJO_PODA} strokeWidth="2" />
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}