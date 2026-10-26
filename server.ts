import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

function paginate<T>(items: T[], pageNumber = 1, pageSize = 20) {
  const page = Math.max(1, Number(pageNumber) || 1);
  const size = Math.max(1, Number(pageSize) || 20);
  const start = (page - 1) * size;
  const paged = items.slice(start, start + size);
  return {
    items: paged,
    pageNumber: page,
    pageSize: size,
    total: items.length,
  };
}

// --------------------------------------------------------------------------
// In-Memory Database matching src/lib/types.ts exactly
// --------------------------------------------------------------------------

const db = {
  categorias: [
    { categoriaId: 1, nome: 'Carro Passeio', descricao: 'Sedans e hatchbacks compactos e médios', ativo: true },
    { categoriaId: 2, nome: 'SUV / Caminhonete', descricao: 'Veículos utilitários esportivos, picapes e crossovers', ativo: true },
    { categoriaId: 3, nome: 'Motocicleta', descricao: 'Motos de qualquer cilindrada e scooters', ativo: true },
    { categoriaId: 4, nome: 'Utilitário / Van', descricao: 'Vans de passageiros e furgões comerciais', ativo: true },
  ],
  tabelasPreco: [
    {
      tabelaId: 1,
      nome: 'Tabela Padrão Rotativo 2026',
      tipoCobranca: 'HORA',
      valorHora: 16.0,
      valorDiaria: 65.0,
      valorMensalidade: 350.0,
      toleranciaMinutos: 15,
      ativo: true,
    },
    {
      tabelaId: 2,
      nome: 'Tabela SUVs e Caminhonetes',
      tipoCobranca: 'HORA',
      valorHora: 22.0,
      valorDiaria: 85.0,
      valorMensalidade: 450.0,
      toleranciaMinutos: 15,
      ativo: true,
    },
    {
      tabelaId: 3,
      nome: 'Tabela Motocicletas',
      tipoCobranca: 'HORA',
      valorHora: 10.0,
      valorDiaria: 40.0,
      valorMensalidade: 220.0,
      toleranciaMinutos: 15,
      ativo: true,
    },
  ],
  taxasDinamicas: [
    {
      taxaId: 1,
      tabelaId: 1,
      diaSemana: 1, // Segunda
      multiplicador: 1.2,
      valorFixoHora: 19.2,
      ativo: true,
    },
    {
      taxaId: 2,
      tabelaId: 1,
      diaSemana: 5, // Sexta
      multiplicador: 1.3,
      valorFixoHora: 20.8,
      ativo: true,
    },
  ],
  servicos: [
    { servicoId: 1, modulo: 'LAVAGEM', nome: 'Lavagem Detalhada Completa', descricao: 'Lavagem Snow Foam, secagem por ar quente, aspiração profunda e verniz de motor', ativo: true },
    { servicoId: 2, modulo: 'LAVAGEM', nome: 'Lavagem Expressa Externa', descricao: 'Enxágue, shampoo neutro e secagem rápida', ativo: true },
    { servicoId: 3, modulo: 'ESTETICA', nome: 'Higienização e Oxi-sanitização', descricao: 'Eliminação de ácaros, fungos e odores com ozônio medicinal', ativo: true },
    { servicoId: 4, modulo: 'ESTETICA', nome: 'Cera Carnaúba Nobre', descricao: 'Proteção hidrofóbica e brilho profundo por até 60 dias', ativo: true },
    { servicoId: 5, modulo: 'POLIMENTO', nome: 'Cristalização de Parabrisas', descricao: 'Aplicação de repelente de água e desengordurante nos vidros', ativo: true },
  ],
  precosServicos: [
    { servicoValorId: 1, servicoId: 1, categoriaId: 1, valor: 75.0, tempoEstimadoMinutos: 50 },
    { servicoValorId: 2, servicoId: 1, categoriaId: 2, valor: 95.0, tempoEstimadoMinutos: 65 },
    { servicoValorId: 3, servicoId: 2, categoriaId: 1, valor: 45.0, tempoEstimadoMinutos: 25 },
    { servicoValorId: 4, servicoId: 2, categoriaId: 2, valor: 60.0, tempoEstimadoMinutos: 35 },
    { servicoValorId: 5, servicoId: 3, categoriaId: 1, valor: 80.0, tempoEstimadoMinutos: 30 },
  ],
  clientes: [
    { clienteId: 1, tipoPessoa: 'FISICA', documento: '284.912.748-12', nomeOuRazaoSocial: 'Eduardo Furlaneti', email: 'eduardo@furlaneti.com.br', celular: '(11) 99482-1029', ativo: true, criadoEm: '2026-01-10T10:00:00Z' },
    { clienteId: 2, tipoPessoa: 'FISICA', documento: '198.423.891-45', nomeOuRazaoSocial: 'Mariana Vasconcelos', email: 'mariana.vasc@gmail.com', celular: '(11) 98112-4490', ativo: true, criadoEm: '2026-02-15T14:30:00Z' },
    { clienteId: 3, tipoPessoa: 'JURIDICA', documento: '18.293.401/0001-92', nomeOuRazaoSocial: 'Transportes Aliança LTDA', email: 'financeiro@aliancalog.com.br', celular: '(11) 3450-8800', ativo: true, criadoEm: '2026-03-01T08:20:00Z' },
  ],
  veiculos: [
    { veiculoId: 1, clienteId: 1, categoriaId: 1, placa: 'BRA2E19', marca: 'Honda', modelo: 'Civic Touring 1.5 Turbo', cor: 'Preto Cristal', situacaoVeiculo: 'REGULAR', criadoEm: '2026-01-10T10:05:00Z' },
    { veiculoId: 2, clienteId: 2, categoriaId: 2, placa: 'RKO8F42', marca: 'Jeep', modelo: 'Compass Limited', cor: 'Cinza Granite', situacaoVeiculo: 'REGULAR', criadoEm: '2026-02-15T14:35:00Z' },
    { veiculoId: 3, clienteId: 1, categoriaId: 2, placa: 'FRL7A88', marca: 'Toyota', modelo: 'Hilux SRX 4x4', cor: 'Branco Pérola', situacaoVeiculo: 'REGULAR', criadoEm: '2026-03-05T09:15:00Z' },
    { veiculoId: 4, clienteId: null, categoriaId: 3, placa: 'MTO3K21', marca: 'Yamaha', modelo: 'MT-07 ABS', cor: 'Azul Racing', situacaoVeiculo: 'REGULAR', criadoEm: '2026-03-20T11:40:00Z' },
  ],
  estadias: [
    {
      estadiaId: 101,
      veiculoId: 1,
      tabelaId: 1,
      dataEntrada: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      dataSaida: null,
      valorEstacionamento: 24.0,
      valorServicos: 75.0,
      valorTotal: 99.0,
      status: 'EM_ANDAMENTO',
      observacao: 'Cliente solicitou Lavagem Detalhada Completa. Deixar chave no quadro da recepção.',
    },
    {
      estadiaId: 102,
      veiculoId: 2,
      tabelaId: 2,
      dataEntrada: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      dataSaida: null,
      valorEstacionamento: 22.0,
      valorServicos: 0,
      valorTotal: 22.0,
      status: 'EM_ANDAMENTO',
      observacao: 'Vaga coberta 14.',
    },
    {
      estadiaId: 100,
      veiculoId: 3,
      tabelaId: 2,
      dataEntrada: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      dataSaida: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      valorEstacionamento: 58.0,
      valorServicos: 95.0,
      valorTotal: 153.0,
      status: 'CONCLUIDO',
      observacao: 'Serviço concluído com excelência. Pagamento Pix confirmado.',
    },
    {
      estadiaId: 99,
      veiculoId: 4,
      tabelaId: 3,
      dataEntrada: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
      dataSaida: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      valorEstacionamento: 20.0,
      valorServicos: 0,
      valorTotal: 20.0,
      status: 'CONCLUIDO',
      observacao: 'Pagamento via Cartão de Débito.',
    },
  ],
  estadiaServicos: {
    101: [
      { estadiaServicoId: 1, estadiaId: 101, servicoId: 1, valorCobrado: 75.0, status: 'EM_EXECUCAO', adicionadoEm: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
    ],
    100: [
      { estadiaServicoId: 2, estadiaId: 100, servicoId: 1, valorCobrado: 95.0, status: 'FINALIZADO', adicionadoEm: new Date(Date.now() - 1000 * 60 * 230).toISOString() },
    ],
  } as Record<number, Record<string, unknown>[]>,
  checklists: {
    101: {
      atendente: 'Lucas Pista (Operador)',
      atualizadoEm: new Date(Date.now() - 1000 * 60 * 94).toISOString(),
      itens: [
        { item: 'Pintura & Lataria', status: 'ruim', observacao: 'Pequeno risco porta direita' },
        { item: 'Pneus & Rodas', status: 'bom', observacao: 'Rodas diamantadas sem ralados' },
        { item: 'Vidros & Retrovisores', status: 'bom', observacao: 'Película e espelhos íntegros' },
        { item: 'Faróis & Lanternas', status: 'bom', observacao: 'Leds funcionando perfeitamente' },
        { item: 'Interior & Bancos', status: 'bom', observacao: 'Couro preto higienizado' },
        { item: 'Estepe & Ferramentas', status: 'bom', observacao: 'Estepe no porta-malas' },
        { item: 'Combustível / Carga', status: 'bom', observacao: '3/4 tanque' },
        { item: 'Documento / Pertences', status: 'bom', observacao: 'Sem pertences de valor visíveis' },
      ],
      avarias: [
        { id: 'av-1', tipo: 'risco', gravidade: 'leve', vista: 'lateral_dir', x: 210, y: 75, descricao: 'Risco superficial verniz porta direita' },
      ],
      observacoesGerais: 'Cliente acompanhou vistoria no totem de entrada.',
    },
  } as Record<number, Record<string, unknown>>,
  pagamentos: [
    {
      pagamentoId: 1,
      estadiaId: 100,
      clienteId: 1,
      valorCentavos: 15300,
      meio: 'PIX',
      status: 'PAGO',
      asaasCobrancaId: 'pay_asaas_881920',
      integracaoStatus: 'RECEBIDO',
      asaasAmbiente: 'SANDBOX',
      asaasOrigem: 'INTEGRACAO',
      urlFatura: 'https://sandbox.asaas.com/f/881920',
      pixCopiaECola: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406153.005802BR5916AUTOCARE PAULIST6009SAO PAULO62070503***6304E2CA',
      vencimento: new Date().toISOString(),
      criadoEm: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      pagoEm: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
    },
    {
      pagamentoId: 2,
      estadiaId: 99,
      clienteId: 2,
      valorCentavos: 2000,
      meio: 'CARTAO_DEBITO',
      status: 'PAGO',
      asaasCobrancaId: null,
      integracaoStatus: 'LOCAL',
      asaasAmbiente: null,
      asaasOrigem: 'BALCAO',
      urlFatura: null,
      pixCopiaECola: null,
      vencimento: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      criadoEm: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      pagoEm: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
  ],
  assinaturas: [
    {
      assinaturaId: 1,
      clienteId: 1,
      veiculoId: 1,
      status: 'ATIVA',
      iniciadaEm: '2026-01-01T00:00:00Z',
      encerradaEm: null,
      valorCentavos: 38000,
    },
    {
      assinaturaId: 2,
      clienteId: 3,
      veiculoId: 3,
      status: 'ATIVA',
      iniciadaEm: '2026-02-01T00:00:00Z',
      encerradaEm: null,
      valorCentavos: 29000,
    },
  ],
  usuarios: [
    { usuarioId: 1, nome: 'Rodrigo Furlaneti (Gerente)', email: 'admin@autocare.com.br', perfil: 'Admin', ativo: true },
    { usuarioId: 2, nome: 'Lucas Pista (Operador)', email: 'operador@autocare.com.br', perfil: 'Operador', ativo: true },
    { usuarioId: 3, nome: 'Clara Financeiro', email: 'financeiro@autocare.com.br', perfil: 'Financeiro', ativo: true },
  ],
  printers: [
    { impressoraId: 1, nome: 'Térmica Entrada - Guarita Principal', tipo: 'REDE', endereco: '192.168.1.180', porta: 9100, padrao: true, status: 'ONLINE', modelo: 'Epson TM-T20X' },
    { impressoraId: 2, nome: 'Térmica Balcão Caixa / Checkout', tipo: 'USB', endereco: '/dev/usb/lp0', porta: 0, padrao: false, status: 'ONLINE', modelo: 'Bematech MP-4200 TH' },
  ],
  printJobs: [
    { trabalhoId: 101, impressora: 'Térmica Entrada - Guarita Principal', documento: 'Ticket Entrada - BRA2E19', status: 'IMPRESSO', criadoEm: new Date(Date.now() - 1000 * 60 * 95).toISOString() },
    { trabalhoId: 100, impressora: 'Térmica Balcão Caixa / Checkout', documento: 'Comprovante Pagamento - FRL7A88', status: 'IMPRESSO', criadoEm: new Date(Date.now() - 1000 * 60 * 28).toISOString() },
  ],
  printConfig: {
    impressaoEntradaDisponivel: true,
    acaoAposEntrada: 'PERGUNTAR',
    larguraColunas: 48,
    cortarPapel: true,
    viaEstabelecimento: false,
    cabecalho: "AUTOCARE MANAGER - ESTACIONAMENTO & ESTÉTICA\nAv. Paulista, 1000 - Bela Vista - SP\nCNPJ: 42.190.812/0001-90 | Tel: (11) 3284-9000",
    rodape: "Guarde este ticket. Cobrança de 1ª hora após 15 min de tolerância.\nNão nos responsabilizamos por objetos de valor deixados no interior do veículo.",
  },
  integrations: {
    origem: { asaas: 'PROPRIO', claude: 'COMPARTILHADO', consultaPlaca: 'COMPARTILHADO' },
    asaas: {
      ambiente: 'SANDBOX',
      possuiChaveApi: true,
      possuiTokenWebhook: true,
      ativo: true,
      atualizadoEm: '2026-10-14T10:00:00Z',
      atualizadoPor: 'admin@autocare.com.br',
      versao: 'v1',
    },
    claude: {
      modelo: 'claude-3-7-sonnet',
      maximoTokens: 4096,
      tempoEsgotadoSegundos: 30,
      possuiChaveApi: true,
      ativo: true,
      atualizadoEm: '2026-10-14T10:00:00Z',
      atualizadoPor: 'admin@autocare.com.br',
      versao: 'v1',
    },
    consultaPlaca: {
      urlTemplate: 'https://api.placas.exemplo/v1/{placa}',
      possuiToken: true,
      ativo: true,
      atualizadoEm: '2026-10-14T10:00:00Z',
      atualizadoPor: 'admin@autocare.com.br',
      versao: 'v1',
    },
    googleAds: {
      customerId: '941-209-4102',
      loginCustomerId: '810-192-3001',
      clientId: 'autocare-ads-client-id.apps.googleusercontent.com',
      versaoApi: 'v18',
      possuiDeveloperToken: true,
      possuiClientSecret: true,
      possuiRefreshToken: true,
      ativo: true,
      atualizadoEm: '2026-10-14T10:00:00Z',
      atualizadoPor: 'admin@autocare.com.br',
      versao: 'v1',
    },
  },
  backofficePlans: [
    { planoId: 1, nome: 'AutoCare Starter (Até 50 vagas)', tipo: 'POS_PAGO', periodicidade: 'MENSAL', meses: 1, duracaoDias: 30, valorMensal: 149.0, descontoPercentual: 0, valorPeriodo: 149.0, descricao: 'Ideal para pequenos estacionamentos, lava-rápidos e garagens rotativas.', ativo: true, assinaturas: 4, versao: 'v1' },
    { planoId: 2, nome: 'AutoCare Pro Business', tipo: 'POS_PAGO', periodicidade: 'MENSAL', meses: 1, duracaoDias: 30, valorMensal: 289.0, descontoPercentual: 0, valorPeriodo: 289.0, descricao: 'Gestão completa com checklist de avarias por foto, impressão térmica ESC/POS e emissão de cobranças Pix Asaas.', ativo: true, assinaturas: 9, versao: 'v1' },
    { planoId: 3, nome: 'AutoCare Pro Anual (2 meses grátis)', tipo: 'PRE_PAGO', periodicidade: 'ANUAL', meses: 12, duracaoDias: 365, valorMensal: 239.0, descontoPercentual: 16.6, valorPeriodo: 2868.0, descricao: 'Plano com desconto anual para redes de estacionamentos e centros de estética automotiva.', ativo: true, assinaturas: 5, versao: 'v1' },
  ],
  backofficeSubscribers: [
    { estabelecimentoId: 1, nome: 'AutoCare Paulista Prime', tipoPessoa: 'JURIDICA', documento: '42.190.812/0001-90', emailDono: 'rodrigofurlaneti31@gmail.com', criadoEm: '2026-01-05T10:00:00Z', situacao: 'ATIVA', assinaturaId: 10, plano: 'AutoCare Pro Business', tipoPlano: 'POS_PAGO', trialFim: null, periodoFim: '2026-11-05T10:00:00Z', valorPeriodo: 289.0 },
    { estabelecimentoId: 2, nome: 'Garagem Central Augusta', tipoPessoa: 'JURIDICA', documento: '19.482.019/0001-22', emailDono: 'contato@garagemaust.com.br', criadoEm: '2026-02-12T14:30:00Z', situacao: 'ATIVA', assinaturaId: 11, plano: 'AutoCare Starter', tipoPlano: 'POS_PAGO', trialFim: null, periodoFim: '2026-11-12T14:30:00Z', valorPeriodo: 149.0 },
    { estabelecimentoId: 3, nome: 'Lava Rápido e Estética Fino Trato', tipoPessoa: 'FISICA', documento: '391.029.481-00', emailDono: 'finotrato@gmail.com', criadoEm: '2026-10-01T09:00:00Z', situacao: 'TRIAL', assinaturaId: 12, plano: 'AutoCare Pro Business', tipoPlano: 'POS_PAGO', trialFim: '2026-10-21T09:00:00Z', periodoFim: '2026-10-21T09:00:00Z', valorPeriodo: 289.0 },
  ],
  backofficeCharges: [
    { cobrancaId: 501, assinaturaId: 10, estabelecimentoId: 1, estabelecimento: 'AutoCare Paulista Prime', periodoInicio: '2026-10-01', periodoFim: '2026-10-31', vencimento: '2026-10-10', valor: 289.0, origem: 'ROTINA', formaPagamento: 'PIX', status: 'PAGA', urlFatura: 'https://asaas.com/fatura/501', erro: null, criadoEm: '2026-10-01T06:00:00Z', pagoEm: '2026-10-05T11:22:00Z' },
    { cobrancaId: 502, assinaturaId: 11, estabelecimentoId: 2, estabelecimento: 'Garagem Central Augusta', periodoInicio: '2026-10-01', periodoFim: '2026-10-31', vencimento: '2026-10-20', valor: 149.0, origem: 'ROTINA', formaPagamento: 'BOLETO', status: 'EMITIDA', urlFatura: 'https://asaas.com/fatura/502', erro: null, criadoEm: '2026-10-01T06:00:00Z', pagoEm: null },
  ],
  backofficeCampaigns: [
    {
      campanhaId: 1,
      nome: 'Google Search - Gestão de Estacionamento SP',
      briefing: 'Campanha de busca focada em donos de estacionamento buscando software profissional.',
      urlFinal: 'https://www.furlaneti.com.br/autocare',
      orcamentoDiario: 50.0,
      contexto: 'Foco em cidades com alta densidade urbana e fluxo de veículos.',
      titulos: ['Software de Estacionamento', 'AutoCare Manager', 'Controle com Leitura de Placa', 'Emita Pix na Pista'],
      descricoes: ['Aumente seu faturamento e organize o pátio com o AutoCare Manager. Teste grátis!', 'Checklist por foto, integração Asaas e emissão rápida de tickets.'],
      palavrasChave: [
        { texto: 'sistema para estacionamento', correspondencia: 'PHRASE' },
        { texto: 'software gestao estacionamento', correspondencia: 'PHRASE' },
        { texto: 'programa para lava rapido', correspondencia: 'BROAD' },
      ],
      status: 'PUBLICADA',
      recursoGoogle: 'customers/9412094102/campaigns/18920192',
      erro: null,
      criadoEm: '2026-09-01T12:00:00Z',
      atualizadoEm: '2026-10-10T09:00:00Z',
      publicadaEm: '2026-09-02T10:00:00Z',
      versao: 'v1',
    },
  ],
};

// --------------------------------------------------------------------------
// Endpoints
// --------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'Healthy', time: new Date().toISOString() });
});

