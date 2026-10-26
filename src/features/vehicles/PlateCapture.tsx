import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Camera, ImagePlus } from 'lucide-react';
import { Button, Field } from '../../ui';
import { api } from '../../lib/apiClient';
import { describeError } from '../../lib/describeError';
import type { FormValues } from '../shared/schema';
import { isPlate, normalizePlate } from './plate';
import { preparePlateImage, type PreparedPlateImage } from './preparePlateImage';

interface PlateResult {
  placa: string;
  sucesso: boolean;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  situacaoVeiculo: string | null;
  mensagem: string | null;
  /** Tipo/carroceria informado pelo provedor (ex.: "AU - HATCH PEQUENO"). */
  tipoVeiculo?: string | null;
  /** Categoria ativa do estabelecimento correspondente; ausente quando não há correspondência segura. */
  categoriaId?: number | null;
  categoriaNome?: string | null;
}
const emptyCategory = (value: unknown) =>
  value === null || value === undefined || value === '' || value === 0 || Number.isNaN(value);
const dataFields = ['marca', 'modelo', 'cor', 'situacaoVeiculo'] as const;

export function PlateCapture() {
  const {
    register,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useFormContext<FormValues>();
  const [message, setMessage] = useState(
    'Fotografe de perto, com a placa inteira e bem iluminada.',
  );
  const [lookupMessage, setLookupMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [prepared, setPrepared] = useState<PreparedPlateImage>();
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const reading = useRef<AbortController>();
  const lookup = useRef<AbortController>();
  const revision = useRef(0);
  const lastPlate = useRef('');
  const autoValues = useRef<Partial<FormValues>>({});
  // Categoria escolhida pela consulta e o valor que havia antes, para desfazer se a placa mudar.
  const autoCategory = useRef<{ value: number; previous: FormValues[string] }>();
  const cancelLookup = () => {
    lookup.current?.abort();
    lookup.current = undefined;
    setConsulting(false);
  };
  useEffect(() => {
    if (isSubmitting) {
      revision.current++;
      reading.current?.abort();
      reading.current = undefined;
      setBusy(false);
      cancelLookup();
      lastPlate.current = '';
    }
  }, [isSubmitting]);
  useEffect(
    () => () => {
      reading.current?.abort();
      reading.current = undefined;
      lookup.current?.abort();
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const changed = () => {
    revision.current++;
    cancelLookup();
    lastPlate.current = '';
    setLookupMessage('');
    for (const name of dataFields) {
      if (autoValues.current[name] !== undefined && getValues(name) === autoValues.current[name])
        setValue(name, null, { shouldDirty: true });
    }
    autoValues.current = {};
    if (autoCategory.current && getValues('categoriaId') === autoCategory.current.value)
      setValue('categoriaId', autoCategory.current.previous, { shouldDirty: true });
    autoCategory.current = undefined;
  };
  /** force: o botão Consultar repete a busca mesmo para a placa já consultada. */
  const consult = async (value: string, force = false) => {
    const plate = normalizePlate(value);
    setValue('placa', plate, { shouldValidate: true, shouldDirty: true });
    if (!isPlate(plate) || (!force && lastPlate.current === plate)) return;
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    lastPlate.current = plate;
    const snapshot = { ...getValues() };
    setLookupMessage('Consultando dados do veículo…');
    setConsulting(true);
    try {
      const data = await api<PlateResult>('/api/v1/consultas-placa', {
        method: 'POST',
        body: JSON.stringify({ placa: plate }),
        signal: controller.signal,
      });
      if (controller.signal.aborted || normalizePlate(String(getValues('placa'))) !== plate) return;
      if (data.sucesso) {
        for (const name of dataFields) {
          if (data[name] !== null && getValues(name) === snapshot[name]) {
            setValue(name, data[name], { shouldValidate: true, shouldDirty: true });
            autoValues.current[name] = data[name];
          }
        }
        const category = getValues('categoriaId');
        let categoryNote = '';
        if (
          data.categoriaId &&
          (emptyCategory(category) || category === autoCategory.current?.value)
        ) {
          autoCategory.current = {
            value: data.categoriaId,
            previous: autoCategory.current ? autoCategory.current.previous : category,
          };
          setValue('categoriaId', data.categoriaId, { shouldValidate: true, shouldDirty: true });
          categoryNote = ` Categoria sugerida: ${data.categoriaNome ?? 'selecionada'}${data.tipoVeiculo ? ` (${data.tipoVeiculo})` : ''}.`;
        } else if (!data.categoriaId && data.tipoVeiculo && emptyCategory(category)) {
          categoryNote = ` Tipo informado: ${data.tipoVeiculo}. Escolha a categoria.`;
        }
        setLookupMessage(
          `Dados encontrados. Confira as informações antes de salvar.${categoryNote}`,
        );
      } else {
        lastPlate.current = '';
        setLookupMessage(data.mensagem || 'Dados não encontrados. Preencha manualmente.');
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      lastPlate.current = '';
      setLookupMessage(`${describeError(error)} Você pode preencher manualmente.`);
    } finally {
      if (lookup.current === controller) {
        lookup.current = undefined;
        setConsulting(false);
      }
    }
  };
  const process = async (file?: File) => {
    if (!file || isSubmitting) return;
    reading.current?.abort();
    reading.current = undefined;
    cancelLookup();
    lastPlate.current = '';
    setLookupMessage('');
    setPrepared(undefined);
    setPreview(undefined);
    setBusy(false);
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    ) {
      setMessage('Escolha uma foto JPG, PNG ou WebP de até 20 MB.');
      return;
    }
    const controller = new AbortController();
    reading.current = controller;
    const version = revision.current;
    setBusy(true);
    setMessage('Reduzindo a foto e preparando a leitura…');
    let timeout: number | undefined;
    try {
      const image = await preparePlateImage(file, controller.signal);
      if (controller.signal.aborted) return;
      setPrepared(image);
      setPreview(URL.createObjectURL(image.file));
      setMessage('Lendo a placa com Claude…');
      timeout = window.setTimeout(() => controller.abort(), 65000);
      const body = new FormData();
      body.append('arquivo', image.file);
      const data = await api<{
        sucesso: boolean;
        placa: string | null;
        revisaoNecessaria: boolean;
        mensagem: string;
      }>('/api/v1/leitura-placa', { method: 'POST', body, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (revision.current !== version) {
        setMessage('A placa digitada foi preservada. Confira antes de consultar.');
        return;
      }
      // Always review AI readings; never turn a model's confidence into automatic acceptance.
      setMessage(data.mensagem);
      if (data.sucesso && data.placa && isPlate(data.placa)) {
        changed();
        setValue('placa', data.placa, { shouldValidate: true, shouldDirty: true });
        // Consulta automática: só preenche sugestões; a placa continua editável e o botão refaz a busca.
        void consult(data.placa);
      }
    } catch (error) {
      if (reading.current === controller && revision.current === version)
        setMessage(
          controller.signal.aborted
            ? 'A leitura foi interrompida. Anexe outra foto ou digite a placa.'
            : `${describeError(error)} Você pode digitar a placa.`,
        );
    } finally {
      window.clearTimeout(timeout);
      if (reading.current === controller) {
        setBusy(false);
      }
    }
  };
  const plateInput = register('placa', { onChange: changed });
  return (
    <section className="plate-capture" aria-label="Identificação pela placa">
      <div className="plate-capture-actions">
        <Button
          type="button"
          variant="secondary"
          data-testid="plate-camera"
          disabled={busy || isSubmitting}
          onClick={() => camera.current?.click()}
        >
          <Camera size={18} />
          Tirar foto
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid="plate-upload"
          disabled={busy || isSubmitting}
          onClick={() => upload.current?.click()}
        >
          <ImagePlus size={18} />
          Anexar foto da placa
        </Button>
      </div>
      <input
        ref={camera}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        data-testid="plate-camera-input"
        onChange={(e) => {
          void process(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={upload}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-testid="plate-file-input"
        onChange={(e) => {
          void process(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {preview && (
        <img className="plate-preview" src={preview} alt="Foto selecionada para leitura da placa" />
      )}
      {prepared && (
        <p data-testid="plate-image-size">
          Foto preparada: {Math.ceil(prepared.originalBytes / 1024)} KB →{' '}
          {Math.ceil(prepared.file.size / 1024)} KB · {prepared.width} × {prepared.height} px
        </p>
      )}
      <small>
        Ao tirar ou anexar uma foto, a leitura começa automaticamente com Claude. A foto reduzida é
        enviada à Anthropic e não é armazenada pelo AutoCare.
      </small>
      <p role="status">{message}</p>
      <div className="plate-input-row">
        <Field
          label="Placa"
          data-testid="field-placa"
          {...plateInput}
          required
          disabled={isSubmitting}
          onBlur={(e) => {
            void plateInput.onBlur(e);
            void consult(e.target.value);
          }}
          error={typeof errors.placa?.message === 'string' ? errors.placa.message : undefined}
          hint="Mercosul ABC1D23 ou antiga ABC1234. A consulta é automática após a foto e ao sair do campo."
        />
        <Button
          type="button"
          variant="secondary"
          data-testid="plate-consult"
          busy={consulting}
          disabled={busy || isSubmitting}
          onClick={() => void consult(String(getValues('placa') || ''), true)}
        >
          Consultar
        </Button>
      </div>
      {lookupMessage && <p role="status">{lookupMessage}</p>}
    </section>
  );
}
