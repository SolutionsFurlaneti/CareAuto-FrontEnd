import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../src/stores/authStore';
import { IntegrationsPage } from '../../src/features/integrations/IntegrationsPage';
import { IntegrationDetailPage } from '../../src/features/integrations/IntegrationDetailPage';
import { asaasCredentialsSchema } from '../../src/features/integrations/asaasSchema';
import { credentialsForm } from '../../src/features/integrations/keyedSchema';

const api = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/apiClient', async (actual) => ({
  ...(await actual<typeof import('../../src/lib/apiClient')>()),
  api,
}));

const claude = {
  ativo: true,
  nomeChave: 'autocaremanager-dev',
  possuiChaveApi: true,
  modelo: 'claude-sonnet-5-5',
  enderecoHttp: 'https://api.anthropic.com/v1/messages',
  versaoApi: '2023-06-01',
  maximoTokens: 512,
  tempoEsgotadoSegundos: 45,
  atualizadoEm: '2026-10-06T12:53:00Z',
  atualizadoPor: 'Rodrigo',
  versao: 'v1',
};
const plate = {
  ativo: false,
  possuiToken: false,
  urlTemplate: 'https://wdapi2.com.br/consulta/{placa}/{token}',
  atualizadoEm: null,
  atualizadoPor: null,
  versao: null,
};
const asaas = {
  ativo: false,
  ambiente: 'SANDBOX',
  possuiChaveApi: false,
  possuiTokenWebhook: false,
  caminhoWebhook: '/api/v1/webhooks/asaas/1',
  atualizadoEm: null,
  versao: 'a1',
};
const bySlug: Record<string, unknown> = {
  origem: { usarIntegracoesSistema: false },
  claude,
  'consulta-placa': plate,
  asaas,
};

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}
function show(url: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/integracoes" element={<IntegrationsPage />} />
          <Route path="/integracoes/:integracao" element={<IntegrationDetailPage />} />
        </Routes>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    session: {
      userId: 'u1',
      estabelecimentoId: 1,
      estabelecimentoNome: 'Estacionamento A',
      userName: 'Rodrigo',
      email: 'admin@example.test',
      accessToken: 'token',
      expiresAtUtc: '2099-01-01T00:00:00Z',
      roles: ['Admin'],
    },
  });
  api.mockReset();
  api.mockImplementation((path: string, options?: RequestInit) => {
    const slug = path.split('/').pop() ?? '';
    if (options?.method === 'PUT')
      return Promise.resolve({ ...(bySlug[slug] as object), ...JSON.parse(String(options.body)) });
    return Promise.resolve(bySlug[slug]);
  });
});

describe('integrations hub', () => {
  it('lists one card per integration with status and no forms', async () => {
    show('/integracoes');
    const card = await screen.findByTestId('integration-card-claude');
    expect(within(card).getByRole('heading', { name: 'Claude' })).toBeVisible();
    await waitFor(() => expect(within(card).getByText('Ativada')).toBeVisible());
    expect(
      within(screen.getByTestId('integration-card-consulta-placa')).getByText('Desativada'),
    ).toBeVisible();
    expect(screen.getByTestId('integration-card-asaas')).toHaveAttribute(
      'href',
      '/integracoes/asaas',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('form-submit')).not.toBeInTheDocument();
  });
  it('flags a card whose configuration could not be loaded', async () => {
    api.mockImplementation((path: string) =>
      path.endsWith('/asaas') ? Promise.reject(new Error('offline')) : Promise.resolve(claude),
    );
    show('/integracoes');
    const card = screen.getByTestId('integration-card-asaas');
    await waitFor(() => expect(within(card).getByText('Indisponível')).toBeVisible());
  });
  it('opens the integration on its first tab', async () => {
    show('/integracoes');
    await userEvent.setup().click(screen.getByTestId('integration-card-claude'));
    expect(await screen.findByRole('tab', { name: 'Credenciais' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/integracoes/claude');
  });
});

describe('integration detail tabs', () => {
  it('renders only the fields of the tab named in the URL', async () => {
    show('/integracoes/claude?tab=configuracoes');
    expect(await screen.findByTestId('field-modelo')).toHaveValue('claude-sonnet-5-5');
    expect(screen.queryByTestId('field-chaveApi')).not.toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Configurações');
  });
  it('falls back to the first tab and redirects unknown integrations', async () => {
    const view = show('/integracoes/consulta-placa?tab=inexistente');
    expect(await screen.findByTestId('field-token')).toBeVisible();
    view.unmount();
    show('/integracoes/desconhecida');
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/integracoes$/);
  });
  it('keeps the tab in the URL and supports arrow-key navigation', async () => {
    const user = userEvent.setup();
    show('/integracoes/asaas');
    await user.click(await screen.findByRole('tab', { name: 'Webhooks' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/integracoes/asaas?tab=webhooks');
    expect(screen.getByTestId('asaas-webhook-path')).toHaveTextContent('/api/v1/webhooks/asaas/1');
    expect(screen.queryByTestId('form-submit')).not.toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Status' })).toHaveFocus();
    expect(screen.getByTestId('location')).toHaveTextContent('tab=status');
    expect(screen.getByRole('button', { name: 'Testar conexão salva' })).toBeDisabled();
    await user.keyboard('{End}{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Credenciais' })).toHaveFocus();
  });
  it('saves only the visible tab, keeping saved values and credentials of the others', async () => {
    const user = userEvent.setup();
    show('/integracoes/claude?tab=configuracoes');
    const tokens = await screen.findByTestId('field-maximoTokens');
    await user.clear(tokens);
    await user.type(tokens, '900');
    // Rascunho de outra aba é descartado ao trocar e nunca é enviado.
    await user.click(screen.getByRole('tab', { name: 'Credenciais' }));
    await user.type(screen.getByTestId('field-nomeChave'), '-rascunho');
    await user.click(screen.getByRole('tab', { name: 'Configurações' }));
    expect(screen.getByTestId('field-maximoTokens')).toHaveValue(512);
    await user.clear(screen.getByTestId('field-maximoTokens'));
    await user.type(screen.getByTestId('field-maximoTokens'), '900');
    await user.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/api/v1/configuracoes-integracoes/claude',
        expect.objectContaining({ method: 'PUT' }),
      ),
    );
    const put = api.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === 'PUT');
    expect(JSON.parse(String((put?.[1] as RequestInit).body))).toEqual({
      ...claude,
      maximoTokens: 900,
      chaveApi: null,
      removerChaveApi: false,
      possuiChaveApi: undefined,
      atualizadoEm: undefined,
      atualizadoPor: undefined,
    });
  });
});

