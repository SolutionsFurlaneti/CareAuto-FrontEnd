import { useEffect, useState } from 'react';
import { Controller, useForm, type FieldValues, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z, type ZodType } from 'zod';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { Button, Field, SelectField, Skeleton, StatusBadge, Switch } from '../../ui';
import { dateTime } from '../../lib/format';
import { describeError } from '../../lib/describeError';
import { salvarIntegracao, testarIntegracao, type Integracoes } from './api';
import { useBackofficeAction, useIntegracoes } from './hooks';

type Provedor = 'asaas' | 'claude' | 'google-ads' | 'meta-ads' | 'consulta-placa';
interface Campo {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'select';
  options?: { value: string; label: string }[];
  hint?: string;
  /** Campo secreto: vazio mantém o valor salvo. */
  salvo?: boolean;
}
interface PanelSpec<T extends FieldValues> {
  provedor: Provedor;
  titulo: string;
  descricao: string;
  schema: ZodType<T>;
  defaults: T;
  campos: Campo[];
  meta: {
    ativo: boolean;
    atualizadoEm: string | null;
    atualizadoPor: string | null;
    versao: string | null;
  };
  credenciaisCompletas: boolean;
  body: (values: T, remover: boolean) => Record<string, unknown>;
}

function IntegrationPanel<T extends FieldValues & { ativo: boolean }>({
  spec,
}: {
  spec: PanelSpec<T>;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<T>({
    resolver: zodResolver(spec.schema),
    mode: 'onBlur',
    defaultValues: spec.defaults as never,
  });
  useEffect(() => reset(spec.defaults as never), [spec.meta.versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const salvar = useBackofficeAction(
    (body: Record<string, unknown>) =>
      salvarIntegracao(spec.provedor, { ...body, versao: spec.meta.versao }),
    'Configuração salva.',
  );
  const testar = useBackofficeAction(
    () =>
      spec.provedor === 'consulta-placa' ? Promise.resolve() : testarIntegracao(spec.provedor),
    'Conexão verificada com sucesso.',
  );
  return (
    <section
      className="panel"
      aria-labelledby={'bo-int-' + spec.provedor}
      data-testid={'bo-integration-' + spec.provedor}
    >
      <div className="panel-toolbar">
        <div>
          <h2 id={'bo-int-' + spec.provedor}>{spec.titulo}</h2>
          <span>
            {spec.meta.atualizadoEm
              ? `Atualizado em ${dateTime(spec.meta.atualizadoEm)} por ${spec.meta.atualizadoPor}`
              : 'Ainda não configurado'}
          </span>
        </div>
        <StatusBadge
          status={spec.meta.ativo ? 'ATIVA' : 'ENCERRADA'}
          label={spec.meta.ativo ? 'Ativa' : 'Inativa'}
        />
      </div>
      <form
        className="integration-body"
        noValidate
        onSubmit={handleSubmit((v) => salvar.mutate(spec.body(v as T, false)))}
      >
        <p>{spec.descricao}</p>
        <div className="form-grid">
          {spec.campos.map((c) =>
            c.type === 'select' ? (
              <SelectField
                key={c.name}
                label={c.label}
                hint={c.hint}
                data-testid={`bo-${spec.provedor}-${c.name}`}
                {...register(c.name as Path<T>)}
              >
                {c.options!.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            ) : (
              <Field
                key={c.name}
                label={c.label}
                type={c.type ?? 'text'}
                autoComplete="off"
                placeholder={c.salvo ? '•••••• salvo (deixe em branco para manter)' : undefined}
                hint={c.hint}
                data-testid={`bo-${spec.provedor}-${c.name}`}
                {...register(
                  c.name as Path<T>,
                  c.type === 'number' ? { valueAsNumber: true } : undefined,
                )}
                error={errors[c.name]?.message as string | undefined}
              />
            ),
          )}
          <Controller
            control={control}
            name={'ativo' as Path<T>}
            render={({ field }) => (
              <Switch
                label="Integração ativa"
                description={
                  spec.credenciaisCompletas ? undefined : 'Informe as credenciais para ativar.'
                }
                checked={!!field.value}
                onChange={field.onChange}
                data-testid={`bo-${spec.provedor}-ativo`}
              />
            )}
          />
        </div>
        {!!salvar.error && (
          <p className="field-error" role="alert">
            {describeError(salvar.error)}
          </p>
        )}
        {confirmarRemocao ? (
          <div className="bo-actions">
            <span className="modal-actions-note" role="alert">
              As credenciais serão apagadas e a integração desativada.
            </span>
            <Button variant="secondary" onClick={() => setConfirmarRemocao(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              busy={salvar.isPending}
              data-testid={`bo-${spec.provedor}-remove-confirm`}
              onClick={() =>
                salvar.mutate(spec.body({ ...spec.defaults, ativo: false }, true), {
                  onSuccess: () => setConfirmarRemocao(false),
                })
              }
            >
              Remover credenciais
            </Button>
          </div>
        ) : (
          <div className="bo-actions">
            <Button
              type="submit"
              busy={salvar.isPending}
              disabled={!isDirty}
              data-testid={`bo-${spec.provedor}-save`}
            >
              Salvar
            </Button>
            {spec.provedor !== 'consulta-placa' && (
              <Button
                variant="secondary"
                busy={testar.isPending}
                disabled={!spec.credenciaisCompletas || isDirty}
                data-testid={`bo-${spec.provedor}-test`}
                onClick={() => testar.mutate(undefined)}
              >
                Testar conexão
              </Button>
            )}
            {spec.credenciaisCompletas && (
              <Button variant="ghost" onClick={() => setConfirmarRemocao(true)}>
                Remover credenciais
              </Button>
            )}
          </div>
        )}
      </form>
    </section>
  );
}

const placaSchema = z.object({ ativo: z.boolean(), token: z.string().trim().max(500) });
const asaasSchema = z.object({
  tokenWebhook: z
    .string()
    .trim()
    .refine(
      (v) => !v || (v.length >= 32 && v.length <= 255 && !/\s/.test(v)),
      'Use de 32 a 255 caracteres sem espaços.',
    ),
  ativo: z.boolean(),
  ambiente: z.enum(['SANDBOX', 'PRODUCAO']),
  chaveApi: z.string().trim().max(500),
});
const claudeSchema = z.object({
  ativo: z.boolean(),
  modelo: z
    .string()
    .trim()
    .min(1, 'Informe o modelo.')
    .max(100)
    .regex(/^[A-Za-z0-9._:-]+$/, 'Modelo inválido.'),
  maximoTokens: z
    .number({ invalid_type_error: 'Informe um número.' })
    .int()
    .min(512, 'Entre 512 e 4096.')
    .max(4096, 'Entre 512 e 4096.'),
  tempoEsgotadoSegundos: z
    .number({ invalid_type_error: 'Informe um número.' })
    .int()
    .min(10, 'Entre 10 e 120.')
    .max(120, 'Entre 10 e 120.'),
  chaveApi: z.string().trim().max(500),
});
const conta = z
  .string()
  .trim()
  .refine((v) => /^\d{3}-?\d{3}-?\d{4}$/.test(v), 'Use os 10 dígitos (ex.: 123-456-7890).');
const googleSchema = z.object({
  ativo: z.boolean(),
  customerId: conta,
  loginCustomerId: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{3}-?\d{3}-?\d{4}$/.test(v), 'Use os 10 dígitos da conta MCC.'),
  clientId: z.string().trim().min(1, 'Informe o client ID OAuth.').max(200),
  versaoApi: z
    .string()
    .trim()
    .regex(/^v\d{2}$/, 'Formato v25.'),
  developerToken: z.string().trim().max(200),
  clientSecret: z.string().trim().max(200),
  refreshToken: z.string().trim().max(1000),
});
const metaSchema = z.object({
  ativo: z.boolean(),
  adAccountId: z
    .string()
    .trim()
    .min(1, 'Informe o ID da conta de anúncios.')
    .regex(/^(act_)?\d+$/, 'Use o ID numérico da conta, com ou sem act_.'),
  pixelId: z
    .string()
    .trim()
    .min(1, 'Informe o ID do Pixel/conjunto de dados.')
    .regex(/^\d+$/, 'Use o ID numérico.'),
  pageId: z
    .string()
    .trim()
    .min(1, 'Informe o ID da Página do Facebook.')
    .regex(/^\d+$/, 'Use o ID numérico.'),
  siteUrl: z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((value) => value.startsWith('https://'), 'Use uma URL HTTPS.'),
  urlImagem: z
    .string()
    .trim()
    .max(1000)
    .url()
    .refine((value) => value.startsWith('https://'), 'Use uma URL HTTPS pública.'),
  versaoApi: z
    .string()
    .trim()
    .regex(/^v\d{2}\.\d$/, 'Formato esperado: v25.0.'),
  codigoEventoTeste: z.string().trim().max(100),
  accessToken: z.string().trim().max(4000),
});
const vazio = (v: string) => (v.trim() ? v.trim() : null);

function panels(d: Integracoes) {
  const asaas: PanelSpec<z.infer<typeof asaasSchema>> = {
    provedor: 'asaas',
    titulo: 'Asaas da plataforma',
    meta: d.asaas,
    credenciaisCompletas: d.asaas.possuiChaveApi,
    descricao:
      'Conta usada nas mensalidades e pelos estabelecimentos sem integração própria. Recebimentos ficam na plataforma; o repasse é manual. Configure o webhook https://www.furlaneti.com.br/autocare-api/api/v1/webhooks/asaas/plataforma com o token abaixo.',
    schema: asaasSchema,
    defaults: { ativo: d.asaas.ativo, ambiente: d.asaas.ambiente, chaveApi: '', tokenWebhook: '' },
    campos: [
      {
        name: 'ambiente',
        label: 'Ambiente',
        type: 'select',
        options: [
          { value: 'SANDBOX', label: 'Sandbox — testes' },
          { value: 'PRODUCAO', label: 'Produção — cobranças reais' },
        ],
      },
      { name: 'chaveApi', label: 'Chave de API', type: 'password', salvo: d.asaas.possuiChaveApi },
      {
        name: 'tokenWebhook',
        label: 'Token do webhook compartilhado',
        type: 'password',
        salvo: d.asaas.possuiTokenWebhook,
      },
    ],
    body: (v, remover) => ({
      ativo: v.ativo,
      ambiente: v.ambiente,
      tokenWebhook: vazio(v.tokenWebhook),
      chaveApi: vazio(v.chaveApi),
      removerChaveApi: remover,
    }),
  };
  const claude: PanelSpec<z.infer<typeof claudeSchema>> = {
    provedor: 'claude',
    titulo: 'Claude (Anthropic)',
    meta: d.claude,
    credenciaisCompletas: d.claude.possuiChaveApi,
    descricao:
      'Gera campanhas e lê placas por foto para os estabelecimentos que não ativaram credenciais próprias. O consumo usa a conta da plataforma.',
    schema: claudeSchema,
    defaults: {
      ativo: d.claude.ativo,
      modelo: d.claude.modelo,
      maximoTokens: d.claude.maximoTokens,
      tempoEsgotadoSegundos: d.claude.tempoEsgotadoSegundos,
      chaveApi: '',
    },
    campos: [
      { name: 'modelo', label: 'Modelo' },
      { name: 'chaveApi', label: 'Chave de API', type: 'password', salvo: d.claude.possuiChaveApi },
      { name: 'maximoTokens', label: 'Máximo de tokens', type: 'number', hint: '512 a 4096.' },
      {
        name: 'tempoEsgotadoSegundos',
        label: 'Tempo limite (s)',
        type: 'number',
        hint: '10 a 120.',
      },
    ],
    body: (v, remover) => ({ ...v, chaveApi: vazio(v.chaveApi), removerChaveApi: remover }),
  };
  const g = d.googleAds;
  const google: PanelSpec<z.infer<typeof googleSchema>> = {
    provedor: 'google-ads',
    titulo: 'Google Ads',
    meta: g,
    credenciaisCompletas: g.possuiClientSecret && g.possuiRefreshToken,
    descricao: [
      'Conta onde as campanhas de Pesquisa são criadas (sempre pausadas). O refresh token precisa ser emitido com os escopos adwords e datamanager; se foi criado só com adwords, gere outro após autorizar os dois. Salve as credenciais e use Testar para validar o acesso e criar as ações de conversão.',
      g.trialConversionActionId && g.subscriptionConversionActionId
        ? `Ações configuradas — Trial started: ${g.trialConversionActionId}; Subscription active: ${g.subscriptionConversionActionId}.`
        : 'As ações ainda serão criadas ao testar a conexão.',
      'Os envios começam em novos trials/assinaturas pagos e exigem consentimento do estabelecimento. A conta também precisa aceitar os termos de dados do cliente e ativar Enhanced Conversions for Leads no Google Ads.',
    ].join(' '),
    schema: googleSchema,
    defaults: {
      ativo: g.ativo,
      customerId: g.customerId,
      loginCustomerId: g.loginCustomerId ?? '',
      clientId: g.clientId,
      versaoApi: g.versaoApi,
      developerToken: '',
      clientSecret: '',
      refreshToken: '',
    },
    campos: [
      { name: 'customerId', label: 'Customer ID da conta', hint: '10 dígitos.' },
      { name: 'loginCustomerId', label: 'Login customer ID (MCC, opcional)' },
      { name: 'clientId', label: 'OAuth client ID' },
      { name: 'versaoApi', label: 'Versão da API', hint: 'Ex.: v25.' },
      {
        name: 'developerToken',
        label: 'Developer token (legado, opcional)',
        type: 'password',
        salvo: g.possuiDeveloperToken,
        hint: 'O Google deixou de exigir esse token em 2026. Pode ficar vazio.',
      },
      {
        name: 'clientSecret',
        label: 'OAuth client secret',
        type: 'password',
        salvo: g.possuiClientSecret,
      },
      {
        name: 'refreshToken',
        label: 'Refresh token',
        type: 'password',
        salvo: g.possuiRefreshToken,
        hint: 'Emita o token OAuth com os escopos adwords e datamanager.',
      },
    ],
    body: (v, remover) => ({
      ...v,
      loginCustomerId: vazio(v.loginCustomerId),
      developerToken: vazio(v.developerToken),
      clientSecret: vazio(v.clientSecret),
      refreshToken: vazio(v.refreshToken),
      removerCredenciais: remover,
    }),
  };
  const meta = d.metaAds;
  const metaAds: PanelSpec<z.infer<typeof metaSchema>> = {
    provedor: 'meta-ads',
    titulo: 'Meta Ads',
    meta,
    credenciaisCompletas: meta.possuiAccessToken,
    descricao:
      'Conta usada para divulgar o AutoCare a novos estacionamentos. Campanhas são otimizadas para Lead (trial) ou Purchase (assinatura) e sempre criadas pausadas. O servidor envia conversões com consentimento, usando e-mail/telefone em SHA-256 e IDs de clique disponíveis. A imagem precisa estar publicamente acessível por HTTPS. Sinônimos gerados pelo Claude são apenas variações de texto: Meta não usa palavras-chave de busca.',
    schema: metaSchema,
    defaults: {
      ativo: meta.ativo,
      adAccountId: meta.adAccountId,
      pixelId: meta.pixelId,
      pageId: meta.pageId,
      siteUrl: meta.siteUrl,
      urlImagem: meta.urlImagem,
      versaoApi: meta.versaoApi,
      codigoEventoTeste: meta.codigoEventoTeste ?? '',
      accessToken: '',
    },
    campos: [
      {
        name: 'adAccountId',
        label: 'ID da conta de anúncios',
        hint: 'Aceita o número ou act_ seguido do número.',
      },
      { name: 'pixelId', label: 'ID do Pixel/conjunto de dados' },
      { name: 'pageId', label: 'ID da Página do Facebook' },
      { name: 'siteUrl', label: 'URL do site para eventos (HTTPS)' },
      {
        name: 'urlImagem',
        label: 'URL HTTPS pública da imagem do anúncio',
        hint: 'A Meta fará o download desta imagem para o criativo.',
      },
      { name: 'versaoApi', label: 'Versão da Graph API', hint: 'Ex.: v25.0.' },
      {
        name: 'codigoEventoTeste',
        label: 'Código de teste de eventos (opcional)',
        hint: 'Events Manager; remova após homologar.',
      },
      {
        name: 'accessToken',
        label: 'Token de acesso Meta (System User)',
        type: 'password',
        salvo: meta.possuiAccessToken,
        hint: 'Guarde no servidor; solicite ads_management e acesso ao Pixel.',
      },
    ],
    body: (v, remover) => ({
      ...v,
      adAccountId: v.adAccountId.trim().replace(/^act_/i, ''),
      codigoEventoTeste: vazio(v.codigoEventoTeste),
      accessToken: vazio(v.accessToken),
      removerCredenciais: remover,
    }),
  };
  const placa = d.consultaPlaca ?? {
    ativo: false,
    possuiToken: false,
    atualizadoEm: null,
    atualizadoPor: null,
    versao: null,
  };
  const consulta: PanelSpec<z.infer<typeof placaSchema>> = {
    provedor: 'consulta-placa',
    titulo: 'Consulta de placas da plataforma',
    meta: placa,
    descricao:
      'Token do provedor de consulta de placas usado pelos estabelecimentos sem integração própria. A consulta de um veículo consome o saldo da plataforma.',
    schema: placaSchema,
    defaults: { ativo: placa.ativo, token: '' },
    credenciaisCompletas: placa.possuiToken,
    campos: [{ name: 'token', label: 'Token', type: 'password', salvo: placa.possuiToken }],
    body: (v, remover) => ({ ativo: v.ativo, token: vazio(v.token), removerToken: remover }),
  };
  return { asaas, claude, google, metaAds, consulta };
}

export function BackofficeIntegrationsPage() {
  const integracoes = useIntegracoes();
  const p = integracoes.data ? panels(integracoes.data) : null;
  return (
    <>
      <PageHeader
        eyebrow="PLATAFORMA"
        title="Integrações"
        description="Credenciais da plataforma, criptografadas no servidor. As respostas nunca trazem as chaves."
      />
      {integracoes.isPending ? (
        <Skeleton />
      ) : integracoes.isError ? (
        <QueryError
          error={integracoes.error}
          what="as integrações"
          onRetry={() => void integracoes.refetch()}
        />
      ) : (
        p && (
          <>
            <IntegrationPanel spec={p.asaas} />
            <IntegrationPanel spec={p.claude} />
            <IntegrationPanel spec={p.consulta} />
            <IntegrationPanel spec={p.google} />
            <IntegrationPanel spec={p.metaAds} />
          </>
        )
      )}
    </>
  );
}
