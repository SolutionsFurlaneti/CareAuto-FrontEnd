import { translate, useI18n } from '../../i18n';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, type Column } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { RecordForm } from '../../components/RecordForm';
import { QueryError } from '../../components/QueryError';
import { Button, EmptyState, Modal, Skeleton, StatusBadge } from '../../ui';
import { useRecords, useSaveRecord, useCommand } from '../shared/hooks';
import { useAuthStore, hasRole } from '../../stores/authStore';
import type { Assinatura } from '../../lib/types';
import { money, dateTime, integer } from '../../lib/format';
import { label } from '../../lib/labels';
import { confirmAction } from '../../lib/swal';
import { subscriptionSchema } from './subscriptionSchema';
export function SubscriptionsPage() {
  useI18n();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const query = useRecords<Assinatura>('assinaturas', page);
  const save = useSaveRecord<Assinatura>('assinaturas');
  const action = useCommand('assinaturas');
  const roles = useAuthStore((s) => s.session?.roles || []);
  const writable = hasRole(roles, ['Admin', 'Financeiro']);
  const columns: Column<Assinatura>[] = [
    { label: 'Assinatura', render: (r) => <strong>#{r.assinaturaId}</strong> },
    { label: 'Cliente', render: (r) => '#' + r.clienteId },
    { label: 'Veículo', render: (r) => '#' + r.veiculoId },
    {
      label: 'Mensalidade',
      render: (r) => money(r.valorCentavos === null ? null : r.valorCentavos / 100),
    },
    { label: 'Início', render: (r) => dateTime(r.iniciadaEm) },
    { label: 'Situação', render: (r) => <StatusBadge status={r.status} label={label(r.status)} /> },
  ];
  if (writable)
    columns.push({
      label: 'Ações',
      render: (r) =>
        r.status === 'ATIVA' ? (
          <Button
            variant="ghost"
            data-testid="subscription-end"
            disabled={action.isPending}
            onClick={async () => {
              if (
                await confirmAction(
                  'Encerrar assinatura?',
                  'Novas entradas não poderão usar esta assinatura.',
                  'Encerrar assinatura',
                )
              )
                action.mutate({ action: r.assinaturaId + '/encerramento' });
            }}
          >
            {translate('Encerrar')}
          </Button>
        ) : (
          '—'
        ),
    });
  return (
    <>
      <PageHeader
        eyebrow={translate('FINANCEIRO')}
        title={translate('Assinaturas')}
        description={
          writable
            ? translate('Gerencie os vínculos dos clientes mensalistas.')
            : translate('Consulte as assinaturas vinculadas à sua conta.')
        }
        action={
          writable && (
            <Button
              data-testid="subscription-new"
              onClick={() => {
                save.reset();
                setOpen(true);
              }}
            >
              <Plus size={18} />
              {translate('Adicionar assinatura')}
            </Button>
          )
        }
      />
      <section className="panel">
        <div className="panel-toolbar">
          <h2>{translate('Clientes mensalistas')}</h2>
          <span className="muted">
            {query.data ? integer(query.data.total) : '—'} {translate('registros')}
          </span>
        </div>
        {query.isPending ? (
          <Skeleton />
        ) : query.isError ? (
          <QueryError
            error={query.error}
            what={translate('as assinaturas')}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length ? (
          <DataTable
            rows={query.data.items}
            columns={columns}
            rowKey={(r) => r.assinaturaId}
            testId="subscriptions-table"
            caption={translate('Assinaturas')}
          />
        ) : (
          <EmptyState
            title={translate('Nenhuma assinatura registrada')}
            description={translate('Os vínculos de mensalistas aparecerão aqui.')}
          />
        )}
        {query.data && (
          <Pagination
            page={page}
            size={20}
            total={query.data.total}
            onChange={setPage}
            busy={query.isFetching}
          />
        )}
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={translate('Adicionar assinatura')}
        busy={save.isPending}
        actions={
          <>
            <Button
              variant="secondary"
              data-testid="form-cancel"
              disabled={save.isPending}
              onClick={() => setOpen(false)}
            >
              {translate('Cancelar')}
            </Button>
            <Button
              type="submit"
              form="subscription-form"
              data-testid="form-submit"
              busy={save.isPending}
            >
              {translate('Salvar assinatura')}
            </Button>
          </>
        }
      >
        {open && (
          <>
            <p className="muted">
              {translate(
                'A assinatura habilita a tabela mensal. Cobranças recorrentes não são emitidas automaticamente.',
              )}
            </p>
            <RecordForm
              formId="subscription-form"
              spec={{
                schema: subscriptionSchema,
                defaults: { clienteId: 0, veiculoId: 0, valor: 0 },
                fields: [
                  { name: 'clienteId', label: 'Código do cliente', kind: 'number' },
                  {
                    name: 'veiculoId',
                    label: 'Código do veículo',
                    kind: 'number',
                    hint: 'O veículo deve pertencer ao cliente informado.',
                  },
                  { name: 'valor', label: 'Valor mensal', kind: 'money' },
                ],
              }}
              error={save.error}
              onSubmit={async (values) => {
                const { valor, ...data } = values;
                try {
                  await save.mutateAsync({
                    data: { ...data, valorCentavos: Math.round(Number(valor) * 100) },
                  });
                  setOpen(false);
                } catch {
                  /* Retain form. */
                }
              }}
            />
          </>
        )}
      </Modal>
    </>
  );
}
