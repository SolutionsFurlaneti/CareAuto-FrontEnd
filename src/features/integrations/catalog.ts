import {
  Activity,
  Bot,
  CreditCard,
  KeyRound,
  ScanSearch,
  Settings2,
  Webhook,
  type LucideIcon,
} from 'lucide-react';

export type IntegrationSlug = 'claude' | 'consulta-placa' | 'asaas';
export type IntegrationTab = 'credenciais' | 'configuracoes' | 'webhooks' | 'status';

export interface BaseConfiguration {
  ativo: boolean;
  origem?: 'PROPRIA' | 'PLATAFORMA' | 'DESATIVADA';
  disponivel?: boolean;
  ambienteEfetivo?: string | null;
  atualizadoEm: string | null;
  versao: string | null;
}

export interface IntegrationDefinition {
  slug: IntegrationSlug;
  title: string;
  /** Texto curto do card no hub. */
  summary: string;
  /** Texto de abertura da tela de detalhes. */
  description: string;
  icon: LucideIcon;
  tabs: IntegrationTab[];
}

export const tabMeta: Record<IntegrationTab, { label: string; icon: LucideIcon }> = {
  credenciais: { label: 'Credenciais', icon: KeyRound },
  configuracoes: { label: 'Configurações', icon: Settings2 },
  webhooks: { label: 'Webhooks', icon: Webhook },
  status: { label: 'Status', icon: Activity },
};

export const integrations: IntegrationDefinition[] = [
  {
    slug: 'claude',
    title: 'Claude',
    summary: 'Leitura automática da placa nas fotos com inteligência artificial.',
    description: 'Leitura automática da placa nas fotos. O uso é cobrado pela Anthropic.',
    icon: Bot,
    tabs: ['credenciais', 'configuracoes', 'status'],
  },
  {
    slug: 'consulta-placa',
    title: 'Consulta de placas',
    summary: 'Marca, modelo, cor e situação do veículo a partir da placa.',
    description:
      'Preenchimento de marca, modelo, cor e situação. Requer consultas disponíveis no provedor.',
    icon: ScanSearch,
    tabs: ['credenciais', 'configuracoes', 'status'],
  },
  {
    slug: 'asaas',
    title: 'Asaas',
    summary: 'Cobranças por Pix, boleto e cartão, com conciliação por webhook.',
    description:
      'Emita Pix, boleto ou uma fatura para pagamento com cartão. Comece pelo Sandbox para testar sem movimentar dinheiro.',
    icon: CreditCard,
    tabs: ['credenciais', 'webhooks', 'status'],
  },
];

export const findIntegration = (slug: string | undefined) =>
  integrations.find((i) => i.slug === slug);

/** Aba pedida na URL, ou a primeira aba da integração quando ausente/inválida. */
export const resolveTab = (def: IntegrationDefinition, requested: string | null): IntegrationTab =>
  def.tabs.find((t) => t === requested) ?? def.tabs[0];
