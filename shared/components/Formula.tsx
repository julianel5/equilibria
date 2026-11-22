import { useMemo } from 'react';
import katex from 'katex';

interface FormulaProps {
  tex: string;
  display?: boolean;
}

export default function Formula({ tex, display = false }: FormulaProps) {
  const html = useMemo(
    () => katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      // Solo se confía en las dos marcas semánticas de los pivotes del motor.
      trust: (ctx) => ctx.command === '\\htmlClass'
        && (ctx.class === 'math-entrante' || ctx.class === 'math-pivote'),
      strict: (code) => code === 'htmlExtension' ? 'ignore' : 'warn',
    }),
    [tex, display]
  );

  return (
    <span
      className={display
        ? 'math-display block max-w-full overflow-x-auto text-center'
        : 'inline-block max-w-full overflow-x-auto align-middle'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
