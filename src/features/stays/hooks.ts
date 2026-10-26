import { useQuery } from '@tanstack/react-query';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import { getStay, getStayServices } from './api';
export const stayKeys = { all: (userId: string | null) => ['estadias', userId] as const };
export function useStay(id: number) {
  const userId = useAuthStore((s) => sessionScope(s.session));
  return useQuery({
    queryKey: [...stayKeys.all(userId), 'detail', id],
    queryFn: ({ signal }) => getStay(id, signal),
    enabled: !!userId,
  });
}
export function useStayServices(id: number) {
  const userId = useAuthStore((s) => sessionScope(s.session));
  return useQuery({
    queryKey: [...stayKeys.all(userId), 'services', id],
    queryFn: ({ signal }) => getStayServices(id, signal),
    enabled: !!userId,
  });
}
