import { ExternalLink, RefreshCw, Send } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { Button, StatusBadge } from '../../ui';
import { dateOnly, money } from '../../lib/format';
import { emitirCobranca, sincronizarCobranca, type Cobranca } from './api';
import { useBackofficeAction } from './hooks';
import { cobrancaLabel, formaLabel } from './labels';

const badge: Record<Cobranca['status'], string> = {
  PENDENTE_EMISSAO: 'PENDENTE',
  EMITINDO: 'EM_EXECUCAO',
  EMITIDA: 'PENDENTE',
  PAGA: 'PAGO',
  VENCIDA: 'ERRO',
  CANCELADA: 'CANCELADO',
};

export function ChargesTable({
  rows,
  testId,
  showSubscriber,
}: {
  rows: Cobranca[];
  testId: string;
  showSubscriber?: boolean;
}) {
  const emitir = useBackofficeAction(emitirCobranca, (c: Cobranca) =>
    c.status === 'PENDENTE_EMISSAO'
      ? 'A emissão não foi concluída. Veja o motivo na cobrança.'
      : 'Cobrança emitida no Asaas.',
  );
  const sincronizar = useBackofficeAction(
    sincronizarCobranca,
    (c: Cobranca) => 'Status atualizado: ' + cobrancaLabel[c.status] + '.',
  );
  return (
    <DataTable
      testId={testId}
      caption="Cobranças da mensalidade"
      rows={rows}
      rowKey={(c) => c.cobrancaId}
      columns={[
        ...(showSubscriber
          ? [{ label: 'Assinante', render: (c: Cobranca) => <strong>{c.estabelecimento}</strong> }]
          : []),
        { label: 'Vencimento', render: (c) => dateOnly(c.vencimento) },
        {
          label: 'Período',
          render: (c) => `${dateOnly(c.periodoInicio)} a ${dateOnly(c.periodoFim)}`,
        },
        { label: 'Valor', render: (c) => money(c.valor) },
        {
          label: 'Forma',
          render: (c) =>
            `${formaLabel[c.formaPagamento]} · ${c.origem === 'ROTINA' ? 'rotina' : 'manual'}`,
        },
        {
          label: 'Status',
          render: (c) => (
            <span className="bo-status-cell">
              <StatusBadge status={badge[c.status]} label={cobrancaLabel[c.status]} />
              {c.erro && <small className="field-error">{c.erro}</small>}
            </span>
          ),
        },
        {
          label: 'Ações',
          render: (c) => (
            <span className="bo-actions">
              {c.urlFatura && (
                <a
                  className="text-link"
                  href={c.urlFatura}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Fatura <ExternalLink size={12} />
                </a>
              )}
              {c.status === 'PENDENTE_EMISSAO' && (
                <Button
                  variant="ghost"
                  busy={emitir.isPending && emitir.variables === c.cobrancaId}
                  data-testid="bo-charge-emit"
                  onClick={() => emitir.mutate(c.cobrancaId)}
                >
                  <Send size={14} /> Emitir
                </Button>
              )}
              {(c.status === 'EMITIDA' || c.status === 'VENCIDA') && (
                <Button
                  variant="ghost"
                  busy={sincronizar.isPending && sincronizar.variables === c.cobrancaId}
                  data-testid="bo-charge-sync"
                  onClick={() => sincronizar.mutate(c.cobrancaId)}
                >
                  <RefreshCw size={14} /> Atualizar
                </Button>
              )}
            </span>
          ),
        },
      ]}
    />
  );
}
