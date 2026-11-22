import { useState, type ReactNode } from 'react';
import Glossary, { GlossaryButton, type VariableDef } from '@shared/components/Glossary';

interface CabeceraConGlosarioProps {
  children: ReactNode;
  variables: VariableDef[];
  className?: string;
}

export default function CabeceraConGlosario({ children, variables, className }: CabeceraConGlosarioProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <header className={className}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>{children}</div>
          <GlossaryButton onClick={() => setAbierto(true)} />
        </div>
      </header>
      <Glossary abierto={abierto} onClose={() => setAbierto(false)} variables={variables} />
    </>
  );
}