// Auth
app.get('/api/v1/auth/configuracao', (_req, res) => {
  res.json({ mode: 'Internal', registrationEnabled: true });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, login } = req.body || {};
  const userEmail = email || login || 'admin@autocare.com.br';
  res.json({
    accessToken: 'jwt_mock_token_autocare_operator_' + Date.now(),
    refreshToken: 'ref_mock_token_autocare_' + Date.now(),
    userId: 'usr-admin-1',
    estabelecimentoId: 1,
    estabelecimentoNome: 'AutoCare Paulista Prime',
    userName: userEmail.includes('@') ? userEmail.split('@')[0] : 'Rodrigo Furlaneti',
    email: userEmail,
    roles: ['Admin', 'Operador', 'Financeiro'],
    expiresAtUtc: '2030-01-01T00:00:00Z',
    mustChangePassword: false,
    authMode: 'password',
  });
});

app.post('/api/v1/auth/logout', (_req, res) => {
  res.status(204).end();
});

app.post('/api/v1/auth/primeiro-acesso', (req, res) => {
  const { nome, email, estabelecimentoNome } = req.body || {};
  const userEmail = email || 'admin@autocare.com.br';
  res.json({
    accessToken: 'jwt_mock_token_autocare_operator_' + Date.now(),
    refreshToken: 'ref_mock_token_autocare_' + Date.now(),
    userId: 'usr-admin-1',
    estabelecimentoId: 1,
    estabelecimentoNome: estabelecimentoNome || 'AutoCare Paulista Prime',
    userName: nome || (userEmail.includes('@') ? userEmail.split('@')[0] : 'Rodrigo Furlaneti'),
    email: userEmail,
    roles: ['Admin', 'Operador', 'Financeiro'],
    expiresAtUtc: '2030-01-01T00:00:00Z',
    mustChangePassword: false,
    authMode: 'password',
  });
});

