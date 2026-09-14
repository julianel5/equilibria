import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  calcularTeoriaColas,
  ApiError,
  type TeoriaColasResult,
  type TiempoConUnidadColas,
  type UnidadTiempoColas,
} from '../services/api';
import TeoriaColasTeoria from '../components/TeoriaColasTeoria';
import ProbabilidadEstadosChart from '../components/ProbabilidadEstadosChart';
import { VARIABLES_TEORIACOLAS } from '../data/glosario';
import Formula from '@shared/components/Formula';
import Glossary, { GlossaryButton } from '@shared/components/Glossary';
import KpiCard from '@shared/components/KpiCard';
import TabsPanel from '@shared/components/TabsPanel';

type Pestana = 'calculadora' | 'teoria';
type Modelo = 'MM1' | 'MMc';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

const MODELOS: { clave: Modelo; etiqueta: string; descripcion: string }[] = [
  { clave: 'MM1', etiqueta: 'Un Servidor (M/M/1)', descripcion: 'Un solo servidor procesa a todos los clientes.' },
  { clave: 'MMc', etiqueta: 'Múltiples Servidores (M/M/c)', descripcion: 'c servidores en paralelo y una única cola.' },
];

const UNIDADES_TIEMPO: { clave: UnidadTiempoColas; etiqueta: string }[] = [
  { clave: 'horas', etiqueta: 'Horas (por defecto)' },
  { clave: 'minutos', etiqueta: 'Minutos' },
  { clave: 'dias', etiqueta: 'Días' },
];

const ETIQUETA_UNIDAD: Record<UnidadTiempoColas, string> = {
  horas: 'horas',
  minutos: 'minutos',
  dias: 'días',
};

const TASA_INPUTS: Record<UnidadTiempoColas, { llegada: string; servicio: string }> = {
  horas: { llegada: 'Clientes por hora', servicio: 'Clientes atendidos por servidor y por hora' },
  minutos: { llegada: 'Clientes por minuto', servicio: 'Clientes atendidos por servidor y por minuto' },
  dias: { llegada: 'Clientes por día', servicio: 'Clientes atendidos por servidor y por día' },
};

interface FormState {
  tasaLlegada: string;
  tasaServicio: string;
  servidores: string;
}

const fmtDecimal = (n: number, max = 4) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

