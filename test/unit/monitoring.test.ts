import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectBrowserMetrics,
  sanitizeMonitoringUrl,
} from '../../src/features/monitoring/PageViewTracker';
import {
  monitoringDateRange,
  periodDates,
  todayInBrasilia,
} from '../../src/features/backoffice/monitoring/dates';
import { getMonitoringSessionId } from '../../src/lib/monitoringSession';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe('períodos do monitoramento', () => {
  it('usa o dia de Brasília quando a data UTC já mudou', () => {
    expect(todayInBrasilia(new Date('2026-11-19T01:30:00Z'))).toBe('2026-11-18');
    expect(periodDates('7', '2026-11-18')).toEqual({ start: '2026-11-12', end: '2026-11-18' });
  });
  it('envia o fim exclusivo para incluir todo o último dia', () => {
    expect(monitoringDateRange('2026-11-12', '2026-11-18')).toEqual({
      startDate: '2026-11-12T03:00:00.000Z',
      endDate: '2026-11-19T03:00:00.000Z',
    });
  });
  it('recusa período invertido, datas ausentes e intervalos maiores que 366 dias', () => {
    expect(monitoringDateRange('2026-11-19', '2026-11-18')).toBeNull();
    expect(monitoringDateRange('', '2026-11-18')).toBeNull();
    expect(monitoringDateRange('2025-01-01', '2026-01-02')).toBeNull();
  });
});
describe('telemetria do navegador', () => {
  it('preserva campanhas e remove credenciais, tokens e fragmentos da URL', () => {
    const result = sanitizeMonitoringUrl(
      'https://user:password@example.com/pagina?access_token=secreto&email=pessoa@example.com&utm_campaign=novembro#token-privado',
    );
    const url = new URL(result!);
    expect(url.username).toBe('');
    expect(url.password).toBe('');
    expect(url.hash).toBe('');
    expect(url.searchParams.get('access_token')).toBe('[REDACTED]');
    expect(url.searchParams.get('email')).toBe('[REDACTED]');
    expect(url.searchParams.get('utm_campaign')).toBe('novembro');
    expect(sanitizeMonitoringUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeMonitoringUrl('')).toBeUndefined();
  });
  it('coleta capacidades reais e mantém recursos não suportados ausentes', () => {
    vi.stubGlobal('navigator', { language: 'pt-BR', hardwareConcurrency: 8, maxTouchPoints: 5 });
    vi.stubGlobal('screen', { width: 1080, height: 1920, colorDepth: 24 });
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    vi.stubGlobal('devicePixelRatio', 3);
    expect(collectBrowserMetrics()).toMatchObject({
      screenWidth: 1080,
      screenHeight: 1920,
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 3,
      language: 'pt-BR',
      hardwareConcurrency: 8,
      isTouchScreen: true,
    });
    expect(collectBrowserMetrics().deviceMemory).toBeUndefined();
    expect(collectBrowserMetrics().connectionEffectiveType).toBeUndefined();
  });
  it('reutiliza uma sessão analítica da aba sem ler autenticação', () => {
    window.sessionStorage.setItem('AutoCareManager-monitoring-session', 'analytics-session-123');
    expect(getMonitoringSessionId()).toBe('analytics-session-123');
  });
  it('continua funcionando quando o armazenamento é bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const first = getMonitoringSessionId();
    expect(first).toMatch(/^[a-zA-Z0-9._-]{1,100}$/);
    expect(getMonitoringSessionId()).toBe(first);
  });
});
