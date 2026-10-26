import { api, toQuery } from '../../lib/apiClient';
import type { BackofficeSession } from './store';

const root = '/api/v1/backoffice/';
const bo = <T>(path: string, options: RequestInit = {}) =>
  api<T>(root + path, { ...options, auth: 'backoffice' });
const send = <T>(path: string, method: string, body?: unknown) =>
  bo<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface Page<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  total: number;
}
export type TipoPlano = 'PRE_PAGO' | 'POS_PAGO';
export type Periodicidade = 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
export type Situacao = 'SEM_ASSINATURA' | 'TRIAL' | 'ATIVA' | 'INADIMPLENTE' | 'CANCELADA';
export type StatusCobranca =
  'PENDENTE_EMISSAO' | 'EMITINDO' | 'EMITIDA' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
export type FormaPagamento = 'BOLETO' | 'PIX' | 'UNDEFINED';

export interface Plano {
  planoId: number;
  nome: string;
  tipo: TipoPlano;
  periodicidade: Periodicidade;
  meses: number;
  duracaoDias: number;
  valorMensal: number;
  descontoPercentual: number;
  valorPeriodo: number;
  descricao: string | null;
  ativo: boolean;
  assinaturas: number;
  versao: string;
}
export interface PlanoInput {
  nome: string;
  tipo: TipoPlano;
  periodicidade: Periodicidade;
  valorMensal: number;
  descontoPercentual: number;
  descricao: string | null;
  ativo: boolean;
  versao?: string;
}
export interface Assinante {
  estabelecimentoId: number;
  nome: string;
  tipoPessoa: string;
  documento: string;
  emailDono: string | null;
  criadoEm: string;
  situacao: Situacao;
  assinaturaId: number | null;
  plano: string | null;
  tipoPlano: TipoPlano | null;
  trialFim: string | null;
  periodoFim: string | null;
  valorPeriodo: number | null;
}
export interface Assinatura {
  assinaturaId: number;
  planoId: number;
  plano: string;
  tipoPlano: TipoPlano;
  periodicidade: Periodicidade;
  status: 'ATIVA' | 'CANCELADA';
  situacao: Situacao;
  trialFim: string | null;
  periodoInicio: string;
  periodoFim: string;
  valorPeriodo: number;
  criadoEm: string;
  canceladaEm: string | null;
  versao: string;
}
export interface Cobranca {
  cobrancaId: number;
  assinaturaId: number;
  estabelecimentoId: number;
  estabelecimento: string;
  periodoInicio: string;
  periodoFim: string;
  vencimento: string;
  valor: number;
  origem: 'ROTINA' | 'MANUAL';
  formaPagamento: FormaPagamento;
  status: StatusCobranca;
  urlFatura: string | null;
  erro: string | null;
  criadoEm: string;
  pagoEm: string | null;
}
export interface AssinanteDetalhe {
  assinante: Assinante;
  assinatura: Assinatura | null;
  podeUsarTrial: boolean;
  cobrancas: Cobranca[];
}
export interface ProrrogacaoTrial {
  trialFim: string;
  emailStatus: 'ACEITO' | 'FALHA' | 'INCERTO';
  emailId: number | null;
}
export interface ResultadoRotina {
  data: string;
  asaasConfigurado: boolean;
  sincronizadas: number;
  emitidas: number;
  falhas: number;
  mensagens: string[];
}
export interface RotinaCobranca {
  habilitada: boolean;
  hora: number;
  ultimaData: string | null;
  executadaEm: string | null;
  origem: 'AGENDADA' | 'MANUAL' | null;
  ultimoResultado: ResultadoRotina | null;
}
export interface Resumo {
  estabelecimentos: number;
  semAssinatura: number;
  emTrial: number;
  ativas: number;
  inadimplentes: number;
  canceladas: number;
  receitaMensalRecorrente: number;
  cobrancasAbertas: number;
  valorEmAberto: number;
  rotina: RotinaCobranca;
}
interface Meta {
  ativo: boolean;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  versao: string | null;
}
export interface AsaasPlataforma extends Meta {
  possuiTokenWebhook?: boolean;
  ambiente: 'SANDBOX' | 'PRODUCAO';
  possuiChaveApi: boolean;
}
export interface ClaudePlataforma extends Meta {
  modelo: string;
  maximoTokens: number;
  tempoEsgotadoSegundos: number;
  possuiChaveApi: boolean;
}
export interface GoogleAdsPlataforma extends Meta {
  customerId: string;
  loginCustomerId: string | null;
  clientId: string;
  versaoApi: string;
  possuiDeveloperToken: boolean;
  possuiClientSecret: boolean;
  possuiRefreshToken: boolean;
  trialConversionActionId: string | null;
  subscriptionConversionActionId: string | null;
}
export interface MetaAdsPlataforma extends Meta {
  adAccountId: string;
  pixelId: string;
  pageId: string;
  siteUrl: string;
  urlImagem: string;
  versaoApi: string;
  codigoEventoTeste: string | null;
  possuiAccessToken: boolean;
}
export interface Integracoes {
  consultaPlaca?: Meta & { possuiToken: boolean; urlTemplate: string };
  asaas: AsaasPlataforma;
  claude: ClaudePlataforma;
  googleAds: GoogleAdsPlataforma;
  metaAds: MetaAdsPlataforma;
}
export interface PalavraChave {
  texto: string;
  correspondencia: 'BROAD' | 'PHRASE' | 'EXACT';
}
export interface Campanha {
  campanhaId: number;
  nome: string;
  briefing: string;
  urlFinal: string;
  orcamentoDiario: number;
  contexto: string | null;
  titulos: string[];
  descricoes: string[];
  palavrasChave: PalavraChave[];
  regioes: string[];
  status: 'RASCUNHO' | 'PUBLICADA' | 'ARQUIVADA';
  recursoGoogle: string | null;
  erro: string | null;
  criadoEm: string;
  atualizadoEm: string;
  publicadaEm: string | null;
  versao: string;
}
export interface GerarCampanhaInput {
  nome: string;
  briefing: string;
  regiao: string | null;
  regioes: string[];
  urlFinal: string;
  orcamentoDiario: number;
}
export interface MetaCampanha {
  campanhaId: number;
  nome: string;
  briefing: string;
  urlFinal: string;
  orcamentoDiario: number;
  regiao: string;
  objetivoConversao: 'TRIAL_STARTED' | 'SUBSCRIPTION_ACTIVE';
  contexto: string | null;
  textos: string[];
  titulos: string[];
  variacoes: string[];
  status: 'RASCUNHO' | 'PUBLICADA' | 'ARQUIVADA' | 'REVISAO_MANUAL';
  campanhaMetaId: string | null;
  conjuntoMetaId: string | null;
  criativoMetaId: string | null;
  anuncioMetaId: string | null;
  erro: string | null;
  criadoEm: string;
  atualizadoEm: string;
  publicadaEm: string | null;
  versao: string;
}
export interface GerarCampanhaMetaInput {
  nome: string;
  briefing: string;
  regiao: string | null;
  urlFinal: string;
  orcamentoDiario: number;
  objetivoConversao: MetaCampanha['objetivoConversao'];
}

