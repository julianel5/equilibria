import Formula from './Formula';

type Tone = 'blue' | 'emerald' | 'amber' | 'slate';

const tones: Record<Tone, { value: string; chip: string; border: string }> = {
  blue: {
    value: 'text-blue-600 dark:text-blue-400',
    chip: 'bg-blue-50 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
    border: 'border-blue-100 dark:border-blue-950',
  },
  emerald: {
    value: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-950',
  },
  amber: {
    value: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    border: 'border-amber-100 dark:border-amber-950',
  },
  slate: {
    value: 'text-slate-700 dark:text-gray-300',
    chip: 'bg-slate-50 text-slate-700 dark:bg-gray-700/40 dark:text-gray-300',
    border: 'border-slate-100 dark:border-gray-800',
  },
};

interface KpiCardProps {
  label: string;
  value: string;
  formula: string;
  tone?: Tone;
  large?: boolean;
  descripcion?: string;
}

export default function KpiCard({
  label,
  value,
  formula,
  tone = 'slate',
  large = false,
  descripcion,
}: KpiCardProps) {
  const t = tones[tone];

  return (
    <div className={`rounded-lg border ${t.border} bg-white p-5 shadow-md  dark:bg-gray-800`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500  dark:text-gray-400">
        {label}
      </p>
      <p
        className={`mt-2 tabular-nums  ${t.value} ${
          large ? 'text-4xl font-extrabold tracking-tight' : 'text-2xl font-bold'
        }`}
      >
        {value}
      </p>
      <div className={`mt-3 rounded-md  ${t.chip} px-3 py-2`}>
        <Formula tex={formula} />
      </div>
      {descripcion ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400  dark:text-gray-500">{descripcion}</p>
      ) : null}
    </div>
  );
}