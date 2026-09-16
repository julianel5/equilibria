import { Fragment, useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { calcularPeriodoUnico, ApiError, type PeriodoUnicoResult } from '../services/api';
import PeriodoUnicoTeoria from '../components/PeriodoUnicoTeoria';
import { VARIABLES_PERIODOUNICO } from '../data/glosario';
import Formula from '@shared/components/Formula';
import CurvaDemandaChart from '@shared/components/CurvaDemandaChart';
import Glossary, { GlossaryButton } from '@shared/components/Glossary';
import KpiCard from '@shared/components/KpiCard';
import PrefsCard from '@shared/components/PrefsCard';
import ProcesosView from '@shared/components/ProcesosView';
import TabsPanel from '@shared/components/TabsPanel';

type Pestana = 'calculadora' | 'procesos' | 'teoria';
type Distribucion = 'normal' | 'uniforme';
type ModoIngreso = 'bienes' | 'servicios';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'procesos', etiqueta: 'Procesos' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

interface FormState {
  modoIngreso: ModoIngreso;
  distribucion: Distribucion;
  precioVenta: string;
  costoCompra: string;
  valorRescate: string;
  costoSubestimacion: string;
  costoSobreestimacion: string;
  demandaMedia: string;
  desviacionDemanda: string;
  limiteInferior: string;
  limiteSuperior: string;
}

interface CampoFormulario {
  key: keyof FormState;
  label: string;
  simbolo?: string;
  min: number;
  aria: string;
  unidadSufijo: (u: string, m: string) => string;
  solo: Distribucion | 'comun' | 'bienes' | 'servicios';
}

const CAMPOS_COMUNES: CampoFormulario[] = [
  { key: 'precioVenta', label: 'Precio de venta', simbolo: 'p', min: 0.01, aria: 'Precio de venta', unidadSufijo: (_u: string, m: string) => `${m} / unidad`, solo: 'bienes' },
  { key: 'costoCompra', label: 'Costo de compra', simbolo: 'c', min: 0.01, aria: 'Costo de compra', unidadSufijo: (_u: string, m: string) => `${m} / unidad`, solo: 'bienes' },
  { key: 'valorRescate', label: 'Valor de rescate', simbolo: 'v', min: 0, aria: 'Valor de rescate', unidadSufijo: (_u: string, m: string) => `${m} / unidad`, solo: 'bienes' },
  { key: 'costoSubestimacion', label: 'Costo de subestimación', simbolo: 'C_u', min: 0.01, aria: 'Costo de subestimación', unidadSufijo: (_u: string, m: string) => `${m} / unidad`, solo: 'servicios' },
  { key: 'costoSobreestimacion', label: 'Costo de sobreestimación', simbolo: 'C_o', min: 0.01, aria: 'Costo de sobreestimación', unidadSufijo: (_u: string, m: string) => `${m} / unidad`, solo: 'servicios' },
  { key: 'demandaMedia', label: 'Demanda media', simbolo: '\\mu', min: 0.01, aria: 'Demanda media', unidadSufijo: (u: string) => `${u} / período`, solo: 'normal' },
  { key: 'desviacionDemanda', label: 'Desviación estándar', simbolo: '\\sigma', min: 0, aria: 'Desviación estándar', unidadSufijo: (u: string) => `${u} / período`, solo: 'normal' },
  { key: 'limiteInferior', label: 'Límite inferior', simbolo: 'a', min: 0, aria: 'Límite inferior', unidadSufijo: (u: string) => `${u} / período`, solo: 'uniforme' },
  { key: 'limiteSuperior', label: 'Límite superior', simbolo: 'b', min: 0.01, aria: 'Límite superior', unidadSufijo: (u: string) => `${u} / período`, solo: 'uniforme' },
];

const fmtDecimal = (n: number, max = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

const fmtCSL = (n: number) =>
  `${(n * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;

export default function PeriodoUnicoPage() {
  const [form, setForm] = useState<FormState>({
    modoIngreso: 'bienes',
    distribucion: 'normal',
    precioVenta: '25',
    costoCompra: '10',
    valorRescate: '5',
    costoSubestimacion: '15',
    costoSobreestimacion: '5',
    demandaMedia: '1000',
    desviacionDemanda: '200',
    limiteInferior: '100',
    limiteSuperior: '500',
  });
  const [prefs, setPrefs] = useState({ unidad: 'unidades', moneda: 'USD' });
  const [resultado, setResultado] = useState<PeriodoUnicoResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [glosarioAbierto, setGlosarioAbierto] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('calculadora');

  const unidad = prefs.unidad.trim() || 'unidades';
  const moneda = prefs.moneda.trim() || 'USD';

  const calcular = useCallback(async (datos: FormState) => {
    setCargando(true);
    setErrors([]);
    setFieldErrors({});
    try {
      const res = await calcularPeriodoUnico({
        modoIngreso: datos.modoIngreso,
        distribucion: datos.distribucion,
        ...(datos.modoIngreso === 'bienes'
          ? {
              precioVenta: Number(datos.precioVenta),
              costoCompra: Number(datos.costoCompra),
              valorRescate: Number(datos.valorRescate),
            }
          : {
              costoSubestimacion: Number(datos.costoSubestimacion),
              costoSobreestimacion: Number(datos.costoSobreestimacion),
            }),
        ...(datos.distribucion === 'normal'
          ? {
              demandaMedia: Number(datos.demandaMedia),
              desviacionDemanda: Number(datos.desviacionDemanda),
            }
          : {
              limiteInferior: Number(datos.limiteInferior),
              limiteSuperior: Number(datos.limiteSuperior),
            }),
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
  }, []);

  useEffect(() => {
    void calcular(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void calcular(form);
  };

  const handleChange =
    (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleDistribucion = (distribucion: Distribucion) =>
    setForm((prev) => ({ ...prev, distribucion }));

  const handleModoIngreso = (modoIngreso: ModoIngreso) =>
    setForm((prev) => ({ ...prev, modoIngreso }));

  const handlePrefChange = (key: 'unidad' | 'moneda') => (e: ChangeEvent<HTMLInputElement>) =>
    setPrefs((prev) => ({ ...prev, [key]: e.target.value }));

  const header = (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">
        Periodo Único (Newsvendor)
      </h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Cantidad óptima de pedido para una sola oportunidad, con costos de exceso y escasez.
      </p>
    </header>
  );

  const pestanas = (
    <TabsPanel
      pestanas={PESTANAS}
      activa={pestana}
      onCambio={(c) => setPestana(c as Pestana)}
      ariaLabel="Secciones del modelo de periodo único"
    />
  );

  if (pestana === 'teoria') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {header}
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        {pestanas}
        <PeriodoUnicoTeoria />
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_PERIODOUNICO}
        />
      </div>
    );
  }

  if (pestana === 'procesos') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {header}
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        {pestanas}
        {resultado ? (
          <ProcesosView procesos={resultado.procesos} unidad={unidad} moneda={moneda} />
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
            <p className="text-sm text-slate-500  dark:text-gray-400">Calculando la cantidad óptima…</p>
          </div>
        )}
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_PERIODOUNICO}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
        <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
      </div>
      {pestanas}

      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">Parámetros</h2>
          <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
            Ingresa los costos del período y la distribución de la demanda.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-600  dark:text-gray-300">
                Distribución de la demanda
              </legend>
              <div className="flex flex-wrap gap-2">
                {(['normal', 'uniforme'] as Distribucion[]).map((d) => (
                  <label
                    key={d}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      form.distribucion === d
                        ? 'border-blue-500 bg-blue-50 text-blue-600  dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-400'
                        : 'border-slate-300 text-slate-500  hover:bg-slate-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="distribucion"
                      value={d}
                      checked={form.distribucion === d}
                      onChange={() => handleDistribucion(d)}
                      className="sr-only"
                    />
                    {d === 'normal' ? 'Normal' : 'Uniforme'}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-600  dark:text-gray-300">
                Modo de Ingreso de Costos
              </legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['bienes', 'Bienes (Precios y Rescate)'],
                    ['servicios', 'Servicios (Costos Marginales)'],
                  ] as [ModoIngreso, string][]
                ).map(([modo, etiqueta]) => (
                  <label
                    key={modo}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      form.modoIngreso === modo
                        ? 'border-blue-500 bg-blue-50 text-blue-600  dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-400'
                        : 'border-slate-300 text-slate-500  hover:bg-slate-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modoIngreso"
                      value={modo}
                      checked={form.modoIngreso === modo}
                      onChange={() => handleModoIngreso(modo)}
                      className="sr-only"
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>
            </fieldset>

            {CAMPOS_COMUNES.filter(
              (c) =>
                (c.solo === 'bienes' && form.modoIngreso === 'bienes') ||
                (c.solo === 'servicios' && form.modoIngreso === 'servicios') ||
                c.solo === 'comun' ||
                c.solo === form.distribucion
            ).map((campo) => (
                <Fragment key={campo.key}>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                      {campo.label}
                      {campo.simbolo ? (
                        <span className="text-slate-400  dark:text-gray-500">
                          <Formula tex={campo.simbolo} />
                        </span>
                      ) : null}
                    </span>
                    <input
                      type="number"
                      min={String(campo.min)}
                      step="any"
                      required
                      aria-label={campo.aria}
                      value={form[campo.key]}
                      onChange={handleChange(campo.key)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
                    />
                    <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                      {campo.unidadSufijo(unidad, moneda)}
                    </span>
                    {fieldErrors[campo.key] ? (
                      <span
                        role="alert"
                        className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400"
                      >
                        {fieldErrors[campo.key]}
                      </span>
                    ) : null}
                  </label>
                </Fragment>
              )
            )}

            <PrefsCard
              unidad={prefs.unidad}
              moneda={prefs.moneda}
              onUnidadChange={handlePrefChange('unidad')}
              onMonedaChange={handlePrefChange('moneda')}
            />

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

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">Resultados</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              title="Costo de subestimación"
              value={`${moneda} ${fmtDecimal(resultado?.costoSubestimacion ?? 0)}`}
              formula={form.modoIngreso === 'bienes' ? 'C_u = p - c' : 'C_u'}
              tone="blue"
              description="Utilidad perdida por cada unidad que falta (C_u)."
            />
            <KpiCard
              title="Costo de sobreestimación"
              value={`${moneda} ${fmtDecimal(resultado?.costoSobreestimacion ?? 0)}`}
              formula={form.modoIngreso === 'bienes' ? 'C_o = c - v' : 'C_o'}
              tone="slate"
              description="Pérdida por cada unidad no vendida (C_o)."
            />
            <KpiCard
              highlight
              title="Razón crítica (CSL)"
              value={fmtCSL(resultado?.nivelServicio ?? 0)}
              formula={'P(D \\le Q^*) = \\frac{C_u}{C_u + C_o}'}
              description="Probabilidad de que la demanda no supere la cantidad óptima."
            />
            {resultado?.distribucion === 'normal' ? (
              <KpiCard
                title="Valor Z"
                value={fmtDecimal(resultado.valorZ ?? 0, 4)}
                formula={'Z = \\Phi^{-1}(CSL)'}
                tone="blue"
                description="Cuantil de la normal estándar para la razón crítica."
              />
            ) : null}
            <KpiCard
              highlight
              large
              title="Cantidad óptima de pedido"
              value={`${fmtDecimal(resultado?.cantidadOptima ?? 0)} ${unidad}`}
              formula={
                resultado?.distribucion === 'normal'
                  ? 'Q^* = \\mu + Z\\,\\sigma'
                  : 'Q^* = a + \\mathrm{CSL}\\,(b - a)'
              }
              description="Cantidad a ordenar al inicio del período que minimiza el costo esperado."
            />
          </div>

          {resultado && resultado.puntos.length > 0 ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
                Distribución de la demanda y cantidad óptima
              </h3>
              <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
                El área a la izquierda de Q* (CSL) está sombreada: al subir el costo
                de escasez (C_u), la razón crítica crece y Q* se desplaza a la
                derecha comprando más área bajo la curva.
              </p>
              <CurvaDemandaChart
                puntos={resultado.puntos}
                cantidadOptima={resultado.cantidadOptima}
                nivelServicio={resultado.nivelServicio}
                distribucion={resultado.distribucion}
              />
            </div>
          ) : null}
        </section>
      </div>

      <Glossary
        abierto={glosarioAbierto}
        onClose={() => setGlosarioAbierto(false)}
        variables={VARIABLES_PERIODOUNICO}
      />
    </div>
  );
}