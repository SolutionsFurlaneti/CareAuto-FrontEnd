import { test, expect, openNav } from '../../support/session';

test('operator fills the vehicle checklist after the entry, marks damages and reads the report after exit', async ({
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
    celular: '11987654321',
  });
  const category = await create('categorias-veiculo', { nome: 'Sedan' });
  const vehicle = await create('veiculos', {
    clienteId: customer.clienteId,
    categoriaId: category.categoriaId,
    placa: 'CHK1A23',
    marca: 'Toyota',
    modelo: 'Corolla',
    cor: 'Prata',
  });
  const price = await create('tabelas-preco', {
    nome: 'Tabela padrão',
    tipoCobranca: 'AVULSO',
    valorHora: 10,
    toleranciaMinutos: 15,
  });
  // The entry is registered without any checklist: it never blocks the check-in.
  await create('estadias', { veiculoId: vehicle.veiculoId, tabelaId: price.tabelaId });

  await openNav(page, 'nav-estacionamento');
  await page.getByTestId('stay-details').click();
  await expect(page.getByTestId('stay-checklist-summary')).toContainText('Pendente');
  await page.getByTestId('stay-checklist').click();
  await expect(page.getByTestId('stay-checklist')).toHaveText('Realizar checklist');

  const checklist = page.getByTestId('checklist');
  await expect(page.getByTestId('checklist-header')).toContainText('CHK1A23');
  await expect(page.getByTestId('checklist-header')).toContainText('Toyota Corolla · Prata');
  await expect(page.getByTestId('checklist-header')).toContainText('Marina Oliveira');
  await expect(page.getByTestId('checklist-header')).toContainText('11987654321');

  await page.getByTestId('checklist-km').fill('45.210 km');
  await expect(page.getByTestId('checklist-km')).toHaveValue('45210');
  await page.getByTestId('checklist-last-maintenance').fill('2026-08-15');
  await page.getByTestId('item-FAROIS_LAMPADAS_PISCAS-BOM').click();
  await page.getByTestId('item-PNEUS_TRASEIROS-RUIM').click();
  await expect(page.getByTestId('item-PNEUS_TRASEIROS-RUIM')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByTestId('item-OUTRO-FALTANTE_NAO_FUNCIONA').click();
  await page.getByTestId('checklist-save').click();
  await expect(page.getByText('Descreva o item avaliado.')).toBeVisible();
  await page.getByTestId('checklist-other').fill('Rádio');

  // A at the left side door, R on the front bumper; then one marker is removed.
  const side = page.getByTestId('damage-view-LATERAL_ESQ');
  await side.click({ position: { x: (await side.boundingBox())!.width * 0.4, y: 30 } });
  await page.getByTestId('damage-tool-R').click();
  await page.getByTestId('damage-view-FRENTE').click();
  await page.getByTestId('damage-tool-X').click();
  await page.getByTestId('damage-view-TOPO').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('damage-marker')).toHaveCount(3);
  await page.getByTestId('damage-remove').last().click();
  await expect(page.getByTestId('damage-marker')).toHaveCount(2);
  await page.getByTestId('damage-note').first().fill('Porta traseira');
  await page.getByTestId('checklist-notes').fill('Cliente ciente das avarias.');
  await expect(checklist).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('checklist-form-dark.png'), fullPage: true });
  await page
    .getByTestId('damage-map')
    .screenshot({ path: testInfo.outputPath('checklist-damage-map.png') });

  await page.getByTestId('checklist-save').click();
  await expect(page.getByText('Checklist salvo.')).toBeVisible();
  const report = page.getByTestId('checklist-report');
  await expect(report).toContainText('45.210 km');
  await expect(report).toContainText('15/08/2026');
  await expect(page.getByTestId('checklist-report-items')).toContainText('Pneus traseiros');
  await expect(page.getByTestId('checklist-report-items')).toContainText('Outro: Rádio');
  await expect(report).toContainText('Porta traseira');
  await expect(report.getByTestId('damage-marker')).toHaveCount(2);

  // Editing loads the saved values and keeps the markers.
  await page.getByTestId('checklist-edit').click();
  await expect(page.getByTestId('checklist-km')).toHaveValue('45210');
  await expect(page.getByTestId('damage-marker')).toHaveCount(2);
  await page.getByTestId('item-BUZINA-BOM').click();
  await page.getByTestId('checklist-save').click();
  await expect(page.getByTestId('checklist-report-items')).toContainText('Buzina');
  await page.getByTestId('checklist-close').click();
  await expect(page.getByTestId('stay-checklist-summary')).toContainText('2 avaria(s)');
  await expect(page.getByTestId('stay-checklist')).toHaveText('Ver checklist');

  await request.post('http://127.0.0.1:5081/__test/advance', { headers });
  await page.getByTestId('stay-exit').click();
  await page.getByTestId('stay-confirm').click();
  await page.getByTestId('stay-checklist').click();
  await expect(page.getByTestId('checklist-report')).toContainText('apenas para consulta');
  await expect(page.getByTestId('checklist-edit')).toHaveCount(0);

  await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page
        .locator('.MuiDialog-paper')
        .last()
        .evaluate((paper) => paper.scrollWidth > paper.clientWidth),
    ).toBe(false);
  }
  await page.screenshot({ path: testInfo.outputPath('checklist-report.png'), fullPage: true });
});
