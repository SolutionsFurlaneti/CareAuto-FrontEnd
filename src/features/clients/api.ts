import { listRecords, saveRecord } from '../shared/api';
import type { Cliente } from '../../lib/types';
import type { ClientsFormData } from './clientsSchema';
export const listClients = (page: number, signal?: AbortSignal) =>
  listRecords<Cliente>('clientes', page, signal);
export const saveClients = (data: ClientsFormData, id?: number) =>
  saveRecord<Cliente>('clientes', data, id);
