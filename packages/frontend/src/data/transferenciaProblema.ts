/**
 * Traspaso de un problema de PL entre páginas (Simplex → Gran M → Análisis de
 * Sensibilidad) mediante el parámetro ?data= de la URL.
 *
 * Se codifica como JSON → UTF-8 → base64, para que los nombres de variables
 * con tildes, ñ o símbolos (×, ·) viajen sin errores.
 */
import type { MetodoSimplex, ObjetivoSimplex } from '../services/api';

export type OperadorPL = 'LE' | 'GE' | 'EQ';

export interface FilaTransferida {
  id: string;
  operador: OperadorPL;
  b: string;
  coeficientes: string[];
}

export interface ProblemaTransferido {
  metodo?: MetodoSimplex;
  objetivo: ObjetivoSimplex;
  n: string | number;
  coefsObj: string[];
  filas: FilaTransferida[];
  /** Nombre de cada variable de decisión (opcional, '' si no tiene). */
  etiquetas?: string[];
}

function aBase64Utf8(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario);
}

function desdeBase64Utf8(base64: string): string {
  const binario = atob(base64);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Valor listo para poner en la URL: `?data=${codificarProblema(p)}`. */
export const codificarProblema = (p: ProblemaTransferido): string => encodeURIComponent(aBase64Utf8(JSON.stringify(p)));

/** Lee el valor de ?data= (ya decodificado por URLSearchParams). */
export const decodificarProblema = (data: string): ProblemaTransferido =>
  JSON.parse(desdeBase64Utf8(data)) as ProblemaTransferido;

/** Ajusta la lista de nombres a n variables (conserva los existentes por posición). */
export const ajustarEtiquetas = (etiquetas: string[] | undefined, n: number): string[] =>
  Array.from({ length: n }, (_, j) => etiquetas?.[j] ?? '');