// Acesso
export const loginBackoffice = (login: string, senha: string) =>
  send<BackofficeSession>('auth/login', 'POST', { login, senha });
export const trocarSenhaBackoffice = (senhaAtual: string, novaSenha: string) =>
  send<BackofficeSession>('auth/trocar-senha', 'POST', { senhaAtual, novaSenha });
export const sairBackoffice = () => send<void>('auth/logout', 'POST');

// Painel
export const getResumo = (signal?: AbortSignal) => bo<Resumo>('resumo', { signal });
export const executarRotina = () => send<ResultadoRotina>('rotina-cobranca/execucao', 'POST');

// Planos
export const getPlanos = (signal?: AbortSignal) => bo<Plano[]>('planos', { signal });
export const salvarPlano = (data: PlanoInput, id?: number) =>
  send<Plano>(id ? 'planos/' + id : 'planos', id ? 'PUT' : 'POST', data);

// Assinantes
export const getAssinantes = (
  filtro: { busca?: string; situacao?: string; pagina: number },
  signal?: AbortSignal,
) =>
  bo<Page<Assinante>>(
    'assinantes' +
      toQuery({
        busca: filtro.busca,
        situacao: filtro.situacao,
        pagina: filtro.pagina,
        tamanho: 20,
      }),
    { signal },
  );
export const getAssinante = (id: number, signal?: AbortSignal) =>
  bo<AssinanteDetalhe>('assinantes/' + id, { signal });
