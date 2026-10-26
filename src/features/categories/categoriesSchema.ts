import { z } from 'zod';
import { requiredText, nullableText } from '../shared/schema';
export const categoriesSchema = z.object({ nome: requiredText(50), descricao: nullableText(200) });
export type CategoriesFormData = z.infer<typeof categoriesSchema>;
