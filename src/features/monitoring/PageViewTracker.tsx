import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { getMonitoringSessionId } from '../../lib/monitoringSession';

const sensitiveKey =
  /token|password|senha|secret|authorization|credential|api.?key|^code$|^state$|email|cpf|cnpj|telefone/i;
let navigationTimingReported = false;
export function sanitizeMonitoringUrl(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    url.hash = '';
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      if (sensitiveKey.test(key)) url.searchParams.set(key, '[REDACTED]');
    }
    return url.toString();
  } catch {
    return undefined;
  }
}
export function collectBrowserMetrics() {
  const browser = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };
  return {
    screenWidth: window.screen.width || undefined,
    screenHeight: window.screen.height || undefined,
    viewportWidth: window.innerWidth || undefined,
    viewportHeight: window.innerHeight || undefined,
    devicePixelRatio: Number.isFinite(window.devicePixelRatio)
      ? Math.min(9.99, Math.max(0.01, window.devicePixelRatio))
      : undefined,
    colorDepth: window.screen.colorDepth || undefined,
    language: browser.language || undefined,
    hardwareConcurrency: browser.hardwareConcurrency || undefined,
    deviceMemory: browser.deviceMemory,
    connectionEffectiveType: browser.connection?.effectiveType,
    isTouchScreen:
      browser.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches === true,
  };
}
export function PageViewTracker() {
  const location = useLocation();
  const previous = useRef<string>();
  useEffect(() => {
    if (/\/auth\/callback\/?$/.test(location.pathname)) return;
    const url = sanitizeMonitoringUrl(window.location.href);
    if (!url || previous.current === url) return;
    const referrer = sanitizeMonitoringUrl(previous.current || document.referrer);
    previous.current = url;
    let initialPageTtfbMs: number | undefined;
    if (!navigationTimingReported) {
      navigationTimingReported = true;
      const timing = performance.getEntriesByType?.('navigation')[0] as
        PerformanceNavigationTiming | undefined;
      const duration = timing ? timing.responseStart - timing.startTime : 0;
      if (Number.isFinite(duration) && duration > 0 && duration <= 120000)
        initialPageTtfbMs = duration;
    }
    void api<void>('/api/v1/monitoring/page-view', {
      auth: 'none',
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({
        url,
        referrer,
        sessionId: getMonitoringSessionId(),
        initialPageTtfbMs,
        ...collectBrowserMetrics(),
      }),
    }).catch(() => undefined);
  }, [location.pathname, location.search]);
  return null;
}
