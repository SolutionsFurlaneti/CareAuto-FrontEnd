import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordForm } from '../../src/components/RecordForm';
import { PlateCapture } from '../../src/features/vehicles/PlateCapture';
import { vehiclesSchema } from '../../src/features/vehicles/vehiclesSchema';
import { isPlate, normalizePlate } from '../../src/features/vehicles/plate';
import { api } from '../../src/lib/apiClient';
import { preparePlateImage } from '../../src/features/vehicles/preparePlateImage';

vi.mock('../../src/lib/apiClient', async (original) => ({
  ...(await original<object>()),
  api: vi.fn(),
}));
vi.mock('../../src/features/vehicles/preparePlateImage', () => ({ preparePlateImage: vi.fn() }));

const data = {
  placa: 'ABC1D23',
  sucesso: true,
  marca: 'VW',
  modelo: 'Gol',
  cor: 'Prata',
  situacaoVeiculo: 'Sem restrição',
};
const categories = [
  { value: 1, label: 'Automóvel' },
  { value: 4, label: 'Hatch' },
  { value: 9, label: 'Sedan' },
];
/** Responde a leitura do Claude e a consulta veicular conforme o endereço chamado. */
function respond(reading: unknown, lookup: unknown) {
  vi.mocked(api).mockImplementation((async (path: string) => {
    if (path === '/api/v1/leitura-placa') return reading;
    if (lookup instanceof Error) throw lookup;
    return typeof lookup === 'function' ? (lookup as () => unknown)() : lookup;
  }) as never);
}
const lookups = () =>
  vi.mocked(api).mock.calls.filter(([path]) => path === '/api/v1/consultas-placa');
