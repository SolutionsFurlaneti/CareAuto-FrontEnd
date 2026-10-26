import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import { dateTime, money } from '../../lib/format';
import { describeError } from '../../lib/describeError';
import {
  Button,
  EmptyState,
  Field,
  Modal,
  MoneyField,
  SelectField,
  Skeleton,
  StatusBadge,
  TextAreaField,
} from '../../ui';
import {
  arquivarCampanhaMetaAds,
  editarCampanhaMetaAds,
  gerarCampanhaMetaAds,
  publicarCampanhaMetaAds,
  type GerarCampanhaMetaInput,
  type MetaCampanha,
} from './api';
import { useBackofficeAction, useMetaCampanhas } from './hooks';

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(100),
  briefing: z.string().trim().min(1, 'Explique a campanha.').max(1000),
  regiao: z.string().trim().max(100),
  urlFinal: z
    .string()
    .trim()
    .url('Informe uma URL válida.')
    .refine((value) => value.startsWith('https://'), 'Use HTTPS.'),
  orcamentoDiario: z.number().min(1, 'Mínimo R$ 1,00.').max(10000, 'Máximo R$ 10.000,00.'),
  objetivoConversao: z.enum(['TRIAL_STARTED', 'SUBSCRIPTION_ACTIVE']),
});
type FormData = z.infer<typeof schema>;

const statusCampanha: Record<MetaCampanha['status'], { badge: string; label: string }> = {
  RASCUNHO: { badge: 'PENDENTE', label: 'Rascunho' },
  PUBLICADA: { badge: 'ATIVA', label: 'Criada pausada' },
  ARQUIVADA: { badge: 'ENCERRADA', label: 'Arquivada' },
  REVISAO_MANUAL: { badge: 'ATENCAO', label: 'Revisão manual' },
};

function GenerateForm({
  formId,
  onSubmit,
  error,
}: {
  formId: string;
  onSubmit: (input: GerarCampanhaMetaInput) => Promise<void>;
  error: unknown;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      nome: 'AutoCare | novos estacionamentos',
      briefing: '',
      regiao: 'Brasil',
      urlFinal: 'https://furlaneti.com.br/autocare/sobrenos',
      orcamentoDiario: 25,
      objetivoConversao: 'TRIAL_STARTED',
    },
  });
  return (
    <form id={formId} className="form-grid" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Field
        label="Nome da campanha"
        data-testid="bo-meta-campaign-name"
        {...register('nome')}
        error={errors.nome?.message}
      />
      <SelectField
        label="Conversão para otimizar"
        data-testid="bo-meta-campaign-objective"
        {...register('objetivoConversao')}
      >
        <option value="TRIAL_STARTED">Cadastro e início do teste (Lead)</option>
        <option value="SUBSCRIPTION_ACTIVE">Assinatura confirmada (Purchase)</option>
      </SelectField>
      <div className="form-span">
        <TextAreaField
          label="Briefing para o Claude"
          rows={4}
          placeholder="Público, diferencial, oferta aprovada e contexto…"
          data-testid="bo-meta-campaign-briefing"
          {...register('briefing')}
          error={errors.briefing?.message}
        />
      </div>
      <Field
        label="Região de comunicação"
        hint="A segmentação da primeira versão é Brasil; a região orienta os textos do Claude."
        data-testid="bo-meta-campaign-region"
        {...register('regiao')}
        error={errors.regiao?.message}
      />
      <Field
        label="Página de destino (HTTPS)"
        data-testid="bo-meta-campaign-url"
        {...register('urlFinal')}
        error={errors.urlFinal?.message}
      />
      <Controller
        control={control}
        name="orcamentoDiario"
        render={({ field }) => (
          <MoneyField
            label="Orçamento diário"
            data-testid="bo-meta-campaign-budget"
            name={field.name}
            ref={field.ref}
            value={field.value}
            onBlur={field.onBlur}
            onChange={(value) => field.onChange(value ?? 0)}
            error={errors.orcamentoDiario?.message}
          />
        )}
      />
      <p className="muted form-span">
        Claude sugere textos e sinônimos seguros para revisão. A Meta usa o evento de conversão para
        otimização; não há palavras-chave de busca nesta plataforma.
      </p>
      {!!error && (
        <p className="field-error form-span" role="alert">
          {describeError(error)}
        </p>
      )}
    </form>
  );
}

