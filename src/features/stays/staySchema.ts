import { z } from 'zod';
import { id, nullableText } from '../shared/schema';
export const staySchema = z.object({ veiculoId: id, tabelaId: id, observacao: nullableText(500) });
export type StayFormData = z.infer<typeof staySchema>;
export const stayServiceSchema = z.object({ servicoId: id });
