import { listRecords, saveRecord } from '../shared/api';
import type { Taxa } from '../../lib/types';
import type { RatesFormData } from './ratesSchema';
export const listRates = (page: number, signal?: AbortSignal) =>
  listRecords<Taxa>('taxas-dinamicas', page, signal);
export const saveRates = (data: RatesFormData, id?: number) =>
  saveRecord<Taxa>('taxas-dinamicas', data, id);
