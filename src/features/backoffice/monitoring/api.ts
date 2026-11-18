import { useQuery } from '@tanstack/react-query';
import { api, toQuery } from '../../../lib/apiClient';
import { useBackofficeScope } from '../hooks';
import type {
  MonitoringFilters,
  MonitoringLogDetail,
  MonitoringLogs,
  MonitoringOverview,
} from './types';

const root = '/api/v1/backoffice/monitoring';
export function useMonitoringOverview(filters: MonitoringFilters, enabled: boolean) {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: ['backoffice', scope, 'monitoring', 'overview', filters],
    queryFn: ({ signal }) =>
      api<MonitoringOverview>(root + '/overview' + toQuery({ ...filters }), {
        auth: 'backoffice',
        signal,
      }),
    enabled: !!scope && enabled,
  });
}
export function useMonitoringLogs(filters: MonitoringFilters, page: number, enabled: boolean) {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: ['backoffice', scope, 'monitoring', 'logs', filters, page],
    queryFn: ({ signal }) =>
      api<MonitoringLogs>(root + '/logs' + toQuery({ ...filters, page, pageSize: 20 }), {
        auth: 'backoffice',
        signal,
      }),
    enabled: !!scope && enabled,
  });
}
export function useMonitoringDetail(id: number | null) {
  const scope = useBackofficeScope();
  return useQuery({
    queryKey: ['backoffice', scope, 'monitoring', 'detail', id],
    queryFn: ({ signal }) =>
      api<MonitoringLogDetail>(root + '/logs/' + id, { auth: 'backoffice', signal }),
    enabled: !!scope && id !== null,
  });
}
