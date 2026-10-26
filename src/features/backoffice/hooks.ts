import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { describeError } from '../../lib/describeError';
import { useBackofficeStore } from './store';
import * as api from './api';

/** Chaves com o login: trocar de usuário no backoffice nunca reaproveita cache de outro. */
export const useBackofficeScope = () => useBackofficeStore((s) => s.session?.login ?? null);
export const backofficeKeys = {
  all: (scope: string | null) => ['backoffice', scope] as const,
  resumo: (scope: string | null) => ['backoffice', scope, 'resumo'] as const,
  planos: (scope: string | null) => ['backoffice', scope, 'planos'] as const,
  assinantes: (scope: string | null, filtro: object) =>
    ['backoffice', scope, 'assinantes', filtro] as const,
  assinante: (scope: string | null, id: number) => ['backoffice', scope, 'assinante', id] as const,
  cobrancas: (scope: string | null, filtro: object) =>
    ['backoffice', scope, 'cobrancas', filtro] as const,
  integracoes: (scope: string | null) => ['backoffice', scope, 'integracoes'] as const,
  campanhas: (scope: string | null) => ['backoffice', scope, 'campanhas'] as const,
  metaCampanhas: (scope: string | null) => ['backoffice', scope, 'meta-ads', 'campanhas'] as const,
};
export function useResumo() {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.resumo(scope),
    queryFn: ({ signal }) => api.getResumo(signal),
    enabled: !!scope,
  });
}
export function usePlanos() {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.planos(scope),
    queryFn: ({ signal }) => api.getPlanos(signal),
    enabled: !!scope,
  });
}
export function useAssinantes(filtro: { busca?: string; situacao?: string; pagina: number }) {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.assinantes(scope, filtro),
    queryFn: ({ signal }) => api.getAssinantes(filtro, signal),
    enabled: !!scope,
  });
}
export function useAssinante(id: number) {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.assinante(scope, id),
    queryFn: ({ signal }) => api.getAssinante(id, signal),
    enabled: !!scope && id > 0,
  });
}
export function useCobrancas(filtro: { status?: string; pagina: number }) {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.cobrancas(scope, filtro),
    queryFn: ({ signal }) => api.getCobrancas(filtro, signal),
    enabled: !!scope,
  });
}
export function useIntegracoes() {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.integracoes(scope),
    queryFn: ({ signal }) => api.getIntegracoes(signal),
    enabled: !!scope,
  });
}
export function useCampanhas() {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.campanhas(scope),
    queryFn: ({ signal }) => api.getCampanhas(signal),
    enabled: !!scope,
  });
}
export function useMetaCampanhas() {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: backofficeKeys.metaCampanhas(scope),
    queryFn: ({ signal }) => api.getCampanhasMetaAds(signal),
    enabled: !!scope,
  });
}
/** Mutação do backoffice: invalida todo o cache do backoffice e mostra o resultado. */
export function useBackofficeAction<A, R>(
  fn: (arg: A) => Promise<R>,
  sucesso?: string | ((r: R) => string),
) {
  const cache = useQueryClient();
  const scope = useBackofficeScope();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      void cache.invalidateQueries({ queryKey: backofficeKeys.all(scope) });
      if (sucesso) toast.success(typeof sucesso === 'string' ? sucesso : sucesso(result));
    },
    onError: (error) => toast.error(describeError(error)),
  });
}
