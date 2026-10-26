import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { describeError } from '../../lib/describeError';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import { getPrintConfig, listPrintJobs, listPrinters, printEntryTicket } from './api';

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
export function usePrintJobs() {
  const scope = usePrintScope();
  return useQuery({
    queryKey: printKeys.jobs(scope),
    queryFn: ({ signal }) => listPrintJobs(signal),
    enabled: !!scope,
    // Acompanha a fila enquanto o agente ainda não confirmou algum trabalho.
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === 'PENDENTE' || j.status === 'IMPRIMINDO')
        ? 4000
        : false,
  });
}
/** Envia o ticket de entrada para a fila do agente. */
export function usePrintTicket() {
  const cache = useQueryClient();
  const scope = usePrintScope();
  return useMutation({
    mutationFn: (estadiaId: number) => printEntryTicket(estadiaId),
    onSuccess: (result) => {
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
