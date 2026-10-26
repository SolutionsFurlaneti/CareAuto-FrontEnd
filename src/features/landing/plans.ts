import { api } from '../../lib/apiClient';

export type TipoPlanoPublico = 'PRE_PAGO' | 'POS_PAGO';
export interface PlanoPublico {
  planoId: number;
  nome: string;
  tipo: TipoPlanoPublico;
  periodicidade: 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  meses: number;
  valorMensal: number;
  descontoPercentual: number;
  valorPeriodo: number;
  descricao: string | null;
}

/** Planos ativos cadastrados no backoffice (endpoint público, sem sessão). */
export const listarPlanosPublicos = (signal?: AbortSignal) =>
  api<PlanoPublico[]>('/api/v1/publico/planos', { signal });

/** Mensalidade mínima da plataforma (regra do backoffice), usada quando não há planos publicados. */
export const MENSALIDADE_MINIMA = 99;

const periodo: Record<PlanoPublico['periodicidade'], string> = {
  MENSAL: 'por mês',
  BIMESTRAL: 'a cada 2 meses',
  TRIMESTRAL: 'a cada 3 meses',
  SEMESTRAL: 'a cada 6 meses',
  ANUAL: 'por ano',
};

export interface OfertaPlano {
  /** Valor equivalente por mês, já com desconto. */
  mensal: number;
  /** Linha de cobrança: quanto e quando é pago. */
  cobranca: string;
  /** Selo de economia em relação à mensalidade cheia, quando houver desconto. */
  economia: string | null;
}

const reais = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function oferta(p: PlanoPublico): OfertaPlano {
  const mensal = Math.round((p.valorPeriodo / Math.max(p.meses, 1)) * 100) / 100;
  const cobranca =
    p.tipo === 'PRE_PAGO'
      ? p.meses > 1
        ? `${reais(p.valorPeriodo)} à vista por ${p.meses} meses`
        : `${reais(p.valorPeriodo)} pagos antecipadamente por 30 dias`
      : p.meses > 1
        ? `${reais(p.valorPeriodo)} ${periodo[p.periodicidade]}, por boleto`
        : 'Cobrança mensal por boleto';
  const economizado = p.valorMensal * p.meses - p.valorPeriodo;
  const economia =
    p.descontoPercentual > 0 && economizado > 0
      ? `${p.descontoPercentual.toLocaleString('pt-BR')}% off · economize ${reais(economizado)}`
      : null;
  return { mensal, cobranca, economia };
}

/** Separa por modalidade mantendo a ordem do servidor (prazo crescente). */
export function agrupar(planos: PlanoPublico[]) {
  return {
    posPago: planos.filter((p) => p.tipo === 'POS_PAGO'),
    prePago: planos.filter((p) => p.tipo === 'PRE_PAGO'),
  };
}

/** Plano em destaque: o de maior desconto; sem desconto, o de menor mensalidade equivalente. */
export function destaque(planos: PlanoPublico[]): number | null {
  if (planos.length < 2) return null;
  const ordenados = [...planos].sort(
    (a, b) => b.descontoPercentual - a.descontoPercentual || oferta(a).mensal - oferta(b).mensal,
  );
  return ordenados[0].planoId;
}
