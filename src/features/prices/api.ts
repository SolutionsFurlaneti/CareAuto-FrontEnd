import { listRecords, saveRecord } from '../shared/api';
import type { Tabela } from '../../lib/types';
import type { PricesFormData } from './pricesSchema';
export const listPrices = (page: number, signal?: AbortSignal) =>
  listRecords<Tabela>('tabelas-preco', page, signal);
export const savePrices = (data: PricesFormData, id?: number) =>
  saveRecord<Tabela>('tabelas-preco', data, id);
