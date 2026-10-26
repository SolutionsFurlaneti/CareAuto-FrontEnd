import type { Page } from '@playwright/test';
import { test, expect } from '../../support/session';

async function nav(page: Page, id: string) {
  if ((page.viewportSize()?.width ?? 1440) < 900) await page.getByTestId('nav-open').click();
  await page.getByTestId('bo-nav-' + id).click();
}

test('platform admin enters with admin/123456, sets a new password and manages plans, subscribers, billing and Claude campaigns', async ({
  page,
  state,
}, testInfo) => {
  // Backoffice has its own session: only the isolated test API session header is needed.
  await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
  await page.goto('/backoffice');
  await expect(page).toHaveURL(/\/backoffice\/login$/);
  await page.getByTestId('bo-login').fill('admin');
  await page.getByTestId('bo-senha').fill('errada');
  await page.getByTestId('bo-login-submit').click();
  await expect(page.getByTestId('bo-login-error')).toContainText('Login ou senha inválidos');
  await page.getByTestId('bo-senha').fill('123456');
  await page.getByTestId('bo-login-submit').click();

  await expect(page).toHaveURL(/\/backoffice\/trocar-senha$/);
  await page.getByTestId('bo-senha-atual').fill('123456');
  await page.getByTestId('bo-nova-senha').fill('123456');
  await page.getByTestId('bo-confirmar-senha').fill('123456');
  await page.getByTestId('bo-password-submit').click();
  await expect(page.getByText('Use pelo menos 8 caracteres.')).toBeVisible();
  await page.getByTestId('bo-nova-senha').fill('Senha-Forte-2026');
  await page.getByTestId('bo-confirmar-senha').fill('Senha-Forte-2026');
  await page.getByTestId('bo-password-submit').click();
  await expect(page.getByTestId('page-title')).toHaveText('Visão geral');
  await expect(page.getByTestId('metric-Estabelecimentos')).toHaveText('1');

  await nav(page, 'planos');
  await page.getByTestId('bo-plan-new').click();
  await page.getByTestId('bo-plan-nome').fill('Pós mensal');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('bo-plans')).toContainText('Pós mensal');
  await page.getByTestId('bo-plan-new').click();
  await page.getByTestId('bo-plan-nome').fill('Semestral à vista');
  await page.getByTestId('bo-plan-tipo').selectOption('PRE_PAGO');
  await page.getByTestId('bo-plan-periodicidade').selectOption('SEMESTRAL');
  await page.getByTestId('bo-plan-desconto').fill('10');
  await expect(page.getByTestId('bo-plan-preview')).toContainText('534,60');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('bo-plans')).toContainText('Semestral à vista');

  await nav(page, 'integracoes');
  await page.getByTestId('bo-asaas-chaveApi').fill('$aact_teste_plataforma');
  await page
    .getByTestId('bo-asaas-tokenWebhook')
    .fill('fake-shared-webhook-at-least-32-characters');
  await page.getByTestId('bo-asaas-ativo').click();
  await page.getByTestId('bo-asaas-save').click();
  await expect(page.getByTestId('bo-integration-asaas')).toContainText('Ativa');
  await page.getByTestId('bo-consulta-placa-token').fill('fake-platform-plate-token');
  await page.getByTestId('bo-consulta-placa-ativo').click();
  await page.getByTestId('bo-consulta-placa-save').click();
  await expect(page.getByTestId('bo-integration-consulta-placa')).toContainText('Ativa');
  await expect(page.getByTestId('bo-consulta-placa-token')).toHaveValue('');
  await page.getByTestId('bo-claude-chaveApi').fill('sk-ant-teste');
  await page.getByTestId('bo-claude-ativo').click();
  await page.getByTestId('bo-claude-save').click();
  await expect(page.getByTestId('bo-integration-claude')).toContainText('Ativa');
  await page.getByTestId('bo-google-ads-customerId').fill('123-456-7890');
  await page.getByTestId('bo-google-ads-clientId').fill('cliente.apps.googleusercontent.com');
  await page.getByTestId('bo-google-ads-developerToken').fill('dev');
  await page.getByTestId('bo-google-ads-clientSecret').fill('secret');
  await page.getByTestId('bo-google-ads-refreshToken').fill('refresh');
  await page.getByTestId('bo-google-ads-ativo').click();
  await page.getByTestId('bo-google-ads-save').click();
  await expect(page.getByTestId('bo-integration-google-ads')).toContainText('Ativa');
  await page.getByTestId('bo-google-ads-test').click();
  await expect(page.getByText('Conexão verificada com sucesso.')).toBeVisible();

  await nav(page, 'assinantes');
  await expect(page.getByTestId('bo-subscribers')).toContainText('Sem assinatura');
  await page.getByTestId('bo-sub-open').click();
  const plano = page.getByTestId('bo-sub-plan').locator('option', { hasText: 'Pós mensal' });
  await page.getByTestId('bo-sub-plan').selectOption((await plano.getAttribute('value'))!);
  await page.getByTestId('bo-sub-save').click();
  await expect(page.getByTestId('bo-sub-trial')).toHaveText('12/10/2026');
  await expect(page.getByTestId('bo-subscriber')).toContainText('Período grátis');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.getByTestId('bo-subscribers')).toContainText('Período grátis');

  await nav(page, 'overview');
  await page.getByTestId('bo-rotina-executar').click();
  await expect(page.getByText(/Rotina concluída: 0 emitida/)).toBeVisible();

  await nav(page, 'marketing');
  await page.getByTestId('bo-campaign-new').click();
  await page.getByTestId('bo-campaign-nome').fill('Estacionamentos SP');
  await page
    .getByTestId('bo-campaign-briefing')
    .fill('Donos de estacionamento na Grande São Paulo');
  await page.getByTestId('form-submit').click();
  const editor = page.getByTestId('bo-campaign-editor');
  await expect(editor).toContainText('Contexto sugerido pelo Claude');
  await expect(page.getByTestId('bo-titles-0')).toHaveValue('Gestão de Estacionamento');
  await page.getByTestId('bo-titles-add').click();
  await page.getByTestId('bo-titles-3').fill('Um título bem maior que trinta letras');
  await expect(editor).toContainText('37/30 caracteres');
  await page.getByTestId('bo-campaign-publish').click();
  await expect(page.getByTestId('bo-campaign-errors')).toContainText(
    'títulos com até 30 caracteres',
  );
  await page.getByTestId('bo-titles-3').fill('Ticket com QR Code');
  await page.getByTestId('bo-campaign-publish').click();
  await expect(page.getByText(/criada PAUSADA no Google Ads/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('backoffice-campaign.png'), fullPage: true });
  await page.getByTestId('bo-campaign-publish-confirm').click();
  await expect(page.getByTestId('bo-campaign-resource')).toContainText(
    'customers/1234567890/campaigns/999',
  );
  // On phones the toasts sit over the dialog actions: close with Esc (supported by every dialog).
  // Press on the dialog itself: after publishing, focus may not have returned to it yet.
  await page.getByRole('dialog').press('Escape');
  await expect(page.getByTestId('modal')).toBeHidden();
  await expect(page.getByTestId('bo-campaigns')).toContainText('Publicada (pausada)');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.locator('body').evaluate((b) => b.scrollWidth > window.innerWidth)).toBe(
      false,
    );
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await nav(page, 'overview');
  await expect(page.getByTestId('bo-rotina-ultima')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('backoffice-overview.png'), fullPage: true });

  // The parking-lot app keeps its own session: the backoffice login does not open it.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
