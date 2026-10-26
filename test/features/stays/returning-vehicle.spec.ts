import { test, expect, openNav } from '../../support/session';

test('returning plate reuses the vehicle and rejects a second open stay', async ({
  authenticated: page,
  state,
  request,
}) => {
  const headers = {
    'X-AutoCare-Test-Session': state.key,
    Authorization: 'Bearer ' + state.session.accessToken,
  };
  const post = async (resource: string, data?: unknown) => {
    const response = await request.post('http://127.0.0.1:5081/api/v1/' + resource, {
      headers,
      data,
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const category = await post('categorias-veiculo', { nome: 'Retorno' });
  const customer = await post('clientes', {
    tipoPessoa: 'PF',
    documento: '12345678901',
    nomeOuRazaoSocial: 'Cliente retorno',
  });
  const vehicle = await post('veiculos', {
    placa: 'ABC1D23',
    categoriaId: category.categoriaId,
    clienteId: customer.clienteId,
    marca: 'Marca original',
  });
  const table = await post('tabelas-preco', {
    nome: 'Retorno',
    tipoCobranca: 'AVULSO',
    valorHora: 10,
    toleranciaMinutos: 0,
  });
  const previous = await post('estadias', {
    veiculoId: vehicle.veiculoId,
    tabelaId: table.tabelaId,
  });
  await request.post('http://127.0.0.1:5081/__test/advance', { headers });
  await post('estadias/' + previous.estadiaId + '/saida');
  await openNav(page, 'nav-estacionamento');
  let vehicleWrites = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/v1/veiculos')) vehicleWrites++;
  });
  const reuse = async () => {
    await page.getByTestId('stay-new').click();
    await page.getByTestId('field-tabelaId').selectOption(String(table.tabelaId));
    await page.getByTestId('entry-add-vehicle').click();
    await page.getByTestId('field-placa').fill('ABC1D23');
    await page.getByTestId('form-submit').click();
    await expect(page.getByTestId('field-veiculoId')).toHaveValue(String(vehicle.veiculoId));
    await expect(page.getByTestId('field-tabelaId')).toHaveValue(String(table.tabelaId));
    await page.getByTestId('form-submit').click();
  };
  await reuse();
  await expect(page.getByTestId('stays-table-row')).toContainText('ABC1D23');
  await reuse();
  await expect(page.getByRole('alert')).toContainText('Veículo já possui estadia aberta.');
  expect(vehicleWrites).toBe(0);
  const vehicles = await request.get('http://127.0.0.1:5081/api/v1/veiculos', { headers });
  const result = await vehicles.json();
  expect(result.total).toBe(1);
  expect(result.items[0].clienteId).toBe(customer.clienteId);
  expect(result.items[0].marca).toBe('Marca original');
});
