import type { MonitoringTraffic } from './types';

/** Ausência de requisições é zero; ausência de medição de duração permanece null. */
export function completeMonitoringTraffic(
  traffic: MonitoringTraffic[],
  startDate: string,
  endDate: string,
  granularity: 'hour' | 'day',
): MonitoringTraffic[] {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return traffic;
  const step = granularity === 'hour' ? 3600000 : 86400000;
  if ((end - start) / step > 1000) return traffic;
  const points = new Map(traffic.map((item) => [Date.parse(item.timestamp), item]));
  const result: MonitoringTraffic[] = [];
  for (let cursor = start; cursor < end; cursor += step)
    result.push(
      points.get(cursor) ?? {
        timestamp: new Date(cursor).toISOString(),
        requests: 0,
        errors: 0,
        httpRequests: 0,
        averageResponseTimeMs: null,
        successPercentage: 0,
      },
    );
  return result;
}