app.post('/api/v1/auth/recuperar-senha', (_req, res) => {
  res.json({ message: 'E-mail com instruções enviado com sucesso.' });
});

app.post('/api/v1/auth/trocar-senha', (req, res) => {
  res.json({
    accessToken: 'jwt_mock_token_autocare_operator_' + Date.now(),
    refreshToken: 'ref_mock_token_autocare_' + Date.now(),
    userId: 'usr-admin-1',
    estabelecimentoId: 1,
    estabelecimentoNome: 'AutoCare Paulista Prime',
    userName: 'Rodrigo Furlaneti',
    email: 'admin@autocare.com.br',
    roles: ['Admin', 'Operador', 'Financeiro'],
    expiresAtUtc: '2030-01-01T00:00:00Z',
    mustChangePassword: false,
    authMode: 'password',
  });
});

// Backoffice Auth
app.post('/api/v1/backoffice/auth/login', (req, res) => {
  const { login } = req.body || {};
  res.json({
    login: login || 'admin@autocare.com.br',
    nome: 'Admin Master Furlaneti',
    accessToken: 'jwt_mock_backoffice_' + Date.now(),
    expiresAtUtc: '2030-01-01T00:00:00Z',
    mustChangePassword: false,
  });
});

app.post('/api/v1/backoffice/auth/trocar-senha', (_req, res) => {
  res.json({
    login: 'admin@autocare.com.br',
    nome: 'Admin Master Furlaneti',
    accessToken: 'jwt_mock_backoffice_' + Date.now(),
    expiresAtUtc: '2030-01-01T00:00:00Z',
    mustChangePassword: false,
  });
});

