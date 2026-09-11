import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { calcularEOQ, type EOQResult } from '../services/api';
import CostChart, { type PuntoCosto } from '../components/CostChart';
import Formula from '../components/Formula';
import Glossary from '../components/Glossary';
import KpiCard from '../components/KpiCard';
import PrefsCard from '../components/PrefsCard';

interface FormState {
  demandaAnual: string;
  costoOrdenar: string;
  costoMantener: string;
  costoUnitario: string;
}

interface PrefsState {
  unidad: string;
  moneda: string;
}

const FORM_METADATA = [
  { key: 'demandaAnual', label: 'Demanda anual', simbolo: 'D', unidadSufijo: (u: string, _m: string) => `${u} / año` },
  { key: 'costoOrdenar', label: 'Costo de ordenar', simbolo: 'S', unidadSufijo: (_u: string, m: string) => `${m} / orden` },
  { key: 'costoMantener', label: 'Costo de mantener', simbolo: 'H', unidadSufijo: (u: string, m: string) => `${m} / ${u}-año` },
  { key: 'costoUnitario', label: 'Costo unitario (opcional)', simbolo: 'C', unidadSufijo: (u: string, m: string) => `${m} / ${u}` },
] as const;

const fmtMoneda = (n: number, moneda: string) =>
  `${moneda} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDecimal = (n: number, max = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

export default function EOQPage() {
  const [form, setForm] = useState<FormState>({
    demandaAnual: '10000',
    costoOrdenar: '20',
    costoMantener: '5',
    costoUnitario: '10',
  });
  const [prefs, setPrefs] = useState<PrefsState>({
    unidad: 'unidades',
    moneda: 'USD',
  });
  const [resultado, setResultado] = useState<EOQResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glosarioAbierto, setGlosarioAbierto] = useState(false);

  const unidad = prefs.unidad.trim() || 'unidades';
  const moneda = prefs.moneda.trim() || 'USD';

  const calcular = useCallback(async (datos: FormState) => {
    setCargando(true);
    setError(null);
    try {
      const res = await calcularEOQ({
        demandaAnual: Number(datos.demandaAnual),
        costoOrdenar: Number(datos.costoOrdenar),
        costoMantener: Number(datos.costoMantener),
        costoUnitario: Number(datos.costoUnitario) || undefined,
      });
      setResultado(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
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

  // Curva de costos: solo costos relevantes (se excluye D·C, el costo del producto).
  // El punto mínimo (Q*) y su costo se obtienen de la API; las curvas se
  // reconstruyen en el cliente con las mismas fórmulas EOQ.
  const curva: PuntoCosto[] = useMemo(() => {
    if (!resultado) return [];

    const { demandaAnual: D, costoFijoOrden: S, costoHoldingUnitario: H } =
      resultado.desglose;
    const qMin = Math.max(1, Math.round(resultado.cantidadOptima * 0.25));
    const qMax = Math.ceil(resultado.cantidadOptima * 1.75);
    const paso = (qMax - qMin) / 80;

    const puntos: PuntoCosto[] = [];
    for (let i = 0; i <= 80; i++) {
      const Q = qMin + paso * i;
      const ordenar = (D / Q) * S;
      const mantener = (Q / 2) * H;
      puntos.push({
        cantidad: Math.round(Q),
        ordenar,
        mantener,
        total: ordenar + mantener,
      });
    }
    return puntos;
  }, [resultado]);

  if (!resultado) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <EOQHeader />
          <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
        </div>
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md  dark:border-gray-700 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
          <p className="text-sm text-slate-500  dark:text-gray-400">Calculando EOQ…</p>
        </div>
        <Glossary abierto={glosarioAbierto} onClose={() => setGlosarioAbierto(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EOQHeader />
        <GlossaryButton onClick={() => setGlosarioAbierto(true)} />
      </div>

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
            Ingresa la demanda y los costos del modelo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {FORM_METADATA.map((campo) => (
              <label key={campo.key} className="block">
                <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600  dark:text-gray-300">
                  {campo.label}
                  <span className="text-slate-400  dark:text-gray-500">
                    <Formula tex={campo.simbolo} />
                  </span>
                </span>
                <input
                  type="number"
                  min={campo.key === 'costoUnitario' ? '0' : '0.01'}
                  step="any"
                  required={campo.key !== 'costoUnitario'}
                  value={form[campo.key]}
                  onChange={handleChange(campo.key)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
                />
                <span className="mt-0.5 block text-xs text-slate-400  dark:text-gray-500">
                  {campo.unidadSufijo(unidad, moneda)}
                </span>
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

          {error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600  dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </section>

        {/* Métricas clave (KPIs grandes) */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700  dark:text-gray-100">Resultados</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              large
              label="Cantidad óptima de pedido"
              value={`${fmtDecimal(resultado.cantidadOptima)} ${unidad}`}
              formula={'Q^* = \\sqrt{ \\frac{2DS}{H} }'}
              tone="blue"
              descripcion="Punto en el que se equilibran el costo de ordenar y el costo de mantener."
            />
            <KpiCard
              large
              label="Costo total anual"
              value={fmtMoneda(resultado.costoTotalAnual, moneda)}
              formula={'TC = \\frac{D}{Q^*}S + \\frac{Q^*}{2}H + DC'}
              tone="emerald"
              descripcion="Suma anual de los costos de ordenar, mantener y comprar el inventario."
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
          Métricas derivadas del punto óptimo Q*.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="Número de pedidos"
            value={`${fmtDecimal(resultado.numeroPedidos)} / año`}
            formula={'N = \\frac{D}{Q^*}'}
            tone="slate"
            descripcion="Órdenes emitidas al año en el punto óptimo."
          />
          <KpiCard
            label="Ciclo de reposición"
            value={`${fmtDecimal(resultado.cicloReposicion)} días`}
            formula={'T = \\frac{365}{N}'}
            tone="slate"
            descripcion="Días entre una orden y la siguiente."
          />
          <KpiCard
            label="Inventario promedio"
            value={`${fmtDecimal(resultado.inventarioPromedio)} ${unidad}`}
            formula={'I_{media} = \\frac{Q^*}{2}'}
            tone="slate"
            descripcion="Nivel medio de stock a lo largo del ciclo."
          />
          <KpiCard
            label="Costo anual de ordenar"
            value={fmtMoneda(resultado.costoOrdenar, moneda)}
            formula={'C_o = \\frac{D}{Q^*} \\cdot S'}
            tone="amber"
            descripcion="Costo fijo multiplicado por los pedidos del año."
          />
          <KpiCard
            label="Costo anual de mantener"
            value={fmtMoneda(resultado.costoMantener, moneda)}
            formula={'C_h = \\frac{Q^*}{2} \\cdot H'}
            tone="amber"
            descripcion="Costo de holding aplicado al inventario promedio."
          />
          <KpiCard
            label="Costo de adquisición"
            value={fmtMoneda(resultado.costoAdquisicion, moneda)}
            formula={'C_c = D \\cdot C'}
            tone="slate"
            descripcion="Costo de comprar la demanda anual al precio unitario."
          />
        </div>
      </section>

      {/* Gráfica interactiva */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md  dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-slate-700  dark:text-gray-100">
          Comportamiento de los costos
        </h2>
        <p className="mb-4 text-sm text-slate-400  dark:text-gray-500">
          Variación de los costos según la cantidad pedida Q. El gráfico muestra
          solo los costos relevantes (excluye el costo del producto D·C). La línea
          azul punteada marca Q*, el punto más bajo del Costo Relevante Total
          (curva en forma de U), donde se cruzan el costo de ordenar y el de mantener.
        </p>
        <CostChart
          data={curva}
          qOptimo={resultado.cantidadOptima}
          costoTotalOptimo={resultado.costoOrdenar + resultado.costoMantener}
          unidad={unidad}
          moneda={moneda}
        />
      </section>
      <Glossary abierto={glosarioAbierto} onClose={() => setGlosarioAbierto(false)} />
    </div>
  );
}

function GlossaryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm  hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
      aria-label="Abrir glosario de nomenclatura"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.471-.75.451-1.451 1.066-1.451 1.798v.065M12 19h.01" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
      </svg>
      Glosario
    </button>
  );
}

function EOQHeader() {
  return (
    <header>
      <h1 className="text-2xl font-bold text-slate-800  dark:text-gray-100">
        EOQ — Cantidad Económica de Pedido
      </h1>
      <p className="mt-1 text-sm text-slate-500  dark:text-gray-400">
        Modelo clásico de inventario con demanda constante y sin faltantes.
      </p>
    </header>
  );
}