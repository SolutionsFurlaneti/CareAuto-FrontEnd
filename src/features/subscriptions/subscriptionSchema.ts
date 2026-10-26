import { z } from 'zod';
import { id, amount } from '../shared/schema';
export const subscriptionSchema = z.object({
  clienteId: id,
  veiculoId: id,
  valor: amount.refine(
    (v) => v > 0 && v <= 21474836.47,
    'Informe um valor positivo dentro do limite.',
  ),
});
export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;
