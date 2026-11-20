import { expect, test, type Page } from '@playwright/test';

const HOST = 'http://127.0.0.1:5081';
type PublicLocale = 'pt-BR' | 'en-US';

async function chooseHomeLanguage(page: Page, locale: PublicLocale) {
  const compact = page.viewportSize()!.width < 600;
  if (compact) await page.getByTestId('lp-menu').click();
  const selector = page.getByTestId('language-selector');
  await expect(selector).toBeVisible();
  await selector.selectOption(locale);
  await expect(selector).toHaveValue(locale);
  if (compact)
    await page
      .getByRole('button', { name: locale === 'en-US' ? 'Close menu' : 'Fechar menu', exact: true })
      .click();
}

test('visitor switches public pages between Portuguese and English without losing entered data', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);
  // The real API uses an isolated in-memory database and Internal account configuration.
  const created = await request.post(HOST + '/__test/session', {
    data: { role: 'Admin', accounts: true },
  });
  expect(created.ok()).toBeTruthy();
  const { key } = (await created.json()) as { key: string };
  const headers = { 'X-AutoCare-Test-Session': key };
  await page.context().setExtraHTTPHeaders(headers);
  try {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('tudo sob controle.');
    await page.getByTestId('lp-simulator-vehiclesPerDay').fill('37');
    await page.getByTestId('lp-simulator-servicePrice').fill('42.5');
    await page.getByRole('tab', { name: 'Configuração', exact: true }).click();

    await chooseHomeLanguage(page, 'en-US');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page).toHaveTitle('CareAuto | Parking and car wash management · 7 days free');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Track vehicle arrivals and departures/,
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'everything under control.',
    );
    await expect(page.getByTestId('lp-tutorial-progress')).toHaveText('Step 2 of 3');
    await expect(
      page.getByRole('heading', { name: 'Get your business ready to operate' }),
    ).toBeVisible();
    await expect(page.getByTestId('lp-simulator-vehiclesPerDay')).toHaveValue('37');
    await expect(page.getByTestId('lp-simulator-servicePrice')).toHaveValue('42.5');
    await page.getByRole('tab', { name: 'Registration', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Create your administrator account' }),
    ).toBeVisible();
    await expect(page.getByText('Video tutorial coming soon', { exact: true })).toBeVisible();
    await page
      .locator('#como-funciona')
      .screenshot({ path: testInfo.outputPath('landing-en.png') });

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page).toHaveTitle('CareAuto | Parking and car wash management · 7 days free');

    const tutorials = page.locator('#como-funciona');
    const preview = tutorials.getByTestId('lp-tutorial-preview');
    const card = tutorials.locator('.MuiCard-root');
    for (const locale of ['pt-BR', 'en-US'] as const) {
      await chooseHomeLanguage(page, locale);
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await tutorials.getByTestId('lp-tutorial-read-instructions').click();
        const heading = tutorials.getByRole('heading', {
          name:
            locale === 'en-US'
              ? 'Create your administrator account'
              : 'Crie sua conta de administrador',
        });
        await expect(heading).toBeFocused();
        await expect.poll(() => card.evaluate((element) => element.scrollLeft)).toBe(0);
        const cardBounds = await card.boundingBox();
        expect(cardBounds).not.toBeNull();
        for (const element of [preview, heading]) {
          const bounds = await element.boundingBox();
          expect(bounds).not.toBeNull();
          expect(bounds!.x).toBeGreaterThanOrEqual(cardBounds!.x - 1);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
            cardBounds!.x + cardBounds!.width + 1,
          );
        }
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <=
                window.innerWidth,
            ),
          )
          .toBe(true);
        const signupBounds = await page.getByTestId('lp-header-cta').boundingBox();
        expect(signupBounds).not.toBeNull();
        expect(signupBounds!.x).toBeGreaterThanOrEqual(0);
        expect(signupBounds!.x + signupBounds!.width).toBeLessThanOrEqual(width);
      }
    }

    await page.setViewportSize({
      width: testInfo.project.name === 'mobile' ? 390 : 1440,
      height: 900,
    });
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page).toHaveTitle('CareAuto | Parking and car wash management · 7 days free');
    await expect(page.getByRole('heading', { name: 'Ready to get started?' })).toBeVisible();
    await page.getByTestId('field-email').fill('owner.language@example.test');
    await page.getByTestId('field-senha').fill('Language123');
    await page.getByTestId('language-selector').selectOption('pt-BR');
    await expect(page.getByRole('heading', { name: 'Vamos começar?' })).toBeVisible();
    await expect(page.getByTestId('field-email')).toHaveValue('owner.language@example.test');
    await expect(page.getByTestId('field-senha')).toHaveValue('Language123');
    await page.getByTestId('language-selector').selectOption('en-US');
    await expect(page.getByTestId('field-email')).toHaveValue('owner.language@example.test');
    await expect(page.getByTestId('field-senha')).toHaveValue('Language123');
    await page.getByRole('link', { name: 'Register my business', exact: true }).click();

    await expect(page).toHaveURL(/\/primeiro-acesso$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(
      page.getByRole('heading', { name: 'Your parking business starts here.' }),
    ).toBeVisible();
    await expect(page.getByTestId('setup-progress')).toHaveText('Step 1 of 3');
    await page.getByTestId('field-estacionamento').fill('Estacionamento São João');
    await page.getByTestId('field-nome').fill('João da Silva');
    await page.getByTestId('field-email').fill('owner.language@example.test');
    await page.getByTestId('language-selector').selectOption('pt-BR');
    await expect(
      page.getByRole('heading', { name: 'Seu estacionamento começa aqui.' }),
    ).toBeVisible();
    await expect(page.getByTestId('setup-progress')).toHaveText('Etapa 1 de 3');
    await expect(page.getByTestId('field-estacionamento')).toHaveValue('Estacionamento São João');
    await expect(page.getByTestId('field-nome')).toHaveValue('João da Silva');
    await expect(page.getByTestId('field-email')).toHaveValue('owner.language@example.test');
    await page.getByTestId('language-selector').selectOption('en-US');
    await expect(page.getByTestId('field-estacionamento')).toHaveValue('Estacionamento São João');
    await expect(page.getByTestId('field-nome')).toHaveValue('João da Silva');
    await expect(page.getByTestId('field-email')).toHaveValue('owner.language@example.test');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page.getByTestId('language-selector')).toHaveValue('en-US');

    await page.getByTestId('language-selector').selectOption('pt-BR');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page).toHaveTitle(
      'CareAuto | Sistema para estacionamento e lava-rápido · 7 dias grátis',
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText('tudo sob controle.');
  } finally {
    await request.delete(HOST + '/__test/session', { headers });
  }
});
