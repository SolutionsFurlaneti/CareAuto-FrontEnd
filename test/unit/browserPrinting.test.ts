import { waitFor } from '@testing-library/react';
import QRCode from 'qrcode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TicketNavegador } from '../../src/features/printing/api';
import {
  printBrowserTest,
  printBrowserTicket,
  renderBrowserTicket,
} from '../../src/features/printing/browserPrinting';

const ticket: TicketNavegador = {
  larguraPapelMm: 58,
  ticket: {
    estabelecimento: 'Estacionamento São João',
    placa: 'ABC1D23',
    veiculo: 'Fiat Uno · Prata',
    entrada: '29/10/2026 19:32:40',
    codigoQr: 'ACM1.assinatura-do-ticket',
    operadora: 'Operadora do estacionamento',
    toleranciaMinutos: 15,
    pontoEntrada: 'PRINCIPAL',
    codigoTicket: '000000010021',
    sequencial: '10021',
    promocaoRodape: {
      ativo: true,
      nomeParceiro: 'Parceiro',
      mensagem: 'Primeira linha\nSegunda linha',
    },
  },
};

function parse(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

async function frame() {
  let result: HTMLIFrameElement | null = null;
  await waitFor(() => {
    result = document.querySelector<HTMLIFrameElement>('[data-testid="browser-print-frame"]');
    expect(result).not.toBeNull();
  });
  if (!result) throw new Error('Print frame was not created');
  return result as HTMLIFrameElement;
}

beforeEach(() => {
  vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(window);
  vi.spyOn(window, 'focus').mockImplementation(() => undefined);
  vi.spyOn(window, 'print').mockImplementation(() => undefined);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  window.dispatchEvent(new Event('afterprint'));
  window.dispatchEvent(new Event('pagehide'));
  vi.restoreAllMocks();
  document
    .querySelectorAll('[data-testid="browser-print-frame"]')
    .forEach((element) => element.remove());
});

describe('browser ticket document', () => {
  it.each([58, 80] as const)(
    'renders the signed QR and two barcodes on %s mm paper',
    async (width) => {
      const qr = vi.spyOn(QRCode, 'toString');
      const html = await renderBrowserTicket({ ...ticket, larguraPapelMm: width });
      const doc = parse(html);
      expect(qr).toHaveBeenCalledWith(
        ticket.ticket.codigoQr,
        expect.objectContaining({ type: 'svg', margin: 4 }),
      );
      expect(doc.title).toBe('Ticket de estacionamento');
      expect(doc.querySelector('style')?.textContent).toContain(`width: ${width}mm`);
      expect(doc.querySelector('style')?.textContent).toContain('background: #fff; color: #000');
      expect(doc.body.textContent).toContain('Estacionamento São João');
      expect(doc.body.textContent).toContain('ABC1D23');
      expect(doc.body.textContent).toContain('29/10/2026 19:32:40');
      expect(doc.body.textContent).toContain('Tolerância: 15 minutos');
      expect(doc.body.textContent).toContain('Ticket/Seq: 10021');
      expect(doc.querySelectorAll('.barcode svg')).toHaveLength(2);
      for (const barcode of doc.querySelectorAll('.barcode svg')) {
        expect(barcode.getAttribute('aria-label')).toBe('Código do ticket 000000010021');
        expect(barcode.getAttribute('viewBox')).toBeTruthy();
        expect(barcode.querySelectorAll('rect').length).toBeGreaterThan(1);
      }
      expect(doc.querySelector('.qr svg path')).not.toBeNull();
      expect(doc.querySelector('.promotion')?.textContent).toBe('Primeira linha\nSegunda linha');
    },
  );

  it('escapes customer-controlled text and keeps long names in the paper layout', async () => {
    const unsafe = '<img src=x onerror="alert(1)"><script>alert(2)</script>&';
    const html = await renderBrowserTicket({
      ...ticket,
      ticket: {
        ...ticket.ticket,
        estabelecimento: unsafe + 'Nome muito longo '.repeat(20),
        veiculo: unsafe,
        operadora: unsafe,
        pontoEntrada: unsafe,
        entrada: unsafe,
        placa: unsafe,
        sequencial: unsafe,
        promocaoRodape: { ativo: true, nomeParceiro: unsafe, mensagem: unsafe },
      },
    });
    const doc = parse(html);
    expect(doc.querySelectorAll('script, img, [onerror]')).toHaveLength(0);
    expect(doc.querySelector('h1')?.textContent).toBe(unsafe + 'Nome muito longo '.repeat(20));
    expect(doc.querySelector('.promotion')?.textContent).toBe(unsafe);
    expect(doc.querySelector('style')?.textContent).toContain('overflow-wrap: anywhere');
  });

  it('omits an inactive promotion and missing optional barcodes', async () => {
    const html = await renderBrowserTicket({
      ...ticket,
      ticket: {
        ...ticket.ticket,
        codigoTicket: null,
        promocaoRodape: { ativo: false, nomeParceiro: 'Não imprimir', mensagem: 'Não imprimir' },
      },
    });
    const doc = parse(html);
    expect(doc.querySelector('footer')).toBeNull();
    expect(doc.querySelector('.barcode')).toBeNull();
    expect(doc.querySelector('.qr svg')).not.toBeNull();
  });

  it('rejects invalid paper widths and barcode values', async () => {
    await expect(renderBrowserTicket({ ...ticket, larguraPapelMm: 72 as 58 })).rejects.toThrow(
      '58 ou 80 mm',
    );
    await expect(
      renderBrowserTicket({
        ...ticket,
        ticket: { ...ticket.ticket, codigoTicket: '<script>123</script>' },
      }),
    ).rejects.toThrow('código do ticket');
  });
});

describe('browser print dialog', () => {
  it('prints an isolated document and removes sensitive data after the dialog closes', async () => {
    const originalTitle = document.title;
    const printing = printBrowserTicket(ticket);
    const iframe = await frame();
    expect(iframe.srcdoc).toContain('Estacionamento São João');
    expect(iframe.getAttribute('aria-hidden')).toBe('true');
    iframe.dispatchEvent(new Event('load'));
    await printing;
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.title).toBe(originalTitle);
    window.dispatchEvent(new Event('afterprint'));
    expect(iframe.isConnected).toBe(false);
    expect(iframe.srcdoc).toBe('');
  });

  it('prevents concurrent dialogs and allows another request after closing', async () => {
    const first = printBrowserTicket(ticket);
    await expect(printBrowserTicket(ticket)).rejects.toThrow('diálogo de impressão aberto');
    const firstFrame = await frame();
    firstFrame.dispatchEvent(new Event('load'));
    await first;
    window.dispatchEvent(new Event('afterprint'));
    const second = printBrowserTicket(ticket);
    const secondFrame = await frame();
    secondFrame.dispatchEvent(new Event('load'));
    await second;
    expect(window.print).toHaveBeenCalledTimes(2);
  });

  it('cleans the document and releases the next attempt when printing fails', async () => {
    vi.mocked(window.print).mockImplementationOnce(() => {
      throw new Error('Print unavailable');
    });
    const printing = printBrowserTicket(ticket);
    const failed = expect(printing).rejects.toThrow('Print unavailable');
    const iframe = await frame();
    iframe.dispatchEvent(new Event('load'));
    await failed;
    expect(iframe.isConnected).toBe(false);
    expect(iframe.srcdoc).toBe('');
    const retry = printBrowserTicket(ticket);
    (await frame()).dispatchEvent(new Event('load'));
    await retry;
    expect(window.print).toHaveBeenCalledTimes(2);
  });

  it('cleans an open document when leaving the page', async () => {
    const printing = printBrowserTicket(ticket);
    const iframe = await frame();
    iframe.dispatchEvent(new Event('load'));
    await printing;
    window.dispatchEvent(new Event('pagehide'));
    expect(iframe.isConnected).toBe(false);
    expect(iframe.srcdoc).toBe('');
  });

  it('does not append personal data if the caller guard rejects after rendering', async () => {
    await expect(
      printBrowserTicket(ticket, () => {
        throw new Error('A sessão mudou');
      }),
    ).rejects.toThrow('A sessão mudou');
    expect(document.querySelector('[data-testid="browser-print-frame"]')).toBeNull();
    expect(window.print).not.toHaveBeenCalled();
  });

  it('checks the caller again immediately before printing and releases a rejected attempt', async () => {
    const beforePrint = vi
      .fn()
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('A sessão mudou');
      });
    const printing = printBrowserTicket(ticket, beforePrint);
    const rejected = expect(printing).rejects.toThrow('A sessão mudou');
    const iframe = await frame();
    iframe.dispatchEvent(new Event('load'));
    await rejected;
    expect(beforePrint).toHaveBeenCalledTimes(2);
    expect(window.print).not.toHaveBeenCalled();
    expect(iframe.isConnected).toBe(false);
    expect(iframe.srcdoc).toBe('');

    const retry = printBrowserTicket(ticket);
    (await frame()).dispatchEvent(new Event('load'));
    await retry;
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('labels the test page and uses a sample QR rather than a signed stay ticket', async () => {
    const qr = vi.spyOn(QRCode, 'toString');
    const printing = printBrowserTest('Estacionamento A', 58);
    const iframe = await frame();
    const doc = parse(iframe.srcdoc);
    expect(doc.title).toBe('Teste de impressão');
    expect(doc.body.textContent).toContain('TESTE DE IMPRESSÃO');
    expect(doc.body.textContent).toContain('não representa uma estadia');
    expect(qr).toHaveBeenCalledWith('CARE-AUTO-TESTE-DE-IMPRESSAO', expect.anything());
    iframe.dispatchEvent(new Event('load'));
    await printing;
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
