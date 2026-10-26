import { toast } from 'sonner';
import { Button } from '../../ui';
import type { Pagamento } from '../../lib/types';
import { money } from '../../lib/format';
import { confirmAction } from '../../lib/swal';
import { useCommand } from '../shared/hooks';

export function AsaasPayment({
  payment: p,
  writable,
  refresh,
}: {
  payment: Pagamento;
  writable: boolean;
  refresh: () => void;
}) {
  const command = useCommand<Pagamento>('pagamentos');
  const linked = !!p.asaasCobrancaId || !!p.integracaoStatus;
  const emit = p.status === 'PENDENTE' && !linked && p.meio !== 'DINHEIRO' && !!p.clienteId;
  const invoice = safeInvoice(p.urlFatura);
  const action = (name: string) =>
    command.mutate({ action: `${p.pagamentoId}/asaas/${name}` }, { onSettled: refresh });
  if (!linked && !(writable && emit)) return <span className="muted">—</span>;
  return (
    <div className="asaas-payment-actions">
      {p.asaasOrigem === 'PLATAFORMA' && (
        <small>Recebimento na plataforma — repasse pela gestão</small>
      )}
      {p.asaasAmbiente && (
        <small>{p.asaasAmbiente === 'SANDBOX' ? 'Sandbox — teste' : 'Asaas — produção'}</small>
      )}
      {linked && !p.asaasCobrancaId && <small>Emissão aguardando conciliação</small>}
      {invoice && p.status === 'PENDENTE' && (
        <a className="text-link" href={invoice} target="_blank" rel="noopener noreferrer">
          Abrir fatura Asaas
        </a>
      )}
      {p.pixCopiaECola && p.status === 'PENDENTE' && (
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(p.pixCopiaECola!);
              toast.success('Pix copiado.');
            } catch {
              toast.error('Não foi possível copiar. Abra a fatura para pagar.');
            }
          }}
        >
          Copiar Pix
        </Button>
      )}
      {writable && emit && (
        <Button
          variant="secondary"
          busy={command.isPending}
          onClick={async () => {
            if (
              await confirmAction(
                'Emitir cobrança no Asaas?',
                `${money(p.valorCentavos / 100)} será enviado ao ambiente configurado em Integrações.`,
                'Emitir cobrança',
              )
            )
              action('emitir');
          }}
        >
          Emitir no Asaas
        </Button>
      )}
      {writable && linked && (
        <Button variant="ghost" busy={command.isPending} onClick={() => action('sincronizar')}>
          Atualizar cobrança
        </Button>
      )}
      {writable && p.asaasCobrancaId && p.status === 'PENDENTE' && (
        <Button
          variant="ghost"
          disabled={command.isPending}
          onClick={async () => {
            if (
              await confirmAction(
                'Cancelar cobrança no Asaas?',
                'A cobrança será cancelada no provedor e o histórico será preservado.',
                'Cancelar cobrança',
              )
            )
              action('cancelar');
          }}
        >
          Cancelar no Asaas
        </Button>
      )}
    </div>
  );
}
function safeInvoice(value: string | null) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      (u.hostname === 'asaas.com' || u.hostname.endsWith('.asaas.com'))
      ? value
      : null;
  } catch {
    return null;
  }
}
