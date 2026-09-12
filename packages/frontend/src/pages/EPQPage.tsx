import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { calcularEPQ, ApiError, type EPQResult } from '../services/api';
import CostChart, { type PuntoCosto } from '@shared/components/CostChart';
import EPQTeoria from '../components/EPQTeoria';
import { VARIABLES_EPQ } from '../data/glosario';
import Formula from '@shared/components/Formula';
import Glossary, { GlossaryButton } from '@shared/components/Glossary';
import KpiCard from '@shared/components/KpiCard';
import PrefsCard from '@shared/components/PrefsCard';
import TabsPanel from '@shared/components/TabsPanel';

type Pestana = 'calculadora' | 'teoria';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'calculadora', etiqueta: 'Calculadora' },
  { clave: 'teoria', etiqueta: 'Teoría y Supuestos' },
];

interface FormState {
  demandaAnual: string;
  tasaProduccion: string;
  costoOrdenar: string;
  costoMantener: string;
  costoUnitario: string;
  diasLaborables: string;
  leadTime: string;
}

interface PrefsState {
  unidad: string;
  moneda: string;
}

interface CampoFormulario {
  key: keyof FormState;
  label: string;
  simbolo?: string;
  opcional?: boolean;
  placeholder?: string;
  min: number;
  unidadSufijo: (u: string, m: string) => string;
}

const FORM_METADATA: CampoFormulario[] = [
  { key: 'demandaAnual', label: 'Demanda anual', simbolo: 'D', min: 0.01, unidadSufijo: (u: string, _m: string) => `${u} / año` },
  { key: 'tasaProduccion', label: 'Tasa de producción (P)', simbolo: 'P', min: 0.01, unidadSufijo: (u: string, _m: string) => `${u} / año` },
  { key: 'costoOrdenar', label: 'Costo de preparación', simbolo: 'S', min: 0.01, unidadSufijo: (_u: string, m: string) => `${m} / corrida` },
  { key: 'costoMantener', label: 'Costo de mantener', simbolo: 'H', min: 0.01, unidadSufijo: (u: string, m: string) => `${m} / ${u}-año` },
  { key: 'costoUnitario', label: 'Costo unitario (opcional)', simbolo: 'C', opcional: true, min: 0, unidadSufijo: (u: string, m: string) => `${m} / ${u}` },
  { key: 'diasLaborables', label: 'Días laborables al año', min: 1, unidadSufijo: () => 'días al año' },
  { key: 'leadTime', label: 'Tiempo de entrega (L)', simbolo: 'L', opcional: true, placeholder: 'ej. días que tarda el proveedor', min: 0, unidadSufijo: () => 'días' },
];

