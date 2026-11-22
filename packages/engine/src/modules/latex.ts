/** Escapa texto literal antes de interpolarlo en un bloque \text{...}. */
export function escapeLatexText(text: string): string {
  return text.replace(/[\\_%$&#{}^~]/g, (char) => {
    if (char === '\\') return '\\textbackslash{}';
    if (char === '^') return '\\textasciicircum{}';
    if (char === '~') return '\\textasciitilde{}';
    return `\\${char}`;
  });
}
