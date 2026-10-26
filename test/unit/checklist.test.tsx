import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../src/stores/authStore';
import { ChecklistModal } from '../../src/features/checklist/ChecklistModal';
import { ApiError } from '../../src/lib/apiClient';
import type { ChecklistEstadia } from '../../src/features/checklist/api';

const api = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/apiClient', async (actual) => ({
  ...(await actual<typeof import('../../src/lib/apiClient')>()),
  api,
}));

const header: ChecklistEstadia = {
  estadiaId: 55,
  statusEstadia: 'EM_ANDAMENTO',
  editavel: true,
  dataEntrada: '2026-10-06T12:00:00Z',
  placa: 'CHK1A23',
  marca: 'Toyota',
  modelo: 'Corolla',
  cor: 'Prata',
  clienteNome: 'Maria Souza',
  clienteTelefone: '11987654321',
  checkList: null,
};
const saved: ChecklistEstadia = {
  ...header,
  checkList: {
    checkListId: 9,
    kmAtual: 45210,
    dataUltimaManutencao: '2026-08-15',
    observacoes: 'Cliente ciente.',
    atendente: 'Ana',
    criadoEm: '2026-10-06T12:05:00Z',
    atualizadoEm: '2026-10-06T12:05:00Z',
    versao: 'v1',
    itens: [
      { item: 'PNEUS_TRASEIROS', status: 'RUIM', descricao: null },
      { item: 'OUTRO', status: 'FALTANTE_NAO_FUNCIONA', descricao: 'Rádio' },
    ],
    avarias: [{ vista: 'LATERAL_ESQ', tipo: 'A', posicaoX: 40, posicaoY: 30, observacao: 'Porta' }],
  },
};
let current: ChecklistEstadia;
const puts = () => api.mock.calls.filter(([, o]) => o?.method === 'PUT');
const body = (index = 0) => JSON.parse(String(puts()[index][1].body));

function open(onClose = vi.fn()) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ChecklistModal estadiaId={55} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

beforeEach(() => {
  useAuthStore.setState({
    session: {
      userId: 'u1',
      estabelecimentoId: 1,
      estabelecimentoNome: 'Estacionamento A',
      userName: 'Ana',
      email: 'ana@example.test',
      accessToken: 'token',
      expiresAtUtc: '2099-01-01T00:00:00Z',
      roles: ['Operador'],
    },
  });
  current = header;
  api.mockReset();
  api.mockImplementation((path: string, options?: RequestInit) => {
    if (path !== '/api/v1/estadias/55/checklist')
      return Promise.reject(new Error('unexpected ' + path));
    if (options?.method === 'PUT') {
      const input = JSON.parse(String(options.body));
      current = {
        ...current,
        checkList: {
          ...saved.checkList!,
          ...input,
          versao: 'v' + (puts().length + 1),
        },
      };
    }
    return Promise.resolve(current);
  });
});

