import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
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
  TextAreaField,
} from '../../ui';
import { dateTime, money } from '../../lib/format';
import { describeError } from '../../lib/describeError';
import {
  arquivarCampanha,
  editarCampanha,
  gerarCampanha,
  publicarCampanha,
  type Campanha,
  type GerarCampanhaInput,
  type PalavraChave,
} from './api';
import { useBackofficeAction, useCampanhas } from './hooks';

const LIMITES = { titulos: [3, 15, 30], descricoes: [2, 4, 90], palavras: [1, 50, 80] } as const;
const statusCampanha: Record<Campanha['status'], { badge: string; label: string }> = {
  RASCUNHO: { badge: 'PENDENTE', label: 'Rascunho' },
  PUBLICADA: { badge: 'ATIVA', label: 'Publicada (pausada)' },
  ARQUIVADA: { badge: 'ENCERRADA', label: 'Arquivada' },
};
const correspondencias: Record<PalavraChave['correspondencia'], string> = {
  PHRASE: 'Frase',
  EXACT: 'Exata',
  BROAD: 'Ampla',
};

const gerarSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(100),
  briefing: z
    .string()
    .trim()
    .min(10, 'Descreva público, região e diferenciais (mín. 10 caracteres).')
    .max(1000),
  regiao: z.string().trim().max(100),
  regioes: z.string().max(260),
  urlFinal: z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^https:\/\/\S+$/.test(v), 'A URL deve começar com https://.'),
  orcamentoDiario: z.number().min(1, 'Mínimo R$ 1,00.').max(10000, 'Máximo R$ 10.000,00.'),
});
type GerarData = z.infer<typeof gerarSchema>;