function form(categoriaId: number | null = null) {
  return render(
    <RecordForm
      spec={{
        schema: vehiclesSchema,
        defaults: {
          placa: '',
          categoriaId,
          clienteId: null,
          marca: null,
          modelo: null,
          cor: null,
          situacaoVeiculo: null,
        },
        fields: [
          { name: 'placa', label: 'Placa', component: PlateCapture },
          { name: 'categoriaId', label: 'Categoria', kind: 'select', options: categories },
          ...['marca', 'modelo', 'cor', 'situacaoVeiculo'].map((name) => ({
            name,
            label: name,
            optional: true,
          })),
        ],
      }}
      onSubmit={vi.fn()}
    />,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(preparePlateImage).mockImplementation(async (file) => ({
    file: new File(['compressed'], 'placa.jpg', { type: 'image/jpeg' }),
    originalBytes: file.size,
    width: 420,
    height: 234,
  }));
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:photo');
      static revokeObjectURL = vi.fn();
    },
  );
});
describe('plate recognition and lookup', () => {
  it.each(['plate-file-input', 'plate-camera-input'])(
    'sends only the compressed JPEG from %s and looks the vehicle up right after the reading',
    async (input) => {
      respond(
        {
          sucesso: true,
          placa: 'FRD4486',
          revisaoNecessaria: true,
          mensagem: 'Confira os sete caracteres.',
        },
        { ...data, placa: 'FRD4486', marca: 'Ford', modelo: 'Ka' },
      );
      form();
      expect(api).not.toHaveBeenCalled();
      expect(screen.queryByTestId('plate-claude')).not.toBeInTheDocument();
      fireEvent.change(screen.getByTestId(input), {
        target: { files: [new File(['original'], 'plate.png', { type: 'image/png' })] },
      });
      await waitFor(() => expect(screen.getByTestId('field-placa')).toHaveValue('FRD4486'));
      const [path, options] = vi.mocked(api).mock.calls[0];
      expect(path).toBe('/api/v1/leitura-placa');
      const sent = (options?.body as FormData).get('arquivo') as File;
      expect(sent.name).toBe('placa.jpg');
      expect(sent.type).toBe('image/jpeg');
      expect(sent.size).toBe(10);
      await screen.findByText('Confira os sete caracteres.');
      // Sem clique: a consulta parte da placa lida, uma única vez.
      await waitFor(() => expect(screen.getByTestId('field-marca')).toHaveValue('Ford'));
      expect(api).toHaveBeenCalledTimes(2);
      expect(lookups()).toHaveLength(1);
      expect(JSON.parse(String(lookups()[0][1]?.body))).toEqual({ placa: 'FRD4486' });
      expect(screen.getByTestId('field-modelo')).toHaveValue('Ka');
      expect(screen.getByTestId('field-placa')).toBeEnabled();
      fireEvent.blur(screen.getByTestId('field-placa'));
      expect(lookups()).toHaveLength(1);
    },
  );
  it('keeps a plate edited while Claude is responding and handles unavailable configuration', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(api).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    form();
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['original'], 'plate.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    await userEvent.type(screen.getByTestId('field-placa'), 'XYZ1234');
    resolve({ sucesso: true, placa: 'FRD4486', revisaoNecessaria: true, mensagem: 'Confira.' });
    await screen.findByText(/A placa digitada foi preservada/);
    expect(screen.getByTestId('field-placa')).toHaveValue('XYZ1234');
    vi.mocked(api).mockResolvedValue({
      sucesso: false,
      placa: null,
      revisaoNecessaria: true,
      mensagem: 'Claude não configurado.',
    });
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['original'], 'plate.png', { type: 'image/png' })] },
    });
    await screen.findByText('Claude não configurado.');
    expect(screen.getByTestId('field-placa')).toHaveValue('XYZ1234');
  });
  it('recognizes both formats without matching longer identifiers or silently replacing ambiguous characters', () => {
    expect(isPlate('XABC12345')).toBe(false);
    expect(isPlate('ABCID23')).toBe(false);
    expect(normalizePlate(' abc-1234 ')).toBe('ABC1234');
    expect(isPlate('ABC1D23')).toBe(true);
    expect(isPlate('ABC1234')).toBe(true);
    expect(isPlate('AB01234')).toBe(false);
  });
  it('fills API data on blur and requests a changed manual plate', async () => {
    vi.mocked(api).mockResolvedValue(data);
    form();
    const user = userEvent.setup();
    await user.type(screen.getByTestId('field-placa'), 'abc-1d23');
    await user.tab();
    await waitFor(() => expect(screen.getByTestId('field-marca')).toHaveValue('VW'));
    expect(screen.getByTestId('field-placa')).toHaveValue('ABC1D23');
    await user.clear(screen.getByTestId('field-placa'));
    vi.mocked(api).mockResolvedValue({ ...data, placa: 'XYZ1234', marca: 'Ford' });
    await user.type(screen.getByTestId('field-placa'), 'XYZ1234');
    await user.tab();
    await waitFor(() => expect(screen.getByTestId('field-marca')).toHaveValue('Ford'));
    expect(api).toHaveBeenCalledTimes(2);
  });
  it('does not apply an old response or overwrite fields manually edited while waiting', async () => {
    let resolve!: (value: typeof data) => void;
    vi.mocked(api).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    form();
    const user = userEvent.setup();
    await user.type(screen.getByTestId('field-placa'), 'ABC1D23');
    await user.tab();
    await user.type(screen.getByTestId('field-marca'), 'Manual');
    resolve(data);
    await waitFor(() => expect(screen.getByTestId('field-modelo')).toHaveValue('Gol'));
    expect(screen.getByTestId('field-marca')).toHaveValue('Manual');
    await user.clear(screen.getByTestId('field-placa'));
    await user.type(screen.getByTestId('field-placa'), 'XYZ1234');
    await user.tab();
    await user.clear(screen.getByTestId('field-placa'));
    await user.type(screen.getByTestId('field-placa'), 'DEF1234');
    resolve(data);
    await waitFor(() => expect(screen.getByTestId('field-modelo')).toHaveValue(''));
  });
  it('keeps the manual fallback when the automatic lookup fails and lets Consultar retry', async () => {
    respond(
      { sucesso: true, placa: 'ABC1D23', revisaoNecessaria: true, mensagem: 'Confira a placa.' },
      { ...data, sucesso: false, mensagem: 'Serviço indisponível.' },
    );
    form();
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['photo'], 'plate.png', { type: 'image/png' })] },
    });
    await screen.findByText('Confira a placa.');
    await screen.findByText('Serviço indisponível.');
    expect(screen.getByTestId('field-placa')).toHaveValue('ABC1D23');
    expect(screen.getByTestId('field-placa')).toBeEnabled();
    expect(screen.getByTestId('plate-consult')).toBeEnabled();
    respond(null, data);
    await userEvent.click(screen.getByTestId('plate-consult'));
    await waitFor(() => expect(screen.getByTestId('field-marca')).toHaveValue('VW'));
    expect(lookups()).toHaveLength(2);
  });
  it('shows the loading state on Consultar and repeats the lookup for the same plate on demand', async () => {
    let resolve!: (value: unknown) => void;
    respond(
      { sucesso: true, placa: 'ABC1D23', revisaoNecessaria: true, mensagem: 'Confira a placa.' },
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    form();
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['photo'], 'plate.png', { type: 'image/png' })] },
    });
    await screen.findByText('Consultando dados do veículo…');
    expect(screen.getByTestId('plate-consult')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('plate-consult')).toBeDisabled();
    resolve(data);
    await waitFor(() =>
      expect(screen.getByTestId('plate-consult')).not.toHaveAttribute('aria-busy'),
    );
    expect(screen.getByTestId('plate-consult')).toBeEnabled();
    respond(null, { ...data, cor: 'Preta' });
    await userEvent.click(screen.getByTestId('plate-consult'));
    await waitFor(() => expect(lookups()).toHaveLength(2));
  });
  it('clears the loading state when the plate is edited during the lookup', async () => {
    respond(
      { sucesso: true, placa: 'ABC1D23', revisaoNecessaria: true, mensagem: 'Confira a placa.' },
      () => new Promise(() => {}),
    );
    form();
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['photo'], 'plate.png', { type: 'image/png' })] },
    });
    await waitFor(() =>
      expect(screen.getByTestId('plate-consult')).toHaveAttribute('aria-busy', 'true'),
    );
    await userEvent.type(screen.getByTestId('field-placa'), '4');
    expect(lookups()[0][1]?.signal?.aborted).toBe(true);
    expect(screen.getByTestId('plate-consult')).not.toHaveAttribute('aria-busy');
    expect(screen.getByTestId('plate-consult')).toBeEnabled();
  });
});
describe('category from the vehicle lookup', () => {
  const read = { sucesso: true, placa: 'ABC1D23', revisaoNecessaria: true, mensagem: 'Confira.' };
  const upload = () =>
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['photo'], 'plate.png', { type: 'image/png' })] },
    });
  it('selects the matching category automatically and explains the suggestion', async () => {
    respond(read, {
      ...data,
      tipoVeiculo: 'AU - HATCH PEQUENO',
      categoriaId: 4,
      categoriaNome: 'Hatch',
    });
    form();
    upload();
    await waitFor(() => expect(screen.getByTestId('field-categoriaId')).toHaveValue('4'));
    expect(
      await screen.findByText(/Categoria sugerida: Hatch \(AU - HATCH PEQUENO\)\./),
    ).toBeVisible();
  });
  it('leaves Categoria empty when the provider returns no type or no match', async () => {
    respond(read, data);
    form();
    upload();
    await screen.findByText('Dados encontrados. Confira as informações antes de salvar.');
    expect(screen.getByTestId('field-categoriaId')).toHaveValue('');
    respond(null, { ...data, tipoVeiculo: 'TRATOR ESTEIRA', categoriaId: null });
    await userEvent.click(screen.getByTestId('plate-consult'));
    expect(
      await screen.findByText(/Tipo informado: TRATOR ESTEIRA\. Escolha a categoria\./),
    ).toBeVisible();
    expect(screen.getByTestId('field-categoriaId')).toHaveValue('');
  });
  it('never replaces a category the operator already chose', async () => {
    respond(read, { ...data, tipoVeiculo: 'SEDAN', categoriaId: 4, categoriaNome: 'Hatch' });
    form(9);
    upload();
    await screen.findByText('Dados encontrados. Confira as informações antes de salvar.');
    expect(screen.getByTestId('field-categoriaId')).toHaveValue('9');
  });
  it('undoes the suggested category when the plate changes', async () => {
    respond(read, { ...data, categoriaId: 4, categoriaNome: 'Hatch' });
    form();
    upload();
    await waitFor(() => expect(screen.getByTestId('field-categoriaId')).toHaveValue('4'));
    await userEvent.clear(screen.getByTestId('field-placa'));
    expect(screen.getByTestId('field-categoriaId')).toHaveValue('');
    expect(screen.getByTestId('field-marca')).toHaveValue('');
  });
});
describe('plate reading edge cases', () => {
  it('rejects invalid uploads and does not fill or consult an ambiguous reading', async () => {
    form();
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['pdf'], 'bad.pdf', { type: 'application/pdf' })] },
    });
    await screen.findByText(/Escolha uma foto/);
    expect(preparePlateImage).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
    vi.mocked(api).mockResolvedValue({
      sucesso: false,
      placa: null,
      mensagem: 'Mais de uma placa.',
    });
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['photo'], 'plate.png', { type: 'image/png' })] },
    });
    await screen.findByText(/Mais de uma placa/);
    expect(api).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('field-placa')).toHaveValue('');
  });
  it('cancels a previous image and ignores its late response', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(api)
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      )
      .mockImplementation((async (path: string) =>
        path === '/api/v1/leitura-placa'
          ? { sucesso: true, placa: 'XYZ1234', mensagem: 'Nova foto lida.' }
          : { ...data, placa: 'XYZ1234' }) as never);
    form();
    const upload = () =>
      fireEvent.change(screen.getByTestId('plate-file-input'), {
        target: { files: [new File(['photo'], 'plate.jpg', { type: 'image/jpeg' })] },
      });
    upload();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    const firstSignal = vi.mocked(api).mock.calls[0][1]?.signal;
    upload();
    await screen.findByText('Nova foto lida.');
    expect(firstSignal?.aborted).toBe(true);
    resolve({ sucesso: true, placa: 'ABC1D23', mensagem: 'Foto antiga.' });
    await waitFor(() => expect(screen.getByTestId('field-placa')).toHaveValue('XYZ1234'));
    expect(screen.queryByText('Foto antiga.')).not.toBeInTheDocument();
  });
  it('allows another upload after a network failure without automatically retrying', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Falha de rede.'));
    form();
    fireEvent.change(screen.getByTestId('plate-file-input'), {
      target: { files: [new File(['photo'], 'plate.jpg', { type: 'image/jpeg' })] },
    });
    await screen.findByText(/Você pode digitar a placa/);
    expect(screen.getByTestId('plate-upload')).toBeEnabled();
    expect(screen.getByTestId('field-placa')).toBeEnabled();
    expect(api).toHaveBeenCalledTimes(1);
  });
});
