import { test, expect, openNav } from '../../support/session';

test('admin opens each integration from the hub and saves one tab at a time without exposing credentials', async ({
  authenticated: page,
}, testInfo) => {
  await openNav(page, 'nav-integracoes');
  const hub = page.getByTestId('integration-hub');
  await expect(hub.getByRole('link')).toHaveCount(3);
  await expect(page.getByTestId('form-submit')).toHaveCount(0);
  await expect(
    page.getByTestId('integration-card-claude').getByTestId(/^status-(ATIVA|ENCERRADA)$/),
  ).toBeVisible();

  await page.getByTestId('integration-card-claude').click();
  await expect(page).toHaveURL(/\/integracoes\/claude$/);
  const header = page.getByTestId('integration-header');
  const claude = page.getByTestId('integration-claude');
  await expect(claude.getByTestId('tab-credenciais')).toHaveAttribute('aria-selected', 'true');
  await expect(claude.getByTestId('field-nomeChave')).toHaveValue('autocaremanager-dev');
  await expect(claude.getByTestId('field-modelo')).toHaveCount(0);
  await claude.getByTestId('field-chaveApi').fill('sk-ant-e2e-fake-key');
  await claude.getByTestId('field-ativo').selectOption('true');
  await claude.getByTestId('form-submit').click();
  await expect(header.getByTestId('status-ATIVA')).toBeVisible();
  await expect(claude.getByTestId('field-chaveApi')).toHaveValue('');
  await expect(claude.getByText(/Credencial salva: •/)).toBeVisible();

  await claude.getByTestId('tab-configuracoes').click();
  await expect(page).toHaveURL(/tab=configuracoes/);
  await expect(claude.getByTestId('field-chaveApi')).toHaveCount(0);
  await claude.getByTestId('field-maximoTokens').fill('900');
  await claude.getByTestId('form-submit').click();
  await expect(claude.getByTestId('form-submit')).toBeEnabled();
  await claude.getByTestId('tab-status').click();
  await expect(claude.getByTestId('integration-status')).toContainText('Salva');

  await page.getByTestId('integrations-back').click();
  await expect(
    page.getByTestId('integration-card-claude').getByTestId('status-ATIVA'),
  ).toBeVisible();
  await page.getByTestId('integration-card-consulta-placa').click();
  const plate = page.getByTestId('integration-consulta-placa');
  await plate.getByTestId('field-token').fill('test-token-never-sent-to-provider');
  await plate.getByTestId('field-ativo').selectOption('true');
  await plate.getByTestId('form-submit').click();
  await expect(header.getByTestId('status-ATIVA')).toBeVisible();
  await expect(plate.getByTestId('field-token')).toHaveValue('');
  await page.reload();
  await expect(plate.getByText(/Credencial salva: •/)).toBeVisible();

  await page.goto('/integracoes/claude?tab=configuracoes');
  await expect(claude.getByTestId('field-maximoTokens')).toHaveValue('900');
  await claude.getByTestId('tab-credenciais').click();
  await expect(claude.getByTestId('field-chaveApi')).toHaveValue('');
  await claude.getByTestId('field-ativo').selectOption('false');
  await claude.getByTestId('field-removerChaveApi').selectOption('true');
  await claude.getByTestId('form-submit').click();
  await expect(claude.getByText('Nenhuma credencial salva.')).toBeVisible();
  await expect(header.getByTestId('status-ENCERRADA')).toBeVisible();

  await expect(page.getByTestId('integration-credential-rule')).toContainText(
    'Credenciais próprias',
  );
  await expect(claude.getByTestId('field-chaveApi')).toBeVisible();
  await page.getByTestId('theme-toggle').click();
  for (const url of ['/integracoes', '/integracoes/claude?tab=configuracoes']) {
    await page.goto(url);
    await expect(page.getByTestId('page-title')).toBeVisible();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth > window.innerWidth),
      ).toBe(false);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('integrations-light.png'), fullPage: true });
});
