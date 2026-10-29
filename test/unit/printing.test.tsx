import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../src/stores/authStore';
import { EntryModal } from '../../src/features/stays/EntryModal';
import { PrintingPage } from '../../src/features/printing/PrintingPage';
import { printerSchema } from '../../src/features/printing/printerSchema';
import type { AcaoAposEntrada, ConfiguracaoImpressao, TicketNavegador } from '../../src/features/printing/api';

const api = vi.hoisted(() => vi.fn());
const browserPrinting = vi.hoisted(() => ({ printBrowserTicket: vi.fn(), printBrowserTest: vi.fn() }));
vi.mock('../../src/features/printing/browserPrinting', () => browserPrinting);
const entryPrinter = {
  impressoraId: 1,
  nome: 'Guarita',
  tipoConexao: 'REDE_TCP',
  enderecoDriverOuIp: '192.168.0.50',
  portaTcp: 9100,
  imprimeEntrada: true,
  imprimeFechamento: true,
  ativo: true,
};
vi.mock('../../src/lib/apiClient', async (actual) => ({
  ...(await actual<typeof import('../../src/lib/apiClient')>()),
  api,
}));
vi.mock('../../src/lib/swal', () => ({ confirmAction: vi.fn(async () => true) }));

const page = <T,>(items: T[]) => ({ items, pageNumber: 1, pageSize: 100, total: items.length });
let action: AcaoAposEntrada = 'PERGUNTAR';
let config: ConfiguracaoImpressao = {
  perguntarAoSalvarEntrada: true,
  imprimirCupomEntradaAutomatico: false,
  imprimirPeloNavegador: false,
  larguraPapelNavegadorMm: 80,
  impressaoAutomaticaNoServidor: false,
  acaoAposEntrada: 'PERGUNTAR',
  possuiTokenAgente: false,
  impressaoEntradaDisponivel: true,
  agenteConectado: false,
  ultimoContatoAgenteEm: null as string | null,
  atualizadoEm: null,
  atualizadoPor: null,
  versao: 'v1',
};
let printers = [entryPrinter];
const browserTicket: TicketNavegador = {
  larguraPapelMm: 58,
  ticket: {
    estabelecimento: 'Estacionamento A',
    placa: 'ABC1D23',
    veiculo: 'Fiat Uno',
    entrada: '29/10/2026 19:30:00',
    codigoQr: 'ACM1.assinatura-de-teste',
    codigoTicket: '000000000055',
    sequencial: '55',
  },
};
const calls = (method: string, path: string) =>
  api.mock.calls.filter(([p, o]) => (o?.method ?? 'GET') === method && String(p).startsWith(path));

function wrap(ui: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    session: {
      userId: 'u1',
      estabelecimentoId: 1,
      estabelecimentoNome: 'Estacionamento A',
      userName: 'Rodrigo',
      email: 'admin@example.test',
      accessToken: 'token',
      expiresAtUtc: '2099-01-01T00:00:00Z',
      roles: ['Admin'],
    },
  });
  action = 'PERGUNTAR';
  config = {
    ...config,
    impressaoEntradaDisponivel: true,
    possuiTokenAgente: false,
    perguntarAoSalvarEntrada: true,
    imprimirCupomEntradaAutomatico: false,
    imprimirPeloNavegador: false,
    larguraPapelNavegadorMm: 80,
    impressaoAutomaticaNoServidor: false,
    agenteConectado: false,
    ultimoContatoAgenteEm: null,
    versao: 'v1',
  };
  printers = [entryPrinter];
  browserPrinting.printBrowserTicket.mockReset().mockResolvedValue(undefined);
  browserPrinting.printBrowserTest.mockReset().mockResolvedValue(undefined);
  api.mockReset();
  api.mockImplementation((path: string, options?: RequestInit) => {
    const method = options?.method ?? 'GET';
    if (path.startsWith('/api/v1/veiculos'))
      return Promise.resolve(page([{ veiculoId: 7, placa: 'ABC1D23' }]));
    if (path.startsWith('/api/v1/tabelas-preco'))
      return Promise.resolve(page([{ tabelaId: 3, nome: 'Avulso', ativo: true }]));
    if (path === '/api/v1/impressao/configuracao' && method === 'GET')
      return Promise.resolve({ ...config, acaoAposEntrada: action });
    if (path === '/api/v1/impressao/configuracao')
      return Promise.resolve({ ...config, ...JSON.parse(String(options!.body)), versao: 'v2' });
    if (path === '/api/v1/estadias' && method === 'POST')
      return Promise.resolve({ estadiaId: 55, veiculoId: 7, tabelaId: 3, status: 'EM_ANDAMENTO' });
    if (path.endsWith('/ticket')) return Promise.resolve(method === 'GET' ? browserTicket : { trabalhos: 1 });
    if (path === '/api/v1/impressao/impressoras' && method === 'GET')
      return Promise.resolve(printers);
    if (path === '/api/v1/impressao/impressoras/1/teste') return Promise.resolve({ trabalhos: 1 });
    if (path === '/api/v1/impressao/impressoras')
      return Promise.resolve({ impressoraId: 1, ...JSON.parse(String(options!.body)) });
    if (path === '/api/v1/impressao/trabalhos') return Promise.resolve([]);
    if (path === '/api/v1/impressao/token-agente')
      return Promise.resolve({ token: 'acm_1_segredo-de-teste' });
    return Promise.reject(new Error('unexpected ' + method + ' ' + path));
  });
});

