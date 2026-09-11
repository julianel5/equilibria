import { useMemo } from 'react';
import katex from 'katex';

interface FormulaProps {
  tex: string;
  display?: boolean;
}

export default function Formula({ tex, display = false }: FormulaProps) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false }),
    [tex, display]
  );

  return (
    <span
      className={display ? 'block overflow-x-auto text-center' : 'inline-block'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}