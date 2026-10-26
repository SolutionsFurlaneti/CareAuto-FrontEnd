import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { AsaasPayment } from '../../src/features/payments/AsaasPayment';
import { asaasSchema } from '../../src/features/integrations/asaasSchema';
import type { Pagamento } from '../../src/lib/types';

const payment: Pagamento = {
  pagamentoId: 1,
  estadiaId: null,
  clienteId: 1,
  valorCentavos: 1234,
  meio: 'PIX',
  status: 'PENDENTE',
  asaasCobrancaId: null,
  asaasAmbiente: null,
  asaasOrigem: null,
  integracaoStatus: null,
  urlFatura: null,
  pixCopiaECola: null,
  vencimento: '2026-10-10',
  criadoEm: '',
  pagoEm: null,
};
function show(p: Pagamento, writable = true) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AsaasPayment payment={p} writable={writable} refresh={() => undefined} />
    </QueryClientProvider>,
  );
}
describe('Asaas payment controls', () => {
  it('allows emission only for an eligible identified pending payment', () => {
    const view = show(payment);
    expect(screen.getByRole('button', { name: 'Emitir no Asaas' })).toBeVisible();
    view.unmount();
    show({ ...payment, meio: 'DINHEIRO' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('offers reconciliation instead of emitting again after an uncertain result', () => {
    show({ ...payment, integracaoStatus: 'INCERTO', asaasAmbiente: 'SANDBOX' });
    expect(screen.queryByRole('button', { name: 'Emitir no Asaas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar cobrança' })).toBeVisible();
    expect(screen.getByText('Sandbox — teste')).toBeVisible();
  });
  it('customers see checkout without management actions and unsafe URLs are never rendered', () => {
    const view = show(
      { ...payment, asaasCobrancaId: 'pay_test', urlFatura: 'https://www.asaas.com/i/test' },
      false,
    );
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    view.unmount();
    show(
      { ...payment, asaasCobrancaId: 'pay_test', urlFatura: 'https://asaas.com.evil.test/pay' },
      false,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('does not offer payment or cancellation for settled charges', () => {
    show({
      ...payment,
      status: 'PAGO',
      asaasCobrancaId: 'pay_test',
      pixCopiaECola: 'pix',
      urlFatura: 'https://www.asaas.com/i/test',
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar Pix' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar no Asaas' })).not.toBeInTheDocument();
  });
  it('requires a usable webhook token and explicit deactivation for removing credentials', () => {
    const base = {
      ativo: 'true',
      ambiente: 'SANDBOX',
      chaveApi: null,
      tokenWebhook: null,
      removerCredenciais: 'false',
    };
    expect(asaasSchema.safeParse(base).success).toBe(true);
    expect(asaasSchema.safeParse({ ...base, tokenWebhook: 'short' }).success).toBe(false);
    expect(asaasSchema.safeParse({ ...base, removerCredenciais: 'true' }).success).toBe(false);
    expect(
      asaasSchema.safeParse({ ...base, ativo: 'false', removerCredenciais: 'true' }).success,
    ).toBe(true);
  });
});
