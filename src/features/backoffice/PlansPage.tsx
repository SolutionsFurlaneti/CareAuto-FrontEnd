import { useI18n } from '../../i18n';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import {
  Button,
  EmptyState,
  Field,
  Modal,
  MoneyField,
  SelectField,
  Skeleton,
  StatusBadge,
  Switch,
  TextAreaField,
} from '../../ui';
import { money } from '../../lib/format';
import { describeError } from '../../lib/describeError';
import { salvarPlano, type Plano, type PlanoInput } from './api';
import { useBackofficeAction, usePlanos } from './hooks';
import { periodicidadeLabel, tipoLabel } from './labels';
import { MESES, planSchema, valorPeriodo, type PlanFormData } from './planSchema';

function PlanForm({
  formId,
  plano,
  error,
  onSubmit,
}: {
  formId: string;
  plano?: Plano;
  error?: unknown;
  onSubmit: (d: PlanoInput) => Promise<void>;
}) {
  const { t } = useI18n();
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    mode: 'onBlur',
    defaultValues: plano
      ? { ...plano, descricao: plano.descricao ?? '' }
      : {
          nome: '',
          tipo: 'POS_PAGO',
          periodicidade: 'MENSAL',
          valorMensal: 99,
          descontoPercentual: 0,
          descricao: '',
          ativo: true,
        },
  });
  const [tipo, periodicidade, mensal, desconto] = watch([
    'tipo',
    'periodicidade',
    'valorMensal',
    'descontoPercentual',
  ]);
  const meses = MESES[periodicidade];
  const permiteDesconto = tipo === 'PRE_PAGO' && meses > 1;
  const valido = Number.isFinite(mensal) && Number.isFinite(desconto);
  return (
    <form
      id={formId}
      noValidate
      className="form-grid"
      data-testid="bo-plan-form"
      onSubmit={handleSubmit((v) =>
        onSubmit({
          ...v,
          descontoPercentual: permiteDesconto ? v.descontoPercentual : 0,
          descricao: v.descricao || null,
          versao: plano?.versao,
        }),
      )}
    >
      <Field
        label={t('Nome')}
        data-testid="bo-plan-nome"
        {...register('nome')}
        error={errors.nome?.message ? t(errors.nome.message) : undefined}
      />
      <SelectField
        label={t('Tipo')}
        data-testid="bo-plan-tipo"
        {...register('tipo')}
        hint={
          tipo === 'PRE_PAGO'
            ? t('Paga antes; cada mês vale 30 dias.')
            : t('Usa e paga depois; o boleto sai 2 dias antes do vencimento.')
        }
      >
        <option value="POS_PAGO">{t('Pós-pago')}</option>
        <option value="PRE_PAGO">{t('Pré-pago')}</option>
      </SelectField>
      <SelectField
        label={t('Periodicidade')}
        data-testid="bo-plan-periodicidade"
        {...register('periodicidade')}
      >
        {Object.entries(periodicidadeLabel).map(([v, l]) => (
          <option key={v} value={v}>
            {t(l)}
          </option>
        ))}
      </SelectField>
      <Controller
        control={control}
        name="valorMensal"
        render={({ field }) => (
          <MoneyField
            label={t('Mensalidade (mínimo R$ 99,00)')}
            data-testid="bo-plan-valor"
            name={field.name}
            ref={field.ref}
            value={field.value}
            onBlur={field.onBlur}
            onChange={(v) => field.onChange(v ?? 0)}
            error={errors.valorMensal?.message ? t(errors.valorMensal.message) : undefined}
          />
        )}
      />
      <Field
        label={t('Desconto do pacote (%)')}
        type="number"
        min={0}
        max={50}
        step="0.01"
        disabled={!permiteDesconto}
        hint={
          permiteDesconto
            ? t('Contratação longa paga à vista.')
            : t('Disponível para pré-pago de mais de um mês.')
        }
        data-testid="bo-plan-desconto"
        {...register('descontoPercentual', { valueAsNumber: true })}
        error={
          errors.descontoPercentual?.message ? t(errors.descontoPercentual.message) : undefined
        }
      />
      <div className="field">
        <span className="field-label">{t('Valor por cobrança')}</span>
        <strong data-testid="bo-plan-preview">
          {valido ? money(valorPeriodo(mensal, meses, permiteDesconto ? desconto : 0)) : '—'}
        </strong>
        <span className="field-hint">
          {meses} {meses === 1 ? t('mês') : t('meses')}
          {tipo === 'PRE_PAGO' ? t(' · {days} dias de uso', { days: meses * 30 }) : ''}
        </span>
      </div>
      <div className="form-span">
        <TextAreaField
          label={t('Descrição (opcional)')}
          rows={2}
          {...register('descricao')}
          error={errors.descricao?.message ? t(errors.descricao.message) : undefined}
        />
      </div>
      {plano && (
        <Controller
          control={control}
          name="ativo"
          render={({ field }) => (
            <Switch
              label={t('Plano ativo')}
              description={t('Inativo deixa de ser oferecido; assinaturas existentes continuam.')}
              checked={field.value}
              onChange={field.onChange}
              data-testid="bo-plan-ativo"
            />
          )}
        />
      )}
      {!!error && (
        <p className="field-error form-span" role="alert">
          {describeError(error)}
        </p>
      )}
    </form>
  );
}

