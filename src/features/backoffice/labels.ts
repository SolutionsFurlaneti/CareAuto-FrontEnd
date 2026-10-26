import type { FormaPagamento, Periodicidade, Situacao, StatusCobranca, TipoPlano } from './api';

export const situacaoLabel: Record<Situacao, string> = {
  SEM_ASSINATURA: 'Sem assinatura',
  TRIAL: 'Período grátis',
  ATIVA: 'Em dia',
  INADIMPLENTE: 'Inadimplente',
  CANCELADA: 'Cancelada',
};
export const cobrancaLabel: Record<StatusCobranca, string> = {
  PENDENTE_EMISSAO: 'A emitir',
  EMITINDO: 'Emitindo',
  EMITIDA: 'Aguardando pagamento',
  PAGA: 'Paga',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada',
};
export const tipoLabel: Record<TipoPlano, string> = { PRE_PAGO: 'Pré-pago', POS_PAGO: 'Pós-pago' };
export const periodicidadeLabel: Record<Periodicidade, string> = {
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};
export const formaLabel: Record<FormaPagamento, string> = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  UNDEFINED: 'Cliente escolhe',
};
export const documento = (tipo: string, valor: string) =>
  tipo === 'PJ' && valor.length === 14
    ? valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : valor.length === 11
      ? valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
      : valor;
