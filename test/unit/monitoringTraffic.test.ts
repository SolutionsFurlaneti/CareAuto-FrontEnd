import { describe, expect, it } from 'vitest';
import { completeMonitoringTraffic } from '../../src/features/backoffice/monitoring/traffic';

describe('lacunas na evolução do tráfego', () => {
  it('preserva medições reais e preenche dias sem acesso sem inventar latência', () => {
    const result = completeMonitoringTraffic(
      [
        {
          timestamp: '2026-11-18T03:00:00.000Z',
          requests: 12,
          httpRequests: 10,
          errors: 1,
          averageResponseTimeMs: 42,
          successPercentage: 90,
        },
      ],
      '2026-11-17T03:00:00.000Z',
      '2026-11-20T03:00:00.000Z',
      'day',
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ requests: 0, averageResponseTimeMs: null });
    expect(result[1]).toMatchObject({ requests: 12, averageResponseTimeMs: 42 });
    expect(result[2]).toMatchObject({ requests: 0, averageResponseTimeMs: null });
  });
  it('preenche as 24 horas de um dia de Brasília com fim exclusivo', () => {
    const result = completeMonitoringTraffic(
      [],
      '2026-11-18T03:00:00.000Z',
      '2026-11-19T03:00:00.000Z',
      'hour',
    );
    expect(result).toHaveLength(24);
    expect(result[23].timestamp).toBe('2026-11-19T02:00:00.000Z');
  });
});