app.post('/api/v1/backoffice/auth/logout', (_req, res) => {
  res.status(204).end();
});

// Backoffice Overview
app.get('/api/v1/backoffice/resumo', (_req, res) => {
  res.json({
    estabelecimentos: 18,
    semAssinatura: 2,
    emTrial: 4,
    ativas: 12,
    inadimplentes: 0,
    canceladas: 1,
    receitaMensalRecorrente: 4280.0,
    cobrancasAbertas: 3,
    valorEmAberto: 587.0,
    rotina: {
      habilitada: true,
      hora: 6,
      ultimaData: new Date().toISOString().split('T')[0],
      executadaEm: new Date().toISOString(),
      origem: 'AGENDADA',
      ultimoResultado: {
        data: new Date().toISOString().split('T')[0],
        asaasConfigurado: true,
        sincronizadas: 12,
        emitidas: 3,
        falhas: 0,
        mensagens: ['Rotina executada com êxito.', '3 faturas emitidas via gateway Asaas.'],
      },
    },
  });
});

app.post('/api/v1/backoffice/rotina-cobranca/execucao', (_req, res) => {
  res.json({
    data: new Date().toISOString().split('T')[0],
    asaasConfigurado: true,
    sincronizadas: 12,
    emitidas: 3,
    falhas: 0,
    mensagens: ['Rotina disparada manualmente pelo operador.', 'Sincronização com Asaas concluída.'],
  });
});

