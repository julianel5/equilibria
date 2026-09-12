import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { calcularEOQDescuentos, ApiError, type EOQDescuentosResult, type RangoEvaluacion } from '../services/api';
import RangosPrecios, { type RangoPrecio } from '@shared/components/RangosPrecios';
import EOQDescuentosTeoria from '../components/EOQDescuentosTeoria';
import { VARIABLES_EOQDESCUENTOS } from '../data/glosario';
import Formula from '@shared/components/Formula';
import Glossary, { GlossaryButton } from '@shared/components/Glossary';
import KpiCard from '@shared/components/KpiCard';
import PrefsCard from '@shared/components/PrefsCard';
import TabsPanel from '@shared/components/TabsPanel';

type Pestana = 'calculadora' | 'teoria';
type ModoMantener = 'fijo' | 'porcentaje';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

interface FormState {
  demandaAnual: string;
  costoOrdenar: string;
  costoMantener: string;
  costoMantenerPorcentaje: string;
}

interface PrefsState {
  unidad: string;
  moneda: string;
}

const fmtMoneda = (n: number, moneda: string) =>
  `${moneda} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDecimal = (n: number, max = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

function intervalo(r: RangoEvaluacion) {
  return `${fmtDecimal(r.cantidadMinima)} – ${r.cantidadMaxima === null ? '∞' : fmtDecimal(r.cantidadMaxima)}`;
}

export default function EOQDescuentosPage() {
  const [form, setForm] = useState<FormState>({
    demandaAnual: '10000',
    costoOrdenar: '20',
    costoMantener: '2',
    costoMantenerPorcentaje: '20',
  });
  const [tipoCostoMantener, setTipoCostoMantener] = useState<ModoMantener>('porcentaje');
  const [rangos, setRangos] = useState<RangoPrecio[]>([
    { cantidadMinima: '0', cantidadMaxima: '1000', costoUnitario: '10' },
    { cantidadMinima: '1001', cantidadMaxima: '', costoUnitario: '9' },
  ]);
  const [prefs, setPrefs] = useState<PrefsState>({
    unidad: 'unidades',
    moneda: 'USD',
  });
  const [resultado, setResultado] = useState<EOQDescuentosResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [glosarioAbierto, setGlosarioAbierto] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('calculadora');

  const unidad = prefs.unidad.trim() || 'unidades';
  const moneda = prefs.moneda.trim() || 'USD';

  const calcular = useCallback(
    async (datos: FormState, modo: ModoMantener, niveles: RangoPrecio[]) => {
      setCargando(true);
      setErrors([]);
      setFieldErrors({});
      try {
        const res = await calcularEOQDescuentos({
          demandaAnual: Number(datos.demandaAnual),
          costoOrdenar: Number(datos.costoOrdenar),
          tipoCostoMantener: modo,
          costoMantener: modo === 'fijo' ? Number(datos.costoMantener) : undefined,
          costoMantenerPorcentaje:
            modo === 'porcentaje' ? Number(datos.costoMantenerPorcentaje) : undefined,
          rangos: niveles.map((r) => ({
            cantidadMinima: Number(r.cantidadMinima),
            cantidadMaxima:
              r.cantidadMaxima.trim() === '' ? undefined : Number(r.cantidadMaxima),
            costoUnitario: Number(r.costoUnitario),
          })),
        });
        setResultado(res);
      } catch (e) {
        if (e instanceof ApiError) {
          setErrors(e.issues.map((i) => i.message));
          const campos: Record<string, string> = {};
          for (const issue of e.issues) {
            campos[issue.path] = issue.message;
          }
          setFieldErrors(campos);
        } else {
          setErrors([e instanceof Error ? e.message : 'Error inesperado']);
        }
      } finally {
        setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    void calcular(form, tipoCostoMantener, rangos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void calcular(form, tipoCostoMantener, rangos);
  };

  const handleChange =
    (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handlePrefChange =
    (key: keyof PrefsState) => (e: ChangeEvent<HTMLInputElement>) =>
      setPrefs((prev) => ({ ...prev, [key]: e.target.value }));

  // Barras comparativas del TC de los candidatos válidos (reemplaza al CostChart
  // para este modelo, priorizando la legibilidad de la tabla de evaluación).
  const candidatos = useMemo(
    () => (resultado ? resultado.rangos.filter((r) => !r.descartado) : []),
    [resultado]
  );
  const maxTC = candidatos.length ? Math.max(...candidatos.map((r) => r.costoTotal ?? 0)) : 0;

  const inputClases =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30';

  const botonModo = (activo: boolean) =>
    `rounded px-3 py-1.5 text-sm ${
      activo
        ? 'bg-white font-semibold text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
        : 'font-medium text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'
    }`;

  if (pestana === 'teoria') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <EOQDescuentosHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo EOQ con Descuentos"
        />
        <EOQDescuentosTeoria />
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_EOQDESCUENTOS}
        />
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <EOQDescuentosHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo EOQ con Descuentos"
        />
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
          <p className="text-sm text-slate-500  dark:text-gray-400">Calculando EOQ con Descuentos…</p>
        </div>
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_EOQDESCUENTOS}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EOQDescuentosHeader />
        <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
      </div>
      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones del modelo EOQ con Descuentos"
      />

      <PrefsCard
        unidad={prefs.unidad}
        moneda={prefs.moneda}
        onUnidadChange={handlePrefChange('unidad')}
        onMonedaChange={handlePrefChange('moneda')}
      />

      {/* Fila principal: formulario dinámico + KPIs grandes */}
      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">Parámetros</h2>
          <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
            Define la demanda, los costos y los niveles de precio del proveedor.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                Demanda anual
                <span className="text-slate-400  dark:text-gray-500">
                  <Formula tex="D" />
                </span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={form.demandaAnual}
                onChange={handleChange('demandaAnual')}
                className={inputClases}
              />
              <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                {unidad} / año
              </span>
              {fieldErrors.demandaAnual ? (
                <span role="alert" className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400">
                  {fieldErrors.demandaAnual}
                </span>
              ) : null}
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                Costo de ordenar
                <span className="text-slate-400  dark:text-gray-500">
                  <Formula tex="S" />
                </span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={form.costoOrdenar}
                onChange={handleChange('costoOrdenar')}
                className={inputClases}
              />
              <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                {moneda} / orden
              </span>
              {fieldErrors.costoOrdenar ? (
                <span role="alert" className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400">
                  {fieldErrors.costoOrdenar}
                </span>
              ) : null}
            </div>

            {/* Selector: costo de mantener fijo (H) o porcentaje del precio (I) */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                Costo de mantener
              </p>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1  dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setTipoCostoMantener('fijo')}
                  className={botonModo(tipoCostoMantener === 'fijo')}
                >
                  Fijo (H)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoCostoMantener('porcentaje')}
                  className={botonModo(tipoCostoMantener === 'porcentaje')}
                >
                  Porcentaje (I)
                </button>
              </div>
              <div className="mt-3">
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                  {tipoCostoMantener === 'fijo' ? 'Costo de mantener' : 'Costo de mantener (%)'}
                  <span className="text-slate-400  dark:text-gray-500">
                    <Formula tex={tipoCostoMantener === 'fijo' ? 'H' : 'I'} />
                  </span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={
                    tipoCostoMantener === 'fijo' ? form.costoMantener : form.costoMantenerPorcentaje
                  }
                  onChange={handleChange(
                    tipoCostoMantener === 'fijo' ? 'costoMantener' : 'costoMantenerPorcentaje'
                  )}
                  className={inputClases}
                />
                <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                  {tipoCostoMantener === 'fijo'
                    ? `${moneda} / ${unidad}-año`
                    : 'porcentaje anual del precio del nivel (H = I × C)'}
                </span>
                {fieldErrors.costoMantener ? (
                  <span role="alert" className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400">
                    {fieldErrors.costoMantener}
                  </span>
                ) : null}
                {fieldErrors.costoMantenerPorcentaje ? (
                  <span role="alert" className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400">
                    {fieldErrors.costoMantenerPorcentaje}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Constructor dinámico de niveles de precio */}
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                Niveles de precio
              </p>
              <RangosPrecios
                rangos={rangos}
                onChange={setRangos}
                unidad={unidad}
                moneda={moneda}
                fieldErrors={fieldErrors}
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-md  hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Calculando…' : 'Calcular'}
            </button>
          </form>

          {errors.length > 0 ? (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm  dark:border-red-900 dark:bg-red-900/20"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600  dark:text-red-400"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <ul className="mt-0.5 list-disc space-y-1 pl-5 font-semibold text-red-600  dark:text-red-400">
                {errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Métricas clave (KPIs grandes) */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">Resultados</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              large
              title="Lote óptimo final"
              value={`${fmtDecimal(resultado.loteOptimo)} ${unidad}`}
              formula={'Q^* = \\sqrt{ \\frac{2DS}{H_j} }'}
              tone="blue"
              description="Candidato del nivel ganador. Si el lote local caía debajo del intervalo, se ajustó a la cantidad mínima del nivel."
            />
            <KpiCard
              large
              title="Costo total anual"
              value={fmtMoneda(resultado.costoTotalOptimo, moneda)}
              formula={'TC_j = \\frac{D}{Q}S + \\frac{Q}{2}H_j + DC_j'}
              tone="emerald"
              description="Menor costo total entre los candidatos válidos: ordenar, mantener y adquirir al precio del nivel ganador."
            />
          </div>
        </section>
      </div>

      {/* Tabla de evaluación por nivel */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Tabla de evaluación por nivel
        </h2>
        <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
          Cada nivel muestra su lote óptimo local, el ajuste aplicado y el costo total de su
          candidato. La fila verde es el nivel ganador; los niveles descartados no participan.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500  dark:border-gray-600 dark:text-gray-400">
                <th className="px-3 py-2">Nivel</th>
                <th className="px-3 py-2">Intervalo</th>
                <th className="px-3 py-2">
                  Precio <Formula tex="C_j" />
                </th>
                <th className="px-3 py-2">
                  H aplicado <Formula tex="H_j" />
                </th>
                <th className="px-3 py-2">Q* original</th>
                <th className="px-3 py-2">Q* ajustado</th>
                <th className="px-3 py-2 text-right">Ordenar</th>
                <th className="px-3 py-2 text-right">Mantener</th>
                <th className="px-3 py-2 text-right">Adquisición (D·C)</th>
                <th className="px-3 py-2 text-right">Costo total</th>
              </tr>
            </thead>
            <tbody>
              {resultado.rangos.map((r, idx) => {
                const ganador = r.esGanador;
                const fila = ganador
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : r.descartado
                    ? 'opacity-60'
                    : 'odd:bg-slate-50 dark:odd:bg-gray-900/40';
                return (
                  <tr key={idx} className={`border-b border-slate-100 align-middle  dark:border-gray-700 ${fila}`}>
                    <td className="px-3 py-2.5 font-medium text-slate-700  dark:text-gray-200">
                      {idx + 1}
                      {ganador ? (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700  dark:bg-emerald-500/20 dark:text-emerald-400">
                          Ganador
                        </span>
                      ) : null}
                      {r.descartado ? (
                        <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500  dark:bg-gray-700 dark:text-gray-400">
                          Descartado
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600  dark:text-gray-300">{intervalo(r)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600  dark:text-gray-300">
                      {fmtMoneda(r.costoUnitario, moneda)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600  dark:text-gray-300">
                      {fmtMoneda(r.costoMantenerEfectivo, moneda)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600  dark:text-gray-300">
                      {fmtDecimal(r.qOriginal)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600  dark:text-gray-300">
                      {r.descartado ? (
                        '—'
                      ) : (
                        <>
                          {fmtDecimal(r.qAjustado ?? 0)}
                          {r.qAjustado !== r.qOriginal ? (
                            <span className="ml-1 text-xs italic text-slate-400  dark:text-gray-500">
                              (ajustado)
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600  dark:text-gray-300">
                      {r.descartado ? '—' : fmtMoneda(r.costoOrdenar ?? 0, moneda)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600  dark:text-gray-300">
                      {r.descartado ? '—' : fmtMoneda(r.costoMantener ?? 0, moneda)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600  dark:text-gray-300">
                      {r.descartado ? '—' : fmtMoneda(r.costoProducto ?? 0, moneda)}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${
                      ganador ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-200'
                    }`}>
                      {r.descartado ? '—' : fmtMoneda(r.costoTotal ?? 0, moneda)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comparación visual solo de candidatos válidos (reemplaza al CostChart) */}
      {candidatos.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
            Costo total de los candidatos válidos
          </h2>
          <p className="mb-5 text-sm text-slate-400  dark:text-gray-500">
            Longitud proporcional al costo total anual. La barra más corta (verde) es el nivel
            ganador Q* final.
          </p>
          <div className="space-y-4">
            {candidatos.map((r, idx) => {
              const tc = r.costoTotal ?? 0;
              return (
                <div key={idx}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-600  dark:text-gray-300">
                      Nivel {resultado.rangos.indexOf(r) + 1}: {intervalo(r)} ·{' '}
                      <Formula tex="C" /> {fmtDecimal(r.costoUnitario)}
                    </span>
                    <span className={`tabular-nums font-bold ${
                      r.esGanador
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-gray-200'
                    }`}>
                      {fmtMoneda(tc, moneda)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded bg-slate-200  dark:bg-gray-700">
                    <div
                      className={`h-full rounded ${
                        r.esGanador ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${maxTC > 0 ? (tc / maxTC) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <Glossary
        abierto={glosarioAbierto}
        onClose={() => setGlosarioAbierto(false)}
        variables={VARIABLES_EOQDESCUENTOS}
      />
    </div>
  );
}

function EOQDescuentosHeader() {
  return (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">
        EOQ con Descuentos por Cantidad
      </h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Evaluación por niveles de precio con costo de mantener fijo o porcentual.
      </p>
    </header>
  );
}