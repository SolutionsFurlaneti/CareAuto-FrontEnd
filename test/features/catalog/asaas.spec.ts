import { test, expect, openNav } from '../../support/session';

test('admin configures Asaas and emits, reconciles and cancels a Pix using the isolated gateway', async ({
  authenticated: page,
  state,
  request,
}, testInfo) => {
  await openNav(page, 'nav-integracoes');
  await page.getByTestId('integration-card-asaas').click();
  const panel = page.getByTestId('integration-asaas');
  await expect(panel.getByTestId('field-ambiente')).toHaveValue('SANDBOX');
  await panel.getByTestId('field-chaveApi').fill('fake-key-browser-test');
  await panel
    .getByTestId('field-tokenWebhook')
    .fill('fake-webhook-browser-with-more-than-32-characters');
  await panel.getByTestId('field-ativo').selectOption('true');
  await panel.getByTestId('form-submit').click();
  await expect(page.getByTestId('integration-header').getByTestId('status-ATIVA')).toBeVisible();
  await expect(panel.getByTestId('field-chaveApi')).toHaveValue('');
  await expect(panel.getByTestId('field-tokenWebhook')).toHaveValue('');
  await panel.getByTestId('tab-webhooks').click();
  await expect(panel.getByTestId('asaas-webhook-path')).toContainText('/api/v1/webhooks/asaas/');
  await panel.getByTestId('tab-status').click();
  await panel.getByRole('button', { name: 'Testar conexão salva' }).click();
  await expect(
    page.getByText('Conexão com o Asaas confirmada. Nenhuma cobrança foi criada.'),
  ).toBeVisible();
  await page.reload();
  await expect(panel.getByTestId('tab-status')).toHaveAttribute('aria-selected', 'true');
  await panel.getByTestId('tab-credenciais').click();
  await expect(panel.getByText('Chave salva: ••••••••. Vazio mantém a atual.')).toBeVisible();
  const headers = {
    'X-AutoCare-Test-Session': state.key,
    Authorization: 'Bearer ' + state.session.accessToken,
  };
  const response = await request.post('http://127.0.0.1:5081/api/v1/clientes', {
    headers,
    data: { tipoPessoa: 'PF', documento: '12345678901', nomeOuRazaoSocial: 'Cliente Asaas' },
  });
  expect(response.ok()).toBeTruthy();
  const customer = (await response.json()) as { clienteId: number };
  await openNav(page, 'nav-pagamentos');
  await page.getByTestId('payment-new').click();
  await page.getByTestId('field-clienteId').fill(String(customer.clienteId));
  await page.getByTestId('field-valor').fill('1234');
  await page.getByTestId('field-meio').selectOption('PIX');
  await page.getByTestId('field-vencimento').fill('2026-10-10');
  await page.getByTestId('form-submit').click();
  const row = page.getByTestId('payments-table-row');
  await row.getByRole('button', { name: 'Emitir no Asaas' }).click();
  await page.locator('.swal2-confirm').click();
  await expect(row.getByRole('link', { name: 'Abrir fatura Asaas' })).toHaveAttribute(
    'href',
    'https://sandbox.asaas.com/i/test',
  );
  await expect(row.getByRole('button', { name: 'Copiar Pix' })).toBeVisible();
  await expect(row.getByTestId('payment-confirm')).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Emitir no Asaas' })).toHaveCount(0);
  await row.getByRole('button', { name: 'Atualizar cobrança' }).click();
  await expect(row.getByRole('button', { name: 'Atualizar cobrança' })).toBeEnabled();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth > window.innerWidth),
    ).toBe(false);
  }
  await page.screenshot({ path: testInfo.outputPath('asaas-payments-dark.png'), fullPage: true });
  await page.getByTestId('theme-toggle').click();
  await page.screenshot({ path: testInfo.outputPath('asaas-payments-light.png'), fullPage: true });
  await row.getByRole('button', { name: 'Cancelar no Asaas' }).click();
  await page.locator('.swal2-confirm').click();
  await expect(row.getByTestId('status-CANCELADO')).toBeVisible();
  await expect(row.getByRole('link')).toHaveCount(0);
});