describe('per-tab validation', () => {
  it('requires a credential to activate only on the credentials tab', () => {
    const form = credentialsForm('consulta-placa', { ...plate, ativo: false });
    const base = { ativo: 'true', token: null, removerToken: 'false' };
    expect(form.spec.schema.safeParse(base).success).toBe(false);
    expect(form.spec.schema.safeParse({ ...base, token: 'abc' }).success).toBe(true);
  });
  it('mirrors the backend rule that the Asaas key and webhook token travel together', () => {
    const saved = {
      ambiente: 'SANDBOX',
      possuiChaveApi: true,
      possuiTokenWebhook: false,
      versao: 'a1',
    };
    const schema = asaasCredentialsSchema(saved);
    const base = {
      ativo: 'true',
      ambiente: 'SANDBOX',
      chaveApi: null,
      tokenWebhook: null,
      removerCredenciais: 'false',
    };
    const token = 'x'.repeat(32);
    expect(schema.safeParse(base).success).toBe(false);
    expect(schema.safeParse({ ...base, tokenWebhook: token }).success).toBe(true);
    expect(
      schema.safeParse({ ...base, ativo: 'false', ambiente: 'PRODUCAO', tokenWebhook: token })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...base, ambiente: 'PRODUCAO', chaveApi: 'k', tokenWebhook: token })
        .success,
    ).toBe(true);
    expect(schema.safeParse({ ...base, ativo: 'false', removerCredenciais: 'true' }).success).toBe(
      true,
    );
    expect(
      asaasCredentialsSchema({ ...saved, versao: null }).safeParse({
        ...base,
        ativo: 'false',
        ambiente: 'PRODUCAO',
      }).success,
    ).toBe(true);
  });
});

it('shows platform Asaas availability without requiring the tenant to supply credentials', async () => {
  api.mockResolvedValue({
    ...asaas,
    origem: 'PLATAFORMA',
    disponivel: true,
    ambienteEfetivo: 'PRODUCAO',
  });
  show('/integracoes/asaas?tab=status');
  await waitFor(() =>
    expect(screen.getByTestId('integration-origin')).toHaveTextContent(
      'Usando a integração da plataforma',
    ),
  );
  expect(screen.getByTestId('integration-origin')).toHaveTextContent(
    'repasse é realizado pela gestão',
  );
  expect(screen.getByTestId('integration-status')).toHaveTextContent('Produção — cobranças reais');
  expect(screen.getByRole('button', { name: 'Testar conexão salva' })).toBeEnabled();
  await userEvent.click(screen.getByTestId('tab-webhooks'));
  expect(screen.getByText(/O webhook é configurado pela gestão/)).toBeVisible();
  expect(screen.queryByTestId('asaas-webhook-path')).not.toBeInTheDocument();
});
