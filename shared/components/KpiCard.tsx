import Formula from './Formula';

type Tone = 'blue' | 'emerald' | 'amber' | 'slate';

const values: Record<Exclude<Tone, 'amber'>, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  slate: 'text-slate-700 dark:text-gray-300',
};

interface KpiCardProps {
  title: string;
  value: string;
  formula: string;
  tone?: Tone;
  /** Resalta la tarjeta con el estilo ámbar de destino ("highlight") del modelo. */
  highlight?: boolean;
  large?: boolean;
  description?: string;
}

export default function KpiCard({
  title,
  value,
  formula,
  tone = 'slate',
  highlight = false,
  large = false,
  description,
}: KpiCardProps) {
  const isHighlight = highlight === true || tone === 'amber';

  const shell = isHighlight
    ? 'rounded-lg border border-orange-500 bg-orange-50 p-5 shadow-sm  dark:border-amber-500/60 dark:bg-amber-500/10'
    : 'rounded-lg border border-gray-200 bg-white p-5 shadow-sm  dark:border-gray-600 dark:bg-gray-800';

  const titleClass = `text-xs font-semibold uppercase tracking-wide  ${
    isHighlight ? 'text-orange-600 dark:text-gray-400' : 'text-slate-500 dark:text-gray-400'
  }`;

  const valueClass = `mt-2 tabular-nums  ${
    isHighlight ? 'text-orange-600 dark:text-amber-400' : values[tone as Exclude<Tone, 'amber'>]
  } ${large ? 'text-4xl font-extrabold tracking-tight' : 'text-2xl font-bold'}`;

  return (
    <div className={shell}>
      <p className={titleClass}>{title}</p>
      <p className={valueClass}>{value}</p>
      <div className="mt-3 rounded-md border border-transparent bg-gray-100 px-3 py-2 text-gray-800  dark:border dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <Formula tex={formula} />
      </div>
      {description ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400  dark:text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}