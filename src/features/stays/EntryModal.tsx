import { z } from 'zod';
import { vehiclesSchema } from '../vehicles/vehiclesSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resolveEntryVehicle } from '../vehicles/api';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Modal, SelectField, TextAreaField } from '../../ui';
import { RecordForm } from '../../components/RecordForm';
import { QueryError } from '../../components/QueryError';
import { describeError } from '../../lib/describeError';
import { toNullableText } from '../../lib/forms';
import type { Estadia, Tabela, Veiculo } from '../../lib/types';
import { useAllRecords, useSaveRecord } from '../shared/hooks';
import { vehicleFormSpec } from '../vehicles/vehicleFormSpec';
import { staySchema, type StayFormData } from './staySchema';
import { usePrintConfig, usePrintTicket } from '../printing/hooks';
import type { ConfiguracaoImpressao } from '../printing/api';

export function EntryModal({ onClose }: { onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<Veiculo>();
  // Entrada salva aguardando a resposta "Deseja imprimir o ticket?".
  const [saved, setSaved] = useState<Estadia>();
  const printConfig = usePrintConfig();
  const print = usePrintTicket();
  const vehicles = useAllRecords<Veiculo>('veiculos');
  const tables = useAllRecords<Tabela>('tabelas-preco');
  const save = useSaveRecord<Estadia>('estadias');
  const cache = useQueryClient();
  const create = useMutation({
    mutationFn: ({ data }: { data: Record<string, unknown> }) => resolveEntryVehicle(data),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['veiculos'] });
    },
  });
  const [plateSearch, setPlateSearch] = useState('');
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StayFormData>({
    resolver: zodResolver(staySchema),
    mode: 'onBlur',
    defaultValues: { veiculoId: 0, tabelaId: 0, observacao: null },
  });

  const selectedTabela = watch('tabelaId');
  useEffect(() => {
    if ((!selectedTabela || selectedTabela === 0) && tables.data?.length) {
      const active = tables.data.find((t) => t.ativo);
      if (active) setValue('tabelaId', active.tabelaId, { shouldValidate: true });
    }
  }, [tables.data, selectedTabela, setValue]);
  const busy = save.isPending || create.isPending || print.isPending || isSubmitting;
  if (saved)
    return (
      <Modal
        open
        onClose={onClose}
        title="Entrada registrada"
        busy={print.isPending}
        actions={
          <>
            <Button
              variant="secondary"
              data-testid="ticket-skip"
              disabled={print.isPending}
              onClick={onClose}
            >
              Não
            </Button>
            <Button
              data-testid="ticket-print"
              busy={print.isPending}
              autoFocus
              onClick={() => print.mutate(saved.estadiaId, { onSuccess: onClose })}
            >
              Sim, imprimir
            </Button>
          </>
        }
      >
        <p role="status" data-testid="ticket-question">
          Entrada registrada com sucesso! Deseja imprimir o ticket de estacionamento?
        </p>
        {!!printConfig.error && (
          <p role="alert" className="form-error">
            {describeError(printConfig.error)} A entrada está registrada. Tente imprimir novamente
            ou feche esta janela.
          </p>
        )}
        {!!print.error && (
          <p role="alert" className="form-error">
            {describeError(print.error)} A entrada continua registrada.
          </p>
        )}
      </Modal>
    );
  const options = [...(vehicles.data || [])];
  if (created && !options.some((v) => v.veiculoId === created.veiculoId)) options.push(created);
  return (
    <Modal
      open
      onClose={onClose}
      title={adding ? 'Adicionar veículo' : 'Registrar entrada'}
      busy={busy}
      actions={
        <>
          <Button
            variant="secondary"
            data-testid="entry-cancel"
            disabled={busy}
            onClick={() => (adding ? setAdding(false) : onClose())}
          >
            {adding ? 'Voltar' : 'Cancelar'}
          </Button>
          <Button
            type="submit"
            form={adding ? 'entry-vehicle-form' : 'entry-form'}
            data-testid="form-submit"
            busy={busy}
          >
            {adding ? 'Salvar veículo e continuar' : 'Registrar entrada'}
          </Button>
        </>
      }
    >
      {adding ? (
        <RecordForm
          formId="entry-vehicle-form"
          spec={{
            ...vehicleFormSpec,
            schema: vehiclesSchema.extend({ categoriaId: z.number().nullable() }),
          }}
          error={create.error}
          onSubmit={async (values) => {
            try {
              const vehicle = await create.mutateAsync({ data: values });
              setCreated(vehicle);
              setValue('veiculoId', vehicle.veiculoId, { shouldValidate: true });
              setAdding(false);
            } catch {
              /* Preserve the form and mutation error. */
            }
          }}
        />
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            data-testid="entry-add-vehicle"
            onClick={() => {
              create.reset();
              setAdding(true);
            }}
          >
            Adicionar veículo por foto ou manualmente
          </Button>
          {created && (
            <p role="status">
              Veículo {created.placa} selecionado. O cadastro existente é reutilizado. Escolha a
              tabela e confirme a entrada.
            </p>
          )}
          {(vehicles.isError || tables.isError) && (
            <QueryError
              error={vehicles.error || tables.error}
              what="as opções de entrada"
              onRetry={() => {
                void vehicles.refetch();
                void tables.refetch();
              }}
            />
          )}
          <form
            id="entry-form"
            className="form-grid"
            noValidate
            onSubmit={handleSubmit(async (values) => {
              try {
                const stay = await save.mutateAsync({ data: values });
                let currentConfig: ConfiguracaoImpressao | undefined;
                try {
                  currentConfig = (await printConfig.refetch({ throwOnError: true })).data;
                } catch {
                  setSaved(stay);
                  return;
                }
                // A entrada está salva; a disponibilidade considera navegador ou agente configurado.
                const action = currentConfig?.impressaoEntradaDisponivel
                  ? currentConfig.acaoAposEntrada
                  : 'NENHUMA';
                if (action === 'PERGUNTAR') setSaved(stay);
                else {
                  if (action === 'IMPRIMIR' && currentConfig?.imprimirPeloNavegador) {
                    setSaved(stay);
                    print.mutate(stay.estadiaId, { onSuccess: onClose });
                    return;
                  }
                  if (action === 'IMPRIMIR' && !currentConfig?.impressaoAutomaticaNoServidor)
                    print.mutate(stay.estadiaId);
                  onClose();
                }
              } catch {
                /* Keep the selected vehicle for retry. */
              }
            })}
          >
            <div style={{ marginBottom: '4px' }}>
              <label
                htmlFor="quick-plate-search"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ink-dim)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Digitação Rápida de Placa (opcional)
              </label>
              <input
                id="quick-plate-search"
                type="text"
                placeholder="Ex: ABC1D23"
                value={plateSearch}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setPlateSearch(val);
                  const match = options.find((v) => v.placa.toUpperCase() === val);
                  if (match) {
                    setValue('veiculoId', match.veiculoId, { shouldValidate: true });
                  }
                }}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: 'var(--bg-press)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 12px',
                  fontSize: '15px',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </div>
            <SelectField
              label="Veículo"
              data-testid="field-veiculoId"
              {...register('veiculoId', { valueAsNumber: true })}
              error={errors.veiculoId?.message}
            >
              <option value="">{vehicles.isPending ? 'Carregando…' : 'Selecione'}</option>
              {options.map((v) => (
                <option key={v.veiculoId} value={v.veiculoId}>
                  {v.placa}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Tabela de preços"
              data-testid="field-tabelaId"
              {...register('tabelaId', { valueAsNumber: true })}
              error={errors.tabelaId?.message}
            >
              <option value="">{tables.isPending ? 'Carregando…' : 'Selecione'}</option>
              {tables.data
                ?.filter((t) => t.ativo)
                .map((t) => (
                  <option key={t.tabelaId} value={t.tabelaId}>
                    {t.nome}
                  </option>
                ))}
            </SelectField>
            <TextAreaField
              label="Observação"
              data-testid="field-observacao"
              rows={3}
              {...register('observacao', { setValueAs: toNullableText })}
              error={errors.observacao?.message}
            />
            {!!save.error && (
              <p role="alert" className="form-error">
                {describeError(save.error)}
              </p>
            )}
          </form>
        </>
      )}
    </Modal>
  );
}
