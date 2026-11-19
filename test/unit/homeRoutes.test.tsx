import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { App } from '../../src/App';
import { useAuthStore } from '../../src/stores/authStore';
import { isNativeApp } from '../../src/lib/device';

vi.mock('../../src/features/monitoring/PageViewTracker', () => ({ PageViewTracker: () => null }));
vi.mock('../../src/features/landing/AboutPage', () => ({ AboutPage: () => <p>Home pública</p> }));
vi.mock('../../src/features/overview/OverviewPage', () => ({
  OverviewPage: () => <p>Painel operacional</p>,
}));
vi.mock('../../src/features/auth/LoginPage', () => ({ LoginPage: () => <p>Acesso à conta</p> }));
vi.mock('../../src/components/AppShell', async () => {
  const { Outlet } = await import('react-router-dom');
  return { AppShell: () => <Outlet /> };
});
vi.mock('../../src/lib/device', () => ({ isNativeApp: vi.fn(() => false) }));

function Location() {
  const location = useLocation();
  return <output data-testid="route">{location.pathname + location.search + location.hash}</output>;
}
function open(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Location />
    </MemoryRouter>,
  );
}
function signIn() {
  useAuthStore.getState().setSession({
    userId: '1',
    userName: 'Marina',
    email: '',
    accessToken: 'token',
    roles: ['Admin'],
    estabelecimentoId: 1,
    estabelecimentoNome: 'CareAuto',
    expiresAtUtc: '2099-01-01T00:00:00Z',
  });
}
beforeEach(() => {
  useAuthStore.getState().clear();
  vi.mocked(isNativeApp).mockReturnValue(false);
});

describe('public home and protected dashboard routes', () => {
  it('serves the public home for an anonymous visitor', async () => {
    open('/');
    await screen.findByText('Home pública');
    expect(screen.getByTestId('route')).toHaveTextContent(/^\/$/);
  });
  it('keeps the public home available when signed in', async () => {
    signIn();
    open('/');
    await screen.findByText('Home pública');
  });
  it('redirects the legacy route to its home anchor within the SPA', async () => {
    open('/sobrenos');
    await screen.findByText('Home pública');
    expect(screen.getByTestId('route')).toHaveTextContent('/#sobre');
  });
  it('protects the dashboard for anonymous visitors', async () => {
    open('/visao-geral');
    await screen.findByText('Acesso à conta');
    expect(screen.getByTestId('route')).toHaveTextContent('/login');
  });
  it('retains campaign parameters during the legacy SPA redirect', async () => {
    open('/sobrenos?gclid=demo');
    await screen.findByText('Home pública');
    expect(screen.getByTestId('route')).toHaveTextContent('/?gclid=demo#sobre');
  });
  it('opens the operational dashboard after authentication', async () => {
    signIn();
    open('/visao-geral');
    await screen.findByText('Painel operacional');
  });
  it('preserves dashboard startup inside the installed Android app', async () => {
    signIn();
    vi.mocked(isNativeApp).mockReturnValue(true);
    open('/');
    await screen.findByText('Painel operacional');
    expect(screen.getByTestId('route')).toHaveTextContent('/visao-geral');
  });
});
