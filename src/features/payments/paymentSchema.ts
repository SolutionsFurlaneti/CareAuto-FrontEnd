import { z } from 'zod';
import { id, amount } from '../shared/schema';
export const paymentSchema = z
  .object({
    estadiaId: id.nullable(),
    clienteId: id.nullable(),
    valor: amount.refine(
      (v) => v > 0 && v <= 21474836.47,
      'Informe um valor entre R$ 0,01 e R$ 21.474.836,47.',
    ),
    meio: z.enum(['PIX', 'CARTAO', 'DINHEIRO', 'BOLETO']),
    vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento.'),
  })
  .refine((v) => v.estadiaId !== null || v.clienteId !== null, {
    message: 'Informe uma estadia ou um cliente.',
    path: ['clienteId'],
  });
export type PaymentFormData = z.infer<typeof paymentSchema>;
