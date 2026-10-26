import { test, expect, openNav } from '../../support/session';
test('client creation, validation, edit and logical deletion', async ({ authenticated: page }) => {
  await openNav(page, 'nav-clientes');
  await page.getByTestId('record-new').click();
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('field-nomeOuRazaoSocial')).toHaveAttribute('aria-invalid', 'true');
  await page
    .getByTestId('field-nomeOuRazaoSocial')
    .fill('Cliente com nome longo para verificar a leitura no celular');
  await page.getByTestId('field-documento').fill('12345678901');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('modal')).not.toBeVisible();
  await expect(page.getByTestId('clientes-table-row')).toHaveCount(1);
  await page.getByTestId('record-edit').click();
  await page.getByTestId('field-nomeOuRazaoSocial').fill('Marina Oliveira');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('clientes-table-row')).toContainText('Marina Oliveira');
  await page.getByTestId('record-deactivate').click();
  await page.locator('.swal2-confirm').click();
  await expect(page.getByTestId('status-ENCERRADA')).toHaveText('Inativo');
});
