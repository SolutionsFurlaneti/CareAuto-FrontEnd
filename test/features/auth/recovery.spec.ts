import { test, expect } from '@playwright/test';

test('recuperação acessível pelo login em diferentes larguras', async ({ page }) => {
  await page.route('**/api/v1/auth/configuracao', (route) => route.fulfill({ json: { mode: 'Internal', registrationEnabled: true } }));
  await page.route('**/api/v1/auth/recuperar-senha', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: 'owner@example.test' });
    await route.fulfill({ json: true });
  });
  await page.goto('/login');
  await page.getByTestId('forgot-password').click();
  await expect(page.getByRole('heading', { name: 'Esqueceu sua senha?' })).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Enviar senha provisória' })).toBeVisible();
  }
  await page.getByRole('textbox', { name: 'E-mail cadastrado' }).fill('owner@example.test');
  await page.getByRole('button', { name: 'Enviar senha provisória' }).click();
  await expect(page.getByRole('status')).toContainText('30 minutos');
  await page.getByTestId('recovery-login').click();
  await expect(page.getByTestId('forgot-password')).toBeVisible();
});
