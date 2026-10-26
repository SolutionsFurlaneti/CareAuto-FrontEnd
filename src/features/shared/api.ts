import { api, toQuery } from '../../lib/apiClient';
import type { Page } from '../../lib/types';
export const listRecords = <T>(resource: string, page = 1, signal?: AbortSignal) =>
  api<Page<T>>('/api/v1/' + resource + toQuery({ pageNumber: page, pageSize: 20 }), { signal });
export async function allRecords<T>(resource: string, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  for (;;) {
    const data = await api<Page<T>>(
      '/api/v1/' + resource + toQuery({ pageNumber: page, pageSize: 100 }),
      { signal },
    );
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0) return items;
    page++;
  }
}
export const saveRecord = <T>(resource: string, data: unknown, id?: number) =>
  api<T>('/api/v1/' + resource + (id ? '/' + id : ''), {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });
export const deactivateRecord = (resource: string, id: number) =>
  api<void>('/api/v1/' + resource + '/' + id, { method: 'DELETE' });
export const command = <T>(resource: string, action: string, data?: unknown, method = 'POST') =>
  api<T>('/api/v1/' + resource + '/' + action, {
    method,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
