import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { getMonitoringSessionId } from '../../lib/monitoringSession';
import { LocationConsentPrompt } from './LocationConsentPrompt';
import { useLocationConsent, type BrowserLocation, type ClientLocation } from './locationConsent';

const sensitiveKey =
  /token|password|senha|secret|authorization|credential|api.?key|^code$|^state$|email|cpf|cnpj|telefone/i;
let navigationTimingReported = false;

type PageViewAcknowledgment = { trackingToken?: string };
type TrackedPage = {
  url: string;
  sessionId?: string;
  sentLocation?: ClientLocation;
  acknowledgment: Promise<PageViewAcknowledgment | undefined>;
};

function normalizeLocation(details: ClientLocation, coordinates: BrowserLocation): ClientLocation {
  const text = (value: unknown, limit: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null;
  return {
    ...coordinates,
    timeZone: coordinates.timeZone || text(details.timeZone, 50) || undefined,
    country: text(details.country, 100),
    region: text(details.region, 100),
    city: text(details.city, 100),
    postalCode: text(details.postalCode, 20),
    address: text(details.address, 500),
    isp: text(details.isp, 255),
  };
}
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
  const callback = /\/auth\/callback\/?$/.test(location.pathname);
  const {
    coordinates,
    getCoordinates,
    getNavigationCoordinates,
    refresh,
    status,
    message,
    request,
    dismiss,
    stop,
  } = useLocationConsent(!callback);
  const previous = useRef<string>();
  const currentPage = useRef<TrackedPage>();
  const resolvedLocation = useRef<{ coordinates: BrowserLocation; value: ClientLocation }>();
  const lookupVersion = useRef(0);
  useEffect(() => {
    if (callback) return;
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
    const coordinates = getNavigationCoordinates();
    const clientLocation =
      coordinates && resolvedLocation.current?.coordinates === coordinates
        ? resolvedLocation.current.value
        : coordinates;
    const sessionId = getMonitoringSessionId();
    const acknowledgment = api<PageViewAcknowledgment | undefined>('/api/v1/monitoring/page-view', {
      auth: 'none',
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({
        url,
        referrer,
        sessionId,
        initialPageTtfbMs,
        location: clientLocation,
        ...collectBrowserMetrics(),
      }),
    }).catch(() => undefined);
    currentPage.current = { url, sessionId, sentLocation: clientLocation, acknowledgment };
    if (!coordinates) refresh();
  }, [callback, getNavigationCoordinates, refresh, location.pathname, location.search]);

  useEffect(() => {
    if (!coordinates || callback || getCoordinates() !== coordinates) {
      resolvedLocation.current = undefined;
      return;
    }
    const version = ++lookupVersion.current;
    const controller = new AbortController();
    // Save only the browser's consented coordinates while address enrichment is pending.
    resolvedLocation.current = { coordinates, value: coordinates };
    const url = currentPage.current?.url;
    if (!url) return;
    const isCurrent = () => version === lookupVersion.current && getCoordinates() === coordinates;
    const attach = async (value: ClientLocation) => {
      if (!isCurrent()) return;
      resolvedLocation.current = { coordinates, value };
      const page = currentPage.current;
      if (!page || page.sentLocation === value) return;
      const acknowledgment = await page.acknowledgment;
      if (!isCurrent() || page !== currentPage.current) return;
      const token = acknowledgment?.trackingToken;
      if (typeof token !== 'string' || !token || token.length > 4096) return;
      await api<void>('/api/v1/monitoring/page-view/location', {
        auth: 'none',
        method: 'POST',
        keepalive: true,
        signal: controller.signal,
        body: JSON.stringify({
          trackingToken: token,
          sessionId: page.sessionId,
          url: page.url,
          location: value,
        }),
      });
    };
    void api<ClientLocation>('/api/v1/monitoring/location-details', {
      auth: 'none',
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ url, ...coordinates }),
    })
      .then(
        (details) => attach(normalizeLocation(details || coordinates, coordinates)),
        () => (controller.signal.aborted ? undefined : attach(coordinates)),
      )
      .catch(() => undefined);
    return () => {
      lookupVersion.current += 1;
      controller.abort();
    };
  }, [callback, coordinates, getCoordinates]);

  if (callback) return null;
  return (
    <LocationConsentPrompt
      status={status}
      message={message}
      onRequest={request}
      onDismiss={dismiss}
      onStop={stop}
    />
  );
}