async function registerEntry(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(calls('GET', '/api/v1/impressao/configuracao')).toHaveLength(1));
  await screen.findByRole('option', { name: 'ABC1D23' });
  await user.selectOptions(screen.getByTestId('field-veiculoId'), '7');
  await screen.findByRole('option', { name: 'Avulso' });
  await user.selectOptions(screen.getByTestId('field-tabelaId'), '3');
  await user.click(screen.getByTestId('form-submit'));
}

describe('entry ticket', () => {
  it('asks after saving and prints only when the operator says yes', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    expect(await screen.findByTestId('ticket-question')).toHaveTextContent(
      'Entrada registrada com sucesso! Deseja imprimir o ticket de estacionamento?',
    );
    expect(close).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('ticket-print'));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(1);
  });

  it('closes without printing when the operator says no', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    await user.click(await screen.findByTestId('ticket-skip'));
    expect(close).toHaveBeenCalled();
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });

  it.each([
    ['IMPRIMIR', 1],
    ['NENHUMA', 0],
  ] as const)('does not ask when the setting is %s', async (value, tickets) => {
    action = value;
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(screen.queryByTestId('ticket-question')).not.toBeInTheDocument();
    await waitFor(() => expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(tickets));
  });
  it('never asks while printing is not set up (no agent token or entry printer)', async () => {
    config = { ...config, impressaoEntradaDisponivel: false };
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(screen.queryByTestId('ticket-question')).not.toBeInTheDocument();
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });

  it('opens the browser ticket with a signed payload after the operator confirms, without enqueueing', async () => {
    config = { ...config, imprimirPeloNavegador: true, larguraPapelNavegadorMm: 58 };
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    await user.click(await screen.findByTestId('ticket-print'));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(browserPrinting.printBrowserTicket).toHaveBeenCalledExactlyOnceWith(browserTicket, expect.any(Function));
    expect(calls('GET', '/api/v1/estadias/55/ticket')).toHaveLength(1);
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });

  it('opens the browser dialog automatically after saving the entry', async () => {
    action = 'IMPRIMIR';
    config = { ...config, imprimirPeloNavegador: true };
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(browserPrinting.printBrowserTicket).toHaveBeenCalledExactlyOnceWith(browserTicket, expect.any(Function));
    expect(calls('POST', '/api/v1/estadias')).toHaveLength(1);
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });

  it('keeps the saved entry for retry when the browser dialog fails, without saving or enqueueing twice', async () => {
    action = 'IMPRIMIR';
    config = { ...config, imprimirPeloNavegador: true };
    browserPrinting.printBrowserTicket.mockRejectedValueOnce(new Error('O diálogo de impressão não abriu.'));
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('O diálogo de impressão não abriu.');
    expect(screen.getByRole('alert')).toHaveTextContent('A entrada continua registrada.');
    expect(close).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('ticket-print'));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(browserPrinting.printBrowserTicket).toHaveBeenCalledTimes(2);
    expect(calls('POST', '/api/v1/estadias')).toHaveLength(1);
    expect(calls('GET', '/api/v1/estadias/55/ticket')).toHaveLength(2);
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });

  it('does not request another agent job when the server already queues automatic printing', async () => {
    action = 'IMPRIMIR';
    config = { ...config, impressaoAutomaticaNoServidor: true };
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
    expect(browserPrinting.printBrowserTicket).not.toHaveBeenCalled();
  });

  it('uses the current browser preference when the cached configuration still says the agent queues automatically', async () => {
    action = 'IMPRIMIR';
    config = { ...config, impressaoAutomaticaNoServidor: true };
    const originalApi = api.getMockImplementation()!;
    let configReads = 0;
    api.mockImplementation((path: string, options?: RequestInit) => {
      if (path === '/api/v1/impressao/configuracao' && (options?.method ?? 'GET') === 'GET') {
        configReads += 1;
        return Promise.resolve({
          ...config,
          acaoAposEntrada: action,
          imprimirPeloNavegador: configReads > 1,
          impressaoAutomaticaNoServidor: configReads === 1,
        });
      }
      return originalApi(path, options);
    });
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(browserPrinting.printBrowserTicket).toHaveBeenCalledExactlyOnceWith(browserTicket, expect.any(Function));
    expect(calls('POST', '/api/v1/estadias')).toHaveLength(1);
    expect(calls('GET', '/api/v1/estadias/55/ticket')).toHaveLength(1);
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });

  it('keeps the saved entry available for print retry when refreshing its printing preference fails', async () => {
    action = 'IMPRIMIR';
    config = { ...config, imprimirPeloNavegador: true };
    const originalApi = api.getMockImplementation()!;
    let configReads = 0;
    api.mockImplementation((path: string, options?: RequestInit) => {
      if (path === '/api/v1/impressao/configuracao' && (options?.method ?? 'GET') === 'GET') {
        configReads += 1;
        if (configReads === 2)
          return Promise.reject(new Error('Configuração de impressão temporariamente indisponível.'));
      }
      return originalApi(path, options);
    });
    const user = userEvent.setup();
    const close = vi.fn();
    wrap(<EntryModal onClose={close} />);
    await registerEntry(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Configuração de impressão temporariamente indisponível.');
    expect(screen.getByRole('alert')).toHaveTextContent('A entrada está registrada.');
    expect(close).not.toHaveBeenCalled();
    expect(browserPrinting.printBrowserTicket).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('ticket-print'));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(browserPrinting.printBrowserTicket).toHaveBeenCalledExactlyOnceWith(browserTicket, expect.any(Function));
    expect(calls('POST', '/api/v1/estadias')).toHaveLength(1);
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });

  it.each(['different user', 'new login for the same user'] as const)('does not print after the session changes: %s', async (sessionChange) => {
    config = { ...config, imprimirPeloNavegador: true };
    const user = userEvent.setup();
    wrap(<EntryModal onClose={vi.fn()} />);
    await registerEntry(user);
    const printButton = await screen.findByTestId('ticket-print');
    const originalApi = api.getMockImplementation()!;
    let resolveConfig: ((value: ConfiguracaoImpressao) => void) | undefined;
    let holdRequest = true;
    api.mockImplementation((path: string, options?: RequestInit) => {
      if (path === '/api/v1/impressao/configuracao' && (options?.method ?? 'GET') === 'GET' && holdRequest) {
        holdRequest = false;
        return new Promise<ConfiguracaoImpressao>((resolve) => { resolveConfig = resolve; });
      }
      return originalApi(path, options);
    });
    await user.click(printButton);
    await waitFor(() => expect(resolveConfig).toBeDefined());
    await act(async () => {
      useAuthStore.setState({ session: {
        ...useAuthStore.getState().session!,
        ...(sessionChange === 'different user' ? { userId: 'u2' } : { accessToken: 'new-login-token' }),
      } });
      resolveConfig!(config);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('A sessão mudou.');
    expect(browserPrinting.printBrowserTicket).not.toHaveBeenCalled();
    expect(calls('GET', '/api/v1/estadias/55/ticket')).toHaveLength(0);
    expect(calls('POST', '/api/v1/estadias/55/ticket')).toHaveLength(0);
  });
});

