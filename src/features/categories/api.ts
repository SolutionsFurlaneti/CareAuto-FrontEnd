import { listRecords, saveRecord } from '../shared/api';
import type { Categoria } from '../../lib/types';
import type { CategoriesFormData } from './categoriesSchema';
export const listCategories = (page: number, signal?: AbortSignal) =>
  listRecords<Categoria>('categorias-veiculo', page, signal);
export const saveCategories = (data: CategoriesFormData, id?: number) =>
  saveRecord<Categoria>('categorias-veiculo', data, id);