app.get('/api/v1/backoffice/planos', (_req, res) => {
  res.json(db.backofficePlans);
});

app.post('/api/v1/backoffice/planos', (req, res) => {
  const newPlan = { planoId: db.backofficePlans.length + 1, ...req.body, assinaturas: 0, versao: 'v1' };
  db.backofficePlans.push(newPlan);
  res.status(201).json(newPlan);
});

app.put('/api/v1/backoffice/planos/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db.backofficePlans.findIndex(p => p.planoId === id);
  if (idx !== -1) {
    db.backofficePlans[idx] = { ...db.backofficePlans[idx], ...req.body };
    return res.json(db.backofficePlans[idx]);
  }
  res.status(404).json({ error: 'Plano não encontrado' });
});

app.get('/api/v1/backoffice/assinantes', (req, res) => {
  const page = Number(req.query.pagina) || 1;
  const size = Number(req.query.tamanho) || 20;
  res.json(paginate(db.backofficeSubscribers, page, size));
});

app.get('/api/v1/backoffice/assinantes/:id', (req, res) => {
  const id = Number(req.params.id);
  const sub = db.backofficeSubscribers.find(s => s.estabelecimentoId === id);
  if (!sub) return res.status(404).json({ error: 'Assinante não encontrado' });
  const cobrancas = db.backofficeCharges.filter(c => c.estabelecimentoId === id);
  res.json({
    assinante: sub,
    assinatura: {
      assinaturaId: sub.assinaturaId || 1,
      planoId: 2,
      plano: sub.plano || 'AutoCare Pro Business',
      tipoPlano: sub.tipoPlano || 'POS_PAGO',
      periodicidade: 'MENSAL',
      status: 'ATIVA',
      situacao: sub.situacao,
      trialFim: sub.trialFim,
      periodoInicio: '2026-10-01',
      periodoFim: sub.periodoFim || '2026-11-01',
      valorPeriodo: sub.valorPeriodo || 289.0,
      criadoEm: sub.criadoEm,
      canceladaEm: null,
      versao: 'v1',
    },
    podeUsarTrial: sub.situacao === 'SEM_ASSINATURA',
    cobrancas,
  });
});

