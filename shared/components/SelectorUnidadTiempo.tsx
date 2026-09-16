import type { ChangeEvent } from 'react';

export type UnidadTiempo =
  | 'anual'
  | 'semestral'
  | 'cuatrimestral'
  | 'trimestral'
  | 'bimestral'
  | 'mensual'
  | 'semanal'
  | 'diario';

/** Opciones del selector de unidad de tiempo. */
export const UNIDADES_TIEMPO: { valor: UnidadTiempo; etiqueta: string }[] = [
  { valor: 'anual', etiqueta: 'Anual' },
  { valor: 'semestral', etiqueta: 'Semestral' },
  { valor: 'cuatrimestral', etiqueta: 'Cuatrimestral' },
  { valor: 'trimestral', etiqueta: 'Trimestral' },
  { valor: 'bimestral', etiqueta: 'Bimestral' },
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'diario', etiqueta: 'Diario' },
];

/** Período singular para sufijos como "unidades / mes" o "unidades / año". */
export const PERIODO_DE_UNIDAD: Record<UnidadTiempo, string> = {
  anual: 'año',
  semestral: 'semestre',
  cuatrimestral: 'cuatrimestre',
  trimestral: 'trimestre',
  bimestral: 'bimestre',
  mensual: 'mes',
  semanal: 'semana',
  diario: 'día',
};

/** Período plural para la frase "× N semestres/año" de la Fase 0. */
export const PERIODO_PLURAL: Record<UnidadTiempo, string> = {
  anual: 'años',
  semestral: 'semestres',
  cuatrimestral: 'cuatrimestres',
  trimestral: 'trimestres',
  bimestral: 'bimestres',
  mensual: 'meses',
  semanal: 'semanas',
  diario: 'días',
};

/** Adjetivo del período para títulos dinámicos ("Costo total semestral", "mensual"...). */
export const ETIQUETAS_UNIDAD_TIEMPO: Record<UnidadTiempo, string> = Object.fromEntries(
  UNIDADES_TIEMPO.map((u) => [u.valor, u.etiqueta])
) as Record<UnidadTiempo, string>;

const selectClases =
  'shrink-0 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

interface SelectorUnidadTiempoProps {
  valor: UnidadTiempo;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  ariaLabel?: string;
}

/** Selector de unidad de tiempo (p. ej. Anual, Mensual, Diario). */
export default function SelectorUnidadTiempo({
  valor,
  onChange,
  ariaLabel,
}: SelectorUnidadTiempoProps) {
  return (
    <select aria-label={ariaLabel} value={valor} onChange={onChange} className={selectClases}>
      {UNIDADES_TIEMPO.map((u) => (
        <option key={u.valor} value={u.valor}>
          {u.etiqueta}
        </option>
      ))}
    </select>
  );
}