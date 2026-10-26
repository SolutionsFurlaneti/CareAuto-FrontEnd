import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import { resourceKeys } from '../shared/hooks';
import type { BaseConfiguration, IntegrationSlug } from './catalog';

export const integrationKey = (slug: IntegrationSlug, scope: string | null) =>
  [...resourceKeys.all('configuracoes-integracoes', scope), slug] as const;
export const integrationPath = (slug: IntegrationSlug) =>
  `/api/v1/configuracoes-integracoes/${slug}`;

/** Configuração de uma integração. O hub e a tela de detalhes compartilham o mesmo cache. */
export function useIntegration<T extends BaseConfiguration>(slug: IntegrationSlug) {
  const scope = useAuthStore((s) => sessionScope(s.session));
  const query = useQuery({
    queryKey: integrationKey(slug, scope),
    queryFn: ({ signal }) => api<T>(integrationPath(slug), { signal }),
    enabled: !!scope,
  });
  return { scope, query };
}

/**
 * PUT da configuração completa. Retorna false quando a sessão mudou durante a requisição,
 * para que a resposta atrasada não seja gravada no cache da sessão nova.
 */
export function useSaveIntegration<T extends BaseConfiguration>(slug: IntegrationSlug) {
  const scope = useAuthStore((s) => sessionScope(s.session));
  const cache = useQueryClient();
  return useCallback(
    async (body: Record<string, unknown>) => {
      const result = await api<T>(integrationPath(slug), {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (sessionScope(useAuthStore.getState().session) !== scope) return false;
      cache.setQueryData(integrationKey(slug, scope), result);
      return true;
    },
    [cache, scope, slug],
  );
}
