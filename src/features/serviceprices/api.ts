import { listRecords, saveRecord } from '../shared/api';
import type { PrecoServico } from '../../lib/types';
import type { ServicePricesFormData } from './servicepricesSchema';
export const listServicePrices = (page: number, signal?: AbortSignal) =>
  listRecords<PrecoServico>('precos-servicos', page, signal);
export const saveServicePrices = (data: ServicePricesFormData, id?: number) =>
  saveRecord<PrecoServico>('precos-servicos', data, id);