type Draft = Pick<
  MetaCampanha,
  | 'nome'
  | 'urlFinal'
  | 'orcamentoDiario'
  | 'regiao'
  | 'objetivoConversao'
  | 'contexto'
  | 'textos'
  | 'titulos'
  | 'variacoes'
>;
const draftDe = (campaign: MetaCampanha): Draft => ({
  nome: campaign.nome,
  urlFinal: campaign.urlFinal,
  orcamentoDiario: campaign.orcamentoDiario,
  regiao: campaign.regiao,
  objetivoConversao: campaign.objetivoConversao,
  contexto: campaign.contexto,
  textos: campaign.textos,
  titulos: campaign.titulos,
  variacoes: campaign.variacoes,
});

function validar(draft: Draft): string[] {
  const errors: string[] = [];
  if (!draft.nome.trim()) errors.push('Informe o nome.');
  if (!/^https:\/\/\S+$/.test(draft.urlFinal.trim()))
    errors.push('A página de destino deve usar HTTPS.');
  if (draft.orcamentoDiario < 1 || draft.orcamentoDiario > 10000)
    errors.push('Orçamento diário entre R$ 1,00 e R$ 10.000,00.');
  if (
    !draft.textos.length ||
    draft.textos.length > 5 ||
    draft.textos.some((value) => value.trim().length > 500)
  )
    errors.push('Use de 1 a 5 textos principais com até 500 caracteres.');
  if (
    !draft.titulos.length ||
    draft.titulos.length > 5 ||
    draft.titulos.some((value) => value.trim().length > 40)
  )
    errors.push('Use de 1 a 5 títulos com até 40 caracteres.');
  if (draft.variacoes.length > 12 || draft.variacoes.some((value) => value.trim().length > 80))
    errors.push('Use até 12 sinônimos/variações com até 80 caracteres.');
  return errors;
}

