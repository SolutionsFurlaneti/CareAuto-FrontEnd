type UserAgentHints = {
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string;
    platform?: string;
    platformVersion?: string;
  }>;
};

export type DeviceMetadata = { deviceBrand: string; deviceModel: string };

function manufacturer(model: string): string | undefined {
  if (/iphone|ipad|macintosh/i.test(model)) return 'Apple';
  if (/^(?:SM-|GT-|SAMSUNG)/i.test(model)) return 'Samsung';
  if (/^(?:moto|motorola|XT\d)/i.test(model)) return 'Motorola';
  if (/^(?:pixel|nexus)/i.test(model)) return 'Google';
  if (/^(?:huawei|ane-|ele-|vog-|lya-)/i.test(model)) return 'Huawei';
  if (/^honor/i.test(model)) return 'Honor';
  if (/^(?:redmi|poco|mi\s|xiaomi)/i.test(model)) return 'Xiaomi';
  if (/^(?:oneplus|IN20|LE21)/i.test(model)) return 'OnePlus';
  if (/^nokia/i.test(model)) return 'Nokia';
  if (/^(?:LG-|LM-)/i.test(model)) return 'LG';
  return undefined;
}

function classifyDevice(model?: string, platformHint?: string): DeviceMetadata {
  const agent = navigator.userAgent || '';
  const platform =
    platformHint ||
    (/Windows/i.test(agent)
      ? 'Windows'
      : /Android/i.test(agent)
        ? 'Android'
        : /iPhone|iPad|iPod/i.test(agent)
          ? 'iOS'
          : /Macintosh/i.test(agent)
            ? 'macOS'
            : /CrOS/i.test(agent)
              ? 'Chrome OS'
              : /Linux/i.test(agent)
                ? 'Linux'
                : 'Unknown');
  const tablet =
    /iPad|Tablet/i.test(agent) ||
    (/Android/i.test(agent) && !/Mobile/i.test(agent)) ||
    (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1);
  const mobile =
    /Mobile|iPhone|iPod/i.test(agent) ||
    (navigator as Navigator & { userAgentData?: UserAgentHints }).userAgentData?.mobile === true;
  const deviceType = tablet ? 'Tablet' : mobile ? 'Mobile' : 'Desktop';
  const parsedModel = /iPhone/i.test(agent)
    ? 'iPhone'
    : /iPad/i.test(agent)
      ? 'iPad'
      : agent.match(
          /Android[^;)]*;\s*(?:[a-z]{2}(?:[-_][A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/[^;)]*)?(?:;|\))/i,
        )?.[1];
  const candidate = model?.trim() || parsedModel?.trim() || '';
  const hardwareModel = /^(?:K|unknown|wv)$/i.test(candidate) ? '' : candidate.slice(0, 100);
  return {
    deviceBrand: manufacturer(hardwareModel) || (/Macintosh/i.test(agent) ? 'Apple' : 'Generic'),
    deviceModel: hardwareModel || `${platform} ${deviceType}`,
  };
}

/** Browser brands identify Chrome/Edge, so only a hardware model determines the manufacturer. */
export function collectDeviceMetadata(): DeviceMetadata | Promise<DeviceMetadata> {
  const hints = (navigator as Navigator & { userAgentData?: UserAgentHints }).userAgentData;
  const fallback = classifyDevice(undefined, hints?.platform);
  if (!hints?.getHighEntropyValues) return fallback;
  return new Promise<DeviceMetadata>((resolve) => {
    // Optional Client Hints must never prevent recording a page view.
    const timeout = window.setTimeout(() => resolve(fallback), 150);
    void Promise.resolve()
      .then(() => hints.getHighEntropyValues!(['model', 'platform', 'platformVersion']))
      .then(
        (details) => {
          window.clearTimeout(timeout);
          resolve(classifyDevice(details.model, details.platform || hints.platform));
        },
        () => {
          window.clearTimeout(timeout);
          resolve(fallback);
        },
      );
  });
}

export function pageViewResponseTime(initialDocument: boolean, routeStartedAt: number): number {
  const timing = performance.getEntriesByType?.('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  const navigationDuration = timing ? timing.loadEventEnd - timing.startTime : 0;
  const measured = initialDocument
    ? navigationDuration > 0
      ? navigationDuration
      : performance.now()
    : performance.now() - routeStartedAt;
  return Number.isFinite(measured) ? Math.max(1, Math.round(measured)) : 1;
}
