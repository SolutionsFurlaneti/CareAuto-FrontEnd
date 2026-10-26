import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { Pagination } from '../../components/Pagination';
import { EmptyState, SelectField, Skeleton } from '../../ui';
import { useCobrancas } from './hooks';
import { cobrancaLabel } from './labels';
import { ChargesTable } from './ChargesTable';

export function BackofficeChargesPage() {
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const lista = useCobrancas({ status: status || undefined, pagina });
  return (
    <>
      <PageHeader
        eyebrow="PLATAFORMA"
        title="Cobranças"
        description="Mensalidades emitidas no Asaas da plataforma. Pós-pagos são emitidos pela rotina diária; pré-pagos, pelo assinante."
      />
      <section className="panel">
        <div className="panel-toolbar bo-filters">
          <SelectField
            label="Status"
            value={status}
            data-testid="bo-charges-filter"
            onChange={(e) => {
              setStatus(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(cobrancaLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </SelectField>
        </div>
        {lista.isPending ? (
          <Skeleton />
        ) : lista.isError ? (
          <QueryError
            error={lista.error}
            what="as cobranças"
            onRetry={() => void lista.refetch()}
          />
        ) : !lista.data.items.length ? (
          <EmptyState
            title="Nenhuma cobrança"
            description="As cobranças aparecem aqui quando a rotina ou um assinante pré-pago as gerar."
          />
        ) : (
          <>
            <ChargesTable rows={lista.data.items} testId="bo-charges" showSubscriber />
            <Pagination
              page={pagina}
              size={lista.data.pageSize}
              total={lista.data.total}
              onChange={setPagina}
              busy={lista.isFetching}
            />
          </>
        )}
      </section>
    </>
  );
}