const fmtMoneda = (n: number, moneda: string) =>
  `${moneda} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDecimal = (n: number, max = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

export default function EPQPage() {
  const [form, setForm] = useState<FormState>({
    demandaAnual: '10000',
    tasaProduccion: '20000',
    costoOrdenar: '20',
    costoMantener: '5',
    costoUnitario: '10',
    diasLaborables: '365',
    leadTime: '',
  });
  const [prefs, setPrefs] = useState<PrefsState>({
    unidad: 'unidades',
    moneda: 'USD',
  });
  const [resultado, setResultado] = useState<EPQResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [glosarioAbierto, setGlosarioAbierto] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('calculadora');

  const unidad = prefs.unidad.trim() || 'unidades';
  const moneda = prefs.moneda.trim() || 'USD';

  // El Punto de Reorden solo aplica si el usuario definió un tiempo de entrega (L > 0)
  const leadTimeNum = Number(form.leadTime);
  const mostrarROP = Number.isFinite(leadTimeNum) && leadTimeNum > 0;

  const calcular = useCallback(async (datos: FormState) => {
    setCargando(true);
    setErrors([]);
    setFieldErrors({});
    try {
      const diasLaborables = Number(datos.diasLaborables);
      const leadTime = Number(datos.leadTime);
      const res = await calcularEPQ({
        demandaAnual: Number(datos.demandaAnual),
        tasaProduccion: Number(datos.tasaProduccion),
        costoOrdenar: Number(datos.costoOrdenar),
        costoMantener: Number(datos.costoMantener),
        costoUnitario: Number(datos.costoUnitario) || undefined,
        diasLaborables:
          Number.isFinite(diasLaborables) && diasLaborables > 0 ? diasLaborables : undefined,
        leadTime:
          datos.leadTime.trim() !== '' && Number.isFinite(leadTime) && leadTime >= 0
            ? leadTime
            : undefined,
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

  const handlePrefChange =
    (key: keyof PrefsState) => (e: ChangeEvent<HTMLInputElement>) =>
      setPrefs((prev) => ({ ...prev, [key]: e.target.value }));

  // Curva de costos: el costo de mantener se contrae por el factor (1 - D/P)
  // porque el inventario se acumula gradualmente durante la producción.
  const curva: PuntoCosto[] = useMemo(() => {
    if (!resultado) return [];

    const { demandaAnual: D, costoFijoOrden: S, costoHoldingUnitario: H } = resultado.desglose;
    const factor = resultado.desglose.factorProduccion;
    const qMin = Math.max(1, Math.round(resultado.cantidadOptima * 0.25));
    const qMax = Math.ceil(resultado.cantidadOptima * 1.75);
    const paso = (qMax - qMin) / 80;

    const puntos: PuntoCosto[] = [];
    for (let i = 0; i <= 80; i++) {
      const Q = qMin + paso * i;
      const ordenar = (D / Q) * S;
      const mantener = (Q / 2) * H * factor;
      puntos.push({
        cantidad: Math.round(Q),
        ordenar,
        mantener,
        total: ordenar + mantener,
      });
    }
    return puntos;
  }, [resultado]);

  if (pestana === 'teoria') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <EPQHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo EPQ"
        />
        <EPQTeoria />
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_EPQ}
        />
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <EPQHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <TabsPanel
          pestanas={PESTANAS}
          activa={pestana}
          onCambio={(c) => setPestana(c as Pestana)}
          ariaLabel="Secciones del modelo EPQ"
        />
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
          <p className="text-sm text-slate-500  dark:text-gray-400">Calculando EPQ…</p>
        </div>
        <Glossary
          abierto={glosarioAbierto}
          onClose={() => setGlosarioAbierto(false)}
          variables={VARIABLES_EPQ}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EPQHeader />
        <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
      </div>
      <TabsPanel
        pestanas={PESTANAS}
        activa={pestana}
        onCambio={(c) => setPestana(c as Pestana)}
        ariaLabel="Secciones del modelo EPQ"
      />

      {/* Preferencias de visualización (unidad y moneda) */}
      <PrefsCard
        unidad={prefs.unidad}
        moneda={prefs.moneda}
        onUnidadChange={handlePrefChange('unidad')}
        onMonedaChange={handlePrefChange('moneda')}
      />

      {/* Fila principal: formulario + KPIs grandes */}
      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">Parámetros</h2>
          <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
            Ingresa la demanda, la tasa de producción y los costos del modelo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {FORM_METADATA.map((campo) => (
              <label key={campo.key} className="block">
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
                  placeholder={campo.placeholder}
                  required={!campo.opcional}
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

        {/* Métricas clave (KPIs grandes) */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">Resultados</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              large
              title="Lote óptimo de producción"
              value={`${fmtDecimal(resultado.cantidadOptima)} ${unidad}`}
              formula={'Q^* = \\sqrt{ \\frac{2DS}{H\\left(1-\\frac{D}{P}\\right)} }'}
              tone="blue"
              description="Tamaño de lote que minimiza los costos relevantes considerando el reabastecimiento gradual."
            />
            <KpiCard
              large
              title="Costo total anual"
              value={fmtMoneda(resultado.costoTotalAnual, moneda)}
              formula={'TC = \\frac{D}{Q^*}S + \\frac{Q^*}{2}H\\left(1-\\frac{D}{P}\\right) + DC'}
              tone="emerald"
              description="Suma anual de los costos de preparación, mantener y comprar el inventario."
            />
          </div>
        </section>
      </div>

      {/* Métricas secundarias */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-1 text-lg font-semibold text-slate-700  dark:text-gray-100">
          Desglose de operación y costos
        </h2>
        <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
          Métricas derivadas del lote óptimo Q*, con reabastecimiento a tasa P.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            title="Corridas de producción"
            value={`${fmtDecimal(resultado.numeroProducciones)} / año`}
            formula={'N = \\frac{D}{Q^*}'}
            tone="slate"
            description="Veces que se arranca la línea de producción al año."
          />
          <KpiCard
            title="Ciclo de producción"
            value={`${fmtDecimal(resultado.cicloProduccion)} días`}
            formula={'T = \\frac{\\text{días laborables}}{N}'}
            tone="slate"
            description="Días de operación entre el inicio de una corrida y la siguiente."
          />
          <KpiCard
            title="Inventario máximo"
            value={`${fmtDecimal(resultado.inventarioMaximo)} ${unidad}`}
            formula={'I_{max} = Q^* \\left(1 - \\frac{D}{P}\\right)'}
            tone="slate"
            description="Nivel máximo de inventario alcanzado al finalizar la producción del lote."
          />
          <KpiCard
            title="Costo anual de preparación"
            value={fmtMoneda(resultado.costoOrdenar, moneda)}
            formula={'C_o = \\frac{D}{Q^*} \\cdot S'}
            tone="amber"
            description="Costo de preparación multiplicado por las corridas del año."
          />
          <KpiCard
            title="Costo anual de mantener"
            value={fmtMoneda(resultado.costoMantener, moneda)}
            formula={'C_h = \\frac{I_{max}}{2} \\cdot H'}
            tone="amber"
            description="Costo de holding aplicado al inventario máximo acumulado."
          />
          <KpiCard
            title="Costo de adquisición"
            value={fmtMoneda(resultado.costoAdquisicion, moneda)}
            formula={'C_c = D \\cdot C'}
            tone="slate"
            description="Costo de fabricar o comprar la demanda anual al costo unitario."
          />
          {mostrarROP ? (
            <KpiCard
              title="Punto de Reorden"
              value={`${fmtDecimal(resultado.puntoReorden)} ${unidad}`}
              formula={'ROP = d \\cdot L'}
              tone="blue"
              description="Nivel de inventario en el que se debe iniciar una nueva corrida."
            />
          ) : null}
        </div>
      </section>

      {/* Gráfica interactiva */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
          Comportamiento de los costos
        </h2>
        <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
          Variación de los costos según el lote producido Q. El costo de mantener usa
          el factor (1 − D/P) porque el inventario se acumula gradualmente. La línea
          azul punteada marca Q*, el punto más bajo del Costo Relevante Total
          (curva en forma de U), donde se cruzan el costo de preparación y el de mantener.
        </p>
        <CostChart
          data={curva}
          optimalQ={resultado.cantidadOptima}
          costoTotalOptimo={resultado.costoOrdenar + resultado.costoMantener}
          unidad={unidad}
          moneda={moneda}
          formulaMantener={'\\frac{Q}{2}H\\left(1-\\frac{D}{P}\\right)'}
          formulaTotal={'\\frac{D}{Q}S + \\frac{Q}{2}H\\left(1-\\frac{D}{P}\\right)'}
        />
      </section>
      <Glossary
        abierto={glosarioAbierto}
        onClose={() => setGlosarioAbierto(false)}
        variables={VARIABLES_EPQ}
      />
    </div>
  );
}

function EPQHeader() {
  return (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">
        EPQ — Lote Económico de Producción
      </h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Modelo de inventario con reabastecimiento gradual a una tasa de producción finita.
      </p>
    </header>
  );
}