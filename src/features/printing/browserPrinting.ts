import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import type { TicketEntrada, TicketNavegador } from './api';

const loadTimeoutMs = 15000;
const cleanupTimeoutMs = 5 * 60 * 1000;
let activePrint: { dispose: () => void } | null = null;

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function barcodeSvg(code: string): string {
  if (!/^\d+$/.test(code)) throw new Error('O código do ticket é inválido para impressão.');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, code, {
    format: 'CODE128',
    displayValue: false,
    width: 2,
    height: 60,
    margin: 12,
    background: '#ffffff',
    lineColor: '#000000',
  });
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Código do ticket ' + code);
  return svg.outerHTML;
}

async function renderTicket(payload: TicketNavegador, test = false): Promise<string> {
  const width = payload.larguraPapelMm;
  if (width !== 58 && width !== 80) throw new Error('Escolha papel de 58 ou 80 mm para imprimir.');
  const ticket = payload.ticket;
  const qr = await QRCode.toString(ticket.codigoQr, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  });
  const barcode = ticket.codigoTicket ? barcodeSvg(ticket.codigoTicket) : '';
  const promotion = ticket.promocaoRodape?.ativo ? ticket.promocaoRodape : null;
  const title = test ? 'Teste de impressão' : 'Ticket de estacionamento';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <title>${title}</title>
  <style>
    @page { size: auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: ${width}mm; margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: ${width === 58 ? '10' : '12'}pt; line-height: 1.3; }
    .ticket { width: ${width}mm; padding: 3mm; overflow-wrap: anywhere; }
    h1, h2, p { margin: 0 0 2mm; }
    h1 { font-size: 1.2em; text-transform: uppercase; }
    h2 { font-size: 1em; }
    .center { text-align: center; }
    .small { font-size: .85em; }
    .plate { font-size: 1.7em; font-weight: 700; letter-spacing: .03em; }
    .section { margin-top: 3mm; padding-top: 3mm; border-top: .25mm dashed #000; }
    .barcode svg { display: block; width: 100%; height: 16mm; }
    .barcode-lower svg { height: 10mm; }
    .qr svg { display: block; width: ${width === 58 ? 32 : 38}mm; height: ${width === 58 ? 32 : 38}mm; margin: 0 auto; }
    .promotion { white-space: pre-line; }
    .test { padding: 2mm; border: .4mm solid #000; font-weight: 700; }
  </style>
</head>
<body>
  <main class="ticket">
    ${test ? '<p class="test center">TESTE DE IMPRESSÃO</p>' : ''}
    <header class="center">
      <h1>${escapeHtml(ticket.estabelecimento)}</h1>
      ${ticket.operadora ? `<p>${escapeHtml(ticket.operadora)}</p>` : ''}
      <p>ENTRADA ${escapeHtml(ticket.pontoEntrada || 'PRINCIPAL')}</p>
      ${ticket.toleranciaMinutos ? `<p class="small">Tolerância: ${escapeHtml(ticket.toleranciaMinutos)} minutos</p>` : ''}
    </header>
    ${barcode ? `<div class="barcode">${barcode}</div>` : ''}
    <div class="center">
      ${ticket.sequencial ? `<p>Ticket/Seq: ${escapeHtml(ticket.sequencial)}</p>` : ''}
      ${ticket.codigoTicket ? `<p class="small">${escapeHtml(ticket.codigoTicket)}</p>` : ''}
      <p>Data/Hora: ${escapeHtml(ticket.entrada)}</p>
      <p class="plate">${escapeHtml(ticket.placa)}</p>
      ${ticket.veiculo ? `<p>${escapeHtml(ticket.veiculo)}</p>` : ''}
    </div>
    <div class="qr">${qr}</div>
    ${test ? '<p class="small center">O QR Code de teste não representa uma estadia.</p>' : '<p class="small center">Guarde este ticket para a saída.</p>'}
    ${barcode ? `<div class="barcode barcode-lower section">${barcode}</div>` : ''}
    ${promotion ? `<footer class="section center"><h2>${escapeHtml(promotion.nomeParceiro)}</h2><p class="promotion">${escapeHtml(promotion.mensagem)}</p></footer>` : ''}
  </main>
</body>
</html>`;
}

/** Documento independente do tema do aplicativo; dados de texto sempre são escapados. */
export function renderBrowserTicket(payload: TicketNavegador): Promise<string> {
  return renderTicket(payload);
}

async function printDocument(
  render: () => Promise<string>,
  beforePrint?: () => void,
): Promise<void> {
  if (activePrint)
    throw new Error('Já existe um diálogo de impressão aberto. Feche-o e tente novamente.');
  let frame: HTMLIFrameElement | undefined;
  let frameWindow: Window | null = null;
  let loadTimeout: number | undefined;
  let cleanupTimeout: number | undefined;
  let rejectLoading: ((reason: Error) => void) | undefined;
  let disposed = false;
  const previousFocus = document.activeElement;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(loadTimeout);
    window.clearTimeout(cleanupTimeout);
    window.removeEventListener('afterprint', dispose);
    window.removeEventListener('pagehide', abort);
    frameWindow?.removeEventListener('afterprint', dispose);
    if (frame) {
      frame.srcdoc = '';
      frame.remove();
    }
    if (activePrint === session) activePrint = null;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
  };
  const abort = () => {
    rejectLoading?.(new Error('A impressão foi interrompida ao sair da página.'));
    dispose();
  };
  const session = { dispose };
  activePrint = session;
  window.addEventListener('pagehide', abort);
  try {
    const html = await render();
    if (disposed) throw new Error('A impressão foi interrompida ao sair da página.');
    beforePrint?.();
    await new Promise<void>((resolve, reject) => {
      rejectLoading = reject;
      const fail = (error: unknown) => {
        dispose();
        reject(
          error instanceof Error
            ? error
            : new Error('Não foi possível abrir a impressão no navegador.'),
        );
      };
      loadTimeout = window.setTimeout(
        () => fail(new Error('O ticket não carregou para impressão. Tente novamente.')),
        loadTimeoutMs,
      );
      frame = document.createElement('iframe');
      frame.title = 'Documento de impressão do ticket';
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.dataset.testid = 'browser-print-frame';
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      frame.addEventListener(
        'load',
        () => {
          void (async () => {
            try {
              if (disposed || !frame) return;
              frameWindow = frame.contentWindow;
              if (!frameWindow || typeof frameWindow.print !== 'function') {
                throw new Error(
                  'Este navegador não disponibilizou a impressão. Use um navegador no computador.',
                );
              }
              await frame.contentDocument?.fonts?.ready;
              await new Promise<void>((ready) => {
                if (window.requestAnimationFrame) window.requestAnimationFrame(() => ready());
                else window.setTimeout(ready, 0);
              });
              if (disposed) return;
              window.clearTimeout(loadTimeout);
              window.addEventListener('afterprint', dispose);
              frameWindow.addEventListener('afterprint', dispose);
              cleanupTimeout = window.setTimeout(dispose, cleanupTimeoutMs);
              frameWindow.focus();
              beforePrint?.();
              frameWindow.print();
              rejectLoading = undefined;
              resolve();
            } catch (error) {
              fail(error);
            }
          })();
        },
        { once: true },
      );
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
  } catch (error) {
    dispose();
    throw error;
  }
}

/** Abre o diálogo; o navegador não informa se houve impressão física ou cancelamento. */
export function printBrowserTicket(
  payload: TicketNavegador,
  beforePrint?: () => void,
): Promise<void> {
  return printDocument(() => renderBrowserTicket(payload), beforePrint);
}

export function printBrowserTest(
  establishment: string,
  width: 58 | 80,
  beforePrint?: () => void,
): Promise<void> {
  const ticket: TicketEntrada = {
    estabelecimento: establishment,
    placa: 'ABC1D23',
    veiculo: 'Teste da impressora',
    entrada: new Date().toLocaleString('pt-BR'),
    codigoQr: 'CARE-AUTO-TESTE-DE-IMPRESSAO',
    codigoTicket: '000000000000',
    sequencial: 'TESTE',
    pontoEntrada: 'TESTE',
  };
  return printDocument(() => renderTicket({ larguraPapelMm: width, ticket }, true), beforePrint);
}
