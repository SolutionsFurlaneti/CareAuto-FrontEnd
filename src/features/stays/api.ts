import { api } from '../../lib/apiClient';
import type { Estadia, EstadiaServico } from '../../lib/types';
export const getStay = (id: number, signal?: AbortSignal) =>
  api<Estadia>('/api/v1/estadias/' + id, { signal });
export const getStayServices = (id: number, signal?: AbortSignal) =>
  api<EstadiaServico[]>('/api/v1/estadias/' + id + '/servicos', { signal });
