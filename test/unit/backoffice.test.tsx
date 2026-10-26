import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../../src/lib/apiClient';
import { useAuthStore, type Session } from '../../src/stores/authStore';
import { useBackofficeStore, type BackofficeSession } from '../../src/features/backoffice/store';
import { BackofficeLoginPage } from '../../src/features/backoffice/BackofficeLoginPage';
import { RequireBackoffice } from '../../src/features/backoffice/RequireBackoffice';
import { BackofficePlansPage } from '../../src/features/backoffice/PlansPage';
import { planSchema, valorPeriodo } from '../../src/features/backoffice/planSchema';

const tenant: Session = {
  userId: 'u',
  estabelecimentoId: 1,
  estabelecimentoNome: 'Estacionamento',
  userName: 'Ana',
  email: 'a@x.test',
  accessToken: 'tenant-token',
  expiresAtUtc: '2099-01-01T00:00:00Z',
  roles: ['Admin'],
};
const backoffice: BackofficeSession = {
  login: 'admin',
  nome: 'Administrador',
  accessToken: 'bo-token',
  expiresAtUtc: '2099-01-01T00:00:00Z',
  mustChangePassword: false,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function wrap(ui: React.ReactNode, path: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/backoffice/login" element={<BackofficeLoginPage />} />
          <Route path="/backoffice/trocar-senha" element={<p>tela de nova senha</p>} />
          <Route
            path="/backoffice"
            element={
              <RequireBackoffice>
                <p>painel do backoffice</p>
              </RequireBackoffice>
            }
          />
          <Route path="/backoffice/planos" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  useAuthStore.getState().clear();
  useBackofficeStore.getState().clear();
  vi.unstubAllGlobals();
});

describe('backoffice session', () => {
  it('uses its own token and a 401 clears only the backoffice session', async () => {
    useAuthStore.getState().setSession(tenant);
    useBackofficeStore.getState().setSession(backoffice);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(api('/api/v1/backoffice/resumo', { auth: 'backoffice' })).rejects.toMatchObject({
      code: 'Auth.SessionExpired',
    });
    expect(new Headers(fetcher.mock.calls[0][1].headers).get('Authorization')).toBe(
      'Bearer bo-token',
    );
    expect(useBackofficeStore.getState().session).toBeNull();
    expect(useAuthStore.getState().session?.accessToken).toBe('tenant-token');
  });

  it('redirects to login without a session and to the password change on first access', async () => {
    const r1 = wrap(null, '/backoffice');
    expect(await screen.findByTestId('backoffice-login-form')).toBeVisible();
    r1.unmount();
    useBackofficeStore.getState().setSession({ ...backoffice, mustChangePassword: true });
    const r2 = wrap(null, '/backoffice');
    expect(await screen.findByText('tela de nova senha')).toBeVisible();
    r2.unmount();
  });

  it('logs in with admin and sends the first access to the password change', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ ...backoffice, mustChangePassword: true }));
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    wrap(null, '/backoffice/login');
    await user.click(screen.getByTestId('bo-login-submit'));
    expect(await screen.findByText('Informe o login.')).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
    await user.type(screen.getByTestId('bo-login'), 'admin');
    await user.type(screen.getByTestId('bo-senha'), '123456');
    await user.click(screen.getByTestId('bo-login-submit'));
    expect(await screen.findByText('tela de nova senha')).toBeVisible();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('/api/v1/backoffice/auth/login');
    expect(JSON.parse(init.body)).toEqual({ login: 'admin', senha: '123456' });
    expect(useBackofficeStore.getState().session?.accessToken).toBe('bo-token');
  });

  it('shows the login error from the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json({ title: 'Login ou senha inválidos.', code: 'backoffice.credenciais' }, 401),
        ),
    );
    const user = userEvent.setup();
    wrap(null, '/backoffice/login');
    await user.type(screen.getByTestId('bo-login'), 'admin');
    await user.type(screen.getByTestId('bo-senha'), 'errada');
    await user.click(screen.getByTestId('bo-login-submit'));
    expect(await screen.findByTestId('bo-login-error')).toHaveTextContent(
      'Login ou senha inválidos.',
    );
  });
});

describe('plans', () => {
  const base = {
    nome: 'Plano',
    tipo: 'PRE_PAGO' as const,
    periodicidade: 'SEMESTRAL' as const,
    valorMensal: 99,
    descontoPercentual: 10,
    descricao: '',
    ativo: true,
  };
  it('follows the minimum fee and the long-term prepaid discount rule', () => {
    expect(planSchema.safeParse(base).success).toBe(true);
    expect(planSchema.safeParse({ ...base, valorMensal: 98.99 }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, tipo: 'POS_PAGO' }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, periodicidade: 'MENSAL' }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, descontoPercentual: 51 }).success).toBe(false);
    expect(valorPeriodo(99, 6, 10)).toBe(534.6);
    expect(valorPeriodo(99, 12, 20)).toBe(950.4);
  });

  it('previews the package value and sends the plan with the backoffice token', async () => {
    useBackofficeStore.getState().setSession(backoffice);
    const fetcher = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) =>
        init?.method === 'POST' ? json({ planoId: 1 }, 201) : json([]),
      );
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    wrap(<BackofficePlansPage />, '/backoffice/planos');
    await user.click(await screen.findByTestId('bo-plan-new'));
    await user.type(screen.getByTestId('bo-plan-nome'), 'Semestral à vista');
    expect(screen.getByTestId('bo-plan-desconto')).toBeDisabled();
    await user.selectOptions(screen.getByTestId('bo-plan-tipo'), 'PRE_PAGO');
    await user.selectOptions(screen.getByTestId('bo-plan-periodicidade'), 'SEMESTRAL');
    await user.clear(screen.getByTestId('bo-plan-desconto'));
    await user.type(screen.getByTestId('bo-plan-desconto'), '10');
    expect(screen.getByTestId('bo-plan-preview')).toHaveTextContent('534,60');
    await user.click(screen.getByTestId('form-submit'));
    await waitFor(() =>
      expect(fetcher.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(true),
    );
    const [url, init] = fetcher.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(url).toBe('/api/v1/backoffice/planos');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer bo-token');
    expect(JSON.parse(init.body)).toMatchObject({
      nome: 'Semestral à vista',
      tipo: 'PRE_PAGO',
      periodicidade: 'SEMESTRAL',
      valorMensal: 99,
      descontoPercentual: 10,
      descricao: null,
    });
  });
});
