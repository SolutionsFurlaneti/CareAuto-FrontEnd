import { api } from '../../lib/apiClient';

export type AcaoAposEntrada = 'PERGUNTAR' | 'IMPRIMIR' | 'NENHUMA';
export interface ConfiguracaoImpressao {
  perguntarAoSalvarEntrada: boolean;
  imprimirCupomEntradaAutomatico: boolean;
  acaoAposEntrada: AcaoAposEntrada;
  possuiTokenAgente: boolean;
  /** Token gerado e ao menos uma impressora de entrada ativa. */
  impressaoEntradaDisponivel: boolean;
  /** Calculado pelo servidor: contato nos últimos 2 minutos. */
  agenteConectado: boolean;
  ultimoContatoAgenteEm: string | null;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  versao: string | null;
}
export type TipoConexao = 'USB_WINDOWS' | 'REDE_TCP';
export interface Impressora {
  impressoraId: number;
  nome: string;
  tipoConexao: TipoConexao;
  enderecoDriverOuIp: string;
  portaTcp: number | null;
  imprimeEntrada: boolean;
  imprimeFechamento: boolean;
  ativo: boolean;
}
export type ImpressoraInput = Omit<Impressora, 'impressoraId'>;
export interface TrabalhoImpressao {
  impressaoId: number;
  impressoraId: number;
  impressora: string;
  estadiaId: number | null;
  tipo: 'ENTRADA' | 'TESTE';
  status: 'PENDENTE' | 'IMPRIMINDO' | 'IMPRESSO' | 'FALHOU';
  tentativas: number;
  criadoEm: string;
  concluidoEm: string | null;
  erro: string | null;
}

const root = '/api/v1/impressao/';
export const getPrintConfig = (signal?: AbortSignal) =>
  api<ConfiguracaoImpressao>(root + 'configuracao', { signal });
export const savePrintConfig = (data: {
  perguntarAoSalvarEntrada: boolean;
  imprimirCupomEntradaAutomatico: boolean;
  versao: string | null;
}) =>
  api<ConfiguracaoImpressao>(root + 'configuracao', { method: 'PUT', body: JSON.stringify(data) });
export const generateAgentToken = () =>
  api<{ token: string }>(root + 'token-agente', { method: 'POST' });
export const listPrinters = (signal?: AbortSignal) =>
  api<Impressora[]>(root + 'impressoras', { signal });
export const savePrinter = (data: ImpressoraInput, id?: number) =>
  api<Impressora>(root + 'impressoras' + (id ? '/' + id : ''), {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });
export const deactivatePrinter = (id: number) =>
  api<void>(root + 'impressoras/' + id, { method: 'DELETE' });
export const testPrinter = (id: number) =>
  api<{ trabalhos: number }>(root + 'impressoras/' + id + '/teste', { method: 'POST' });
export const listPrintJobs = (signal?: AbortSignal) =>
  api<TrabalhoImpressao[]>(root + 'trabalhos', { signal });
export const printEntryTicket = (estadiaId: number) =>
  api<{ trabalhos: number }>('/api/v1/estadias/' + estadiaId + '/ticket', { method: 'POST' });
