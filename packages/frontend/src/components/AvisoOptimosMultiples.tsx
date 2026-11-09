import Formula from '@shared/components/Formula';
import type { FraccionJSON, OptimosMultiplesDTO } from '../services/api';

/** "x_{2}" → "X_{2}" (decisión); holguras, excesos y artificiales quedan igual. */
const texVariable = (v: string) => v.replace(/^x_/, 'X_');

const celda = 'border border-blue-200 px-2 py-1 text-center tabular-nums dark:border-blue-900';

/**
 * Aviso de óptimos múltiples: explica por qué hay más de una solución óptima y
 * muestra otra solución con el mismo Z* (o la dirección en la que se puede
 * avanzar sin cambiarlo).
 */
export default function AvisoOptimosMultiples({
  om,
  solucion,
  valorObjetivo,
  etiquetas = [],
}: {
  om: OptimosMultiplesDTO;
  solucion: FraccionJSON[];
  valorObjetivo: FraccionJSON;
  etiquetas?: string[];
}) {
  if (!om.hay) return null;
  const nombre = (j: number) => etiquetas[j]?.trim();
  const listaVars = om.variables.map(texVariable).join(',\\; ');

  return (
    <section
      role="note"
      className="mt-6 rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-100"
    >
      <p className="font-bold">Óptimos múltiples: hay más de una solución óptima</p>
      <p className="mt-1">
        En el tableau óptimo, <Formula tex={listaVars} /> {om.variables.length === 1 ? 'está' : 'están'} fuera de la
        base con costo reducido <Formula tex={'\\bar c_j = 0'} />: puede{om.variables.length === 1 ? '' : 'n'} entrar a
        la base sin cambiar <Formula tex={`Z^{*} = ${valorObjetivo.tex}`} />.
      </p>

      {om.alternativa ? (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse bg-white/60 text-sm dark:bg-gray-900/40">
              <thead>
                <tr>
                  <th className={`${celda} text-left font-semibold`}>Variable</th>
                  <th className={`${celda} font-semibold`}>Solución encontrada</th>
                  <th className={`${celda} font-semibold`}>Otra solución óptima</th>
                </tr>
              </thead>
              <tbody>
                {solucion.map((f, j) => (
                  <tr key={j}>
                    <td className={`${celda} whitespace-nowrap text-left`}>
                      <Formula tex={`X_{${j + 1}}`} />
                      {nombre(j) ? <span className="ml-2 text-xs">{nombre(j)}</span> : null}
                    </td>
                    <td className={celda}>
                      <Formula tex={f.tex} />
                    </td>
                    <td className={`${celda} font-semibold`}>
                      <Formula tex={om.alternativa![j].tex} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs">
            Ambas dan el mismo <Formula tex={'Z^{*}'} />, y también cualquier punto del segmento entre ellas:{' '}
            <Formula tex={"\\lambda\\, x^{*} + (1-\\lambda)\\, x', \\; 0 \\le \\lambda \\le 1"} />. El problema tiene
            infinitas soluciones óptimas; elegir entre ellas depende de criterios que el modelo no incluye.
          </p>
        </>
      ) : om.rayo ? (
        <p className="mt-2">
          Además, la variable puede crecer sin límite: toda solución{' '}
          <Formula tex={`x^{*} + t\\,d,\\; t \\ge 0`} /> con{' '}
          <Formula tex={`d = (${om.rayo.map((f) => f.tex).join(',\\; ')})`} /> es óptima. El conjunto de soluciones
          óptimas no está acotado, aunque <Formula tex={'Z^{*}'} /> sí es finito.
        </p>
      ) : null}
    </section>
  );
}