app.get('/api/v1/backoffice/cobrancas', (req, res) => {
  const page = Number(req.query.pagina) || 1;
  const size = Number(req.query.tamanho) || 20;
  res.json(paginate(db.backofficeCharges, page, size));
});

app.get('/api/v1/backoffice/integracoes', (_req, res) => {
  res.json(db.integrations);
});

app.get('/api/v1/backoffice/campanhas', (_req, res) => {
  res.json(db.backofficeCampaigns);
});

app.get('/api/v1/backoffice/emails', (_req, res) => {
  res.json({
    habilitado: true,
    modelos: [
      { id: 'boas-vindas', nome: 'Boas-vindas ao AutoCare', assunto: 'Bem-vindo ao AutoCare Manager!', html: '<p>Seja bem-vindo!</p>' },
      { id: 'fatura-disponivel', nome: 'Fatura Mensal Disponível', assunto: 'Sua fatura AutoCare está disponível', html: '<p>Segue fatura...</p>' },
    ],
    destinatarios: db.backofficeSubscribers.map(s => ({
      estabelecimentoId: s.estabelecimentoId,
      nome: s.nome,
      email: s.emailDono,
      boasVindasStatus: 'ENVIADO',
      orientacaoAsaasStatus: 'ENVIADO',
    })),
  });
});

app.get('/api/v1/publico/planos', (_req, res) => {
  res.json(db.backofficePlans.filter(p => p.ativo));
});

// Estadias
app.get('/api/v1/estadias', (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const size = Number(req.query.pageSize) || 20;
  res.json(paginate(db.estadias, page, size));
});

app.get('/api/v1/estadias/:id', (req, res) => {
  const id = Number(req.params.id);
  const stay = db.estadias.find(s => s.estadiaId === id);
  if (!stay) return res.status(404).json({ error: 'Estadia não encontrada' });
  res.json(stay);
});

app.post('/api/v1/estadias', (req, res) => {
  const { veiculoId, tabelaId, observacao, placa, modelo, cor, categoriaId, clienteId } = req.body || {};

  let targetVehicleId = Number(veiculoId);
  if (!targetVehicleId && placa) {
    const cleanPlate = String(placa).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let existing = db.veiculos.find(v => v.placa === cleanPlate);
    if (!existing) {
      existing = {
        veiculoId: db.veiculos.length + 1,
        clienteId: clienteId ? Number(clienteId) : null,
        categoriaId: Number(categoriaId) || 1,
        placa: cleanPlate,
        marca: (modelo || 'Genérico').split(' ')[0],
        modelo: modelo || 'Veículo Cadastrado',
        cor: cor || 'Não informada',
        situacaoVeiculo: 'REGULAR',
        criadoEm: new Date().toISOString(),
      };
      db.veiculos.push(existing);
    }
    targetVehicleId = existing.veiculoId;
  }

  const newStay = {
    estadiaId: Date.now() % 100000,
    veiculoId: targetVehicleId || 1,
    tabelaId: Number(tabelaId) || 1,
    dataEntrada: new Date().toISOString(),
    dataSaida: null,
    valorEstacionamento: 16.0,
    valorServicos: 0,
    valorTotal: 16.0,
    status: 'EM_ANDAMENTO',
    observacao: observacao || '',
  };

  db.estadias.unshift(newStay);
  db.estadiaServicos[newStay.estadiaId] = [];

  res.status(201).json(newStay);
});

// Stay commands
app.post('/api/v1/estadias/:id/saida', (req, res) => {
  const id = Number(req.params.id);
  const stay = db.estadias.find(s => s.estadiaId === id);
  if (!stay) return res.status(404).json({ error: 'Estadia não encontrada' });

  stay.dataSaida = new Date().toISOString();
  stay.status = 'CONCLUIDO';
  const servicesTotal = (db.estadiaServicos[id] || []).reduce((acc, s) => acc + s.valorCobrado, 0);
  stay.valorServicos = servicesTotal;
  stay.valorTotal = (stay.valorEstacionamento || 16.0) + servicesTotal;

  // Record payment in payments list
  db.pagamentos.unshift({
    pagamentoId: db.pagamentos.length + 1,
    estadiaId: id,
    clienteId: db.veiculos.find(v => v.veiculoId === stay.veiculoId)?.clienteId || null,
    valorCentavos: Math.round(stay.valorTotal * 100),
    meio: 'PIX',
    status: 'PAGO',
    asaasCobrancaId: 'pay_' + Date.now(),
    integracaoStatus: 'CONCLUIDO',
    asaasAmbiente: 'SANDBOX',
    asaasOrigem: 'SAIDA',
    urlFatura: null,
    pixCopiaECola: null,
    vencimento: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
    pagoEm: new Date().toISOString(),
  });

  res.json(stay);
});

