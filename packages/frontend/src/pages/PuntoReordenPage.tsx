import { Fragment, useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  calcularDemandaProbabilistica,
  ApiError,
  type DemandaProbabilisticaResult,
} from '../services/api';
import PuntoReordenTeoria from '../components/PuntoReordenTeoria';
import { VARIABLES_DEMANDAPROBABILISTICA } from '../data/glosario';
import Formula from '@shared/components/Formula';
import Glossary, { GlossaryButton } from '@shared/components/Glossary';
import KpiCard from '@shared/components/KpiCard';
import NormalDistributionChart from '@shared/components/NormalDistributionChart';
import TabsPanel from '@shared/components/TabsPanel';

type Pestana = 'calculadora' | 'teoria';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

interface FormState {
  demandaPromedioDiaria: string;
  desviacionEstandarDemandaDiaria: string;
  tiempoEntrega: string;
  nivelServicio: string;
}

interface CampoFormulario {
  key: keyof FormState;
  label: string;
  simbolo?: string;
  min: number;
  max?: number;
  unidadSufijo: (u: string, _m: string) => string;
}

const FORM_METADATA: CampoFormulario[] = [
  { key: 'demandaPromedioDiaria', label: 'Demanda promedio diaria', simbolo: '\\bar{d}', min: 0.01, unidadSufijo: (u: string) => `${u} / día` },
  { key: 'desviacionEstandarDemandaDiaria', label: 'Desviación estándar diaria', simbolo: '\\sigma_d', min: 0.01, unidadSufijo: (u: string) => `${u} / día` },
  { key: 'tiempoEntrega', label: 'Tiempo de entrega (Lead Time)', simbolo: 'L', min: 0.01, unidadSufijo: () => 'días' },
  { key: 'nivelServicio', label: 'Nivel de servicio (CSL)', simbolo: 'CSL', min: 50.01, max: 99.98, unidadSufijo: () => '%' },
];

const fmtDecimal = (n: number, max = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

export default function PuntoReordenPage() {
  const [form, setForm] = useState<FormState>({
    demandaPromedioDiaria: '50',
    desviacionEstandarDemandaDiaria: '10',
    tiempoEntrega: '7',
    nivelServicio: '95',
  });
  const [resultado, setResultado] = useState<DemandaProbabilisticaResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [glosarioAbierto, setGlosarioAbierto] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('calculadora');

  const calcular = useCallback(async (datos: FormState) => {
    setCargando(true);
    setErrors([]);
    setFieldErrors({});
    try {
      const res = await calcularDemandaProbabilistica({
        demandaPromedioDiaria: Number(datos.demandaPromedioDiaria),
        desviacionEstandarDemandaDiaria: Number(datos.desviacionEstandarDemandaDiaria),
        tiempoEntrega: Number(datos.tiempoEntrega),
        nivelServicio: Number(datos.nivelServicio),
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

  if (pestana === 'teoria') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PuntoReordenHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo de punto de reorden"
        />
        <PuntoReordenTeoria />
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_DEMANDAPROBABILISTICA}
        />
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PuntoReordenHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo de punto de reorden"
        />
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
          <p className="text-sm text-slate-500  dark:text-gray-400">Calculando el punto de reorden…</p>
        </div>
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_DEMANDAPROBABILISTICA}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PuntoReordenHeader />
        <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
      </div>
      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones del modelo de punto de reorden"
      />

      {/* Fila principal: formulario + KPIs grandes */}
      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">Parámetros</h2>
          <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
            Ingresa la demanda probabilística y el nivel de servicio deseado.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {FORM_METADATA.map((campo) => (
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
                    max={campo.max !== undefined ? String(campo.max) : undefined}
                    step="any"
                    required
                    value={form[campo.key]}
                    onChange={handleChange(campo.key)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
                  />
                  <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                    {campo.unidadSufijo('unidades', 'USD')}
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
            ))}

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
          <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">Resultados</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              title="Valor Z"
              value={fmtDecimal(resultado.valorZ, 4)}
              formula={'Z = \\Phi^{-1}(CSL)'}
              tone="blue"
              description="Cuantil de la normal estándar asociado al nivel de servicio."
            />
            <KpiCard
              title="Demanda durante lead time"
              value={`${fmtDecimal(resultado.demandaDuranteEntrega)} unidades`}
              formula={'D_L = \\bar{d} \\cdot L'}
              tone="slate"
              description="Demanda esperada mientras el pedido está en tránsito."
            />
            <KpiCard
              highlight
              title="Stock de Seguridad"
              value={`${fmtDecimal(resultado.stockSeguridad)} unidades`}
              formula={'SS = Z \\cdot \\sigma_d \\sqrt{L}'}
              description="Inventario adicional que protege contra la variabilidad de la demanda."
            />
            <KpiCard
              highlight
              large
              title="Punto de Reorden"
              value={`${fmtDecimal(resultado.puntoReorden)} unidades`}
              formula={'ROP = D_L + SS'}
              description="Nivel de inventario en el que se debe emitir una nueva orden."
            />
          </div>
          <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            Desviación de la demanda durante el lead time:{' '}
            <strong className="tabular-nums text-slate-700  dark:text-gray-200">
              σ_L = {fmtDecimal(resultado.sigmaDuranteEntrega)} unidades
            </strong>{' '}
            (σ_d × √L).
          </p>
        </section>
      </div>

      {/* Gráfica de la distribución normal */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
          Distribución Normal Estándar
        </h2>
        <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
          Campana estándar con la región de nivel de servicio (zona azul, a la izquierda de Z) y
          el riesgo de faltante α = 1 − CSL (cola roja, a la derecha de Z). La línea punteada
          marca el valor Z del nivel de servicio elegido.
        </p>
        <NormalDistributionChart valorZ={resultado.valorZ} nivelServicio={resultado.desglose.nivelServicio} />
      </section>

      <Glossary
        abierto={glosarioAbierto}
        onClose={() => setGlosarioAbierto(false)}
        variables={VARIABLES_DEMANDAPROBABILISTICA}
      />
    </div>
  );
}

function PuntoReordenHeader() {
  return (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">
        Demanda Probabilística — Punto de Reorden
      </h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Punto de reorden y stock de seguridad con demanda variable y lead time constante.
      </p>
    </header>
  );
}