describe('printing settings page', () => {
  it('only allows automatic printing when the question is off and saves both flags', async () => {
    // The backend's availability flag also requires an agent token; a configured entry printer
    // should still allow the preference to be saved before the agent is installed.
    config = { ...config, impressaoEntradaDisponivel: false };
    const user = userEvent.setup();
    wrap(<PrintingPage />);
    const ask = await screen.findByRole('switch', {
      name: 'Perguntar se deseja imprimir na entrada',
    });
    const automatic = screen.getByRole('switch', { name: 'Imprimir automaticamente' });
    await waitFor(() => expect(ask).toHaveAttribute('aria-checked', 'true'));
    expect(automatic).toBeDisabled();
    expect(screen.getByTestId('print-preferences-save')).toBeDisabled();
    await user.click(ask);
    expect(automatic).toBeEnabled();
    await user.click(automatic);
    expect(screen.getByText('O ticket é impresso automaticamente em toda entrada.')).toBeVisible();
    await user.click(screen.getByTestId('print-preferences-save'));
    await waitFor(() => expect(calls('PUT', '/api/v1/impressao/configuracao')).toHaveLength(1));
    expect(JSON.parse(String(calls('PUT', '/api/v1/impressao/configuracao')[0][1].body))).toEqual({
      perguntarAoSalvarEntrada: false,
      imprimirCupomEntradaAutomatico: true,
      imprimirPeloNavegador: false,
      larguraPapelNavegadorMm: 80,
      versao: 'v1',
    });
  });

  it('saves browser printing and paper width without a printer or agent token', async () => {
    printers = [];
    config = { ...config, perguntarAoSalvarEntrada: false, impressaoEntradaDisponivel: false };
    const user = userEvent.setup();
    wrap(<PrintingPage />);
    await user.click(await screen.findByTestId('field-imprimirPeloNavegador'));
    await user.selectOptions(screen.getByTestId('field-larguraPapelNavegadorMm'), '58');
    await user.click(screen.getByTestId('print-preferences-save'));
    await waitFor(() => expect(calls('PUT', '/api/v1/impressao/configuracao')).toHaveLength(1));
    expect(JSON.parse(String(calls('PUT', '/api/v1/impressao/configuracao')[0][1].body))).toEqual({
      perguntarAoSalvarEntrada: false,
      imprimirCupomEntradaAutomatico: false,
      imprimirPeloNavegador: true,
      larguraPapelNavegadorMm: 58,
      versao: 'v1',
    });
    expect(await screen.findByTestId('browser-print-panel')).toBeVisible();
    expect(screen.queryByTestId('print-agent')).not.toBeInTheDocument();
  });

  it('prints a browser test without calling the agent API', async () => {
    config = { ...config, imprimirPeloNavegador: true, larguraPapelNavegadorMm: 58 };
    printers = [];
    const user = userEvent.setup();
    wrap(<PrintingPage />);
    const panel = await screen.findByTestId('browser-print-panel');
    await user.click(within(panel).getByTestId('browser-print-test'));
    await waitFor(() => expect(browserPrinting.printBrowserTest).toHaveBeenCalledExactlyOnceWith('Estacionamento A', 58, expect.any(Function)));
    expect(calls('POST', '/api/v1/impressao/impressoras/1/teste')).toHaveLength(0);
    expect(screen.queryByTestId('print-printers')).not.toBeInTheDocument();
  });

  it('keeps agent testing blocked while a configured agent has no contact', async () => {
    config = { ...config, possuiTokenAgente: true };
    const user = userEvent.setup();
    wrap(<PrintingPage />);
    const button = await screen.findByTestId('printer-test');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringContaining('Agente sem contato'));
    await user.click(button);
    expect(calls('POST', '/api/v1/impressao/impressoras/1/teste')).toHaveLength(0);
    expect(browserPrinting.printBrowserTest).not.toHaveBeenCalled();
  });

  it('uses the existing agent test endpoint when browser mode is off and the agent is connected', async () => {
    config = { ...config, possuiTokenAgente: true, agenteConectado: true };
    const user = userEvent.setup();
    wrap(<PrintingPage />);
    await user.click(await screen.findByTestId('printer-test'));
    await waitFor(() => expect(calls('POST', '/api/v1/impressao/impressoras/1/teste')).toHaveLength(1));
    expect(browserPrinting.printBrowserTest).not.toHaveBeenCalled();
  });

  it('shows the agent token once with setup instructions', async () => {
    const user = userEvent.setup();
    wrap(<PrintingPage />);
    expect(await screen.findByText('Não configurado')).toBeVisible();
    await user.click(screen.getByTestId('agent-token'));
    const dialog = await screen.findByRole('dialog', { name: 'Token do agente' });
    expect(within(dialog).getByTestId('agent-token-value')).toHaveTextContent(
      'acm_1_segredo-de-teste',
    );
    expect(within(dialog).getByText(/aparece uma única vez/)).toBeVisible();
    await user.click(within(dialog).getByTestId('agent-token-done'));
    await waitFor(() => expect(screen.queryByTestId('agent-token-value')).not.toBeInTheDocument());
  });

  it('validates and creates a network printer', async () => {
    const user = userEvent.setup();
    wrap(<PrintingPage />);
    await user.click(await screen.findByTestId('printer-new'));
    const dialog = await screen.findByRole('dialog', { name: 'Nova impressora' });
    await user.type(within(dialog).getByTestId('field-nome'), 'Guarita 1');
    await user.type(within(dialog).getByTestId('field-enderecoDriverOuIp'), 'não é ip');
    await user.click(within(dialog).getByTestId('form-submit'));
    expect(await within(dialog).findByText(/Informe um IP/)).toBeVisible();
    expect(calls('POST', '/api/v1/impressao/impressoras')).toHaveLength(0);
    await user.clear(within(dialog).getByTestId('field-enderecoDriverOuIp'));
    await user.type(within(dialog).getByTestId('field-enderecoDriverOuIp'), '192.168.0.50');
    await user.click(within(dialog).getByTestId('form-submit'));
    await waitFor(() => expect(calls('POST', '/api/v1/impressao/impressoras')).toHaveLength(1));
    expect(JSON.parse(String(calls('POST', '/api/v1/impressao/impressoras')[0][1].body))).toEqual({
      nome: 'Guarita 1',
      tipoConexao: 'REDE_TCP',
      enderecoDriverOuIp: '192.168.0.50',
      portaTcp: 9100,
      imprimeEntrada: true,
      imprimeFechamento: true,
      ativo: true,
    });
  });
});