export function BackofficePlansPage() {
  const { t, locale } = useI18n();
  const planos = usePlanos();
  const formId = useId();
  const [editing, setEditing] = useState<Plano | 'new' | null>(null);
  const salvar = useBackofficeAction(
    (v: { data: PlanoInput; id?: number }) => salvarPlano(v.data, v.id),
    'Plano salvo.',
  );
  return (
    <>
      <PageHeader
        eyebrow="PLATAFORMA"
        title={t('Planos')}
        description={t(
          'Mensalidades pré-pagas e pós-pagas. Alterar o preço não muda assinaturas existentes.',
        )}
        action={
          <Button
            data-testid="bo-plan-new"
            onClick={() => {
              salvar.reset();
              setEditing('new');
            }}
          >
            <Plus size={16} /> {t('Novo plano')}{' '}
          </Button>
        }
      />
      <section className="panel">
        {planos.isPending ? (
          <Skeleton />
        ) : planos.isError ? (
          <QueryError
            error={planos.error}
            what={t('os planos')}
            onRetry={() => void planos.refetch()}
          />
        ) : !planos.data.length ? (
          <EmptyState
            title={t('Nenhum plano')}
            description={t('Crie o primeiro plano para começar a assinar estabelecimentos.')}
          />
        ) : (
          <DataTable
            testId="bo-plans"
            caption={t('Planos da plataforma')}
            rows={planos.data}
            rowKey={(p) => p.planoId}
            columns={[
              { label: t('Plano'), render: (p) => <strong>{p.nome}</strong> },
              {
                label: t('Tipo'),
                render: (p) =>
                  `${t(tipoLabel[p.tipo])} · ${t(periodicidadeLabel[p.periodicidade])}`,
              },
              { label: t('Mensalidade'), render: (p) => money(p.valorMensal) },
              {
                label: t('Desconto'),
                render: (p) =>
                  p.descontoPercentual ? `${p.descontoPercentual.toLocaleString(locale)}%` : '—',
              },
              { label: t('Por cobrança'), render: (p) => money(p.valorPeriodo) },
              { label: t('Assinaturas'), render: (p) => p.assinaturas },
              {
                label: t('Situação'),
                render: (p) => (
                  <StatusBadge
                    status={p.ativo ? 'ATIVA' : 'ENCERRADA'}
                    label={p.ativo ? t('Ativo') : t('Inativo')}
                  />
                ),
              },
              {
                label: t('Ações'),
                render: (p) => (
                  <Button
                    variant="ghost"
                    data-testid="bo-plan-edit"
                    onClick={() => {
                      salvar.reset();
                      setEditing(p);
                    }}
                  >
                    {t('Editar')}{' '}
                  </Button>
                ),
              },
            ]}
          />
        )}
      </section>
      {editing && (
        <Modal
          open
          size="md"
          title={editing === 'new' ? t('Novo plano') : t('Editar plano')}
          busy={salvar.isPending}
          onClose={() => setEditing(null)}
          actions={
            <>
              <Button
                variant="secondary"
                disabled={salvar.isPending}
                onClick={() => setEditing(null)}
              >
                {t('Cancelar')}{' '}
              </Button>
              <Button type="submit" form={formId} busy={salvar.isPending} data-testid="form-submit">
                {t('Salvar plano')}{' '}
              </Button>
            </>
          }
        >
          <PlanForm
            formId={formId}
            plano={editing === 'new' ? undefined : editing}
            error={salvar.error}
            onSubmit={async (data) => {
              await salvar
                .mutateAsync({ data, id: editing === 'new' ? undefined : editing.planoId })
                .then(() => setEditing(null))
                .catch(() => undefined);
            }}
          />
        </Modal>
      )}
    </>
  );
}
