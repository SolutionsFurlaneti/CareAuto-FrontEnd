import { test, expect } from '../../support/session';
import type { EmailPanel } from '../../../src/features/backoffice/api';

test('email panel previews templates and confirms only eligible selected recipients', async ({
  page,
  state,
}, testInfo) => {
  await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
  await page.goto('/backoffice/login');
  await page.getByTestId('bo-login').fill('admin');
  await page.getByTestId('bo-senha').fill('123456');
  await page.getByTestId('bo-login-submit').click();
  await page.getByTestId('bo-senha-atual').fill('123456');
  await page.getByTestId('bo-nova-senha').fill('Strong-Example-2026');
  await page.getByTestId('bo-confirmar-senha').fill('Strong-Example-2026');
  await page.getByTestId('bo-password-submit').click();
  await expect(page.getByTestId('page-title')).toHaveText('Visão geral');
  // Real templates from the isolated API; simulate recipients/queue without sending any mail.
  await page.route('**/api/v1/backoffice/emails', async (route) => {
    const response = await route.fetch();
    const panel = (await response.json()) as EmailPanel;
    await route.fulfill({
      json: {
        ...panel,
        habilitado: true,
        destinatarios: [
          {
            estabelecimentoId: 1,
            nome: 'Estacionamento novo',
            email: 'novo@example.test',
            boasVindasStatus: null,
            orientacaoAsaasStatus: null,
          },
          {
            estabelecimentoId: 2,
            nome: 'Já recebeu',
            email: 'aceito@example.test',
            boasVindasStatus: 'ACEITO',
            orientacaoAsaasStatus: null,
          },
          {
            estabelecimentoId: 3,
            nome: 'Sem contato',
            email: null,
            boasVindasStatus: null,
            orientacaoAsaasStatus: null,
          },
        ],
      },
    });
  });
  let submitted: unknown;
  await page.route('**/api/v1/backoffice/emails/enfileirar', async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { enfileirados: 1, ignorados: 0 } });
  });
  await page.goto('/backoffice/emails');
  await expect(page.getByTestId('bo-email-recipients-row')).toHaveCount(3);
  await page.getByTestId('bo-email-all').click();
  await expect(page.getByTestId('bo-email-select-1')).toBeChecked();
  await expect(page.getByTestId('bo-email-select-2')).toBeDisabled();
  await expect(page.getByTestId('bo-email-select-3')).toBeDisabled();
  await page.getByTestId('bo-email-send').click();
  expect(submitted).toBeUndefined();
  await page.getByTestId('bo-email-confirm').click();
  await expect.poll(() => submitted).toEqual({ modelo: 'BOAS_VINDAS', estabelecimentoIds: [1] });
  await page.getByTestId('bo-email-template').selectOption('ORIENTACAO_ASAAS');
  await expect(page.getByTestId('bo-email-select-1')).toBeEnabled();
  await page.getByTestId('bo-email-all').click();
  await expect(page.getByTestId('bo-email-select-2')).toBeChecked();
  await page.getByTestId('bo-email-send').click();
  await page.getByTestId('bo-email-confirm').click();
  await expect
    .poll(() => submitted)
    .toEqual({ modelo: 'ORIENTACAO_ASAAS', estabelecimentoIds: [1, 2] });
  await page.getByTestId('bo-email-template').selectOption('AMBOS');
  await page.getByTestId('bo-email-all').click();
  await page.getByTestId('bo-email-send').click();
  await page.getByTestId('bo-email-confirm').click();
  await expect.poll(() => submitted).toEqual({ modelo: 'AMBOS', estabelecimentoIds: [1, 2] });
  await page.getByTestId('bo-email-template').selectOption('ORIENTACAO_ASAAS');
  await page.getByText('Visualizar template', { exact: true }).click();
  await expect(page.frameLocator('iframe').getByRole('heading', { level: 1 })).toHaveText(
    'Seu próximo passo: conectar o Asaas',
  );
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    ).toBeTruthy();
  }
  await page.setViewportSize({
    width: testInfo.project.name === 'mobile' ? 390 : 1440,
    height: 1000,
  });
  await page.screenshot({ path: testInfo.outputPath('emails-preview.png'), fullPage: true });
});
