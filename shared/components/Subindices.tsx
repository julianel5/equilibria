import { Fragment, type ReactNode } from 'react';

// Símbolo seguido de "_x" o "_{xy}": C_u, W_q, r_ij, q_{min}, c_{B}.
const PATRON = /([A-Za-zλμρ])_(?:\{([^}]+)\}|([A-Za-z0-9]+))/g;

/**
 * Convierte la notación de subíndice de texto plano ("C_u", "W_q", "q_min")
 * en subíndices reales (<sub>) para textos que no pasan por KaTeX.
 */
export function conSubindices(texto: string): ReactNode {
  if (!texto.includes('_')) return texto;
  const partes: ReactNode[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(PATRON)) {
    const inicio = m.index ?? 0;
    partes.push(texto.slice(ultimo, inicio), m[1]);
    partes.push(<sub key={inicio}>{m[2] ?? m[3]}</sub>);
    ultimo = inicio + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return partes.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}
