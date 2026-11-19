import {
  CalendarClock,
  CarFront,
  ClipboardCheck,
  CreditCard,
  Droplets,
  LayoutDashboard,
  LockKeyhole,
  Printer,
  ScanLine,
  Search,
  Smartphone,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface Funcionalidade {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  grupo?: 'operacao' | 'financeiro' | 'gestao';
}

export const gruposFuncionalidades = [
  { id: 'operacao', titulo: 'Da entrada à saída' },
  { id: 'financeiro', titulo: 'Preços, serviços e recebimentos' },
  { id: 'gestao', titulo: 'Gestão e acesso da equipe' },
] as const;

/** Só o que o produto entrega hoje: cada item corresponde a um módulo existente do CareAuto. */
export const destaques: Funcionalidade[] = [
  {
    icone: ScanLine,
    titulo: 'Leitura de placa por foto com IA',
    texto:
      'Tire a foto do veículo na entrada e o CareAuto lê a placa automaticamente. O operador confere e confirma em segundos, sem digitar.',
  },
  {
    icone: Printer,
    titulo: 'Ticket com QR Code na impressora térmica',
    texto:
      'Imprima placa, horário e QR Code assinado pelo sistema. Use o diálogo do navegador ou configure o agente na máquina ligada à impressora térmica.',
  },
  {
    icone: ClipboardCheck,
    titulo: 'Checklist veicular com mapa de avarias',
    texto:
      'Registre riscos, amassados e itens do veículo na entrada, marcando no desenho do carro. Consulte o relatório para conferir as condições registradas.',
  },
];

export const funcionalidades: Funcionalidade[] = [
  {
    icone: CarFront,
    titulo: 'Entrada e saída de veículos',
    grupo: 'operacao',
    texto:
      'Pátio em tempo real, com quem está dentro, desde quando e quanto deve. O valor sai calculado pela sua tabela de preços.',
  },
  {
    icone: Search,
    titulo: 'Consulta de placa',
    grupo: 'operacao',
    texto:
      'Busque os dados do veículo pela placa e agilize o cadastro, com histórico das consultas.',
  },
  {
    icone: Tags,
    titulo: 'Tabelas de preço e taxas dinâmicas',
    grupo: 'financeiro',
    texto:
      'Monte tabelas por categoria de veículo e ajuste o preço por dia da semana, com multiplicador ou valor fixo por hora.',
  },
  {
    icone: CalendarClock,
    titulo: 'Mensalistas e assinaturas',
    grupo: 'financeiro',
    texto: 'Controle os clientes mensalistas, os vínculos com os veículos e os encerramentos.',
  },
  {
    icone: Droplets,
    titulo: 'Serviços e lava-rápido',
    grupo: 'financeiro',
    texto:
      'Cadastre lavagem, polimento e outros serviços com preço por categoria e adicione-os à estadia do cliente.',
  },
  {
    icone: CreditCard,
    titulo: 'Cobrança por Pix, boleto e cartão',
    grupo: 'financeiro',
    texto:
      'Integração com o Asaas para emitir cobranças, acompanhar o pagamento e conciliar sem planilha.',
  },
  {
    icone: Users,
    titulo: 'Clientes e veículos',
    grupo: 'operacao',
    texto: 'Cadastro com CPF ou CNPJ, categorias de veículo e histórico de cada cliente.',
  },
  {
    icone: UserCog,
    titulo: 'Equipe com permissões',
    grupo: 'gestao',
    texto:
      'O dono administra os acessos dos funcionários. Administradores e operadores usam os módulos e ações permitidos para o seu perfil.',
  },
  {
    icone: LayoutDashboard,
    titulo: 'Painel do dia',
    grupo: 'gestao',
    texto:
      'Veículos no pátio, entradas, saídas, valores recebidos e a receber, e o movimento dos últimos sete dias.',
  },
  {
    icone: Smartphone,
    titulo: 'No celular, tablet ou computador',
    grupo: 'gestao',
    texto: 'Funciona no navegador, sem instalar nada para operar. Tem tema claro e escuro.',
  },
  {
    icone: LockKeyhole,
    titulo: 'Seus dados separados e protegidos',
    grupo: 'gestao',
    texto:
      'Cada estabelecimento tem seus dados isolados, com acesso por senha e as chaves das integrações guardadas com criptografia.',
  },
];

export const passos = [
  {
    titulo: 'Cadastre seu estabelecimento',
    texto: 'Informe os dados do negócio e crie o acesso do dono. Não pedimos cartão de crédito.',
  },
  {
    titulo: 'Configure preços e equipe',
    texto: 'Monte suas tabelas de preço, cadastre os serviços e convide os operadores.',
  },
  {
    titulo: 'Opere por 7 dias grátis',
    texto: 'Use todas as funcionalidades no dia a dia. A primeira cobrança só vem depois do teste.',
  },
];

export const perguntas = [
  {
    pergunta: 'Como funciona o teste grátis?',
    resposta:
      'Você usa o CareAuto completo por 7 dias, sem pagar nada. A primeira cobrança só acontece depois do período de teste, conforme o plano escolhido.',
  },
  {
    pergunta: 'Qual a diferença entre pós-pago e pré-pago?',
    resposta:
      'No pós-pago você paga ao fim de cada período (mensal, bimestral, trimestral, semestral ou anual) e recebe o boleto alguns dias antes do vencimento. No pré-pago você paga antes de usar e, em pacotes mais longos pagos à vista, ganha desconto.',
  },
  {
    pergunta: 'Os planos têm funcionalidades diferentes?',
    resposta:
      'Não. Todos os planos incluem todas as funcionalidades. O que muda é a forma de pagamento e o prazo.',
  },
  {
    pergunta: 'Preciso instalar algum programa?',
    resposta:
      'O CareAuto funciona no navegador do celular, tablet ou computador. No computador, imprima pelo diálogo do navegador ou configure o agente de impressão ligado à impressora térmica.',
  },
  {
    pergunta: 'Serve para lava-rápido?',
    resposta:
      'Sim. Você cadastra os serviços com preço por categoria de veículo e os lança na estadia, junto com o estacionamento.',
  },
  {
    pergunta: 'A leitura de placa por foto é confiável?',
    resposta:
      'A inteligência artificial lê a placa e o operador sempre confere antes de registrar. A foto não fica armazenada.',
  },
];