function GenerateForm({
  formId,
  error,
  onSubmit,
}: {
  formId: string;
  error?: unknown;
  onSubmit: (d: GerarCampanhaInput) => Promise<void>;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GerarData>({
    resolver: zodResolver(gerarSchema),
    mode: 'onBlur',
    defaultValues: {
      nome: '',
      briefing: '',
      regiao: '',
      regioes: '',
      urlFinal: 'https://www.furlaneti.com.br/autocare/sobrenos',
      orcamentoDiario: 30,
    },
  });
  return (
    <form
      id={formId}
      noValidate
      className="form-grid"
      data-testid="bo-campaign-generate"
      onSubmit={handleSubmit((v) => onSubmit({
        ...v,
        regiao: v.regiao || null,
        regioes: v.regioes.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean),
      }))}
    >
      <Field
        label="Nome da campanha"
        data-testid="bo-campaign-nome"
        {...register('nome')}
        error={errors.nome?.message}
      />
      <Field
        label="Região (opcional)"
        placeholder="Ex.: Grande São Paulo"
        data-testid="bo-campaign-regiao"
        {...register('regiao')}
        error={errors.regiao?.message}
      />
      <div>
        <TextAreaField
          label="IDs de regiões do Google Ads (opcional)"
          rows={2}
          placeholder="Um ID por linha. Vazio = Brasil."
          data-testid="bo-campaign-regioes"
          {...register('regioes')}
          error={errors.regioes?.message}
        />
      </div>
      <div className="form-span">
        <TextAreaField
          label="Briefing para o Claude"
          rows={4}
          placeholder="Público, região, diferenciais, oferta…"
          data-testid="bo-campaign-briefing"
          {...register('briefing')}
          error={errors.briefing?.message}
        />
      </div>
      <Field
        label="URL final (https)"
        data-testid="bo-campaign-url"
        {...register('urlFinal')}
        error={errors.urlFinal?.message}
      />
      <Controller
        control={control}
        name="orcamentoDiario"
        render={({ field }) => (
          <MoneyField
            label="Orçamento diário"
            data-testid="bo-campaign-orcamento"
            name={field.name}
            ref={field.ref}
            value={field.value}
            onBlur={field.onBlur}
            onChange={(v) => field.onChange(v ?? 0)}
            error={errors.orcamentoDiario?.message}
          />
        )}
      />
      <p className="muted form-span">
        O Claude da plataforma escreve contexto, títulos, descrições e palavras-chave. Nada é
        publicado até você revisar.
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
  Campanha,
  'nome' | 'urlFinal' | 'orcamentoDiario' | 'titulos' | 'descricoes' | 'palavrasChave' | 'regioes'
>;
const draftDe = (c: Campanha): Draft => ({
  nome: c.nome,
  urlFinal: c.urlFinal,
  orcamentoDiario: c.orcamentoDiario,
  titulos: c.titulos,
  descricoes: c.descricoes,
  palavrasChave: c.palavrasChave,
  regioes: c.regioes,
});
function validar(d: Draft): string[] {
  const erros: string[] = [];
  const [tMin, tMax, tLen] = LIMITES.titulos;
  const [dMin, dMax, dLen] = LIMITES.descricoes;
  const [pMin, pMax, pLen] = LIMITES.palavras;
  const titulos = d.titulos.filter((t) => t.trim());
  const descricoes = d.descricoes.filter((t) => t.trim());
  const palavras = d.palavrasChave.filter((p) => p.texto.trim());
  if (!d.nome.trim()) erros.push('Informe o nome.');
  if (!/^https:\/\/\S+$/.test(d.urlFinal.trim()))
    erros.push('A URL final deve começar com https://.');
  if (d.orcamentoDiario < 1 || d.orcamentoDiario > 10000)
    erros.push('Orçamento diário entre R$ 1,00 e R$ 10.000,00.');
  if (d.regioes.length > 20 || d.regioes.some((id) => !/^\d{4,12}$/.test(id)))
    erros.push('Informe até 20 IDs numéricos de região do Google Ads (4 a 12 dígitos).');
  if (titulos.length < tMin || titulos.length > tMax || titulos.some((t) => t.trim().length > tLen))
    erros.push(`Use de ${tMin} a ${tMax} títulos com até ${tLen} caracteres.`);
  if (
    descricoes.length < dMin ||
    descricoes.length > dMax ||
    descricoes.some((t) => t.trim().length > dLen)
  )
    erros.push(`Use de ${dMin} a ${dMax} descrições com até ${dLen} caracteres.`);
  if (
    palavras.length < pMin ||
    palavras.length > pMax ||
    palavras.some((p) => p.texto.trim().length > pLen)
  )
    erros.push(`Use de ${pMin} a ${pMax} palavras-chave com até ${pLen} caracteres.`);
  return erros;
}

function TextList({
  label,
  values,
  max,
  limit,
  testId,
  onChange,
  readOnly,
}: {
  label: string;
  values: string[];
  max: number;
  limit: number;
  testId: string;
  onChange: (v: string[]) => void;
  readOnly: boolean;
}) {
  return (
    <fieldset className="bo-list" data-testid={testId}>
      <legend>
        {label} ({values.length}/{max})
      </legend>
      {values.map((v, i) => (
        <div className="bo-list-row" key={i}>
          <Field
            label={`${label} ${i + 1}`}
            value={v}
            readOnly={readOnly}
            maxLength={limit + 20}
            data-testid={`${testId}-${i}`}
            error={v.trim().length > limit ? `${v.trim().length}/${limit} caracteres` : undefined}
            hint={`${v.trim().length}/${limit}`}
            onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {!readOnly && (
            <Button
              variant="ghost"
              aria-label={`Remover ${label.toLowerCase()} ${i + 1}`}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
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

function CampaignEditor({ campanha, onClose }: { campanha: Campanha; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => draftDe(campanha));
  const [erros, setErros] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState(false);
  // Só recarrega o rascunho quando o servidor muda a versão (salvar/publicar), nunca num refetch comum.
  useEffect(() => setDraft(draftDe(campanha)), [campanha.versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const editavel = campanha.status === 'RASCUNHO';
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftDe(campanha));
  const salvar = useBackofficeAction((c: Campanha) => editarCampanha(c), 'Rascunho salvo.');
  const publicar = useBackofficeAction(
    (c: Campanha) => publicarCampanha(c),
    'Campanha criada no Google Ads (pausada).',
  );
  const arquivar = useBackofficeAction(
    () => arquivarCampanha(campanha.campanhaId),
    'Campanha arquivada.',
  );
  const busy = salvar.isPending || publicar.isPending || arquivar.isPending;
  const limpo = (): Campanha => ({
    ...campanha,
    ...draft,
    titulos: draft.titulos.map((t) => t.trim()).filter(Boolean),
    descricoes: draft.descricoes.map((t) => t.trim()).filter(Boolean),
    palavrasChave: draft.palavrasChave
      .map((p) => ({ ...p, texto: p.texto.trim() }))
      .filter((p) => p.texto),
  });
  const salvarRascunho = async () => {
    const e = validar(draft);
    setErros(e);
    if (e.length) return null;
    return salvar.mutateAsync(limpo()).catch(() => null);
  };
  return (
    <Modal
      open
      size="lg"
      title={campanha.nome}
      busy={busy}
      onClose={onClose}
      actions={
        confirmar ? (
          <>
            <span className="modal-actions-note" role="alert">
              A campanha será criada PAUSADA no Google Ads, com orçamento de{' '}
              {money(draft.orcamentoDiario)}/dia. Ative-a no painel do Google Ads.
            </span>
            <Button variant="secondary" onClick={() => setConfirmar(false)}>
              Voltar
            </Button>
            <Button
              busy={publicar.isPending || salvar.isPending}
              data-testid="bo-campaign-publish-confirm"
              onClick={async () => {
                const atual = dirty ? await salvarRascunho() : campanha;
                if (!atual) {
                  setConfirmar(false);
                  return;
                }
                await publicar.mutateAsync(atual).catch(() => undefined);
                setConfirmar(false);
              }}
            >
              Publicar pausada
            </Button>
          </>
        ) : (
          <>
            {campanha.status !== 'ARQUIVADA' && (
              <Button
                variant="ghost"
                busy={arquivar.isPending}
                data-testid="bo-campaign-archive"
                onClick={() => arquivar.mutate(undefined)}
              >
                Arquivar
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            {editavel && (
              <>
                <Button
                  variant="secondary"
                  busy={salvar.isPending}
                  disabled={!dirty}
                  data-testid="bo-campaign-save"
                  onClick={() => void salvarRascunho()}
                >
                  Salvar rascunho
                </Button>
                <Button
                  data-testid="bo-campaign-publish"
                  onClick={() => {
                    const e = validar(draft);
                    setErros(e);
                    if (!e.length) setConfirmar(true);
                  }}
                >
                  Publicar no Google Ads
                </Button>
              </>
            )}
          </>
        )
      }
    >
      <div data-testid="bo-campaign-editor">
        <div className="detail-heading">
          <span>{dateTime(campanha.criadoEm)}</span>
          <StatusBadge
            status={statusCampanha[campanha.status].badge}
            label={statusCampanha[campanha.status].label}
          />
        </div>
        {campanha.erro && (
          <p className="field-error" role="alert" data-testid="bo-campaign-error">
            {campanha.erro}
          </p>
        )}
        {campanha.recursoGoogle && (
          <p className="notice" data-testid="bo-campaign-resource">
            Criada no Google Ads como <code>{campanha.recursoGoogle}</code>, pausada. Revise e ative
            no painel do Google Ads.
          </p>
        )}
        {campanha.contexto && (
          <details className="bo-context" open={editavel}>
            <summary>Contexto sugerido pelo Claude</summary>
            <p>{campanha.contexto}</p>
          </details>
        )}
        <div className="form-grid">
          <Field
            label="Nome"
            value={draft.nome}
            readOnly={!editavel}
            maxLength={100}
            data-testid="bo-campaign-edit-nome"
            onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
          />
          <MoneyField
            label="Orçamento diário"
            value={draft.orcamentoDiario}
            onChange={(v) => editavel && setDraft({ ...draft, orcamentoDiario: v ?? 0 })}
          />
          <div className="form-span">
            <Field
              label="URL final"
              value={draft.urlFinal}
              readOnly={!editavel}
              maxLength={500}
              onChange={(e) => setDraft({ ...draft, urlFinal: e.target.value })}
            />
          </div>
          <div className="form-span">
            <TextAreaField
              label="IDs de regiões do Google Ads"
              rows={2}
              value={draft.regioes.join('\n')}
              readOnly={!editavel}
              placeholder="Um ID por linha. Vazio = Brasil."
              data-testid="bo-campaign-edit-regioes"
              onChange={(e) => setDraft({
                ...draft,
                regioes: e.target.value.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean),
              })}
            />
          </div>
        </div>
        <TextList
          label="Título"
          values={draft.titulos}
          max={LIMITES.titulos[1]}
          limit={LIMITES.titulos[2]}
          testId="bo-titles"
          readOnly={!editavel}
          onChange={(titulos) => setDraft({ ...draft, titulos })}
        />
        <TextList
          label="Descrição"
          values={draft.descricoes}
          max={LIMITES.descricoes[1]}
          limit={LIMITES.descricoes[2]}
          testId="bo-descriptions"
          readOnly={!editavel}
          onChange={(descricoes) => setDraft({ ...draft, descricoes })}
        />
        <fieldset className="bo-list" data-testid="bo-keywords">
          <legend>
            Palavras-chave ({draft.palavrasChave.length}/{LIMITES.palavras[1]})
          </legend>
          {draft.palavrasChave.map((p, i) => (
            <div className="bo-list-row" key={i}>
              <Field
                label={`Palavra-chave ${i + 1}`}
                value={p.texto}
                readOnly={!editavel}
                maxLength={100}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    palavrasChave: draft.palavrasChave.map((x, j) =>
                      j === i ? { ...x, texto: e.target.value } : x,
                    ),
                  })
                }
              />
              <SelectField
                label="Correspondência"
                value={p.correspondencia}
                disabled={!editavel}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    palavrasChave: draft.palavrasChave.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            correspondencia: e.target.value as PalavraChave['correspondencia'],
                          }
                        : x,
                    ),
                  })
                }
              >
                {Object.entries(correspondencias).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </SelectField>
              {editavel && (
                <Button
                  variant="ghost"
                  aria-label={`Remover palavra-chave ${i + 1}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      palavrasChave: draft.palavrasChave.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))}
          {editavel && draft.palavrasChave.length < LIMITES.palavras[1] && (
            <Button
              variant="ghost"
              data-testid="bo-keywords-add"
              onClick={() =>
                setDraft({
                  ...draft,
                  palavrasChave: [...draft.palavrasChave, { texto: '', correspondencia: 'PHRASE' }],
                })
              }
            >
              <Plus size={14} /> Adicionar
            </Button>
          )}
        </fieldset>
        {!!erros.length && (
          <ul className="field-error" role="alert" data-testid="bo-campaign-errors">
            {erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export function BackofficeMarketingPage() {
  const campanhas = useCampanhas();
  const formId = useId();
  const [gerando, setGerando] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const gerar = useBackofficeAction(
    gerarCampanha,
    'Rascunho criado pelo Claude. Revise antes de publicar.',
  );
  const atual = campanhas.data?.find((c) => c.campanhaId === aberta);
  return (
    <>
      <PageHeader
        eyebrow="CRESCIMENTO"
        title="Marketing"
        description="Campanhas de Pesquisa no Google Ads escritas com o Claude para atrair novos estacionamentos. Performance Max não é criada por esta tela; o grupo precisa de pelo menos 3 títulos, 1 título longo, 2 descrições e imagens paisagem e quadrada configuradas no Google Ads."
        action={
          <Button
            data-testid="bo-campaign-new"
            onClick={() => {
              gerar.reset();
              setGerando(true);
            }}
          >
            <Sparkles size={16} /> Nova campanha com Claude
          </Button>
        }
      />
      <section className="panel">
        {campanhas.isPending ? (
          <Skeleton />
        ) : campanhas.isError ? (
          <QueryError
            error={campanhas.error}
            what="as campanhas"
            onRetry={() => void campanhas.refetch()}
          />
        ) : !campanhas.data.length ? (
          <EmptyState
            title="Nenhuma campanha"
            description="Gere a primeira campanha: o Claude sugere os textos e as palavras-chave, e você revisa antes de publicar."
          />
        ) : (
          <DataTable
            testId="bo-campaigns"
            caption="Campanhas"
            rows={campanhas.data}
            rowKey={(c) => c.campanhaId}
            columns={[
              { label: 'Campanha', render: (c) => <strong>{c.nome}</strong> },
              {
                label: 'Status',
                render: (c) => (
                  <StatusBadge
                    status={statusCampanha[c.status].badge}
                    label={statusCampanha[c.status].label}
                  />
                ),
              },
              { label: 'Orçamento', render: (c) => money(c.orcamentoDiario) + '/dia' },
              {
                label: 'Anúncio',
                render: (c) =>
                  `${c.titulos.length} títulos · ${c.palavrasChave.length} palavras-chave`,
              },
              { label: 'Atualizada', render: (c) => dateTime(c.atualizadoEm) },
              {
                label: 'Ações',
                render: (c) => (
                  <Button
                    variant="ghost"
                    data-testid="bo-campaign-open"
                    onClick={() => setAberta(c.campanhaId)}
                  >
                    {c.status === 'RASCUNHO' ? 'Revisar' : 'Ver'}
                  </Button>
                ),
              },
            ]}
          />
        )}
      </section>
      {gerando && (
        <Modal
          open
          size="md"
          title="Nova campanha com Claude"
          busy={gerar.isPending}
          onClose={() => setGerando(false)}
          actions={
            <>
              <Button
                variant="secondary"
                disabled={gerar.isPending}
                onClick={() => setGerando(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" form={formId} busy={gerar.isPending} data-testid="form-submit">
                {gerar.isPending ? 'O Claude está escrevendo…' : 'Gerar rascunho'}
              </Button>
            </>
          }
        >
          <GenerateForm
            formId={formId}
            error={gerar.error}
            onSubmit={async (data) => {
              const criada = await gerar.mutateAsync(data).catch(() => null);
              if (criada) {
                setGerando(false);
                setAberta(criada.campanhaId);
              }
            }}
          />
        </Modal>
      )}
      {atual && <CampaignEditor campanha={atual} onClose={() => setAberta(null)} />}
    </>
  );
}
