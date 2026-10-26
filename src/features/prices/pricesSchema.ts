import { z } from 'zod';
import { requiredText, amount } from '../shared/schema';
export const pricesSchema = z
  .object({
    nome: requiredText(100),
    tipoCobranca: z.enum(['AVULSO', 'MENSAL']),
    valorHora: amount.nullable(),
    valorDiaria: amount.nullable(),
    valorMensalidade: amount.nullable(),
    toleranciaMinutos: z.number().int().min(0).max(1440),
  })
  .superRefine((v, ctx) => {
    const field = v.tipoCobranca === 'AVULSO' ? 'valorHora' : 'valorMensalidade';
    if (v[field] === null)
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: 'Informe o valor para este tipo de cobrança.',
      });
  });
export type PricesFormData = z.infer<typeof pricesSchema>;