function EditableList({
  label,
  values,
  limit,
  max,
  testId,
  onChange,
  readOnly,
}: {
  label: string;
  values: string[];
  limit: number;
  max: number;
  testId: string;
  onChange: (items: string[]) => void;
  readOnly: boolean;
}) {
  return (
    <fieldset className="bo-list" data-testid={testId}>
      <legend>
        {label} ({values.length}/{max})
      </legend>
      {values.map((value, index) => (
        <div className="bo-list-row" key={`${index}-${label}`}>
          <Field
            label={`${label} ${index + 1}`}
            value={value}
            readOnly={readOnly}
            maxLength={limit + 20}
            hint={`${value.trim().length}/${limit}`}
            onChange={(event) =>
              onChange(values.map((item, i) => (i === index ? event.target.value : item)))
            }
          />
          {!readOnly && (
            <Button
              variant="ghost"
              aria-label={`Remover ${label} ${index + 1}`}
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && values.length < max && (
        <Button
          variant="ghost"
          data-testid={`${testId}-add`}
          onClick={() => onChange([...values, ''])}
        >
          <Plus size={14} /> Adicionar
        </Button>
      )}
    </fieldset>
  );
}

function CampaignEditor({ campaign, onClose }: { campaign: MetaCampanha; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => draftDe(campaign));
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setDraft(draftDe(campaign)), [campaign.versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const editable = campaign.status === 'RASCUNHO';
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftDe(campaign));
  const save = useBackofficeAction(
    (value: MetaCampanha) => editarCampanhaMetaAds(value),
    'Rascunho salvo.',
  );
  const publish = useBackofficeAction(
    (value: MetaCampanha) => publicarCampanhaMetaAds(value),
    'Campanha criada pausada na Meta.',
  );
  const archive = useBackofficeAction(
    () => arquivarCampanhaMetaAds(campaign.campanhaId),
    'Campanha arquivada.',
  );
  const busy = save.isPending || publish.isPending || archive.isPending;
  const payload = (): MetaCampanha => ({
    ...campaign,
    ...draft,
    textos: draft.textos.map((item) => item.trim()).filter(Boolean),
    titulos: draft.titulos.map((item) => item.trim()).filter(Boolean),
    variacoes: draft.variacoes.map((item) => item.trim()).filter(Boolean),
  });
  const saveDraft = async () => {
    const validation = validar(draft);
    setErrors(validation);
    if (validation.length) return null;
    return save.mutateAsync(payload()).catch(() => null);
  };
  return (
    <Modal
      open
      size="lg"
      title={campaign.nome}
      busy={busy}
      onClose={onClose}
      actions={
        confirm ? (
          <>
            <span className="modal-actions-note" role="alert">
              Será criada a campanha, o conjunto, o criativo e o anúncio em estado PAUSADO. O
              primeiro texto e título serão usados no criativo.
            </span>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Voltar
            </Button>
            <Button
              busy={publish.isPending || save.isPending}
              data-testid="bo-meta-campaign-publish-confirm"
              onClick={async () => {
                const current = dirty ? await saveDraft() : campaign;
                if (!current) {
                  setConfirm(false);
                  return;
                }
                await publish.mutateAsync(current).catch(() => undefined);
                setConfirm(false);
              }}
            >
              Criar pausada
            </Button>
          </>
        ) : (
          <>
            {campaign.status !== 'ARQUIVADA' && (
              <Button
                variant="ghost"
                busy={archive.isPending}
                onClick={() => archive.mutate(undefined)}
              >
                Arquivar
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            {editable && (
              <>
                <Button
                  variant="secondary"
                  busy={save.isPending}
                  disabled={!dirty}
                  data-testid="bo-meta-campaign-save"
                  onClick={() => void saveDraft()}
                >
                  Salvar rascunho
                </Button>
                <Button
                  data-testid="bo-meta-campaign-publish"
                  onClick={() => {
                    const validation = validar(draft);
                    setErrors(validation);
                    if (!validation.length) setConfirm(true);
                  }}
                >
                  Criar na Meta
                </Button>
              </>
            )}
          </>
        )
      }
    >
      <div data-testid="bo-meta-campaign-editor">
        <div className="detail-heading">
          <span>{dateTime(campaign.criadoEm)}</span>
          <StatusBadge
            status={statusCampanha[campaign.status].badge}
            label={statusCampanha[campaign.status].label}
          />
        </div>
        {campaign.erro && (
          <p className="field-error" role="alert" data-testid="bo-meta-campaign-error">
            {campaign.erro}
          </p>
        )}
        {campaign.status === 'REVISAO_MANUAL' && (
          <p className="notice">
            A resposta da Meta foi incerta. Confira os recursos no Gerenciador de Anúncios antes de
            criar outra campanha.
          </p>
        )}
        {campaign.anuncioMetaId && (
          <p className="notice">
            Anúncio Meta {campaign.anuncioMetaId}, criado pausado. Revise e ative pelo Gerenciador
            de Anúncios.
          </p>
        )}
        <div className="form-grid">
          <Field
            label="Nome"
            value={draft.nome}
            readOnly={!editable}
            maxLength={100}
            onChange={(event) => setDraft({ ...draft, nome: event.target.value })}
          />
          <SelectField
            label="Conversão para otimizar"
            value={draft.objetivoConversao}
            disabled={!editable}
            onChange={(event) =>
              setDraft({
                ...draft,
                objetivoConversao: event.target.value as Draft['objetivoConversao'],
              })
            }
          >
            <option value="TRIAL_STARTED">Cadastro e início do teste (Lead)</option>
            <option value="SUBSCRIPTION_ACTIVE">Assinatura confirmada (Purchase)</option>
          </SelectField>
          <MoneyField
            label="Orçamento diário"
            value={draft.orcamentoDiario}
            disabled={!editable}
            onChange={(value) => editable && setDraft({ ...draft, orcamentoDiario: value ?? 0 })}
          />
          <Field
            label="Região usada na sugestão de texto"
            value={draft.regiao}
            readOnly={!editable}
            onChange={(event) => setDraft({ ...draft, regiao: event.target.value })}
          />
          <div className="form-span">
            <Field
              label="Página de destino"
              value={draft.urlFinal}
              readOnly={!editable}
              maxLength={500}
              onChange={(event) => setDraft({ ...draft, urlFinal: event.target.value })}
            />
          </div>
          {draft.contexto && (
            <p className="muted form-span">Estratégia sugerida pelo Claude: {draft.contexto}</p>
          )}
        </div>
        <EditableList
          label="Texto principal"
          values={draft.textos}
          limit={500}
          max={5}
          testId="bo-meta-copy"
          readOnly={!editable}
          onChange={(textos) => setDraft({ ...draft, textos })}
        />
        <EditableList
          label="Título"
          values={draft.titulos}
          limit={40}
          max={5}
          testId="bo-meta-headlines"
          readOnly={!editable}
          onChange={(titulos) => setDraft({ ...draft, titulos })}
        />
        <EditableList
          label="Sinônimos e variações de linguagem (não são segmentação)"
          values={draft.variacoes}
          limit={80}
          max={12}
          testId="bo-meta-synonyms"
          readOnly={!editable}
          onChange={(variacoes) => setDraft({ ...draft, variacoes })}
        />
        {!!errors.length && (
          <ul className="field-error" role="alert" data-testid="bo-meta-campaign-errors">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export function BackofficeMetaAdsPage() {
  const campaigns = useMetaCampanhas();
  const formId = useId();
  const [generating, setGenerating] = useState(false);
  const [opened, setOpened] = useState<number | null>(null);
  const generate = useBackofficeAction(
    gerarCampanhaMetaAds,
    'Rascunho criado pelo Claude. Revise antes de publicar.',
  );
  const current = campaigns.data?.find((campaign) => campaign.campanhaId === opened);
  return (
    <>
      <PageHeader
        eyebrow="CRESCIMENTO"
        title="Meta Ads"
        description="Aquisição de novos estacionamentos com otimização para cadastro ou assinatura e eventos enviados pelo servidor. Os anúncios são criados pausados para revisão."
        action={
          <Button
            data-testid="bo-meta-campaign-new"
            onClick={() => {
              generate.reset();
              setGenerating(true);
            }}
          >
            <Sparkles size={16} /> Nova campanha com Claude
          </Button>
        }
      />
      <section className="panel">
        {campaigns.isPending ? (
          <Skeleton />
        ) : campaigns.isError ? (
          <QueryError
            error={campaigns.error}
            what="as campanhas Meta Ads"
            onRetry={() => void campaigns.refetch()}
          />
        ) : !campaigns.data.length ? (
          <EmptyState
            title="Nenhuma campanha Meta Ads"
            description="Conecte a Meta Ads e Claude em Integrações. Depois gere uma campanha de teste ou assinatura para revisar."
          />
        ) : (
          <DataTable
            testId="bo-meta-campaigns"
            caption="Campanhas Meta Ads"
            rows={campaigns.data}
            rowKey={(campaign) => campaign.campanhaId}
            columns={[
              { label: 'Campanha', render: (campaign) => <strong>{campaign.nome}</strong> },
              {
                label: 'Conversão',
                render: (campaign) =>
                  campaign.objetivoConversao === 'TRIAL_STARTED'
                    ? 'Lead / teste'
                    : 'Purchase / assinatura',
              },
              {
                label: 'Status',
                render: (campaign) => (
                  <StatusBadge
                    status={statusCampanha[campaign.status].badge}
                    label={statusCampanha[campaign.status].label}
                  />
                ),
              },
              {
                label: 'Orçamento',
                render: (campaign) => `${money(campaign.orcamentoDiario)}/dia`,
              },
              {
                label: 'Criativo',
                render: (campaign) =>
                  `${campaign.textos.length} textos · ${campaign.variacoes.length} variações`,
              },
              { label: 'Atualizada', render: (campaign) => dateTime(campaign.atualizadoEm) },
              {
                label: 'Ações',
                render: (campaign) => (
                  <Button
                    variant="ghost"
                    data-testid="bo-meta-campaign-open"
                    onClick={() => setOpened(campaign.campanhaId)}
                  >
                    {campaign.status === 'RASCUNHO' ? 'Revisar' : 'Ver'}
                  </Button>
                ),
              },
            ]}
          />
        )}
      </section>
      {generating && (
        <Modal
          open
          size="md"
          title="Nova campanha Meta Ads com Claude"
          busy={generate.isPending}
          onClose={() => setGenerating(false)}
          actions={
            <>
              <Button
                variant="secondary"
                disabled={generate.isPending}
                onClick={() => setGenerating(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form={formId}
                busy={generate.isPending}
                data-testid="bo-meta-campaign-generate"
              >
                {generate.isPending ? 'Claude está criando…' : 'Gerar rascunho'}
              </Button>
            </>
          }
        >
          <GenerateForm
            formId={formId}
            error={generate.error}
            onSubmit={async (input) => {
              const created = await generate.mutateAsync(input).catch(() => null);
              if (created) {
                setGenerating(false);
                setOpened(created.campanhaId);
              }
            }}
          />
        </Modal>
      )}
      {current && <CampaignEditor campaign={current} onClose={() => setOpened(null)} />}
    </>
  );
}
