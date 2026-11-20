import { useI18n } from '../../i18n';
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
  const { t } = useI18n();
  const emitir = useBackofficeAction(emitirCobranca, (c: Cobranca) =>
    c.status === 'PENDENTE_EMISSAO'
      ? 'A emissão não foi concluída. Veja o motivo na cobrança.'
      : 'Cobrança emitida no Asaas.',
  );
  const sincronizar = useBackofficeAction(sincronizarCobranca, (c: Cobranca) =>
    t('Status atualizado: {status}.', { status: t(cobrancaLabel[c.status]) }),
  );
  return (
    <DataTable
      testId={testId}
      caption={t('Cobranças da mensalidade')}
      rows={rows}
      rowKey={(c) => c.cobrancaId}
      columns={[
        ...(showSubscriber
          ? [
              {
                label: t('Assinante'),
                render: (c: Cobranca) => <strong>{c.estabelecimento}</strong>,
              },
            ]
          : []),
        { label: t('Vencimento'), render: (c) => dateOnly(c.vencimento) },
        {
          label: t('Período'),
          render: (c) =>
            t('{start} a {end}', { start: dateOnly(c.periodoInicio), end: dateOnly(c.periodoFim) }),
        },
        { label: t('Valor'), render: (c) => money(c.valor) },
        {
          label: t('Forma'),
          render: (c) =>
            `${t(formaLabel[c.formaPagamento])} · ${c.origem === 'ROTINA' ? t('rotina') : t('manual')}`,
        },
        {
          label: t('Status'),
          render: (c) => (
            <span className="bo-status-cell">
              <StatusBadge status={badge[c.status]} label={t(cobrancaLabel[c.status])} />
              {c.erro && <small className="field-error">{c.erro}</small>}
            </span>
          ),
        },
        {
          label: t('Ações'),
          render: (c) => (
            <span className="bo-actions">
              {c.urlFatura && (
                <a
                  className="text-link"
                  href={c.urlFatura}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {t('Fatura')} <ExternalLink size={12} />
                </a>
              )}
              {c.status === 'PENDENTE_EMISSAO' && (
                <Button
                  variant="ghost"
                  busy={emitir.isPending && emitir.variables === c.cobrancaId}
                  data-testid="bo-charge-emit"
                  onClick={() => emitir.mutate(c.cobrancaId)}
                >
                  <Send size={14} /> {t('Emitir')}{' '}
                </Button>
              )}
              {(c.status === 'EMITIDA' || c.status === 'VENCIDA') && (
                <Button
                  variant="ghost"
                  busy={sincronizar.isPending && sincronizar.variables === c.cobrancaId}
                  data-testid="bo-charge-sync"
                  onClick={() => sincronizar.mutate(c.cobrancaId)}
                >
                  <RefreshCw size={14} /> {t('Atualizar')}{' '}
                </Button>
              )}
            </span>
          ),
        },
      ]}
    />
  );
}
