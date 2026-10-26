import { listRecords } from '../shared/api';
import type { Assinatura } from '../../lib/types';
export const list = (page: number, signal?: AbortSignal) =>
  listRecords<Assinatura>('assinaturas', page, signal);
