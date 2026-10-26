import { z } from 'zod';
import { requiredText, nullableText } from '../shared/schema';
export const clientsSchema = z
  .object({
    tipoPessoa: z.enum(['PF', 'PJ']),
    documento: requiredText(14),
    nomeOuRazaoSocial: requiredText(200),
    email: nullableText(254).refine(
      (v) => !v || z.string().email().safeParse(v).success,
      'Informe um e-mail válido.',
    ),
    celular: nullableText(15),
  })
  .superRefine((v, ctx) => {
    if (!new RegExp(v.tipoPessoa === 'PF' ? '^\\d{11}$' : '^\\d{14}$').test(v.documento))
      ctx.addIssue({
        code: 'custom',
        path: ['documento'],
        message: 'Informe o documento com 11 dígitos (CPF) ou 14 (CNPJ).',
      });
  });
export type ClientsFormData = z.infer<typeof clientsSchema>;
