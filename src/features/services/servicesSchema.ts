import { z } from 'zod';
import { requiredText, nullableText } from '../shared/schema';
export const servicesSchema = z.object({
  nome: requiredText(100),
  modulo: z.enum(['LAVA_RAPIDO', 'FUNILARIA', 'PINTURA']),
  descricao: nullableText(300),
});
export type ServicesFormData = z.infer<typeof servicesSchema>;
