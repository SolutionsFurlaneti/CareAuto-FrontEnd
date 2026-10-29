import type { Page } from '@playwright/test';
import QRCode from 'qrcode';
import { test, expect, openNav } from '../../support/session';

interface PrintedDocument {
  title: string;
  html: string;
  text: string;
  width: number;
}

async function capturePrints(page: Page) {
  const documents: PrintedDocument[] = [];
  await page.exposeFunction('__captureBrowserPrint', (document: PrintedDocument) => {
    documents.push(document);
  });
  // Mock only the browser dialog in every document, including srcdoc iframes.
  // The authenticated fixture still writes its token only once, without init scripts.
  await page.addInitScript(() => {
    window.print = () => {
      const capture = Reflect.get(window, '__captureBrowserPrint') as (document: {
        title: string;
        html: string;
        text: string;
        width: number;
      }) => Promise<void>;
      void capture({
        title: document.title,
        html: document.documentElement.outerHTML,
        text: document.body.innerText,
        width: document.body.getBoundingClientRect().width,
      });
    };
  });
  return documents;
}

async function closePrintDialog(page: Page) {
  const frame = page.getByTestId('browser-print-frame');
  await expect(frame).toHaveCount(1);
  await frame.evaluate((element) => {
    (element as HTMLIFrameElement).contentWindow?.dispatchEvent(new Event('afterprint'));
  });
  await expect(frame).toHaveCount(0);
}

