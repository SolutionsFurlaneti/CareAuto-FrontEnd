import { test, expect, openNav } from '../../support/session';

test('automatically reads an attached plate with a controlled Claude response and registers an entry', async ({
  authenticated: page,
  state,
  request,
}, testInfo) => {
  const headers = {
    'X-AutoCare-Test-Session': state.key,
    Authorization: 'Bearer ' + state.session.accessToken,
  };
  const create = async (resource: string, data: unknown) => {
    const result = await request.post(`http://127.0.0.1:5081/api/v1/${resource}`, {
      headers,
      data,
    });
    expect(result.ok()).toBeTruthy();
    return result.json() as Promise<Record<string, number>>;
  };
  const category = await create('categorias-veiculo', { nome: 'Carro foto' });
  const table = await create('tabelas-preco', {
    nome: 'Avulso foto',
    tipoCobranca: 'AVULSO',
    valorHora: 10,
    toleranciaMinutos: 0,
  });
  await openNav(page, 'nav-estacionamento');
  await page.getByTestId('stay-new').click();
  await page.getByTestId('field-tabelaId').selectOption(String(table.tabelaId));
  await page.getByTestId('entry-add-vehicle').click();
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 260;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'white';
    context.fillRect(0, 0, 900, 260);
    context.fillStyle = 'black';
    context.font = 'bold 145px Arial';
    context.textAlign = 'center';
    context.fillText('ABC1D23', 450, 185);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  // Only the external reading is controlled; vehicle creation and entry use the real test API.
  let reads = 0;
  let lookups = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/v1/consultas-placa')) lookups++;
  });
  await page.route('**/api/v1/leitura-placa', async (route) => {
    reads++;
    expect(route.request().headers()['content-type']).toContain('multipart/form-data');
    expect(route.request().postDataBuffer()?.toString('latin1')).toContain('image/jpeg');
    await route.fulfill({
      json: {
        sucesso: true,
        placa: 'ABC1D23',
        revisaoNecessaria: true,
        mensagem:
          'Placa lida pelo Claude. Confira os sete caracteres; os dados do veículo são consultados em seguida.',
      },
    });
  });
  await page.getByTestId('plate-file-input').setInputFiles({
    name: 'placa-teste.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(page.getByTestId('field-placa')).toHaveValue('ABC1D23', { timeout: 30000 });
  await expect(page.getByTestId('plate-image-size')).toContainText('KB');
  expect(reads).toBe(1);
  await expect(page.getByTestId('plate-claude')).toHaveCount(0);
  // The vehicle lookup starts by itself after the reading; Consultar stays available to repeat it.
  await expect(page.getByText(/Consulta automática não configurada/)).toBeVisible();
  expect(lookups).toBe(1);
  await expect(page.getByTestId('field-categoriaId')).toHaveValue('');
  await page.getByTestId('plate-consult').click();
  await expect.poll(() => lookups).toBe(2);
  await expect(page.getByText(/Consulta automática não configurada/)).toBeVisible();
  await page.getByTestId('field-categoriaId').selectOption(String(category.categoriaId));
  await page.getByTestId('field-marca').fill('VW');
  await page.getByTestId('field-modelo').fill('Gol');
  await page.getByTestId('field-cor').fill('Prata');
  await page.screenshot({ path: testInfo.outputPath('plate-claude-dark.png'), fullPage: true });
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('field-veiculoId')).toHaveValue('1');
  await expect(page.getByTestId('field-tabelaId')).toHaveValue(String(table.tabelaId));
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('stays-table-row')).toContainText('ABC1D23');
});

test('camera upload reaches the real backend automatically and allows manual entry without a Claude key', async ({
  authenticated: page,
}) => {
  await openNav(page, 'nav-veiculos');
  await page.getByTestId('record-new').click();
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 234;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('plate-camera-input').setInputFiles({
    name: 'camera.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(page.getByText(/Claude não configurado/)).toBeVisible();
  await expect(page.getByTestId('plate-upload')).toBeEnabled();
  await expect(page.getByTestId('field-placa')).toHaveValue('');
  await page.getByTestId('field-placa').fill('XYZ1234');
  await page.getByTestId('plate-consult').click();
  await expect(page.getByText(/Consulta automática não configurada/)).toBeVisible();
});

test('photo controls fit light theme at supported widths and short height', async ({
  authenticated: page,
}, testInfo) => {
  await page.getByTestId('theme-toggle').click();
  await openNav(page, 'nav-veiculos');
  await page.getByTestId('record-new').click();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    await page.getByTestId('plate-upload').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('plate-upload')).toBeVisible();
    const overflows = await page
      .getByRole('dialog')
      .evaluate((dialog) => dialog.scrollWidth > dialog.clientWidth);
    expect(overflows).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`plate-light-${width}.png`) });
  }
});
