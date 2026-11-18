import { test, expect } from '../../support/session';

test('telemetry filters use real reports and remain usable on narrow screens', async ({
  page,
  state,
}, testInfo) => {
  await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });

  const seed = await page.request.post('http://127.0.0.1:5081/__test/monitoring', {
    headers: { 'X-AutoCare-Test-Session': state.key },
  });
  expect(seed.status()).toBe(204);
  await page.goto('/backoffice/login');
  await page.getByTestId('bo-login').fill('admin');
  await page.getByTestId('bo-senha').fill('123456');
  await page.getByTestId('bo-login-submit').click();
  await expect(page).toHaveURL(/\/backoffice\/trocar-senha$/);
  await page.getByTestId('bo-senha-atual').fill('123456');
  await page.getByTestId('bo-nova-senha').fill('Senha-Forte-2026');
  await page.getByTestId('bo-confirmar-senha').fill('Senha-Forte-2026');
  await page.getByTestId('bo-password-submit').click();
  await expect(page.getByTestId('page-title')).toHaveText('Visão geral');
  await page.evaluate(() =>
    localStorage.setItem(
      'AutoCareManager-theme',
      JSON.stringify({ state: { theme: 'light' }, version: 0 }),
    ),
  );
  await page.goto('/backoffice/analytics/telemetry');
  await expect(
    page.getByRole('heading', { name: 'Monitoramento de Acessos e Dispositivos' }),
  ).toBeVisible();
  const total = page.getByTestId('monitoring-total-requests');
  const period = page.getByTestId('monitoring-period');
  const traffic = page.getByTestId('monitoring-traffic-type');
  const host = page.getByTestId('monitoring-host');
  await expect(total).toHaveText('120');
  await expect(period.locator('option')).toHaveText([
    'Hoje',
    'Últimos 7 dias',
    'Últimos 30 dias',
    'Personalizado',
  ]);
  await expect(traffic.locator('option')).toHaveText([
    'Todos os acessos',
    'Ocultar Bots/Crawlers',
    'Somente Bots/Crawlers',
  ]);
  await expect(host.locator('option')).toContainText([
    'Todos os hosts',
    'careauto.online',
    'www.careauto.online',
    'Host não informado',
  ]);
  await traffic.selectOption('bots');
  await expect(total).toHaveText('10');
  await traffic.selectOption('humans');
  await expect(total).toHaveText('110');
  await traffic.selectOption('all');
  await host.selectOption('__unknown__');
  await expect(total).toHaveText('11');
  await host.selectOption('careauto.online');
  await expect(total).toHaveText('93');
  await host.selectOption('');
  await period.selectOption('30');
  await expect(total).toHaveText('120');
  await period.selectOption('today');
  await expect
    .poll(async () => Number((await total.innerText()).replace(/\D/g, '')))
    .toBeLessThan(120);
  await period.selectOption('custom');
  await expect(page.getByTestId('monitoring-start-date')).toBeVisible();
  await expect(page.getByTestId('monitoring-end-date')).toBeVisible();
  await period.selectOption('7');
  await expect(total).toHaveText('120');
  await page.getByTestId('monitoring-map-brazil').click();
  await page.getByTestId('monitoring-map-world').click();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByTestId('monitoring-page')).toBeVisible();
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth > window.innerWidth),
    ).toBe(false);
  }
  await expect(page.locator('#main')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: testInfo.outputPath('telemetry-light-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#main')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: testInfo.outputPath('telemetry-light-mobile.png'),
    fullPage: true,
  });
  await page.evaluate(() =>
    localStorage.setItem(
      'AutoCareManager-theme',
      JSON.stringify({ state: { theme: 'dark' }, version: 0 }),
    ),
  );
  await page.reload();
  await expect(total).toHaveText('120');
  await expect(page.locator('#main')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('telemetry-dark-mobile.png'), fullPage: true });
});
