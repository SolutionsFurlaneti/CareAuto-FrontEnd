import { test, expect, openNav } from '../../support/session';
test('register arrival, add service, conclude and confirm payment', async ({
  authenticated: page,
  state,
  request,
}, testInfo) => {
  const headers = {
    'X-AutoCare-Test-Session': state.key,
    Authorization: 'Bearer ' + state.session.accessToken,
  };
  const create = async (resource: string, data: unknown) => {
    const response = await request.post('http://127.0.0.1:5081/api/v1/' + resource, {
      headers,
      data,
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<Record<string, number>>;
  };
  const customer = await create('clientes', {
    tipoPessoa: 'PF',
    documento: '12345678901',
    nomeOuRazaoSocial: 'Marina Oliveira',
  });
  const category = await create('categorias-veiculo', { nome: 'Hatch' });
  const vehicle = await create('veiculos', {
    clienteId: customer.clienteId,
    categoriaId: category.categoriaId,
    placa: 'ABC1D23',
    marca: 'Volkswagen',
    modelo: 'Polo',
  });
  const price = await create('tabelas-preco', {
    nome: 'Tabela padrão',
    tipoCobranca: 'AVULSO',
    valorHora: 10,
    toleranciaMinutos: 15,
  });
  const service = await create('servicos', { nome: 'Lavagem completa', modulo: 'LAVA_RAPIDO' });
  await create('precos-servicos', {
    servicoId: service.servicoId,
    categoriaId: category.categoriaId,
    valor: 30,
  });
  await openNav(page, 'nav-estacionamento');
  await page.getByTestId('stay-new').click();
  await page.getByTestId('field-veiculoId').selectOption(String(vehicle.veiculoId));
  await page.getByTestId('field-tabelaId').selectOption(String(price.tabelaId));
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('stays-table-row')).toContainText('ABC1D23');
  await page.getByTestId('stay-details').click();
  await page.getByTestId('field-servicoId').selectOption(String(service.servicoId));
  await page.getByTestId('form-submit').click();
  await expect(page.locator('.service-line')).toContainText('Lavagem completa');
  await page.getByTestId('service-advance').click();
  await expect(page.getByTestId('service-advance')).toHaveText('Finalizar');
  await page.getByTestId('service-advance').click();
  await request.post('http://127.0.0.1:5081/__test/advance', { headers });
  await page.getByTestId('stay-exit').click();
  await page.getByTestId('stay-confirm').click();
  await expect(page.locator('.total-line')).toContainText('50,00');
  await page.getByTestId('stay-close').click();
  await openNav(page, 'nav-pagamentos');
  await page.getByTestId('payment-new').click();
  await page.getByTestId('field-estadiaId').fill('1');
  await page.getByTestId('field-clienteId').fill(String(customer.clienteId));
  await page.getByTestId('field-valor').fill('5000');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('payments-table-row')).toContainText('50,00');
  await page.getByTestId('payment-confirm').click();
  await page.locator('.swal2-confirm').click();
  await expect(page.getByTestId('status-PAGO')).toHaveText('Pago');
  await openNav(page, 'nav-overview');
  await expect(page.getByTestId('recent-table-row')).toBeVisible();
  await expect(page.locator('main')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10000 });
  await page.screenshot({ path: testInfo.outputPath('overview-dark.png'), fullPage: true });
  await page.getByTestId('theme-toggle').click();
  await page.screenshot({ path: testInfo.outputPath('overview-light.png'), fullPage: true });
});
