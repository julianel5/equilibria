import { Frac } from './fraction';

/** a es la parte real; b es el coeficiente simbólico de M. */
export interface TerminoM { a: Frac; b: Frac }

export const terminoM = (a = Frac.CERO, b = Frac.CERO): TerminoM => ({ a, b });
export const compararM = (x: TerminoM, y: TerminoM): number => x.b.cmp(y.b) || x.a.cmp(y.a);
export const signoM = (x: TerminoM): number => x.b.signo || x.a.signo;
export const sumarM = (x: TerminoM, y: TerminoM): TerminoM => terminoM(x.a.add(y.a), x.b.add(y.b));
export const restarM = (x: TerminoM, y: TerminoM): TerminoM => terminoM(x.a.sub(y.a), x.b.sub(y.b));
export const escalarM = (x: TerminoM, f: Frac): TerminoM => terminoM(x.a.mul(f), x.b.mul(f));
export const productoM = (x: TerminoM[], y: Frac[]): TerminoM =>
  x.reduce((acc, v, i) => y[i].esCero ? acc : sumarM(acc, escalarM(v, y[i])), terminoM());
