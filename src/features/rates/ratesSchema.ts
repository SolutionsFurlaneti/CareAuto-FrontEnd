import { z } from 'zod';
import { id, amount } from '../shared/schema';
export const ratesSchema = z
  .object({
    tabelaId: id,
    diaSemana: z.coerce.number().int().min(1).max(7),
    multiplicador: amount
      .nullable()
      .refine((v) => v === null || (v > 0 && v <= 999.99), 'Informe um fator entre 0,01 e 999,99.'),
    valorFixoHora: amount.nullable(),
  })
  .refine((v) => v.multiplicador !== null || v.valorFixoHora !== null, {
    message: 'Informe um multiplicador ou valor fixo.',
    path: ['multiplicador'],
  });
export type RatesFormData = z.infer<typeof ratesSchema>;
