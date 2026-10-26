import { useQuery } from '@tanstack/react-query';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import { getOverview } from './api';
export const overviewKeys = { all: (id: string | null) => ['overview', id] as const };
export function useOverview() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: overviewKeys.all(sessionScope(session)),
    queryFn: ({ signal }) => getOverview(session?.roles || [], signal),
    enabled: !!session,
  });
}
