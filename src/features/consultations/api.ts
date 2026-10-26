import { listRecords } from '../shared/api';
import type { Consulta } from '../../lib/types';
export const list = (page: number, signal?: AbortSignal) =>
  listRecords<Consulta>('consultas-placa', page, signal);