export default function TeoriaColasPage() {
  const [pestana, setPestana] = useState<Pestana>('calculadora');
  const [modelo, setModelo] = useState<Modelo>('MM1');
  const [unidadTiempo, setUnidadTiempo] = useState<UnidadTiempoColas>('horas');
  const [form, setForm] = useState<FormState>({
    tasaLlegada: '10',
    tasaServicio: '12',
    servidores: '3',
  });
  const [resultado, setResultado] = useState<TeoriaColasResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [glosarioAbierto, setGlosarioAbierto] = useState(false);

  const calcular = useCallback(async (datos: FormState, modo: Modelo, unidad: UnidadTiempoColas) => {
    setCargando(true);
    setErrors([]);
    setFieldErrors({});
    try {
      const res = await calcularTeoriaColas({
        tasaLlegada: Number(datos.tasaLlegada),
        tasaServicio: Number(datos.tasaServicio),
        // En M/M/1 el campo c se oculta y se fija internamente en 1.
        servidores: modo === 'MM1' ? 1 : Math.max(1, Math.floor(Number(datos.servidores)) || 1),
        unidadTiempo: unidad,
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

  const cambiarModelo = useCallback(
    (modo: Modelo) => {
      setModelo(modo);
      setFieldErrors({});
      setErrors([]);
      void calcular(form, modo, unidadTiempo);
    },
    [calcular, form, unidadTiempo]
  );

  const cambiarUnidad = useCallback(
    (unidad: UnidadTiempoColas) => {
      setUnidadTiempo(unidad);
      setFieldErrors({});
      setErrors([]);
      void calcular(form, modelo, unidad);
    },
    [calcular, form, modelo]
  );

  useEffect(() => {
    void calcular(form, modelo, unidadTiempo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void calcular(form, modelo, unidadTiempo);
  };

  const handleChange =
    (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (pestana === 'teoria') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TeoriaColasHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo de teoría de colas"
        />
        <TeoriaColasTeoria />
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_TEORIACOLAS}
        />
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TeoriaColasHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo de teoría de colas"
        />
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
          <p className="text-sm text-slate-500  dark:text-gray-400">Calculando las métricas de colas…</p>
        </div>
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_TEORIACOLAS}
        />
      </div>
    );
  }

  const esMM1 = resultado.modelo === 'MM1';
  const descripcionTiempo = (item: TiempoConUnidadColas) =>
    item.conversion
      ? `Equivale a ${item.conversion.texto} (conversión pedagógica para valores menores a 1 ${ETIQUETA_UNIDAD[unidadTiempo]}).`
      : `Medido en las unidades seleccionadas (${ETIQUETA_UNIDAD[unidadTiempo]}).`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TeoriaColasHeader />
        <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
      </div>
      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones del modelo de teoría de colas"
      />

      {/* Fila principal: formulario + KPIs */}
      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">Parámetros</h2>
          <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
            Elige el modelo y define las tasas de llegada y servicio.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Modelo de cola
              </legend>
              <div role="radiogroup" aria-label="Modelo de cola" className="grid gap-2 sm:grid-cols-1">
                {MODELOS.map((m) => (
                  <label
                    key={m.clave}
                    className={`block cursor-pointer rounded-md border px-3 py-2 transition-colors ${
                      modelo === m.clave
                        ? 'border-blue-400 bg-blue-50  dark:border-blue-500 dark:bg-blue-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300  dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modelo"
                      value={m.clave}
                      checked={modelo === m.clave}
                      onChange={() => cambiarModelo(m.clave)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-slate-700  dark:text-gray-100">
                      {m.etiqueta}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                      {m.descripcion}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600  dark:text-gray-300">
                Unidad de tiempo base
              </span>
              <select
                aria-label="Unidad de tiempo base"
                value={unidadTiempo}
                onChange={(e) => cambiarUnidad(e.target.value as UnidadTiempoColas)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
              >
                {UNIDADES_TIEMPO.map((u) => (
                  <option key={u.clave} value={u.clave}>
                    {u.etiqueta}
                  </option>
                ))}
              </select>
              <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                Unidad de tiempo con la que se expresan λ, μ y los tiempos W_q y W.
              </span>
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                Tasa de llegada
                <span className="text-slate-400  dark:text-gray-500">
                  <Formula tex="\lambda" />
                </span>
              </span>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                aria-label="Tasa de llegada"
                value={form.tasaLlegada}
                onChange={handleChange('tasaLlegada')}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
              />
              <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                {TASA_INPUTS[unidadTiempo].llegada}
              </span>
              {fieldErrors.tasaLlegada ? (
                <span
                  role="alert"
                  className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400"
                >
                  {fieldErrors.tasaLlegada}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                Tasa de servicio
                <span className="text-slate-400  dark:text-gray-500">
                  <Formula tex="\mu" />
                </span>
              </span>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                aria-label="Tasa de servicio"
                value={form.tasaServicio}
                onChange={handleChange('tasaServicio')}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
              />
              <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                {TASA_INPUTS[unidadTiempo].servicio}
              </span>
              {fieldErrors.tasaServicio ? (
                <span
                  role="alert"
                  className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400"
                >
                  {fieldErrors.tasaServicio}
                </span>
              ) : null}
            </label>

            {modelo === 'MMc' ? (
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                  Número de servidores
                  <span className="text-slate-400  dark:text-gray-500">
                    <Formula tex="c" />
                  </span>
                </span>
                <input
                  type="number"
                  min="2"
                  step="1"
                  required
                  aria-label="Número de servidores (c)"
                  value={form.servidores}
                  onChange={handleChange('servidores')}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
                />
                <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                  Servidores idénticos en paralelo
                </span>
                {fieldErrors.servidores ? (
                  <span
                    role="alert"
                    className="mt-1 block text-xs font-semibold text-red-600  dark:text-red-400"
                  >
                    {fieldErrors.servidores}
                  </span>
                ) : null}
              </label>
            ) : (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                Modelo <strong>M/M/1</strong>: el número de servidores se fija en{' '}
                <strong className="tabular-nums">c = 1</strong>.
              </p>
            )}

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

        {/* Métricas clave (KPIs) */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">
            Resultados — {esMM1 ? 'M/M/1' : 'M/M/c'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              highlight
              title="Factor de utilización"
              value={fmtDecimal(resultado.rho, 6)}
              formula={'\\rho = \\frac{\\lambda}{c \\mu}'}
              tone="blue"
              description="Fracción del tiempo que los servidores están ocupados en promedio. Debe ser menor a 1 para que el sistema sea estable."
            />
            <KpiCard
              title="Probabilidad de sistema vacío"
              value={fmtDecimal(resultado.p0, 6)}
              formula={esMM1 ? 'P_0 = 1 - \\rho' : 'P_0 = \\left[ \\sum_{k=0}^{c-1} \\frac{(c\\rho)^k}{k!} + \\frac{(c\\rho)^c}{c\\,!(1-\\rho)} \\right]^{-1}'}
              tone="slate"
              description="Probabilidad de encontrar el sistema sin clientes (Erlang C para múltiples servidores)."
            />
            <KpiCard
              title="Clientes en cola"
              value={`${fmtDecimal(resultado.lq)} clientes`}
              formula={esMM1 ? 'L_q = \\frac{\\lambda^2}{\\mu(\\mu - \\lambda)}' : 'L_q = \\frac{P_0 \\, (c\\rho)^c \\rho}{c\\,! \\, (1-\\rho)^2}'}
              tone="blue"
              description="Número promedio de clientes esperando a ser atendidos."
            />
            <KpiCard
              highlight
              large
              title="Clientes en el sistema"
              value={`${fmtDecimal(resultado.l)} clientes`}
              formula={'L = L_q + \\frac{\\lambda}{\\mu}'}
              tone="amber"
              description="Número promedio de clientes en cola más los que están en servicio. La métrica central del modelo."
            />
            <KpiCard
              title="Tiempo de espera en cola"
              value={resultado.unidadTiempo.wq.texto}
              formula={'W_q = \\frac{L_q}{\\lambda}'}
              tone="slate"
              description={descripcionTiempo(resultado.unidadTiempo.wq)}
            />
            <KpiCard
              title="Tiempo en el sistema"
              value={resultado.unidadTiempo.w.texto}
              formula={'W = W_q + \\frac{1}{\\mu}'}
              tone="slate"
              description={descripcionTiempo(resultado.unidadTiempo.w)}
            />
          </div>
          <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            Los tiempos <strong>W_q</strong> y <strong>W</strong> se expresan en las unidades
            seleccionadas (<strong>{ETIQUETA_UNIDAD[unidadTiempo]}</strong>). Si el valor es menor a 1
            se agrega su equivalente en minutos o segundos.
          </p>
        </section>
      </div>

      {/* Distribución de probabilidad de estados */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
          Distribución de Probabilidad P(n)
        </h2>
        <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
          Probabilidad de que haya exactamente n clientes en el sistema. Al ser estable, las
          barras decaen asintóticamente conforme crece la cola.
        </p>
        <ProbabilidadEstadosChart
          distribucion={resultado.distribucion}
          modelo={resultado.modelo}
          rho={resultado.rho}
          p0={resultado.p0}
        />
      </section>

      <Glossary
        abierto={glosarioAbierto}
        onClose={() => setGlosarioAbierto(false)}
        variables={VARIABLES_TEORIACOLAS}
      />
    </div>
  );
}

function TeoriaColasHeader() {
  return (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">Teoría de Colas</h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Modelos estocásticos M/M/1 y M/M/c con notación de Kendall.
      </p>
    </header>
  );
}