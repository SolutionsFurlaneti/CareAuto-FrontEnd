import { listRecords, saveRecord } from '../shared/api';
import type { Servico } from '../../lib/types';
import type { ServicesFormData } from './servicesSchema';
export const listServices = (page: number, signal?: AbortSignal) =>
  listRecords<Servico>('servicos', page, signal);
export const saveServices = (data: ServicesFormData, id?: number) =>
  saveRecord<Servico>('servicos', data, id);
