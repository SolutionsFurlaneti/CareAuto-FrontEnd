import { test, expect, openNav } from '../../support/session';
test('configuration screens and optional vehicle owner', async ({ authenticated: page }) => {
  await openNav(page, 'nav-categorias');
  await page.getByTestId('record-new').click();
  await page.getByTestId('field-nome').fill('Utilitário');
  await page.getByTestId('form-submit').click();
  await expect(page.getByText('Registro salvo com sucesso.')).toBeVisible();
  await openNav(page, 'nav-veiculos');
  await page.getByTestId('record-new').click();
  await page.getByTestId('field-placa').fill('def2g34');
  await page.getByTestId('field-categoriaId').selectOption({ label: 'Utilitário' });
  await page.getByTestId('form-submit').click();
  await expect(page.getByText('DEF2G34')).toBeVisible();
  for (const route of [
    'servicos',
    'precos-servicos',
    'tabelas-preco',
    'taxas-dinamicas',
    'consultas-placa',
  ]) {
    await openNav(page, 'nav-' + route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('query-error')).toHaveCount(0);
  }
});
test('create and close monthly subscription', async ({ authenticated: page, state, request }) => {
  const headers = {
    'X-AutoCare-Test-Session': state.key,
    Authorization: 'Bearer ' + state.session.accessToken,
  };
  const create = async (resource: string, data: unknown) => {
    const r = await request.post('http://127.0.0.1:5081/api/v1/' + resource, { headers, data });
    expect(r.ok()).toBeTruthy();
    return r.json() as Promise<Record<string, number>>;
  };
  const c = await create('clientes', {
    tipoPessoa: 'PF',
    documento: '12345678901',
    nomeOuRazaoSocial: 'Cliente Mensal',
  });
  const cat = await create('categorias-veiculo', { nome: 'Sedã' });
  const v = await create('veiculos', {
    clienteId: c.clienteId,
    categoriaId: cat.categoriaId,
    placa: 'XYZ9A87',
  });
  await openNav(page, 'nav-assinaturas');
  await page.getByTestId('subscription-new').click();
  await page.getByTestId('field-clienteId').fill(String(c.clienteId));
  await page.getByTestId('field-veiculoId').fill(String(v.veiculoId));
  await page.getByTestId('field-valor').fill('25000');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('status-ATIVA')).toBeVisible();
  await page.getByTestId('subscription-end').click();
  await page.locator('.swal2-confirm').click();
  await expect(page.getByTestId('status-ENCERRADA')).toBeVisible();
});
