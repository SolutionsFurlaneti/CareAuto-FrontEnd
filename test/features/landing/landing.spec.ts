import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:5081/api/v1/backoffice/';

test('Google visitor sees every feature, the plans published in the backoffice and starts the free trial', async ({
  page,
  request,
}, testInfo) => {
  // Own session in the internal-accounts mode: the sign-up page is only open there.
  const sessao = await request.post('http://127.0.0.1:5081/__test/session', {
    data: { role: 'Admin', accounts: true },
  });
  expect(sessao.ok()).toBeTruthy();
  const state = (await sessao.json()) as { key: string };
  const headers = { 'X-AutoCare-Test-Session': state.key };
  // Publish plans the way the platform admin does, through the backoffice API.
  const login = await request.post(API + 'auth/login', {
    headers,
    data: { login: 'admin', senha: '123456' },
  });
  const temporaria = (await login.json()) as { accessToken: string };
  const troca = await request.post(API + 'auth/trocar-senha', {
    headers: { ...headers, Authorization: 'Bearer ' + temporaria.accessToken },
    data: { senhaAtual: '123456', novaSenha: 'Senha-Forte-2026' },
  });
  const admin = {
    ...headers,
    Authorization: 'Bearer ' + ((await troca.json()) as { accessToken: string }).accessToken,
  };
  for (const plano of [
    {
      nome: 'Mensal',
      tipo: 'POS_PAGO',
      periodicidade: 'MENSAL',
      valorMensal: 129,
      descontoPercentual: 0,
    },
    {
      nome: 'Trimestral',
      tipo: 'POS_PAGO',
      periodicidade: 'TRIMESTRAL',
      valorMensal: 119,
      descontoPercentual: 0,
    },
    {
      nome: 'Semestral à vista',
      tipo: 'PRE_PAGO',
      periodicidade: 'SEMESTRAL',
      valorMensal: 99,
      descontoPercentual: 10,
    },
  ])
    expect((await request.post(API + 'planos', { headers: admin, data: plano })).status()).toBe(
      201,
    );

  await page.context().setExtraHTTPHeaders(headers);
  await page.goto('/sobrenos');
  await expect(page).toHaveTitle(/CareAuto/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tudo sob controle');
  await expect(page.getByTestId('lp-features').locator('article')).toHaveCount(11);
  const planos = page.getByTestId('lp-plans');
  await expect(planos.getByTestId('lp-plan')).toHaveCount(2);
  await expect(planos).toContainText('Trimestral');
  await page.getByTestId('lp-tab-PRE_PAGO').click();
  await expect(planos).toContainText('R$ 89,10');
  await expect(planos).toContainText('534,60 à vista por 6 meses');
  await expect(planos).toContainText('10% off');

  await page.getByText('Os planos têm funcionalidades diferentes?').click();
  await expect(page.getByText('Todos os planos incluem todas as funcionalidades.')).toBeVisible();

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.body.scrollWidth > window.innerWidth)).toBe(false);
  }
  await page.setViewportSize({
    width: testInfo.project.name === 'mobile' ? 390 : 1440,
    height: 900,
  });
  await page.screenshot({ path: testInfo.outputPath('sobrenos.png'), fullPage: true });

  await page.getByTestId('lp-hero-cta').click();
  await expect(page).toHaveURL(/\/primeiro-acesso$/);
  await expect(page.getByTestId('field-estacionamento')).toBeVisible();
  await request.delete('http://127.0.0.1:5081/__test/session', { headers });
});

