import { z } from 'zod';

export const MESES = { MENSAL: 1, BIMESTRAL: 2, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12 } as const;
/** Mesmas regras do servidor: mensalidade mínima R$ 99 e desconto só para pré-pago de mais de um mês. */
export const planSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome.').max(100, 'Use até 100 caracteres.'),
    tipo: z.enum(['PRE_PAGO', 'POS_PAGO']),
    periodicidade: z.enum(['MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']),
    valorMensal: z
      .number({ invalid_type_error: 'Informe a mensalidade.' })
      .min(99, 'A mensalidade mínima é R$ 99,00.')
      .max(99999999.99),
    descontoPercentual: z
      .number({ invalid_type_error: 'Informe o desconto.' })
      .min(0, 'Desconto entre 0% e 50%.')
      .max(50, 'Desconto entre 0% e 50%.'),
    descricao: z.string().trim().max(300, 'Use até 300 caracteres.'),
    ativo: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.descontoPercentual > 0 && (v.tipo !== 'PRE_PAGO' || MESES[v.periodicidade] === 1))
      ctx.addIssue({
        code: 'custom',
        path: ['descontoPercentual'],
        message: 'Desconto só vale para pré-pago de mais de um mês (pacote pago à vista).',
      });
  });
export type PlanFormData = z.infer<typeof planSchema>;
export const valorPeriodo = (mensal: number, meses: number, desconto: number) =>
  Math.round(mensal * meses * (100 - desconto)) / 100;
