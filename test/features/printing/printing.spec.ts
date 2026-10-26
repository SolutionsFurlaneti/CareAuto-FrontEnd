import { test, expect, openNav } from '../../support/session';

test('admin sets up printing and the operator prints the entry ticket through the agent queue', async ({
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
  const category = await create('categorias-veiculo', { nome: 'Hatch' });
  const vehicle = await create('veiculos', {
    categoriaId: category.categoriaId,
    placa: 'TKT1A23',
    marca: 'Fiat',
    modelo: 'Uno',
  });
  const price = await create('tabelas-preco', {
    nome: 'Tabela padrão',
    tipoCobranca: 'AVULSO',
    valorHora: 10,
    toleranciaMinutos: 15,
  });

  await openNav(page, 'nav-impressao');
  await expect(page.getByTestId('page-title')).toHaveText('Impressão');
  await expect(page.getByTestId('print-agent')).toContainText('Não configurado');
  await page.getByTestId('agent-token').click();
  const token = (await page.getByTestId('agent-token-value').textContent())!.trim();
  expect(token).toMatch(/^acm_\d+_/);
  await page.getByTestId('agent-token-done').click();
  await expect(page.getByTestId('print-agent')).toContainText('ainda não se conectou');

  await page.getByTestId('printer-new').click();
  await page.getByTestId('field-nome').fill('Guarita 1');
  await page.getByTestId('field-enderecoDriverOuIp').fill('192.168.0.50');
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('printers-table')).toContainText('Guarita 1');
  await expect(page.getByTestId('printers-table')).toContainText('192.168.0.50:9100');

  await expect(
    page.getByRole('switch', { name: 'Perguntar se deseja imprimir na entrada' }),
  ).toHaveAttribute('aria-checked', 'true');

  await openNav(page, 'nav-estacionamento');
  await page.getByTestId('stay-new').click();
  await page.getByTestId('field-veiculoId').selectOption(String(vehicle.veiculoId));
  await page.getByTestId('field-tabelaId').selectOption(String(price.tabelaId));
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('ticket-question')).toHaveText(
    'Entrada registrada com sucesso! Deseja imprimir o ticket de estacionamento?',
  );
  await page.getByTestId('ticket-print').click();
  await expect(page.getByText('Ticket enviado para a impressora.')).toBeVisible();

  // The local agent authenticates with its own token, never with the user session.
  const agent = { 'X-AutoCare-Test-Session': state.key, 'X-AutoCare-Agente': token };
  const jobs = await request.get('http://127.0.0.1:5081/api/v1/agente-impressao/trabalhos', {
    headers: agent,
  });
  expect(jobs.ok()).toBeTruthy();
  const [job] = (await jobs.json()) as {
    impressaoId: number;
    ticket: { placa: string; codigoQr: string };
  }[];
  expect(job.ticket.placa).toBe('TKT1A23');
  expect(job.ticket.codigoQr).toMatch(/^ACM1\./);
  const done = await request.post(
    `http://127.0.0.1:5081/api/v1/agente-impressao/trabalhos/${job.impressaoId}/resultado`,
    { headers: agent, data: { sucesso: true } },
  );
  expect(done.status()).toBe(204);

  await openNav(page, 'nav-impressao');
  await expect(page.getByTestId('print-jobs')).toContainText('Impresso');
  await expect(page.getByTestId('print-agent')).toContainText('Conectado');
  await page.getByTestId('theme-toggle').click();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth > window.innerWidth),
    ).toBe(false);
  }
  await page.screenshot({ path: testInfo.outputPath('printing-light.png'), fullPage: true });
});
