import { listRecords } from '../shared/api';
import type { Pagamento } from '../../lib/types';
export const list = (page: number, signal?: AbortSignal) =>
  listRecords<Pagamento>('pagamentos', page, signal);
