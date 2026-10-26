import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AboutPage } from '../../src/features/landing/AboutPage';
import { agrupar, destaque, oferta, type PlanoPublico } from '../../src/features/landing/plans';

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
      <MemoryRouter initialEntries={['/sobrenos']}>
        <AboutPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => vi.unstubAllGlobals());

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

  it('lists the published plans by payment mode and sends every CTA to the sign-up', async () => {
    const fetcher = vi.fn().mockResolvedValue(json([plano({}), semestral]));
    vi.stubGlobal('fetch', fetcher);
    abrir();
    expect(document.title).toMatch(/AutoCare/);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(
      /7 dias/,
    );
    const lista = await screen.findByTestId('lp-plans');
    expect(within(lista).getByText('Pós mensal')).toBeTruthy();
    expect(within(lista).queryByText('Semestral à vista')).toBeNull();
    await userEvent.click(screen.getByTestId('lp-tab-PRE_PAGO'));
    expect(within(screen.getByTestId('lp-plans')).getByText(/R\$\s?89,10/)).toBeTruthy();
    expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/publico/planos');
    for (const id of ['lp-hero-cta', 'lp-final-cta'])
      expect(screen.getByTestId(id).getAttribute('href')).toBe('/primeiro-acesso');
    expect(screen.getAllByTestId('lp-features')[0].children.length).toBeGreaterThan(8);
  });

  it('falls back to the minimum price when no plan is published or the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)));
    abrir();
    const bloco = await screen.findByTestId('lp-plans-fallback');
    expect(bloco.textContent).toMatch(/R\$\s?99,00/);
  });
});
