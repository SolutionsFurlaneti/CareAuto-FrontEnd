import { test, expect, openNav } from '../../support/session';
test('logout does not restore the old session on navigation', async ({ authenticated: page }) => {
  if ((page.viewportSize()?.width ?? 1440) < 900) await page.getByTestId('nav-open').click();
  await page.getByTestId('logout').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/clientes');
  await expect(page).toHaveURL(/\/login$/);
});
test('session expiry clears access and preserves login route', async ({
  authenticated: page,
  state,
}) => {
  await page.evaluate(
    (session) =>
      localStorage.setItem(
        'AutoCareManager-auth',
        JSON.stringify({
          state: { session: { ...session, expiresAtUtc: '2000-01-01T00:00:00Z' } },
          version: 0,
        }),
      ),
    state.session,
  );
  await page.goto('/pagamentos');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Sua sessão expirou. Entre novamente.')).toBeVisible();
});
test('responsive layout and both themes remain usable', async ({ authenticated: page }) => {
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await openNav(page, 'nav-clientes');
    await page.getByTestId('record-new').click();
    await expect(page.getByTestId('form-submit')).toBeInViewport();
    await page.getByTestId('form-cancel').click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  }
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