app.post('/api/v1/estadias/:id/cancelamento', (req, res) => {
  const id = Number(req.params.id);
  const stay = db.estadias.find(s => s.estadiaId === id);
  if (!stay) return res.status(404).json({ error: 'Estadia não encontrada' });
  stay.status = 'CANCELADO';
  stay.dataSaida = new Date().toISOString();
  res.json(stay);
});

app.post('/api/v1/estadias/:id/ticket', (req, res) => {
  const id = Number(req.params.id);
  const stay = db.estadias.find(s => s.estadiaId === id);
  const v = db.veiculos.find(x => x.veiculoId === stay?.veiculoId);
  db.printJobs.unshift({
    trabalhoId: Date.now() % 100000,
    impressora: db.printers[0]?.nome || 'Térmica Padrão',
    documento: `Ticket Entrada - ${v ? v.placa : '#' + id}`,
    status: 'IMPRESSO',
    criadoEm: new Date().toISOString(),
  });
  res.json({ trabalhos: 1 });
});

app.get('/api/v1/estadias/:id/servicos', (req, res) => {
  const id = Number(req.params.id);
  res.json(db.estadiaServicos[id] || []);
});

app.post('/api/v1/estadias/:id/servicos', (req, res) => {
  const id = Number(req.params.id);
  const { servicoId, valor } = req.body;
  const srv = db.servicos.find(s => s.servicoId === Number(servicoId));
  if (!srv) return res.status(404).json({ error: 'Serviço não encontrado' });

  if (!db.estadiaServicos[id]) db.estadiaServicos[id] = [];
  const srvPrice = db.precosServicos.find(p => p.servicoId === srv.servicoId)?.valor || 50.0;
  const item = {
    estadiaServicoId: Date.now() % 10000,
    estadiaId: id,
    servicoId: srv.servicoId,
    valorCobrado: Number(valor) || srvPrice,
    status: 'PENDENTE',
    adicionadoEm: new Date().toISOString(),
  };
  db.estadiaServicos[id].push(item);

  const stay = db.estadias.find(s => s.estadiaId === id);
  if (stay) {
    stay.valorServicos = (stay.valorServicos || 0) + item.valorCobrado;
    stay.valorTotal = (stay.valorEstacionamento || 16.0) + stay.valorServicos;
  }

  res.status(201).json(item);
});

app.patch('/api/v1/estadias/:id/servicos/:servicoId/status', (req, res) => {
  const id = Number(req.params.id);
  const sid = Number(req.params.servicoId);
  const list = db.estadiaServicos[id] || [];
  const item = list.find(s => s.estadiaServicoId === sid);
  if (item) {
    item.status = req.body.status || 'FINALIZADO';
    return res.json(item);
  }
  res.status(404).json({ error: 'Serviço não encontrado' });
});

// Checklist
app.get('/api/v1/estadias/:id/checklist', (req, res) => {
  const id = Number(req.params.id);
  const checkList = db.checklists[id] || null;
  res.json({
    estadiaId: id,
    checkList,
    editavel: true,
  });
});

app.put('/api/v1/estadias/:id/checklist', (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  db.checklists[id] = {
    atendente: 'Lucas Pista (Operador)',
    atualizadoEm: new Date().toISOString(),
    itens: body.itens || [],
    avarias: body.avarias || [],
    observacoesGerais: body.observacoesGerais || '',
  };
  res.json({
    estadiaId: id,
    checkList: db.checklists[id],
    editavel: true,
  });
});

// Generic resource router for clients, vehicles, categories, price tables, etc.
function createCrudRoutes(resourceName: string, getArray: () => Record<string, unknown>[], idField: string) {
  app.get(`/api/v1/${resourceName}`, (req, res) => {
    const page = Number(req.query.pageNumber) || 1;
    const size = Number(req.query.pageSize) || 20;
    res.json(paginate(getArray(), page, size));
  });

  app.get(`/api/v1/${resourceName}/:id`, (req, res) => {
    const id = Number(req.params.id);
    const item = getArray().find(x => x[idField] === id);
    if (!item) return res.status(404).json({ error: `${resourceName} não encontrado` });
    res.json(item);
  });

  app.post(`/api/v1/${resourceName}`, (req, res) => {
    const items = getArray();
    const newId = items.length ? Math.max(...items.map(x => x[idField] || 0)) + 1 : 1;
    const newItem = { [idField]: newId, ...req.body, ativo: true, criadoEm: new Date().toISOString() };
    items.unshift(newItem);
    res.status(201).json(newItem);
  });

  app.put(`/api/v1/${resourceName}/:id`, (req, res) => {
    const id = Number(req.params.id);
    const items = getArray();
    const idx = items.findIndex(x => x[idField] === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...req.body };
      return res.json(items[idx]);
    }
    res.status(404).json({ error: `${resourceName} não encontrado` });
  });

  app.delete(`/api/v1/${resourceName}/:id`, (req, res) => {
    const id = Number(req.params.id);
    const items = getArray();
    const idx = items.findIndex(x => x[idField] === id);
    if (idx !== -1) {
      items[idx].ativo = false;
      return res.status(204).end();
    }
    res.status(404).json({ error: `${resourceName} não encontrado` });
  });
}

