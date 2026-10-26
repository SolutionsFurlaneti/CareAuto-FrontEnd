import type { ReactNode } from 'react';
import { dateTime } from '../../lib/format';
import { StatusBadge } from '../../ui';

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <StatusBadge
      status={active ? 'ATIVA' : 'ENCERRADA'}
      label={active ? 'Ativada' : 'Desativada'}
    />
  );
}

/** Aba Status: leitura do que está salvo, sem campos editáveis. */
export function StatusSummary({
  active,
  rows,
  updatedAt,
  updatedBy,
  children,
}: {
  active: boolean;
  rows: { label: string; value: ReactNode }[];
  updatedAt: string | null;
  updatedBy?: string | null;
  children?: ReactNode;
}) {
  return (
    <>
      <dl className="integration-status" data-testid="integration-status">
        <div>
          <dt>Situação</dt>
          <dd>
            <ActiveBadge active={active} />
          </dd>
        </div>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
        <div>
          <dt>Última alteração</dt>
          <dd>{updatedAt ? dateTime(updatedAt) : 'Nunca configurada'}</dd>
        </div>
        {updatedBy !== undefined && (
          <div>
            <dt>Alterado por</dt>
            <dd>{updatedBy || '—'}</dd>
          </div>
        )}
      </dl>
      {children}
    </>
  );
}