describe('vehicle checklist', () => {
  it('opens the form with the server header and saves items, damages and header fields', async () => {
    const user = userEvent.setup();
    open();
    const headerBox = await screen.findByTestId('checklist-header');
    expect(headerBox).toHaveTextContent('CHK1A23');
    expect(headerBox).toHaveTextContent('Toyota Corolla · Prata');
    expect(headerBox).toHaveTextContent('Maria Souza');
    expect(headerBox).toHaveTextContent('11987654321');

    await user.type(await screen.findByTestId('checklist-km'), '45.210');
    expect(screen.getByTestId('checklist-km')).toHaveValue('45210');
    fireEvent.change(screen.getByTestId('checklist-last-maintenance'), {
      target: { value: '2026-08-15' },
    });
    await user.click(screen.getByTestId('item-PNEUS_TRASEIROS-RUIM'));
    await user.click(screen.getByTestId('item-BUZINA-BOM'));
    await user.click(screen.getByTestId('item-BUZINA-BOM'));
    expect(screen.getByTestId('item-BUZINA-BOM')).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByTestId('item-OUTRO-FALTANTE_NAO_FUNCIONA'));
    await user.click(screen.getByTestId('checklist-save'));
    expect(await screen.findByText('Descreva o item avaliado.')).toBeVisible();
    expect(puts()).toHaveLength(0);
    await user.type(screen.getByTestId('checklist-other'), 'Rádio');

    // A click is stored as a percentage of the drawing; Enter marks the center.
    const side = screen.getByTestId('damage-view-LATERAL_ESQ');
    side.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 80 }) as DOMRect;
    fireEvent.click(side, { clientX: 150, clientY: 70 });
    await user.click(screen.getByTestId('damage-tool-X'));
    screen.getByTestId('damage-view-TOPO').focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByTestId('damage-marker')).toHaveLength(2);
    await user.type(screen.getAllByTestId('damage-note')[0], 'Porta traseira');
    await user.type(screen.getByTestId('checklist-notes'), '  Cliente ciente.  ');
    await user.click(screen.getByTestId('checklist-save'));

    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toEqual({
      kmAtual: 45210,
      dataUltimaManutencao: '2026-08-15',
      observacoes: 'Cliente ciente.',
      itens: [
        { item: 'PNEUS_TRASEIROS', status: 'RUIM', descricao: null },
        { item: 'OUTRO', status: 'FALTANTE_NAO_FUNCIONA', descricao: 'Rádio' },
      ],
      avarias: [
        {
          vista: 'LATERAL_ESQ',
          tipo: 'A',
          posicaoX: 25,
          posicaoY: 25,
          observacao: 'Porta traseira',
        },
        { vista: 'TOPO', tipo: 'X', posicaoX: 50, posicaoY: 50, observacao: null },
      ],
      versao: null,
    });
    expect(await screen.findByTestId('checklist-report')).toBeVisible();
  });

  it('opens saved checklists as a report, edits with the saved version and removes damages', async () => {
    current = saved;
    const user = userEvent.setup();
    open();
    const report = await screen.findByTestId('checklist-report');
    expect(report).toHaveTextContent('45.210 km');
    expect(report).toHaveTextContent('15/08/2026');
    expect(report).toHaveTextContent('Ana');
    expect(screen.getByTestId('checklist-report-items')).toHaveTextContent('Outro: Rádio');
    expect(within(report).getAllByTestId('damage-marker')).toHaveLength(1);
    await user.click(screen.getByTestId('checklist-edit'));
    expect(screen.getByTestId('checklist-km')).toHaveValue('45210');
    expect(screen.getByTestId('item-OUTRO-FALTANTE_NAO_FUNCIONA')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('checklist-other')).toHaveValue('Rádio');
    await user.click(screen.getByTestId('damage-remove'));
    expect(screen.queryAllByTestId('damage-marker')).toHaveLength(0);
    await user.click(screen.getByTestId('checklist-save'));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toMatchObject({ versao: 'v1', avarias: [], kmAtual: 45210 });
  });

  it('asks inline before discarding unsaved changes', async () => {
    const user = userEvent.setup();
    const close = open();
    await user.click(await screen.findByTestId('item-EXTINTOR-BOM'));
    await user.click(screen.getByTestId('checklist-cancel'));
    expect(screen.getByRole('alert')).toHaveTextContent('As alterações não salvas serão perdidas.');
    await user.click(screen.getByTestId('checklist-keep'));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByTestId('item-EXTINTOR-BOM')).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByTestId('checklist-cancel'));
    await user.click(screen.getByTestId('checklist-discard'));
    expect(close).toHaveBeenCalled();
    expect(puts()).toHaveLength(0);
  });

  it('is read-only after the stay is closed', async () => {
    current = { ...saved, editavel: false, statusEstadia: 'CONCLUIDO' };
    open();
    expect(await screen.findByText(/apenas para consulta/)).toBeVisible();
    expect(screen.queryByTestId('checklist-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checklist-save')).not.toBeInTheDocument();
  });

  it('tells when a closed stay has no checklist', async () => {
    current = { ...header, editavel: false, statusEstadia: 'CANCELADO' };
    open();
    expect(await screen.findByTestId('checklist-missing')).toHaveTextContent(
      'O checklist não foi realizado nesta estadia.',
    );
  });

  it('keeps the form and shows the server conflict', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByTestId('checklist-km');
    api.mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'O checklist foi alterado por outra pessoa.'),
    );
    await user.click(screen.getByTestId('item-BUZINA-RUIM'));
    await user.click(screen.getByTestId('checklist-save'));
    expect(await screen.findByTestId('checklist-error')).toHaveTextContent(
      'O checklist foi alterado por outra pessoa.',
    );
    expect(screen.getByTestId('item-BUZINA-RUIM')).toHaveAttribute('aria-checked', 'true');
  });
});
