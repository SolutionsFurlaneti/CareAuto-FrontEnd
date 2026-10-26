import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import { describeError } from '../../lib/describeError';
import { listRecords, allRecords, saveRecord, deactivateRecord, command } from './api';
export const resourceKeys = {
  all: (resource: string, userId: string | null) => [resource, userId] as const,
  list: (resource: string, userId: string | null, page: number) =>
    [resource, userId, 'list', page] as const,
};
export function useRecords<T>(resource: string, page: number) {
  const userId = useAuthStore((s) => sessionScope(s.session));
  return useQuery({
    queryKey: resourceKeys.list(resource, userId, page),
    queryFn: ({ signal }) => listRecords<T>(resource, page, signal),
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}
export function useAllRecords<T>(resource: string, enabled = true) {
  const userId = useAuthStore((s) => sessionScope(s.session));
  return useQuery({
    queryKey: [...resourceKeys.all(resource, userId), 'all'],
    queryFn: ({ signal }) => allRecords<T>(resource, signal),
    enabled: !!userId && enabled,
    staleTime: 60000,
  });
}
export function useSaveRecord<T>(resource: string) {
  const cache = useQueryClient();
  const userId = useAuthStore((s) => sessionScope(s.session));
  return useMutation({
    mutationFn: ({ data, id }: { data: unknown; id?: number }) => saveRecord<T>(resource, data, id),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: resourceKeys.all(resource, userId) });
      void cache.invalidateQueries({ queryKey: ['overview', userId] });
      toast.success('Registro salvo com sucesso.');
    },
    onError: (error) => toast.error(describeError(error)),
  });
}
export function useDeactivate(resource: string) {
  const cache = useQueryClient();
  const userId = useAuthStore((s) => sessionScope(s.session));
  return useMutation({
    mutationFn: (id: number) => deactivateRecord(resource, id),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: resourceKeys.all(resource, userId) });
      toast.success('Registro desativado.');
    },
    onError: (e) => toast.error(describeError(e)),
  });
}
export function useCommand<T>(resource: string) {
  const cache = useQueryClient();
  const userId = useAuthStore((s) => sessionScope(s.session));
  return useMutation({
    mutationFn: ({ action, data, method }: { action: string; data?: unknown; method?: string }) =>
      command<T>(resource, action, data, method),
    onSuccess: () => {
      void cache.invalidateQueries({ predicate: (q) => q.queryKey.includes(userId) });
      toast.success('Operação concluída.');
    },
    onError: (e) => toast.error(describeError(e)),
  });
}
