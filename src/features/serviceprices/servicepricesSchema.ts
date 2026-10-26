import { z } from 'zod';
import { id, amount } from '../shared/schema';
export const servicepricesSchema = z.object({
  servicoId: id,
  categoriaId: id,
  valor: amount,
  tempoEstimadoMinutos: z.number().int().positive().nullable(),
});
export type ServicePricesFormData = z.infer<typeof servicepricesSchema>;
