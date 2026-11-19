import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MaterialTheme } from '../../src/components/MaterialTheme';
import { AboutPage } from '../../src/features/landing/AboutPage';
import { agrupar, destaque, oferta, type PlanoPublico } from '../../src/features/landing/plans';
import { useThemeStore } from '../../src/stores/themeStore';

const plano = (p: Partial<PlanoPublico>): PlanoPublico => ({
  planoId: 1,
  nome: 'Pós mensal',
  tipo: 'POS_PAGO',
  periodicidade: 'MENSAL',
  meses: 1,
  valorMensal: 129,
  descontoPercentual: 0,
  valorPeriodo: 129,
  descricao: null,
  ...p,
});
const semestral = plano({
  planoId: 2,
  nome: 'Semestral à vista',
  tipo: 'PRE_PAGO',
  periodicidade: 'SEMESTRAL',
  meses: 6,
  valorMensal: 99,
  descontoPercentual: 10,
  valorPeriodo: 534.6,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function abrir() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MaterialTheme>
        <MemoryRouter initialEntries={['/']}>
          <AboutPage />
        </MemoryRouter>
      </MaterialTheme>
    </QueryClientProvider>,
  );
}
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => useThemeStore.setState({ theme: 'dark' }));

describe('sales page plans', () => {
  it('shows the monthly equivalent, the upfront total and the real savings', () => {
    const o = oferta(semestral);
    expect(o.mensal).toBe(89.1);
    expect(o.cobranca).toMatch(/534,60 à vista por 6 meses/);
    expect(o.economia).toMatch(/10% off · economize R\$\s?59,40/);
    expect(oferta(plano({})).economia).toBeNull();
    expect(oferta(plano({})).cobranca).toBe('Cobrança mensal por boleto');
    expect(agrupar([plano({}), semestral]).prePago).toEqual([semestral]);
    expect(destaque([plano({}), semestral])).toBe(2);
    expect(destaque([plano({})])).toBeNull();
  });

  it('lists real payment modes, shows the billing total and preserves each selected plan in the sign-up link', async () => {
    const fetcher = vi.fn().mockResolvedValue(json([plano({}), semestral]));
    vi.stubGlobal('fetch', fetcher);
    abrir();
    expect(document.title).toMatch(/CareAuto/);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(
      /7 dias/,
    );
    const lista = await screen.findByTestId('lp-plans');
    expect(within(lista).getByText('Pós mensal')).toBeVisible();
    expect(within(lista).queryByText('Semestral à vista')).not.toBeInTheDocument();
    expect(screen.getByTestId('lp-plan-cta-1')).toHaveAttribute(
      'href',
      '/primeiro-acesso?planId=1',
    );
    await userEvent.click(screen.getByTestId('lp-tab-PRE_PAGO'));
    expect(screen.getByTestId('lp-tab-PRE_PAGO')).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByTestId('lp-plans')).getByText(/R\$\s?89,10/)).toBeVisible();
    expect(
      within(screen.getByTestId('lp-plans')).getByText(/534,60 à vista por 6 meses/),
    ).toBeVisible();
    expect(screen.getByTestId('lp-plan-cta-2')).toHaveAttribute(
      'href',
      '/primeiro-acesso?planId=2',
    );
    expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/publico/planos');
    for (const id of ['lp-header-cta', 'lp-hero-cta', 'lp-final-cta'])
      expect(screen.getByTestId(id).getAttribute('href')).toBe('/primeiro-acesso');
    await userEvent.click(screen.getByTestId('lp-tab-POS_PAGO'));
    expect(within(screen.getByTestId('lp-plans')).getByText('Pós mensal')).toBeVisible();
  });

  it('offers every funnel section through the mobile menu, all 11 catalog features and expandable answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([plano({})])));
    abrir();
    await screen.findByTestId('lp-plans');
    expect(within(screen.getByTestId('lp-features')).getAllByRole('article')).toHaveLength(11);
    expect(screen.getByRole('link', { name: 'Ver demonstração' })).toHaveAttribute(
      'href',
      '#como-funciona',
    );
    expect(screen.getByText('Vídeo tutorial em breve')).toBeVisible();
    expect(document.querySelector('#como-funciona iframe, #como-funciona video')).toBeNull();
    expect(screen.getByTestId('lp-testimonials-empty')).toBeVisible();
    await userEvent.click(screen.getByTestId('lp-menu'));
    const nav = screen.getByRole('navigation', { name: 'Seções' });
    for (const [nome, id] of [
      ['Como funciona', 'como-funciona'],
      ['Funcionalidades', 'funcionalidades'],
      ['Simulador', 'simulador'],
      ['Planos', 'planos'],
      ['Depoimentos', 'depoimentos'],
    ]) {
      expect(within(nav).getByRole('link', { name: nome })).toHaveAttribute('href', `#${id}`);
      expect(document.getElementById(id)).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Os planos têm funcionalidades diferentes?' }),
    );
    expect(
      screen.getByText(/Não\. Todos os planos incluem todas as funcionalidades/),
    ).toBeVisible();
  });

  it('shows an empty catalog without inventing a price or a plan ID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([])));
    abrir();
    const bloco = await screen.findByTestId('lp-plans-fallback');
    expect(bloco).toHaveTextContent('Novos planos em breve');
    expect(bloco).not.toHaveTextContent(/R\$/);
    expect(within(bloco).getByRole('link')).toHaveAttribute('href', '/primeiro-acesso');
    expect(screen.queryByTestId('lp-plans-error')).not.toBeInTheDocument();
  });

  it('distinguishes API failure from no plans and lets visitors retry for current prices', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ title: 'Indisponível' }, 500))
      .mockResolvedValueOnce(json([semestral]));
    vi.stubGlobal('fetch', fetcher);
    abrir();
    expect(await screen.findByTestId('lp-plans-error')).toHaveTextContent(
      'Não foi possível carregar os planos',
    );
    expect(screen.queryByTestId('lp-plans-fallback')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByTestId('lp-plans')).toHaveTextContent('Semestral à vista');
    expect(screen.queryByTestId('lp-plans-error')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Pós-pago' })).not.toBeInTheDocument();
    expect(screen.getByTestId('lp-plan-cta-2')).toHaveAttribute(
      'href',
      '/primeiro-acesso?planId=2',
    );
  });
});
