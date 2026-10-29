import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../src/stores/authStore';
import { EntryModal } from '../../src/features/stays/EntryModal';
import { PrintingPage } from '../../src/features/printing/PrintingPage';
import { printerSchema } from '../../src/features/printing/printerSchema';
import type { AcaoAposEntrada } from '../../src/features/printing/api';

const api = vi.hoisted(() => vi.fn());
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
let config = {
  perguntarAoSalvarEntrada: true,
  imprimirCupomEntradaAutomatico: false,
  acaoAposEntrada: 'PERGUNTAR',
  possuiTokenAgente: false,
  impressaoEntradaDisponivel: true,
  agenteConectado: false,
  ultimoContatoAgenteEm: null as string | null,
  atualizadoEm: null,
  atualizadoPor: null,
  versao: 'v1',
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
  };
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
    if (path.endsWith('/ticket')) return Promise.resolve({ trabalhos: 1 });
    if (path === '/api/v1/impressao/impressoras' && method === 'GET')
      return Promise.resolve([entryPrinter]);
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
      versao: 'v1',
    });
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
