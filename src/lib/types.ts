export interface Entity {
  [key: string]: string | number | boolean | null;
}
export interface Page<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  total: number;
}
export interface Cliente extends Entity {
  clienteId: number;
  tipoPessoa: string;
  documento: string;
  nomeOuRazaoSocial: string;
  email: string | null;
  celular: string | null;
  ativo: boolean;
  criadoEm: string;
}
export interface Categoria extends Entity {
  categoriaId: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}
export interface Veiculo extends Entity {
  veiculoId: number;
  clienteId: number | null;
  categoriaId: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  situacaoVeiculo: string | null;
  criadoEm: string;
}
export interface Tabela extends Entity {
  tabelaId: number;
  nome: string;
  tipoCobranca: string;
  valorHora: number | null;
  valorDiaria: number | null;
  valorMensalidade: number | null;
  toleranciaMinutos: number;
  ativo: boolean;
}
export interface Taxa extends Entity {
  taxaId: number;
  tabelaId: number;
  diaSemana: number;
  multiplicador: number | null;
  valorFixoHora: number | null;
  ativo: boolean;
}
export interface Servico extends Entity {
  servicoId: number;
  modulo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}
export interface PrecoServico extends Entity {
  servicoValorId: number;
  servicoId: number;
  categoriaId: number;
  valor: number;
  tempoEstimadoMinutos: number | null;
}
export interface Estadia extends Entity {
  estadiaId: number;
  veiculoId: number;
  tabelaId: number;
  dataEntrada: string;
  dataSaida: string | null;
  valorEstacionamento: number | null;
  valorServicos: number | null;
  valorTotal: number | null;
  status: string;
  observacao: string | null;
}
export interface EstadiaServico extends Entity {
  estadiaServicoId: number;
  estadiaId: number;
  servicoId: number;
  valorCobrado: number;
  status: string;
  adicionadoEm: string;
}
export interface Pagamento extends Entity {
  pagamentoId: number;
  estadiaId: number | null;
  clienteId: number | null;
  valorCentavos: number;
  meio: string;
  status: string;
  asaasCobrancaId: string | null;
  integracaoStatus: string | null;
  asaasAmbiente: string | null;
  asaasOrigem: string | null;
  urlFatura: string | null;
  pixCopiaECola: string | null;
  vencimento: string;
  criadoEm: string;
  pagoEm: string | null;
}
export interface Assinatura extends Entity {
  assinaturaId: number;
  clienteId: number;
  veiculoId: number;
  status: string;
  iniciadaEm: string;
  encerradaEm: string | null;
  valorCentavos: number | null;
}
export interface Consulta extends Entity {
  consultaId: number;
  veiculoId: number | null;
  placa: string;
  sucesso: boolean;
  consultadoEm: string;
}
