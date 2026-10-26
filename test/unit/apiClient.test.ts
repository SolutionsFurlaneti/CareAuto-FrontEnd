import { beforeEach, describe, it, expect, vi } from 'vitest';
import { api, ApiError, toQuery } from '../../src/lib/apiClient';
import { useAuthStore, type Session } from '../../src/stores/authStore';
const session: Session = {
  userId: 'a',
  estabelecimentoId: 1,
  estabelecimentoNome: 'Estacionamento de teste',
  userName: 'Ana',
  email: '',
  accessToken: 'old',
  expiresAtUtc: '2099-01-01T00:00:00Z',
  roles: ['Admin'],
};
beforeEach(() => useAuthStore.getState().clear());
describe('API transport', () => {
  it('injects auth and reads 204', async () => {
    useAuthStore.getState().setSession(session);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    expect(await api('/x', { method: 'DELETE' })).toBeUndefined();
    expect(new Headers(fetcher.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer old');
  });
  it('clears only the session that made the unauthorized request', async () => {
    useAuthStore.getState().setSession(session);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(api('/x')).rejects.toMatchObject({ code: 'Auth.SessionExpired' });
    expect(useAuthStore.getState().session).toBeNull();
  });
  it('does not erase a newer token after a late 401', async () => {
    useAuthStore.getState().setSession(session);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        useAuthStore.getState().setSession({ ...session, accessToken: 'new' });
        return new Response(null, { status: 401 });
      }),
    );
    await expect(api('/x')).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().session?.accessToken).toBe('new');
  });
  it('uses backend extension code, not title', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: 'operacao.conflito', title: 'Placa já cadastrada.' },
            { status: 409 },
          ),
        ),
    );
    await expect(api('/x')).rejects.toMatchObject({
      code: 'operacao.conflito',
      message: 'Placa já cadastrada.',
    });
  });
  it('preserves anonymous authentication errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code: 'auth.invalida', title: 'Credenciais inválidas' }, { status: 401 }),
        ),
    );
    await expect(api('/x')).rejects.toMatchObject({ code: 'auth.invalida' });
  });
  it('parses field errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ errors: { Nome: ['Obrigatório.'] } }, { status: 400 })),
    );
    await expect(api('/x')).rejects.toMatchObject({
      code: 'Validation.Failed',
      fieldErrors: { Nome: ['Obrigatório.'] },
    });
  });
  it('reports network failure and preserves abort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed')));
    await expect(api('/x')).rejects.toEqual(expect.any(ApiError));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')));
    await expect(api('/x')).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('omits empty filters and encodes text', () => {
    expect(toQuery({ a: null, b: undefined, c: '', page: 2, query: 'a b' })).toBe(
      '?page=2&query=a+b',
    );
  });
});

it('anonymous calls omit stored credentials and preserve the session on 401', async () => {
  useAuthStore.getState().setSession(session);
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(api('/public', { auth: 'none' })).rejects.toMatchObject({ status: 401 });
  expect(new Headers(fetcher.mock.calls[0][1].headers).has('Authorization')).toBe(false);
  expect(useAuthStore.getState().session?.accessToken).toBe('old');
});