test('browser printing uses the Windows dialog without an agent and renders the signed ticket', async ({
  authenticated: page,
  state,
  request,
  browser,
}, testInfo) => {
  const printed = await capturePrints(page);
  const agentRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/(ticket|teste)(?:\?|$)/.test(request.url()))
      agentRequests.push(request.url());
  });
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
    placa: 'BRW1A23',
    marca: 'Volkswagen',
    modelo: 'Polo',
    cor: 'Prata',
  });
  const price = await create('tabelas-preco', {
    nome: 'Tabela para impressão',
    tipoCobranca: 'AVULSO',
    valorHora: 10,
    toleranciaMinutos: 15,
  });

  await openNav(page, 'nav-impressao');
  await expect(page.getByTestId('print-agent')).toContainText('Não configurado');
  await page.getByTestId('field-imprimirPeloNavegador').click();
  await page.getByTestId('field-larguraPapelNavegadorMm').selectOption('58');
  await page.getByTestId('field-perguntarAoSalvarEntrada').click();
  await page.getByTestId('print-preferences-save').click();
  await expect(page.getByTestId('browser-print-panel')).toBeVisible();
  await expect(page.getByTestId('print-agent')).toHaveCount(0);
  await expect(page.getByTestId('print-printers')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('field-imprimirPeloNavegador')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByTestId('field-larguraPapelNavegadorMm')).toHaveValue('58');

  const configResponse = await request.get('http://127.0.0.1:5081/api/v1/impressao/configuracao', {
    headers,
  });
  const config = await configResponse.json();
  expect(config).toMatchObject({
    imprimirPeloNavegador: true,
    larguraPapelNavegadorMm: 58,
    possuiTokenAgente: false,
    impressaoEntradaDisponivel: true,
    impressaoAutomaticaNoServidor: false,
  });
  const printers = await request.get('http://127.0.0.1:5081/api/v1/impressao/impressoras', {
    headers,
  });
  expect(await printers.json()).toEqual([]);

  await page.getByTestId('browser-print-test').click();
  await expect.poll(() => printed.length).toBe(1);
  expect(printed[0].title).toBe('Teste de impressão');
  expect(printed[0].text).toContain('TESTE DE IMPRESSÃO');
  expect(printed[0].text).toContain('não representa uma estadia');
  expect(printed[0].width).toBeCloseTo((58 / 25.4) * 96, 0);
  const preview = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await preview.setContent(printed[0].html);
  await preview.locator('.ticket').screenshot({ path: testInfo.outputPath('browser-test-58mm.png') });
  await preview.close();
  await closePrintDialog(page);

  await page.getByTestId('field-larguraPapelNavegadorMm').selectOption('80');
  await page.getByTestId('print-preferences-save').click();
  await expect(page.getByTestId('browser-print-panel')).toContainText('80 mm');
  await openNav(page, 'nav-estacionamento');
  await page.getByTestId('stay-new').click();
  await page.getByTestId('field-veiculoId').selectOption(String(vehicle.veiculoId));
  await page.getByTestId('field-tabelaId').selectOption(String(price.tabelaId));
  await page.getByTestId('form-submit').click();
  await expect(page.getByTestId('ticket-question')).toBeVisible();
  const ticketResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      /\/api\/v1\/estadias\/\d+\/ticket$/.test(response.url()),
  );
  await page.getByTestId('ticket-print').click();
  const payload = await (await ticketResponse).json();
  expect(payload.larguraPapelMm).toBe(80);
  expect(payload.ticket.codigoQr).toMatch(/^ACM1\./);
  await expect.poll(() => printed.length).toBe(2);
  expect(printed[1].title).toBe('Ticket de estacionamento');
  expect(printed[1].text).toContain('BRW1A23');
  expect(printed[1].text).toContain('Volkswagen Polo');
  expect(printed[1].text).toContain('Tolerância: 15 minutos');
  expect(printed[1].width).toBeCloseTo((80 / 25.4) * 96, 0);
  const printFrame = page.frameLocator('[data-testid="browser-print-frame"]');
  await expect(printFrame.locator('.barcode svg')).toHaveCount(2);
  await expect(printFrame.locator('.barcode svg').first()).toHaveAttribute(
    'aria-label',
    'Código do ticket ' + payload.ticket.codigoTicket,
  );
  const expectedQr = await QRCode.toString(payload.ticket.codigoQr, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  });
  const expectedPaths = await page.evaluate((svg) => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return Array.from(document.querySelectorAll('path'), (path) => path.getAttribute('d'));
  }, expectedQr);
  expect(
    await printFrame
      .locator('.qr svg path')
      .evaluateAll((paths) => paths.map((path) => path.getAttribute('d'))),
  ).toEqual(expectedPaths);
  const ticketPreview = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await ticketPreview.setContent(printed[1].html);
  await ticketPreview.locator('.ticket').screenshot({
    path: testInfo.outputPath('browser-ticket-80mm.png'),
  });
  await ticketPreview.close();
  await closePrintDialog(page);
  await expect(page.getByTestId('ticket-question')).toHaveCount(0);
  await expect(page.getByTestId('stays-table-row')).toContainText('BRW1A23');

  await page.getByTestId('stay-details').click();
  await page.getByTestId('stay-print-ticket').click();
  await expect.poll(() => printed.length).toBe(3);
  expect(printed[2].text).toContain('BRW1A23');
  await closePrintDialog(page);
  await page.getByRole('button', { name: 'Fechar formulário', exact: true }).click();
  expect(agentRequests).toEqual([]);
  const jobs = await request.get('http://127.0.0.1:5081/api/v1/impressao/trabalhos', { headers });
  expect(await jobs.json()).toEqual([]);

  await openNav(page, 'nav-impressao');
  await expect(page.getByTestId('print-jobs')).toContainText('Histórico do agente');
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10000 });
  for (const theme of ['dark', 'light']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== theme)
      await page.getByTestId('theme-toggle').click();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth > window.innerWidth),
      ).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`browser-printing-${theme}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test('automatic browser mode prints a newly saved arrival without creating an agent job', async ({
  authenticated: page,
  state,
  request,
}) => {
  const printed = await capturePrints(page);
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
  const vehicle = await create('veiculos', { categoriaId: category.categoriaId, placa: 'AUT1A23' });
  const price = await create('tabelas-preco', {
    nome: 'Avulso',
    tipoCobranca: 'AVULSO',
    valorHora: 10,
    toleranciaMinutos: 10,
  });
  await openNav(page, 'nav-impressao');
  await page.getByTestId('field-imprimirPeloNavegador').click();
  await expect(page.getByTestId('field-imprimirCupomEntradaAutomatico')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByTestId('print-preferences-save').click();
  await expect(page.getByTestId('browser-print-panel')).toBeVisible();
  await openNav(page, 'nav-estacionamento');
  await page.getByTestId('stay-new').click();
  await page.getByTestId('field-veiculoId').selectOption(String(vehicle.veiculoId));
  await page.getByTestId('field-tabelaId').selectOption(String(price.tabelaId));
  await page.getByTestId('form-submit').click();
  await expect.poll(() => printed.length).toBe(1);
  expect(printed[0].text).toContain('AUT1A23');
  await closePrintDialog(page);
  await expect(page.getByTestId('ticket-question')).toHaveCount(0);
  const jobs = await request.get('http://127.0.0.1:5081/api/v1/impressao/trabalhos', { headers });
  expect(await jobs.json()).toEqual([]);
});