export const assinar = (id: number, planoId: number, comTrial: boolean) =>
  send<AssinanteDetalhe>(`assinantes/${id}/assinatura`, 'PUT', { planoId, comTrial });
export const prorrogarTrial = (id: number, versao: string) =>
  send<ProrrogacaoTrial>(`assinantes/${id}/trial/prorrogacao`, 'POST', { versao });
export const cancelarAssinatura = (id: number) =>
  send<AssinanteDetalhe>(`assinantes/${id}/assinatura/cancelamento`, 'POST');
export const gerarCobranca = (id: number, formaPagamento: FormaPagamento) =>
  send<Cobranca>(`assinantes/${id}/cobrancas`, 'POST', { formaPagamento });

// Cobranças
export const getCobrancas = (filtro: { status?: string; pagina: number }, signal?: AbortSignal) =>
  bo<Page<Cobranca>>(
    'cobrancas' + toQuery({ status: filtro.status, pagina: filtro.pagina, tamanho: 20 }),
    {
      signal,
    },
  );
export const emitirCobranca = (id: number) => send<Cobranca>(`cobrancas/${id}/emissao`, 'POST');
export const sincronizarCobranca = (id: number) =>
  send<Cobranca>(`cobrancas/${id}/sincronizacao`, 'POST');

// Integrações
export const getIntegracoes = (signal?: AbortSignal) => bo<Integracoes>('integracoes', { signal });
export const salvarIntegracao = <T>(
  provedor: 'asaas' | 'claude' | 'google-ads' | 'meta-ads' | 'consulta-placa',
  body: unknown,
) => send<T>('integracoes/' + provedor, 'PUT', body);
export const testarIntegracao = (provedor: 'asaas' | 'claude' | 'google-ads' | 'meta-ads') =>
  send<void>(`integracoes/${provedor}/teste`, 'POST');

// Marketing
export const getCampanhas = (signal?: AbortSignal) => bo<Campanha[]>('campanhas', { signal });
export const gerarCampanha = (data: GerarCampanhaInput) =>
  send<Campanha>('campanhas', 'POST', data);
export const editarCampanha = (c: Campanha) =>
  send<Campanha>('campanhas/' + c.campanhaId, 'PUT', {
    nome: c.nome,
    urlFinal: c.urlFinal,
    orcamentoDiario: c.orcamentoDiario,
    titulos: c.titulos,
    descricoes: c.descricoes,
    palavrasChave: c.palavrasChave,
    regioes: c.regioes,
    versao: c.versao,
  });
export const publicarCampanha = (c: Campanha) =>
  send<Campanha>(`campanhas/${c.campanhaId}/publicacao`, 'POST', { versao: c.versao });
export const arquivarCampanha = (id: number) =>
  send<Campanha>(`campanhas/${id}/arquivamento`, 'POST');
export const getCampanhasMetaAds = (signal?: AbortSignal) =>
  bo<MetaCampanha[]>('meta-ads/campanhas', { signal });
export const gerarCampanhaMetaAds = (data: GerarCampanhaMetaInput) =>
  send<MetaCampanha>('meta-ads/campanhas', 'POST', data);
export const editarCampanhaMetaAds = (campaign: MetaCampanha) =>
  send<MetaCampanha>(`meta-ads/campanhas/${campaign.campanhaId}`, 'PUT', campaign);
export const publicarCampanhaMetaAds = (campaign: MetaCampanha) =>
  send<MetaCampanha>(`meta-ads/campanhas/${campaign.campanhaId}/publicacao`, 'POST', {
    versao: campaign.versao,
  });
export const arquivarCampanhaMetaAds = (id: number) =>
  send<MetaCampanha>(`meta-ads/campanhas/${id}/arquivamento`, 'POST');

export interface EmailRecipient {
  estabelecimentoId: number;
  nome: string;
  email: string | null;
  boasVindasStatus: string | null;
  orientacaoAsaasStatus: string | null;
}
export interface EmailPanel {
  habilitado: boolean;
  modelos: { id: string; nome: string; assunto: string; html: string }[];
  destinatarios: EmailRecipient[];
}
export const getEmails = (signal?: AbortSignal) => bo<EmailPanel>('emails', { signal });
export const enfileirarEmails = (body: { modelo: string; estabelecimentoIds: number[] }) =>
  send<{ enfileirados: number; ignorados: number }>('emails/enfileirar', 'POST', body);
