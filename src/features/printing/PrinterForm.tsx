import { useI18n } from '../../i18n';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { ApiError } from '../../lib/apiClient';
import { describeError } from '../../lib/describeError';
import { toNullableId } from '../../lib/forms';
import { Field, SelectField, Switch } from '../../ui';
import type { Impressora, ImpressoraInput } from './api';
import { printerSchema, type PrinterFormData } from './printerSchema';

export function PrinterForm({
  formId,
  printer,
  error,
  onSubmit,
}: {
  formId: string;
  printer?: Impressora;
  error?: unknown;
  onSubmit: (data: ImpressoraInput) => Promise<void>;
}) {
  const { t } = useI18n();
  const {
    register,
    control,
    watch,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<PrinterFormData>({
    resolver: zodResolver(printerSchema),
    mode: 'onBlur',
    defaultValues: printer
      ? { ...printer }
      : {
          nome: '',
          tipoConexao: 'REDE_TCP',
          enderecoDriverOuIp: '',
          portaTcp: 9100,
          imprimeEntrada: true,
          imprimeFechamento: true,
          ativo: true,
        },
  });
  const network = watch('tipoConexao') === 'REDE_TCP';
  const androidPos = watch('tipoConexao') === 'ANDROID_POS';
  useEffect(() => {
    if (!(error instanceof ApiError) || !error.fieldErrors) return;
    for (const [key, messages] of Object.entries(error.fieldErrors)) {
      const name = Object.keys(printerSchema.innerType().shape).find(
        (k) => k.toLowerCase() === key.toLowerCase(),
      ) as keyof PrinterFormData | undefined;
      if (name) setError(name, { type: 'server', message: messages.join(' ') });
    }
  }, [error, setError]);
  return (
    <form
      id={formId}
      className="form-grid"
      noValidate
      onSubmit={handleSubmit((v) =>
        onSubmit({ ...v, portaTcp: v.tipoConexao === 'REDE_TCP' ? v.portaTcp : null }),
      )}
    >
      <Field
        label={t('Nome da impressora')}
        placeholder={t('Guarita 1')}
        required
        data-testid="field-nome"
        {...register('nome')}
        error={errors.nome?.message}
      />
      <SelectField
        label={t('Tipo de conexão')}
        data-testid="field-tipoConexao"
        {...register('tipoConexao')}
        error={errors.tipoConexao?.message}
      >
        <option value="REDE_TCP">{t('Rede TCP/IP (porta 9100)')}</option>
        <option value="USB_WINDOWS">{t('USB (driver do Windows)')}</option>
        <option value="ANDROID_POS">{t('POS Android integrado (agente local)')}</option>
      </SelectField>
      <Field
        label={t(
          androidPos
            ? 'ID do agente Android'
            : network
              ? 'Endereço IP'
              : 'Nome do driver no Windows',
        )}
        placeholder={
          androidPos
            ? t('ID exibido no POS Android')
            : network
              ? '192.168.0.50'
              : 'EPSON TM-T20X Receipt'
        }
        required
        data-testid="field-enderecoDriverOuIp"
        {...register('enderecoDriverOuIp')}
        hint={
          androidPos
            ? t('Identificador mostrado em Configurações > Impressão no próprio POS.')
            : network
              ? t('IP fixo da impressora na rede da guarita.')
              : t('Nome exato exibido em Configurações do Windows › Impressoras e scanners.')
        }
        error={errors.enderecoDriverOuIp?.message}
      />
      {network && (
        <Field
          label={t('Porta TCP')}
          type="number"
          inputMode="numeric"
          required
          data-testid="field-portaTcp"
          {...register('portaTcp', { setValueAs: toNullableId })}
          error={errors.portaTcp?.message}
        />
      )}
      <fieldset className="switch-group">
        <legend>{t('Função')}</legend>
        <Controller
          control={control}
          name="imprimeEntrada"
          render={({ field }) => (
            <Switch
              label={t('Imprime tickets de entrada')}
              data-testid="field-imprimeEntrada"
              checked={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <Controller
          control={control}
          name="imprimeFechamento"
          render={({ field }) => (
            <Switch
              label={t('Imprime comprovantes de fechamento')}
              description={t('Usado quando o fechamento passar a ser impresso.')}
              data-testid="field-imprimeFechamento"
              checked={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        {errors.imprimeFechamento?.message && (
          <span className="field-error" role="alert">
            {t(errors.imprimeFechamento.message)}
          </span>
        )}
      </fieldset>
      {printer && (
        <Controller
          control={control}
          name="ativo"
          render={({ field }) => (
            <Switch
              label={t('Impressora ativa')}
              data-testid="field-ativo"
              checked={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
      )}
      {!!error && (
        <p role="alert" className="form-error">
          {describeError(error)}
        </p>
      )}
    </form>
  );
}
