import { test, expect } from '@playwright/test';

const HOST = 'http://127.0.0.1:5081';
const API = HOST + '/api/v1/backoffice/';

test('visitor explores the public home and simulators, then registers with the published plan selected', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);
  // This isolated Internal-mode API owns its database; no production service is involved.
  const session = await request.post(HOST + '/__test/session', {
    data: { role: 'Admin', accounts: true },
  });
  expect(session.ok()).toBeTruthy();
  const state = (await session.json()) as { key: string };
  const headers = { 'X-AutoCare-Test-Session': state.key };
  try {
    const login = await request.post(API + 'auth/login', {
      headers,
      data: { login: 'admin', senha: '123456' },
    });
    expect(login.ok()).toBeTruthy();
    const temporary = (await login.json()) as { accessToken: string };
    const password = await request.post(API + 'auth/trocar-senha', {
      headers: { ...headers, Authorization: 'Bearer ' + temporary.accessToken },
      data: { senhaAtual: '123456', novaSenha: 'Senha-Forte-2026' },
    });
    expect(password.ok()).toBeTruthy();
    const admin = {
      ...headers,
      Authorization: 'Bearer ' + ((await password.json()) as { accessToken: string }).accessToken,
    };
    // Publish actual plans through the same backoffice endpoints used by administrators.
    for (const plan of [
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
    ]) {
      const created = await request.post(API + 'planos', { headers: admin, data: plan });
      expect(created.status()).toBe(201);
    }
    const publicPlans = await request.get(HOST + '/api/v1/publico/planos', { headers });
    expect(publicPlans.ok()).toBeTruthy();
    const published = (await publicPlans.json()) as { planoId: number; nome: string }[];
    const chosen = published.find((plan) => plan.nome === 'Semestral à vista');
    expect(chosen).toBeDefined();
    if (!chosen) throw new Error('Published prepaid plan was not returned by the public API.');

    await page.context().setExtraHTTPHeaders(headers);
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle(/CareAuto/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('tudo sob controle');
    await expect(page.getByTestId('lp-features').locator('article')).toHaveCount(11);
    await expect(page.getByTestId('lp-header-cta')).toHaveAttribute('href', '/primeiro-acesso');
    await expect(page.getByRole('link', { name: 'Ver demonstração' })).toHaveAttribute(
      'href',
      '#como-funciona',
    );

    // Legacy links still enter the public funnel rather than requiring a login.
    await page.goto('/sobrenos');
    await expect(page).toHaveURL(/\/#sobre$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const plans = page.getByTestId('lp-plans');
    await expect(plans.getByTestId('lp-plan')).toHaveCount(2);
    await expect(plans).toContainText('Trimestral');
    await page.getByTestId('lp-tab-PRE_PAGO').click();
    await expect(plans).toContainText('R$ 89,10');
    await expect(plans).toContainText('534,60 à vista por 6 meses');
    await expect(plans).toContainText('10% off');
    await expect(page.getByTestId(`lp-plan-cta-${chosen.planoId}`)).toHaveAttribute(
      'href',
      `/primeiro-acesso?planId=${chosen.planoId}`,
    );
    await page.getByTestId('lp-tab-POS_PAGO').click();
    await expect(plans.getByTestId('lp-plan')).toHaveCount(2);

    await page.getByRole('button', { name: 'Os planos têm funcionalidades diferentes?' }).click();
    await expect(
      page.getByText(/Não\. Todos os planos incluem todas as funcionalidades/),
    ).toBeVisible();

    await expect(page.getByTestId('lp-tutorial-coming-soon')).toBeVisible();
    await page.getByRole('tab', { name: 'Configuração', exact: true }).click();
    await expect(
      page.getByRole('tabpanel').filter({ hasText: 'Prepare a operação do seu negócio' }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Dia a dia', exact: true }).click();
    await expect(page.getByText('Da primeira entrada ao recebimento')).toBeVisible();
    await expect(page.locator('#como-funciona iframe, #como-funciona video')).toHaveCount(0);
    await expect(page.getByTestId('lp-testimonials-empty')).toContainText(
      'Relatos de clientes em breve',
    );

    // Expected numbers come from the explicit assumptions entered by this visitor.
    await page.getByTestId('lp-simulator-vehiclesPerDay').fill('20');
    await page.getByTestId('lp-simulator-servicePercent').fill('10');
    await page.getByTestId('lp-simulator-servicePrice').fill('35');
    const result = page.getByTestId('lp-simulator-result');
    await expect(result).toContainText('R$ 1.820,00');
    await page.getByTestId('lp-simulator-time-tab').click();
    await page.getByTestId('lp-simulator-minutesPerVehicle').fill('3');
    await page.getByTestId('lp-simulator-hourlyCost').fill('20');
    await expect(result).toContainText('R$ 520,00');
    await expect(result).toContainText('26 horas');
    await page.getByTestId('lp-simulator-vehiclesPerDay').fill('');
    await expect(result).toContainText('Ajuste os campos indicados');
    await expect(result).not.toContainText('NaN');
    await page.getByTestId('lp-simulator-vehiclesPerDay').fill('20');
    await expect(result).toContainText('R$ 520,00');
    await expect(page.getByTestId('lp-simulator-cta')).toHaveAttribute('href', '#planos');

    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByTestId('lp-menu').click();
    const menu = page.getByRole('navigation', { name: 'Seções' });
    await expect(menu).toBeVisible();
    for (const label of ['Como funciona', 'Funcionalidades', 'Simulador', 'Planos', 'Depoimentos'])
      await expect(menu.getByRole('link', { name: label, exact: true })).toBeVisible();
    await menu.getByRole('link', { name: 'Simulador', exact: true }).click();
    await expect(menu).not.toBeVisible();
    await expect(page).toHaveURL(/#simulador$/);

    for (const theme of ['light', 'dark']) {
      if ((await page.locator('html').getAttribute('data-theme')) !== theme) {
        const compact = page.viewportSize()!.width < 600;
        if (compact) await page.getByTestId('lp-menu').click();
        await page.getByTestId('lp-theme-toggle').click();
        if (compact) await page.getByRole('button', { name: 'Fechar menu' }).click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <=
                window.innerWidth,
            ),
          )
          .toBe(true);
        const cta = await page.getByTestId('lp-header-cta').boundingBox();
        expect(cta).not.toBeNull();
        expect(cta!.x).toBeGreaterThanOrEqual(0);
        expect(cta!.x + cta!.width).toBeLessThanOrEqual(width);
      }
    }
    await page.setViewportSize({
      width: testInfo.project.name === 'mobile' ? 390 : 1440,
      height: 900,
    });
    await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });

    await page.getByTestId('lp-tab-PRE_PAGO').click();
    await page.getByTestId(`lp-plan-cta-${chosen.planoId}`).click();
    await expect(page).toHaveURL(new RegExp(`/primeiro-acesso\\?planId=${chosen.planoId}$`));
    await expect(page.getByTestId('setup-selected-plan')).toContainText('Semestral à vista');
    await expect(page.getByTestId('setup-selected-plan')).toContainText(
      '534,60 à vista por 6 meses',
    );
    await expect(page.getByTestId('field-estacionamento')).toBeVisible();
  } finally {
    await request.delete(HOST + '/__test/session', { headers });
  }
});
