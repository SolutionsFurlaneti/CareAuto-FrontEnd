import { translate, useI18n } from '../../i18n';
import { useState } from 'react';
import type { Consulta } from '../../lib/types';
import { useRecords } from '../shared/hooks';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { QueryError } from '../../components/QueryError';
import { Skeleton, EmptyState, StatusBadge } from '../../ui';
import { dateTime } from '../../lib/format';
export function ConsultationsPage() {
  useI18n();
  const [page, setPage] = useState(1);
  const query = useRecords<Consulta>('consultas-placa', page);
  return (
    <>
      <PageHeader
        eyebrow={translate('OPERAÇÃO')}
        title={translate('Consultas de placa')}
        description={translate('Histórico das consultas já registradas no sistema.')}
      />
      <p className="notice">
        {translate(
          'A consulta em um provedor externo ainda não está disponível. Nenhuma nova consulta é realizada nesta tela.',
        )}
      </p>
      <section className="panel">
        {query.isPending ? (
          <Skeleton />
        ) : query.isError ? (
          <QueryError
            error={query.error}
            what={translate('as consultas')}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length ? (
          <DataTable
            rows={query.data.items}
            rowKey={(r) => r.consultaId}
            testId="consultations-table"
            caption={translate('Histórico de consultas')}
            columns={[
              { label: 'Placa', render: (r) => <span className="plate">{r.placa}</span> },
              { label: 'Data', render: (r) => dateTime(r.consultadoEm) },
              {
                label: 'Resultado',
                render: (r) => (
                  <StatusBadge
                    status={r.sucesso ? 'CONCLUIDO' : 'CANCELADO'}
                    label={r.sucesso ? translate('Sucesso') : translate('Falha')}
                  />
                ),
              },
            ]}
          />
        ) : (
          <EmptyState
            title={translate('Nenhuma consulta registrada')}
            description={translate(
              'O histórico ficará disponível quando uma integração registrar consultas.',
            )}
          />
        )}
        {query.data && (
          <Pagination page={page} size={20} total={query.data.total} onChange={setPage} />
        )}
      </section>
    </>
  );
}
