import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Check, Ban } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, type Column } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { RecordForm } from '../../components/RecordForm';
import { QueryError } from '../../components/QueryError';
import { Button, EmptyState, Modal, Skeleton, StatusBadge } from '../../ui';
import { useRecords, useSaveRecord, useCommand } from '../shared/hooks';
import { useAuthStore, hasRole } from '../../stores/authStore';
import type { Pagamento } from '../../lib/types';
import { money, dateOnly, todayIso } from '../../lib/format';
import { label } from '../../lib/labels';
import { confirmAction } from '../../lib/swal';
import { paymentSchema } from './paymentSchema';
import { AsaasPayment } from './AsaasPayment';
export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [params] = useSearchParams();
  const query = useRecords<Pagamento>('pagamentos', page);
  const save = useSaveRecord<Pagamento>('pagamentos');
  const action = useCommand('pagamentos');
  const roles = useAuthStore((s) => s.session?.roles || []);
  const writable = hasRole(roles, ['Admin', 'Financeiro']);
  const columns: Column<Pagamento>[] = [
    {
      label: 'Pagamento',
      render: (r) => (
        <div>
          <strong>#{r.pagamentoId}</strong>
          <small>{r.estadiaId ? 'Estadia #' + r.estadiaId : 'Cobrança independente'}</small>
        </div>
      ),
    },
    { label: 'Cliente', render: (r) => (r.clienteId ? '#' + r.clienteId : 'Avulso') },
    {
      label: 'Valor',
      render: (r) => <strong className="money-value">{money(r.valorCentavos / 100)}</strong>,
    },
    { label: 'Meio', render: (r) => label(r.meio) },
    { label: 'Vencimento', render: (r) => dateOnly(r.vencimento) },
    { label: 'Situação', render: (r) => <StatusBadge status={r.status} label={label(r.status)} /> },
    {
      label: 'Cobrança Asaas',
      render: (r) => (
        <AsaasPayment payment={r} writable={writable} refresh={() => void query.refetch()} />
      ),
    },
  ];
  if (writable)
    columns.push({
      label: 'Ações',
      render: (r) =>
        r.status === 'PENDENTE' && !r.asaasCobrancaId && !r.integracaoStatus ? (
          <div className="row-actions">
            <Button
              variant="ghost"
              aria-label="Confirmar recebimento"
              data-testid="payment-confirm"
              disabled={action.isPending}
              onClick={async () => {
                if (
                  await confirmAction(
                    'Confirmar recebimento?',
                    money(r.valorCentavos / 100) + ' será marcado como pago.',
                    'Confirmar recebimento',
                  )
                )
                  action.mutate({ action: r.pagamentoId + '/confirmacao' });
              }}
            >
              <Check size={18} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Cancelar pagamento"
              data-testid="payment-cancel"
              disabled={action.isPending}
              onClick={async () => {
                if (
                  await confirmAction(
                    'Cancelar pagamento?',
                    'O registro será preservado no histórico.',
                    'Cancelar pagamento',
                  )
                )
                  action.mutate({ action: r.pagamentoId + '/cancelamento' });
              }}
            >
              <Ban size={17} />
            </Button>
          </div>
        ) : (
          <span className="muted">{r.asaasCobrancaId ? 'Vinculado ao Asaas' : '—'}</span>
        ),
    });
  return (
    <>
      <PageHeader
        eyebrow="FINANCEIRO"
        title="Pagamentos"
        description={
          writable
            ? 'Acompanhe as cobranças e registre os recebimentos.'
            : 'Consulte os pagamentos vinculados à sua conta.'
        }
        action={
          writable && (
            <Button
              data-testid="payment-new"
              onClick={() => {
                save.reset();
                setOpen(true);
              }}
            >
              <Plus size={18} />
              Registrar pagamento
            </Button>
          )
        }
      />
      {writable && (
        <p className="notice">
          Registre o pagamento e selecione Emitir no Asaas para gerar Pix, boleto ou fatura de
          cartão. A emissão exige um cliente com CPF/CNPJ e a integração configurada pelo
          administrador.
        </p>
      )}
      <section className="panel">
        <div className="panel-toolbar">
          <h2>{writable ? 'Histórico de pagamentos' : 'Meus pagamentos'}</h2>
          <span className="muted">{query.data?.total ?? '—'} registros</span>
        </div>
        {query.isPending ? (
          <Skeleton />
        ) : query.isError ? (
          <QueryError
            error={query.error}
            what="os pagamentos"
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length ? (
          <DataTable
            rows={query.data.items}
            columns={columns}
            rowKey={(r) => r.pagamentoId}
            testId="payments-table"
            caption="Pagamentos"
          />
        ) : (
          <EmptyState
            title="Nenhum pagamento registrado"
            description={
              writable
                ? 'Os recebimentos registrados aparecerão aqui.'
                : 'Seus pagamentos aparecerão aqui quando forem registrados.'
            }
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
        title="Registrar pagamento"
        busy={save.isPending}
        actions={
          <>
            <Button
              variant="secondary"
              data-testid="form-cancel"
              disabled={save.isPending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="payment-form"
              data-testid="form-submit"
              busy={save.isPending}
            >
              Registrar pagamento
            </Button>
          </>
        }
      >
        {open && (
          <RecordForm
            formId="payment-form"
            spec={{
              schema: paymentSchema,
              defaults: {
                estadiaId: Number(params.get('estadia')) || null,
                clienteId: null,
                valor: 0,
                meio: 'DINHEIRO',
                vencimento: todayIso(),
              },
              fields: [
                {
                  name: 'estadiaId',
                  label: 'Código da estadia',
                  kind: 'number',
                  optional: true,
                  hint: 'A estadia deve estar concluída.',
                },
                {
                  name: 'clienteId',
                  label: 'Código do cliente',
                  kind: 'number',
                  optional: true,
                  hint: 'Use o cliente do veículo. Deixe vazio somente para avulsos.',
                },
                { name: 'valor', label: 'Valor do pagamento', kind: 'money' },
                {
                  name: 'meio',
                  label: 'Meio de pagamento',
                  kind: 'select',
                  options: ['DINHEIRO', 'PIX', 'CARTAO', 'BOLETO'].map((value) => ({
                    value,
                    label: label(value),
                  })),
                },
                { name: 'vencimento', label: 'Vencimento', kind: 'date' },
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
        )}
      </Modal>
    </>
  );
}
