import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sessionScope, useAuthStore } from '../../stores/authStore';
import { getChecklist, saveChecklist, type ChecklistInput } from './api';

const key = (scope: string | null, estadiaId: number) => ['checklist', scope, estadiaId] as const;

export function useChecklist(estadiaId: number) {
  const scope = useAuthStore((s) => sessionScope(s.session));
  return useQuery({
    queryKey: key(scope, estadiaId),
    queryFn: ({ signal }) => getChecklist(estadiaId, signal),
    enabled: !!scope && estadiaId > 0,
  });
}

export function useSaveChecklist(estadiaId: number) {
  const cache = useQueryClient();
  const scope = useAuthStore((s) => sessionScope(s.session));
  return useMutation({
    mutationFn: (data: ChecklistInput) => saveChecklist(estadiaId, data),
    onSuccess: (result) => {
      cache.setQueryData(key(scope, estadiaId), result);
      toast.success('Checklist salvo.');
    },
  });
}
