import Formula from '@shared/components/Formula';
import type { CriterioResult, TeoriaDecisionesResult } from '../services/api';

const BADGE: Record<string, string> = {
  maximax: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  maximin: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  laplace: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  hurwicz: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  savage: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  vme: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
};

const RIBETE: Record<string, string> = {
  maximax: 'border-l-blue-400',
  maximin: 'border-l-rose-400',
  laplace: 'border-l-amber-400',
  hurwicz: 'border-l-violet-400',
  savage: 'border-l-emerald-400',
  vme: 'border-l-cyan-400',
};

interface Props {
  resultado: TeoriaDecisionesResult;
  alternativas: string[];
  estados: string[];
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

function TablaValores(criterio: CriterioResult) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400  dark:border-gray-700 dark:text-gray-500">
          <th className="px-3 py-2 font-semibold">Alternativa</th>
          <th className="px-3 py-2 text-right font-semibold">Valor</th>
        </tr>
      </thead>
      <tbody>
        {criterio.valores.map((v) => {
          const esGanador = v.indice === criterio.ganador.indice;
          return (
            <tr
              key={v.indice}
              className={`border-b border-slate-100 last:border-0 dark:border-gray-800 ${
                esGanador
                  ? 'bg-emerald-50 dark:bg-emerald-500/10'
                  : ''
              }`}
            >
              <td
                className={`px-3 py-2 font-medium ${
                  esGanador
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-gray-300'
                }`}
              >
                {v.alternativa}
                {esGanador ? ' ← ganadora' : ''}
              </td>
              <td
                className={`px-3 py-2 text-right font-semibold tabular-nums ${
                  esGanador
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-700 dark:text-gray-200'
                }`}
              >
                {fmt(v.valor)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TablaArrepentimiento({ criterio, estados }: { criterio: CriterioResult; estados: string[] }) {
  if (!criterio.matrizArrepentimiento) return null;
  const matriz = criterio.matrizArrepentimiento;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400  dark:text-gray-500">
        Matriz de arrepentimiento r_ij
      </h4>
      <div className="overflow-x-auto rounded-lg border border-slate-200  dark:border-gray-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400  dark:bg-gray-900 dark:text-gray-500">
              <th className="px-3 py-2 font-semibold">Alternativa / Estado</th>
              {estados.map((e, j) => (
                <th key={j} className="px-3 py-2 text-right font-semibold">
                  {e}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold">Máx. arrepentimiento</th>
            </tr>
          </thead>
          <tbody>
            {matriz.map((fila, i) => {
              const esGanador = i === criterio.ganador.indice;
              const maxRow = Math.max(...fila);
              return (
                <tr
                  key={i}
                  className={`border-t border-slate-100 dark:border-gray-800 ${
                    esGanador ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-slate-600  dark:text-gray-300">
                    {criterio.valores[i].alternativa}
                  </td>
                  {fila.map((v, j) => (
                    <td key={j} className="px-3 py-2 text-right tabular-nums text-slate-700  dark:text-gray-200">
                      {fmt(v)}
                    </td>
                  ))}
                  <td
                    className={`px-3 py-2 text-right font-bold tabular-nums ${
                      esGanador
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-gray-200'
                    }`}
                  >
                    {fmt(maxRow)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TeoriaDecisionesResultados({ resultado, alternativas, estados }: Props) {
  return (
    <div className="space-y-6">
      {/* Panel resumen de ganadores */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
          Alternativas ganadoras por criterio
        </h2>
        <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
          Cada criterio selecciona una alternativa distinta según la actitud frente al riesgo
          que captura. Las tarjetas resumen el ganador y su valor.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resultado.criterios.map((c) => (
            <div
              key={c.clave}
              className={`rounded-lg border border-slate-200 border-l-4 p-4  dark:border-gray-700 ${RIBETE[c.clave] ?? 'border-l-blue-400'}`}
            >
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  BADGE[c.clave] ?? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                }`}
              >
                {c.nombre}
              </span>
              <p className="mt-2 text-base font-bold text-slate-800  dark:text-gray-100">
                {c.ganador.alternativa}
              </p>
              <p className="text-sm tabular-nums text-slate-500  dark:text-gray-400">
                Valor: <strong className="text-slate-700  dark:text-gray-200">{fmt(c.ganador.valor)}</strong>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          En la matriz de este ejemplo:{' '}
          <strong className="text-slate-700 dark:text-gray-200">{alternativas.join(', ')}</strong>{' '}
          son alternativas y{' '}
          <strong className="text-slate-700 dark:text-gray-200">{estados.join(', ')}</strong>{' '}
          los estados de la naturaleza. Las probabilidades definidas para cada estado alimentan
          el criterio VME.
        </p>
        {resultado.tipoAnalisis === 'minimizar' ? (
          <p className="mt-1 text-xs text-slate-400  dark:text-gray-500">
            Modo costos (minimizar). Máximos por fila (peor costo): [
            {resultado.maximoPorFila.map(fmt).join(', ')}] · Mínimos por fila (mejor costo): [
            {resultado.minimoPorFila.map(fmt).join(', ')}] · Mínimos por columna: [
            {resultado.minimoPorColumna.map(fmt).join(', ')}].
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400  dark:text-gray-500">
            Máximos por fila: [{resultado.maximoPorFila.map(fmt).join(', ')}] · Mínimos por fila: [
            {resultado.minimoPorFila.map(fmt).join(', ')}] · Máximos por columna: [
            {resultado.maximoPorColumna.map(fmt).join(', ')}].
          </p>
        )}
      </section>

      {/* Detalle pedagógico por criterio */}
      {resultado.criterios.map((c) => (
        <section
          key={c.clave}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-700  dark:text-gray-100">{c.nombre}</h3>
            <span className="text-sm text-slate-500  dark:text-gray-400">
              <Formula tex={c.formula} />
            </span>
          </div>
          <p className="mb-4 text-sm text-slate-500  dark:text-gray-400">{c.descripcion}</p>
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700  dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">
            Ganadora: {c.ganador.alternativa} con puntuación {fmt(c.ganador.valor)}
          </p>
          <div className="space-y-5">
            <div className="mx-auto max-w-md">
              {TablaValores(c)}
            </div>
            {c.clave === 'savage' ? <TablaArrepentimiento criterio={c} estados={estados} /> : null}
          </div>
        </section>
      ))}

      {!resultado.vmeDisponible ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          El criterio <strong>VME</strong> aparece cuando defines una probabilidad para cada uno
          de los estados de la naturaleza (sumando exactamente 1). Retrocede a la matriz e ingresa
          esas probabilidades para habilitarlo.
        </section>
      ) : null}
    </div>
  );
}