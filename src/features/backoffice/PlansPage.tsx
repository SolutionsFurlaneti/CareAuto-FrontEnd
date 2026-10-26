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
        label="Nome"
        data-testid="bo-plan-nome"
        {...register('nome')}
        error={errors.nome?.message}
      />
      <SelectField
        label="Tipo"
        data-testid="bo-plan-tipo"
        {...register('tipo')}
        hint={
          tipo === 'PRE_PAGO'
            ? 'Paga antes; cada mês vale 30 dias.'
            : 'Usa e paga depois; o boleto sai 2 dias antes do vencimento.'
        }
      >
        <option value="POS_PAGO">Pós-pago</option>
        <option value="PRE_PAGO">Pré-pago</option>
      </SelectField>
      <SelectField
        label="Periodicidade"
        data-testid="bo-plan-periodicidade"
        {...register('periodicidade')}
      >
        {Object.entries(periodicidadeLabel).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SelectField>
      <Controller
        control={control}
        name="valorMensal"
        render={({ field }) => (
          <MoneyField
            label="Mensalidade (mínimo R$ 99,00)"
            data-testid="bo-plan-valor"
            name={field.name}
            ref={field.ref}
            value={field.value}
            onBlur={field.onBlur}
            onChange={(v) => field.onChange(v ?? 0)}
            error={errors.valorMensal?.message}
          />
        )}
      />
      <Field
        label="Desconto do pacote (%)"
        type="number"
        min={0}
        max={50}
        step="0.01"
        disabled={!permiteDesconto}
        hint={
          permiteDesconto
            ? 'Contratação longa paga à vista.'
            : 'Disponível para pré-pago de mais de um mês.'
        }
        data-testid="bo-plan-desconto"
        {...register('descontoPercentual', { valueAsNumber: true })}
        error={errors.descontoPercentual?.message}
      />
      <div className="field">
        <span className="field-label">Valor por cobrança</span>
        <strong data-testid="bo-plan-preview">
          {valido ? money(valorPeriodo(mensal, meses, permiteDesconto ? desconto : 0)) : '—'}
        </strong>
        <span className="field-hint">
          {meses} {meses === 1 ? 'mês' : 'meses'}
          {tipo === 'PRE_PAGO' ? ` · ${meses * 30} dias de uso` : ''}
        </span>
      </div>
      <div className="form-span">
        <TextAreaField
          label="Descrição (opcional)"
          rows={2}
          {...register('descricao')}
          error={errors.descricao?.message}
        />
      </div>
      {plano && (
        <Controller
          control={control}
          name="ativo"
          render={({ field }) => (
            <Switch
              label="Plano ativo"
              description="Inativo deixa de ser oferecido; assinaturas existentes continuam."
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
        title="Planos"
        description="Mensalidades pré-pagas e pós-pagas. Alterar o preço não muda assinaturas existentes."
        action={
          <Button
            data-testid="bo-plan-new"
            onClick={() => {
              salvar.reset();
              setEditing('new');
            }}
          >
            <Plus size={16} /> Novo plano
          </Button>
        }
      />
      <section className="panel">
        {planos.isPending ? (
          <Skeleton />
        ) : planos.isError ? (
          <QueryError error={planos.error} what="os planos" onRetry={() => void planos.refetch()} />
        ) : !planos.data.length ? (
          <EmptyState
            title="Nenhum plano"
            description="Crie o primeiro plano para começar a assinar estabelecimentos."
          />
        ) : (
          <DataTable
            testId="bo-plans"
            caption="Planos da plataforma"
            rows={planos.data}
            rowKey={(p) => p.planoId}
            columns={[
              { label: 'Plano', render: (p) => <strong>{p.nome}</strong> },
              {
                label: 'Tipo',
                render: (p) => `${tipoLabel[p.tipo]} · ${periodicidadeLabel[p.periodicidade]}`,
              },
              { label: 'Mensalidade', render: (p) => money(p.valorMensal) },
              {
                label: 'Desconto',
                render: (p) => (p.descontoPercentual ? `${p.descontoPercentual}%` : '—'),
              },
              { label: 'Por cobrança', render: (p) => money(p.valorPeriodo) },
              { label: 'Assinaturas', render: (p) => p.assinaturas },
              {
                label: 'Situação',
                render: (p) => (
                  <StatusBadge
                    status={p.ativo ? 'ATIVA' : 'ENCERRADA'}
                    label={p.ativo ? 'Ativo' : 'Inativo'}
                  />
                ),
              },
              {
                label: 'Ações',
                render: (p) => (
                  <Button
                    variant="ghost"
                    data-testid="bo-plan-edit"
                    onClick={() => {
                      salvar.reset();
                      setEditing(p);
                    }}
                  >
                    Editar
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
          title={editing === 'new' ? 'Novo plano' : 'Editar plano'}
          busy={salvar.isPending}
          onClose={() => setEditing(null)}
          actions={
            <>
              <Button
                variant="secondary"
                disabled={salvar.isPending}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" form={formId} busy={salvar.isPending} data-testid="form-submit">
                Salvar plano
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
