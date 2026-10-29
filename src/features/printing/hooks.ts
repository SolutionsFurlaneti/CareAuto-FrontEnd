import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { describeError } from '../../lib/describeError';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import {
  getBrowserTicket,
  getPrintConfig,
  listPrintJobs,
  listPrinters,
  printEntryTicket,
} from './api';

export const printKeys = {
  all: (scope: string | null) => ['impressao', scope] as const,
  config: (scope: string | null) => ['impressao', scope, 'configuracao'] as const,
  printers: (scope: string | null) => ['impressao', scope, 'impressoras'] as const,
  jobs: (scope: string | null) => ['impressao', scope, 'trabalhos'] as const,
};

export function usePrintScope() {
  return useAuthStore((s) => sessionScope(s.session));
}
export function usePrintConfig(enabled = true, refreshMs?: number) {
  const scope = usePrintScope();
  return useQuery({
    queryKey: printKeys.config(scope),
    queryFn: ({ signal }) => getPrintConfig(signal),
    enabled: !!scope && enabled,
    staleTime: refreshMs ? 0 : 60000,
    refetchInterval: refreshMs,
  });
}
export function usePrinters() {
  const scope = usePrintScope();
  return useQuery({
    queryKey: printKeys.printers(scope),
    queryFn: ({ signal }) => listPrinters(signal),
    enabled: !!scope,
  });
}
export function usePrintJobs(refreshPending = true) {
  const scope = usePrintScope();
  return useQuery({
    queryKey: printKeys.jobs(scope),
    queryFn: ({ signal }) => listPrintJobs(signal),
    enabled: !!scope,
    // Acompanha a fila enquanto o agente ainda não confirmou algum trabalho.
    refetchInterval: (query) =>
      refreshPending &&
      query.state.data?.some((j) => j.status === 'PENDENTE' || j.status === 'IMPRIMINDO')
        ? 4000
        : false,
  });
}
/** Usa a preferência atual do estabelecimento para abrir o diálogo ou enfileirar. */
export function usePrintTicket() {
  const cache = useQueryClient();
  const scope = usePrintScope();
  return useMutation({
    mutationFn: async (estadiaId: number) => {
      const accessToken = useAuthStore.getState().session?.accessToken;
      const assertSession = () => {
        const currentSession = useAuthStore.getState().session;
        if (
          !scope ||
          !accessToken ||
          sessionScope(currentSession) !== scope ||
          currentSession?.accessToken !== accessToken
        )
          throw new Error('A sessão mudou. Abra a estadia novamente para imprimir.');
      };
      assertSession();
      const config = await getPrintConfig();
      assertSession();
      cache.setQueryData(printKeys.config(scope), config);
      if (config.imprimirPeloNavegador) {
        if (Capacitor.isNativePlatform())
          throw new Error(
            'Abra o CareAuto no navegador do computador para usar esta forma de impressão.',
          );
        const ticket = await getBrowserTicket(estadiaId);
        assertSession();
        const { printBrowserTicket } = await import('./browserPrinting');
        assertSession();
        await printBrowserTicket(ticket, assertSession);
        return { mode: 'browser' } as const;
      }
      const result = await printEntryTicket(estadiaId);
      return { mode: 'agent', trabalhos: result.trabalhos } as const;
    },
    onSuccess: (result) => {
      if (result.mode === 'browser') {
        toast.info('Diálogo de impressão aberto. Confirme a impressão na janela do sistema.');
        return;
      }
      void cache.invalidateQueries({ queryKey: printKeys.jobs(scope) });
      toast.success(
        result.trabalhos > 1
          ? `Ticket enviado para ${result.trabalhos} impressoras.`
          : 'Ticket enviado para a impressora.',
      );
    },
    onError: (e) => toast.error(describeError(e)),
  });
}
