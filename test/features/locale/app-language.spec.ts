import type { Page } from '@playwright/test';
import { test, expect } from '../../support/session';

async function selectMenuLocale(page: Page, locale: 'pt-BR' | 'en-US') {
  const selector = page.getByTestId('language-selector');
  if (!(await selector.isVisible())) await page.getByTestId('nav-open').click();
  await selector.selectOption(locale);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  if ((page.viewportSize()?.width ?? 1440) < 900) {
    await selector.press('Escape');
    await expect(selector).toBeHidden();
  }
}

test('operations render in English while customer data and API records stay unchanged', async ({
  authenticated: page,
}, testInfo) => {
  await selectMenuLocale(page, 'en-US');
  await page.goto('/clientes');
  await expect(page.getByTestId('page-title')).toHaveText('Customers');
  await page.getByTestId('record-new').click();
  await expect(page.getByRole('dialog')).toContainText('Add customer');
  await page.getByTestId('field-nomeOuRazaoSocial').fill('Cliente São João');
  await page.getByTestId('field-documento').fill('12345678901');
  await page.getByTestId('form-submit').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('clientes-table-row')).toContainText('Cliente São João');
  await expect(page.getByTestId('clientes-table-row')).toContainText('Active');
  for (const [route, title] of [
    ['/veiculos', 'Vehicles'],
    ['/pagamentos', 'Payments'],
    ['/integracoes', 'Integrations'],
    ['/impressao', 'Printing'],
    ['/estacionamento', 'Parking'],
  ]) {
    await page.goto(route);
    await expect(page.getByTestId('page-title')).toHaveText(title);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/clientes');
  await page.reload();
  await expect(page.getByTestId('page-title')).toHaveText('Customers');
  await expect(page.getByTestId('clientes-table-row')).toContainText('Cliente São João');
  await page.screenshot({ path: testInfo.outputPath('customers-en.png'), fullPage: true });
  await selectMenuLocale(page, 'pt-BR');
  await expect(page.getByTestId('page-title')).toHaveText('Clientes');
  await expect(page.getByTestId('clientes-table-row')).toContainText('Cliente São João');
  await expect(page.getByTestId('clientes-table-row')).toContainText('Ativo');
});

test('backoffice uses the saved locale for access, forms, plans and navigation', async ({
  page,
  state,
}, testInfo) => {
  test.setTimeout(90_000);
  await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
  await page.goto('/backoffice/login');
  await page.getByTestId('language-selector').selectOption('en-US');
  await expect(page.getByRole('heading', { name: 'Sign in to the backoffice' })).toBeVisible();
  await page.getByTestId('bo-login').fill('admin');
  await page.getByTestId('bo-senha').fill('123456');
  await page.getByTestId('bo-login-submit').click();
  await expect(page).toHaveURL(/\/backoffice\/trocar-senha$/);
  await expect(page.getByTestId('language-selector')).toHaveValue('en-US');
  await page.getByTestId('bo-senha-atual').fill('123456');
  await page.getByTestId('bo-nova-senha').fill('Language-Test-2026');
  await page.getByTestId('bo-confirmar-senha').fill('Language-Test-2026');
  await page.getByTestId('bo-password-submit').click();
  await expect(page.getByTestId('page-title')).toHaveText('Overview');
  await page.goto('/backoffice/planos');
  await expect(page.getByTestId('page-title')).toHaveText('Plans');
  await page.getByTestId('bo-plan-new').click();
  await page.getByTestId('bo-plan-nome').fill('Plano São João');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('bo-plans')).toContainText('Plano São João');
  for (const [route, title] of [
    ['/backoffice/assinantes', 'Subscribers'],
    ['/backoffice/cobrancas', 'Charges'],
    ['/backoffice/integracoes', 'Integrations'],
  ]) {
    await page.goto(route);
    await expect(page.getByTestId('page-title')).toHaveText(title);
  }
  await page.goto('/backoffice/planos');
  await page.reload();
  await expect(page.getByTestId('page-title')).toHaveText('Plans');
  await expect(page.getByTestId('bo-plans')).toContainText('Plano São João');
  await page.screenshot({ path: testInfo.outputPath('backoffice-en.png'), fullPage: true });
  await selectMenuLocale(page, 'pt-BR');
  await expect(page.getByTestId('page-title')).toHaveText('Planos');
  await expect(page.getByTestId('bo-plans')).toContainText('Plano São João');
});
