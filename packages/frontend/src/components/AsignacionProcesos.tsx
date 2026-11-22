import Formula from '@shared/components/Formula';
import type { AsignacionResultado, MatrizAsignacionDTO, PasoAsignacionDTO } from '../services/api';

const CELDA = 'border border-slate-300 px-3 py-2 text-center tabular-nums dark:border-slate-500';

function TablaTraza({ paso, m, n }: { paso: PasoAsignacionDTO; m: number; n: number }) {
  const filas = new Set(paso.tipo === 'cobertura' ? paso.filas : []);
  const columnas = new Set(paso.tipo === 'cobertura' ? paso.columnas : []);
  const asignadas = new Set(paso.tipo === 'asignacion' ? paso.celdas.map(({ i, j }) => `${i}:${j}`) : []);
  const matriz: MatrizAsignacionDTO = paso.matriz;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={CELDA} scope="col">Origen / destino</th>
            {matriz[0].map((_, j) => (
              <th key={j} scope="col" className={`${CELDA} ${columnas.has(j) ? 'bg-violet-100 dark:bg-violet-500/20' : ''}`}>
                <Formula tex={`D_{${j + 1}}`} />
                {j >= n && <span className="block text-xs font-normal">Ficticio</span>}
                {columnas.has(j) && <span className="block text-xs">Cubierta</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.map((fila, i) => (
            <tr key={i}>
              <th scope="row" className={`${CELDA} ${filas.has(i) ? 'bg-blue-100 dark:bg-blue-500/20' : ''}`}>
                <Formula tex={`O_{${i + 1}}`} />
                {i >= m && <span className="block text-xs font-normal">Ficticio</span>}
                {filas.has(i) && <span className="block text-xs">Cubierta</span>}
              </th>
              {fila.map((valor, j) => {
                const asignada = asignadas.has(`${i}:${j}`);
                const cubierta = filas.has(i) && columnas.has(j)
                  ? 'bg-fuchsia-100 dark:bg-fuchsia-500/25'
                  : filas.has(i) ? 'bg-blue-100 dark:bg-blue-500/20'
                    : columnas.has(j) ? 'bg-violet-100 dark:bg-violet-500/20' : '';
                return (
                  <td key={j} className={`${CELDA} ${asignada ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-200' : cubierta}`}>
                    <Formula tex={valor?.tex ?? '\\infty'} />
                    {asignada && <span className="ml-1" aria-label="Asignada">✓</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TITULOS: Record<PasoAsignacionDTO['tipo'], string> = {
  original: 'Paso 0 · Matriz original',
  conversion: 'Paso 0 · Conversión a minimización',
  balanceo: 'Paso 0 · Matriz balanceada',
  filas: 'Paso 1 · Reducción por filas',
  columnas: 'Paso 2 · Reducción por columnas',
  cobertura: 'Paso 3 · Recubrimiento mínimo de ceros',
  ajuste: 'Paso 4 · Ajuste de la matriz',
  asignacion: 'Paso 5 · Asignación óptima',
  infactible: 'Problema infactible',
};

function DetallePaso({ paso, orden }: { paso: PasoAsignacionDTO; orden: number }) {
  switch (paso.tipo) {
    case 'conversion':
      return paso.maximo
        ? <p>Se reemplaza cada beneficio real permitido por <Formula tex={`C_{\\max}-c_{ij},\\quad C_{\\max}=${paso.maximo.tex}`} />.</p>
        : <p>No hay celdas reales permitidas para calcular el máximo.</p>;
    case 'balanceo':
      return <p>Se completó una matriz de {orden} × {orden} con filas o columnas ficticias de costo cero.</p>;
    case 'filas':
    case 'columnas':
      return (
        <ul className="flex flex-wrap gap-2" aria-label="Mínimos restados">
          {paso.minimos.map((valor, i) => (
            <li key={i} className="rounded bg-slate-100 px-2 py-1 dark:bg-gray-700">
              {paso.tipo === 'filas' ? 'Fila' : 'Columna'} {i + 1}: <Formula tex={valor.tex} />
            </li>
          ))}
        </ul>
      );
    case 'cobertura': {
      const lineas = paso.filas.length + paso.columnas.length;
      return (
        <>
          <p>Prueba {paso.iteracion}: {lineas} de {orden} líneas necesarias. {lineas === orden ? 'Ya hay una asignación completa de ceros.' : 'Hace falta ajustar la matriz.'}</p>
          <ul className="flex flex-wrap gap-2 text-xs">
            <li className="rounded bg-blue-100 px-2 py-1 dark:bg-blue-500/20">Filas: {paso.filas.map(i => i + 1).join(', ') || 'ninguna'}</li>
            <li className="rounded bg-violet-100 px-2 py-1 dark:bg-violet-500/20">Columnas: {paso.columnas.map(j => j + 1).join(', ') || 'ninguna'}</li>
            <li className="rounded bg-fuchsia-100 px-2 py-1 dark:bg-fuchsia-500/25">Intersección: dos líneas</li>
          </ul>
        </>
      );
    }
    case 'ajuste':
      return <p>Ajuste {paso.iteracion}: se resta <Formula tex={`k=${paso.minimo.tex}`} /> a las celdas no cubiertas, se suma en las intersecciones y se mantienen las celdas cubiertas por una sola línea.</p>;
    case 'asignacion':
      return <p>Los ceros en verde forman una selección sin repetir fila ni columna. El valor óptimo se calcula con la matriz original.</p>;
    case 'infactible':
      return <p>Las celdas permitidas solo admiten {paso.cardinalidad} de {orden} asignaciones sin repetir fila ni columna.</p>;
    default:
      return <p>Las asignaciones prohibidas aparecen como <Formula tex="\infty" /> y no participan en el cálculo.</p>;
  }
}

export default function AsignacionProcesos({ resultado }: { resultado: AsignacionResultado }) {
  const sumaOriginal = resultado.asignaciones.filter(celda => !celda.ficticia)
    .map(({ valor }) => `\\left(${valor.tex}\\right)`).join(' + ');

  return (
    <section className="space-y-4" aria-label="Traza del algoritmo húngaro">
      {resultado.pasos.map((paso, index) => (
        <article key={index} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
          <h3 className="font-semibold">{TITULOS[paso.tipo]}</h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <DetallePaso paso={paso} orden={Math.max(resultado.m, resultado.n)} />
          </div>
          <TablaTraza paso={paso} m={resultado.m} n={resultado.n} />
          {paso.tipo === 'asignacion' && resultado.valorObjetivo && (
            <div className="overflow-x-auto">
              <Formula display tex={`Z^* = ${sumaOriginal} = ${resultado.valorObjetivo.tex}`} />
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
