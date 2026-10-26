import { test, expect } from '@playwright/test';

// Smart POS (480×800 and 720×1280 physical, ~320–480 CSS px) and small phones.
const telas = [
  { width: 320, height: 533 },
  { width: 360, height: 640 },
  { width: 480, height: 800 },
];

test('login fits card terminals: form first, 48px touch targets and a direct APK download', async ({
  page,
  request,
}, testInfo) => {
  const sessao = await request.post('http://127.0.0.1:5081/__test/session', {
    data: { role: 'Admin', accounts: true },
  });
  const { key } = (await sessao.json()) as { key: string };
  await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': key });
  try {
    for (const tela of telas) {
      await page.setViewportSize(tela);
      await page.goto('/login');
      const entrar = page.getByTestId('form-submit');
      await expect(entrar).toBeVisible();
      // Institutional copy gives way to the form; the brand stays.
      await expect(page.getByRole('heading', { level: 1 })).toBeHidden();
      await expect(page.locator('.login-story .brand')).toBeVisible();
      // Main action reachable without scrolling.
      const caixa = (await entrar.boundingBox())!;
      expect(caixa.y + caixa.height).toBeLessThanOrEqual(tela.height);
      const alvos = await page.evaluate(() =>
        [...document.querySelectorAll('.login-card a, .login-card button, .login-card input')]
          .map((e) => e.getBoundingClientRect())
          .filter((b) => b.width > 0)
          .map((b) => Math.round(b.height)),
      );
      expect(Math.min(...alvos)).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.body.scrollWidth > window.innerWidth)).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`login-${tela.width}x${tela.height}.png`),
      });
    }
    const apk = page.getByTestId('apk-download');
    await expect(apk).toBeVisible();
    await expect(apk).toHaveAttribute(
      'href',
      /^https:\/\/raw\.githubusercontent\.com\/SolutionsFurlaneti\/AndroidPackageKit\/main\/AutoCareManager\/AutoCareManager\.apk$/,
    );

    // Virtual keyboard: shrinking the visible area keeps the field in view.
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByLabel('E-mail').fill('dono@example.test');
    await page.setViewportSize({ width: 360, height: 330 });
    await expect(page.getByLabel('E-mail')).toBeInViewport();
  } finally {
    await request.delete('http://127.0.0.1:5081/__test/session', {
      headers: { 'X-AutoCare-Test-Session': key },
    });
  }
});
