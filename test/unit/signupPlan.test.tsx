import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SetupPage } from '../../src/features/auth/SetupPage';
import { useAuthStore } from '../../src/stores/authStore';

const plan = {
  planoId: 7,
  nome: 'Mensal publicado',
  tipo: 'POS_PAGO',
  periodicidade: 'MENSAL',
  meses: 1,
  valorMensal: 129,
  descontoPercentual: 0,
  valorPeriodo: 129,
  descricao: null,
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
beforeEach(() => useAuthStore.getState().clear());

function open(path: string, published: (typeof plan)[] = [plan]) {
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/configuracao'))
      return Promise.resolve(json({ mode: 'Internal', registrationEnabled: true }));
    if (url.endsWith('/publico/planos')) return Promise.resolve(json(published));
    if (url.endsWith('/configuracao-inicial') && init?.method === 'POST')
      return Promise.resolve(
        json({
          userId: '1',
          userName: 'Marina',
          email: 'marina@example.test',
          accessToken: 'token',
          estabelecimentoId: 1,
          estabelecimentoNome: 'CareAuto',
          roles: ['Admin'],
          expiresAtUtc: '2099-01-01T00:00:00Z',
        }),
      );
    return Promise.reject(new Error('Unexpected request: ' + url));
  });
  vi.stubGlobal('fetch', fetcher);
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/primeiro-acesso" element={<SetupPage />} />
          <Route path="/visao-geral" element={<p>Painel operacional</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetcher;
}

async function completeForm() {
  const user = userEvent.setup();
  await user.type(await screen.findByTestId('field-estacionamento'), 'CareAuto Centro');
  await user.type(screen.getByTestId('field-documento'), '12345678000199');
  await user.type(screen.getByTestId('field-nome'), 'Marina');
  await user.type(screen.getByTestId('field-email'), 'marina@example.test');
  await user.type(screen.getByTestId('field-senha'), 'Dono12');
  await user.type(screen.getByTestId('field-confirmarSenha'), 'Dono12');
  await user.click(screen.getByTestId('form-submit'));
  await screen.findByText('Painel operacional');
}

describe('plan selection at signup', () => {
  it('preserves entered values and translates existing validation errors when changing language', async () => {
    const user = userEvent.setup();
    const fetcher = open('/primeiro-acesso');
    await user.type(await screen.findByTestId('field-estacionamento'), 'Estacionamento São José');
    await user.type(screen.getByTestId('field-nome'), 'Marina da Silva');

    await user.selectOptions(screen.getByTestId('language-selector'), 'en-US');

    expect(
      screen.getByRole('heading', { name: 'Your parking business starts here.' }),
    ).toBeVisible();
    expect(screen.getByTestId('setup-progress')).toHaveTextContent('Step 1 of 3');
    expect(screen.getByRole('textbox', { name: 'Parking business name' })).toHaveValue(
      'Estacionamento São José',
    );
    expect(screen.getByRole('textbox', { name: 'Owner’s name' })).toHaveValue('Marina da Silva');
    expect(screen.getByRole('button', { name: 'Create my account' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Create my account' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeVisible();
    expect(screen.getByText('Enter a CPF or CNPJ using digits only.')).toBeVisible();
    expect(screen.getByTestId('setup-progress')).toHaveTextContent('Step 1 of 3');
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/configuracao-inicial'))).toBe(false);

    await user.selectOptions(screen.getByTestId('language-selector'), 'pt-BR');

    expect(screen.getByTestId('setup-progress')).toHaveTextContent('Etapa 1 de 3');
    expect(screen.getByRole('textbox', { name: 'Nome do estacionamento' })).toHaveValue(
      'Estacionamento São José',
    );
    expect(screen.getByRole('textbox', { name: 'Nome do dono' })).toHaveValue('Marina da Silva');
    expect(screen.getByText('Informe um e-mail válido.')).toBeVisible();
    expect(screen.getByText('Informe CPF ou CNPJ somente com dígitos.')).toBeVisible();
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/configuracao-inicial'))).toBe(false);
  });

  it('keeps the signup API contract and selected plan when submitting in English', async () => {
    const user = userEvent.setup();
    const fetcher = open('/primeiro-acesso?planId=7');
    await screen.findByTestId('setup-selected-plan');
    await user.selectOptions(screen.getByTestId('language-selector'), 'en-US');
    expect(screen.getByRole('button', { name: 'Create my account' })).toBeVisible();

    await completeForm();

    const call = fetcher.mock.calls.find(([url]) => url.endsWith('/configuracao-inicial'));
    const payload = JSON.parse(String(call?.[1]?.body));
    expect(payload).toMatchObject({
      planoId: 7,
      estacionamento: 'CareAuto Centro',
      tipoPessoa: 'PJ',
      documento: '12345678000199',
      nome: 'Marina',
      email: 'marina@example.test',
      senha: 'Dono12',
    });
    expect(payload).not.toHaveProperty('confirmarSenha');
    expect(payload).not.toHaveProperty('businessName');
  });

  it('keeps the first step visible and blocks signup while required fields are invalid', async () => {
    const user = userEvent.setup();
    const fetcher = open('/primeiro-acesso');
    expect(await screen.findByTestId('setup-progress')).toHaveTextContent('Etapa 1 de 3');
    expect(screen.getByText(/Não pedimos cartão de crédito\./)).toBeVisible();

    await user.click(screen.getByTestId('form-submit'));

    expect(await screen.findByText('Informe seu nome.')).toBeVisible();
    expect(screen.getByTestId('field-email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('setup-progress')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('setup-progress')).toHaveTextContent('Etapa 1 de 3');
    expect(screen.queryByText('Painel operacional')).not.toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/configuracao-inicial'))).toBe(false);
  });

  it('shows the published selection and submits its ID to the existing signup endpoint', async () => {
    const fetcher = open('/primeiro-acesso?planId=7');
    expect(await screen.findByTestId('setup-selected-plan')).toHaveTextContent('Mensal publicado');
    await completeForm();
    const call = fetcher.mock.calls.find(([url]) => url.endsWith('/configuracao-inicial'));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      planoId: 7,
      estacionamento: 'CareAuto Centro',
    });
  });

  it('preserves signup without a selected plan and avoids requesting the plan catalog', async () => {
    const fetcher = open('/primeiro-acesso');
    await completeForm();
    const call = fetcher.mock.calls.find(([url]) => url.endsWith('/configuracao-inicial'));
    expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty('planoId');
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/publico/planos'))).toBe(false);
  });

  it.each(['0', '-1', 'abc', '1.5', '2147483648', ''])(
    'rejects malformed plan ID %s without showing a signup form',
    async (id) => {
      const fetcher = open('/primeiro-acesso?planId=' + id);
      await screen.findByTestId('setup-plan-unavailable');
      expect(screen.queryByTestId('form-submit')).not.toBeInTheDocument();
      expect(fetcher.mock.calls.some(([url]) => url.endsWith('/publico/planos'))).toBe(false);
    },
  );

  it('asks for another plan when the chosen ID is no longer public', async () => {
    open('/primeiro-acesso?planId=7', []);
    await screen.findByTestId('setup-plan-unavailable');
    await waitFor(() => expect(screen.queryByTestId('form-submit')).not.toBeInTheDocument());
    expect(screen.getByTestId('setup-change-plan')).toHaveAttribute('href', '/#planos');
  });
});
