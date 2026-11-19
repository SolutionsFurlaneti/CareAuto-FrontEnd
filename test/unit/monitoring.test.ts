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
import {
  collectDeviceMetadata,
  pageViewResponseTime,
} from '../../src/features/monitoring/browserTelemetry';

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
  it('identifica desktops sem inventar um fabricante e mantém duração positiva', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      maxTouchPoints: 0,
    });
    expect(collectDeviceMetadata()).toEqual({
      deviceBrand: 'Generic',
      deviceModel: 'Windows Desktop',
    });
    vi.spyOn(performance, 'now').mockReturnValue(90);
    expect(pageViewResponseTime(false, 90)).toBe(1);
    expect(pageViewResponseTime(false, 55)).toBe(35);
  });
  it('usa o carregamento completo do documento em vez de TTFB', () => {
    vi.stubGlobal('performance', {
      now: () => 900,
      getEntriesByType: () => [{ startTime: 5, responseStart: 30, loadEventEnd: 305 }],
    });
    expect(pageViewResponseTime(true, 0)).toBe(300);
  });
  it('extrai modelos móveis do User-Agent quando Client Hints não estão disponíveis', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A) Mobile',
      maxTouchPoints: 5,
    });
    expect(collectDeviceMetadata()).toEqual({ deviceBrand: 'Samsung', deviceModel: 'SM-S918B' });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile',
      maxTouchPoints: 5,
    });
    expect(collectDeviceMetadata()).toEqual({ deviceBrand: 'Apple', deviceModel: 'iPhone' });
  });
  it('não interpreta o modelo reduzido K do Android como hardware real', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 10; K) Mobile' });
    expect(collectDeviceMetadata()).toEqual({
      deviceBrand: 'Generic',
      deviceModel: 'Android Mobile',
    });
  });
  it('prefere o modelo dos Client Hints e ignora marcas do navegador', async () => {
    const getHighEntropyValues = vi
      .fn()
      .mockResolvedValue({ model: 'moto g84 5G', platform: 'Android', platformVersion: '13' });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; K) Mobile',
      userAgentData: {
        platform: 'Android',
        mobile: true,
        brands: [{ brand: 'Chromium' }],
        getHighEntropyValues,
      },
    });
    expect(await collectDeviceMetadata()).toEqual({
      deviceBrand: 'Motorola',
      deviceModel: 'moto g84 5G',
    });
    expect(getHighEntropyValues).toHaveBeenCalledWith(['model', 'platform', 'platformVersion']);
  });
  it('mantém fallback quando Client Hints falham ou não respondem', async () => {
    const getHighEntropyValues = vi.fn().mockRejectedValue(new Error('blocked'));
    vi.stubGlobal('navigator', {
      userAgent: 'Windows NT 10.0',
      userAgentData: { platform: 'Windows', getHighEntropyValues },
    });
    expect(await collectDeviceMetadata()).toEqual({
      deviceBrand: 'Generic',
      deviceModel: 'Windows Desktop',
    });
    vi.useFakeTimers();
    getHighEntropyValues.mockImplementation(() => new Promise(() => {}));
    const pending = collectDeviceMetadata();
    await vi.advanceTimersByTimeAsync(150);
    expect(await pending).toEqual({ deviceBrand: 'Generic', deviceModel: 'Windows Desktop' });
    vi.useRealTimers();
  });
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