describe('printer schema', () => {
  const base = {
    nome: 'Caixa',
    tipoConexao: 'USB_WINDOWS' as const,
    enderecoDriverOuIp: 'EPSON TM-T20X Receipt',
    portaTcp: null,
    imprimeEntrada: true,
    imprimeFechamento: false,
    ativo: true,
  };
  it('accepts usb driver names without a port and requires one function', () => {
    expect(printerSchema.safeParse(base).success).toBe(true);
    expect(printerSchema.safeParse({ ...base, imprimeEntrada: false }).success).toBe(false);
  });
  it('requires a valid address and port for network printers', () => {
    const net = {
      ...base,
      tipoConexao: 'REDE_TCP' as const,
      enderecoDriverOuIp: '10.0.0.5',
      portaTcp: 9100,
    };
    expect(printerSchema.safeParse(net).success).toBe(true);
    expect(printerSchema.safeParse({ ...net, portaTcp: null }).success).toBe(false);
    expect(printerSchema.safeParse({ ...net, portaTcp: 70000 }).success).toBe(false);
    expect(printerSchema.safeParse({ ...net, enderecoDriverOuIp: '300.1.1.1' }).success).toBe(
      false,
    );
    expect(printerSchema.safeParse({ ...net, enderecoDriverOuIp: 'guarita.local' }).success).toBe(
      true,
    );
  });
});