createCrudRoutes('clientes', () => db.clientes, 'clienteId');
createCrudRoutes('veiculos', () => db.veiculos, 'veiculoId');
createCrudRoutes('categorias', () => db.categorias, 'categoriaId');
createCrudRoutes('tabelas-preco', () => db.tabelasPreco, 'tabelaId');
createCrudRoutes('taxas-dinamicas', () => db.taxasDinamicas, 'taxaId');
createCrudRoutes('servicos', () => db.servicos, 'servicoId');
createCrudRoutes('precos-servicos', () => db.precosServicos, 'servicoValorId');
createCrudRoutes('servico-valores', () => db.precosServicos, 'servicoValorId');
createCrudRoutes('pagamentos', () => db.pagamentos, 'pagamentoId');
createCrudRoutes('assinaturas', () => db.assinaturas, 'assinaturaId');
createCrudRoutes('usuarios', () => db.usuarios, 'usuarioId');

// Plate Lookup / Camera OCR
app.post('/api/v1/leitura-placa', (_req, res) => {
  // Simulate OCR reading from camera or uploaded file
  const samplePlates = ['BRA2E19', 'RKO8F42', 'FRL7A88', 'MTO3K21', 'ABC1D23'];
  const picked = samplePlates[Math.floor(Math.random() * samplePlates.length)];
  res.json({
    sucesso: true,
    placa: picked,
    revisaoNecessaria: false,
    mensagem: `Placa ${picked} identificada com sucesso via inteligência artificial.`,
  });
});

app.post('/api/v1/consultas-placa', (req, res) => {
  const { placa, imagemBase64 } = req.body || {};
  const plateToLookup = placa || (imagemBase64 ? 'BRA2E19' : 'ABC1D23');
  const upper = String(plateToLookup).toUpperCase().replace(/[^A-Z0-9]/g, '');

  const known = db.veiculos.find(v => v.placa === upper);
  if (known) {
    return res.json({
      placa: known.placa,
      modelo: known.modelo,
      marca: known.marca,
      cor: known.cor,
      ano: '2023',
      anoModelo: '2024',
      municipio: 'São Paulo',
      uf: 'SP',
      categoriaSugeridaId: known.categoriaId,
      sucesso: true,
    });
  }

  res.json({
    placa: upper,
    modelo: 'VOLKSWAGEN T-CROSS HIGHLINE',
    marca: 'VOLKSWAGEN',
    cor: 'BRANCO',
    ano: '2023',
    anoModelo: '2024',
    municipio: 'São Paulo',
    uf: 'SP',
    categoriaSugeridaId: 2,
    sucesso: true,
  });
});

// Printing routes
app.get('/api/v1/impressao/configuracao', (_req, res) => res.json(db.printConfig));
app.put('/api/v1/impressao/configuracao', (req, res) => {
  db.printConfig = { ...db.printConfig, ...req.body };
  res.json(db.printConfig);
});
app.post('/api/v1/impressao/token-agente', (_req, res) => {
  res.json({ token: 'autocare_agent_token_' + Math.random().toString(36).substring(2) });
});
app.get('/api/v1/impressao/impressoras', (_req, res) => res.json(db.printers));
app.post('/api/v1/impressao/impressoras', (req, res) => {
  const p = { impressoraId: db.printers.length + 1, status: 'ONLINE', ...req.body };
  db.printers.push(p);
  res.status(201).json(p);
});
app.delete('/api/v1/impressao/impressoras/:id', (req, res) => {
  const id = Number(req.params.id);
  db.printers = db.printers.filter(p => p.impressoraId !== id);
  res.status(204).end();
});
app.post('/api/v1/impressao/impressoras/:id/teste', (req, res) => {
  db.printJobs.unshift({
    trabalhoId: Date.now() % 100000,
    impressora: db.printers.find(p => p.impressoraId === Number(req.params.id))?.nome || 'Impressora Teste',
    documento: 'Página de Teste de Alinhamento Térmico',
    status: 'IMPRESSO',
    criadoEm: new Date().toISOString(),
  });
  res.json({ trabalhos: 1 });
});
app.get('/api/v1/impressao/trabalhos', (_req, res) => res.json(db.printJobs));

// Integrations routes
app.get('/api/v1/integracoes/origem', (_req, res) => res.json(db.integrations.origem));
app.get('/api/v1/integracoes/:provider', (req, res) => {
  const p = req.params.provider;
  if (p === 'asaas') return res.json(db.integrations.asaas);
  if (p === 'claude') return res.json(db.integrations.claude);
  if (p === 'consulta-placa') return res.json(db.integrations.consultaPlaca);
  if (p === 'google-ads') return res.json(db.integrations.googleAds);
  res.status(404).json({ error: 'Integração não encontrada' });
});
app.put('/api/v1/integracoes/:provider', (req, res) => {
  const p = req.params.provider;
  if (p === 'asaas') {
    db.integrations.asaas = { ...db.integrations.asaas, ...req.body, atualizadoEm: new Date().toISOString() };
    return res.json(db.integrations.asaas);
  }
  if (p === 'claude') {
    db.integrations.claude = { ...db.integrations.claude, ...req.body, atualizadoEm: new Date().toISOString() };
    return res.json(db.integrations.claude);
  }
  if (p === 'consulta-placa') {
    db.integrations.consultaPlaca = { ...db.integrations.consultaPlaca, ...req.body, atualizadoEm: new Date().toISOString() };
    return res.json(db.integrations.consultaPlaca);
  }
  res.status(404).json({ error: 'Provedor desconhecido' });
});
app.post('/api/v1/integracoes/:provider/teste', (_req, res) => {
  res.status(200).json({ success: true, message: 'Conexão testada com sucesso.' });
});

// --------------------------------------------------------------------------
// Vite Frontend Middleware / Static Serving
// --------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`AutoCare Manager listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
