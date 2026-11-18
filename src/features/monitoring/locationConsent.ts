import { useCallback, useEffect, useRef, useState } from 'react';

const CHOICE_KEY = 'AutoCareManager-monitoring-location-choice';
const LOCATION_MAX_AGE_MS = 5 * 60 * 1000;
const LOCATION_TIMEOUT_MS = 10000;
type StoredChoice = 'granted' | 'declined' | 'denied';
let memoryChoice: StoredChoice | undefined;

export type BrowserLocation = {
  consentGranted: true;
  latitude: number;
  longitude: number;
  timeZone?: string;
};

export type ClientLocation = BrowserLocation & {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  isp?: string | null;
};

export type LocationConsentStatus =
  | 'prompt'
  | 'requesting'
  | 'granted'
  | 'expired'
  | 'dismissed'
  | 'denied'
  | 'error'
  | 'unavailable';

function readChoice(): StoredChoice | undefined {
  try {
    const value = window.sessionStorage.getItem(CHOICE_KEY);
    return value === 'granted' || value === 'declined' || value === 'denied' ? value : undefined;
  } catch {
    return memoryChoice;
  }
}

function storeChoice(value: StoredChoice) {
  memoryChoice = value;
  try {
    // A escolha é persistida na aba; as coordenadas ficam somente em memória.
    window.sessionStorage.setItem(CHOICE_KEY, value);
  } catch {
    // O consentimento continua funcionando com storage bloqueado.
  }
}

export function browserSupportsLocation(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.geolocation?.getCurrentPosition === 'function' &&
    window.isSecureContext !== false
  );
}

export function positionToLocation(position: GeolocationPosition): BrowserLocation | undefined {
  const { latitude, longitude } = position.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    return undefined;
  let timeZone: string | undefined;
  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (value && value.length <= 50) timeZone = value;
  } catch {
    // Fuso horário indisponível permanece ausente.
  }
  return {
    consentGranted: true,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    timeZone,
  };
}

export function useLocationConsent(enabled = true) {
  const [status, setStatus] = useState<LocationConsentStatus>(() => {
    if (!browserSupportsLocation()) return 'unavailable';
    const choice = readChoice();
    return choice === 'declined' || choice === 'denied' ? 'dismissed' : 'prompt';
  });
  const [position, setPosition] = useState<{ value: BrowserLocation; receivedAt: number }>();
  const positionRef = useRef<{ value: BrowserLocation; receivedAt: number }>();
  const [message, setMessage] = useState('');
  const permission = useRef<PermissionStatus>();
  const active = useRef(enabled);
  const requestVersion = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const cancelPending = useCallback(() => {
    requestVersion.current += 1;
    if (timeout.current !== undefined) clearTimeout(timeout.current);
    timeout.current = undefined;
  }, []);

  const stop = useCallback(() => {
    cancelPending();
    storeChoice('declined');
    positionRef.current = undefined;
    setPosition(undefined);
    setStatus('dismissed');
    setMessage('');
  }, [cancelPending]);

  const request = useCallback(() => {
    cancelPending();
    if (!browserSupportsLocation()) {
      setStatus('unavailable');
      positionRef.current = undefined;
      setPosition(undefined);
      return;
    }
    const version = requestVersion.current;
    setStatus('requesting');
    setMessage('');
    const current = () => active.current && requestVersion.current === version;
    const finish = () => {
      if (timeout.current !== undefined) clearTimeout(timeout.current);
      timeout.current = undefined;
    };
    const fail = (error?: Pick<GeolocationPositionError, 'code'>) => {
      if (!current()) return;
      finish();
      requestVersion.current += 1;
      positionRef.current = undefined;
      setPosition(undefined);
      const denied = error?.code === 1;
      storeChoice(denied ? 'denied' : 'declined');
      setStatus(denied ? 'denied' : 'error');
      setMessage(
        denied
          ? 'A permissão de localização foi negada. Você pode continuar usando o aplicativo.'
          : error?.code === 3
            ? 'Não foi possível obter a localização a tempo. Você pode tentar novamente ou continuar sem compartilhar.'
            : 'A localização está indisponível no momento. Você pode continuar usando o aplicativo.',
      );
    };
    // Também encerra a espera quando o prompt nativo permanece sem resposta.
    timeout.current = setTimeout(() => fail({ code: 3 }), LOCATION_TIMEOUT_MS + 1000);
    try {
      navigator.geolocation.getCurrentPosition(
        (value) => {
          if (!current()) return;
          finish();
          const coordinates = positionToLocation(value);
          if (!coordinates) {
            fail();
            return;
          }
          const receivedAt = Math.min(Date.now(), value.timestamp);
          if (!Number.isFinite(receivedAt) || Date.now() - receivedAt >= LOCATION_MAX_AGE_MS) {
            fail({ code: 3 });
            return;
          }
          requestVersion.current += 1;
          storeChoice('granted');
          const entry = { value: coordinates, receivedAt };
          positionRef.current = entry;
          setPosition(entry);
          setStatus('granted');
          setMessage('');
        },
        fail,
        {
          enableHighAccuracy: false,
          timeout: LOCATION_TIMEOUT_MS,
          maximumAge: LOCATION_MAX_AGE_MS,
        },
      );
    } catch {
      fail();
    }
  }, [cancelPending]);

  useEffect(() => {
    active.current = enabled;
    if (!enabled) {
      cancelPending();
      return;
    }
    let permissionStatus: PermissionStatus | undefined;
    let disposed = false;
    const changed = () => {
      if (!permissionStatus || disposed) return;
      if (permissionStatus.state === 'denied') {
        cancelPending();
        positionRef.current = undefined;
        setPosition(undefined);
        storeChoice('denied');
        setStatus((current) => (current === 'requesting' ? 'denied' : 'dismissed'));
        setMessage(
          'A permissão de localização foi negada. Você pode continuar usando o aplicativo.',
        );
      } else if (permissionStatus.state === 'prompt' && readChoice() === 'granted') {
        cancelPending();
        positionRef.current = undefined;
        setPosition(undefined);
        storeChoice('declined');
        setStatus('dismissed');
        setMessage('');
      }
    };
    if (browserSupportsLocation() && typeof navigator.permissions?.query === 'function') {
      void navigator.permissions
        .query({ name: 'geolocation' })
        .then((value) => {
          if (disposed) return;
          permissionStatus = value;
          permission.current = value;
          value.addEventListener('change', changed);
          if (
            value.state === 'granted' &&
            readChoice() === 'granted' &&
            !positionRef.current &&
            timeout.current === undefined
          )
            request();
          else changed();
        })
        .catch(() => undefined);
    }
    return () => {
      disposed = true;
      active.current = false;
      permissionStatus?.removeEventListener('change', changed);
      permission.current = undefined;
      positionRef.current = undefined;
      cancelPending();
    };
  }, [cancelPending, enabled, request]);

  const refresh = useCallback(() => {
    if (permission.current?.state === 'granted' && readChoice() === 'granted') request();
  }, [request]);

  useEffect(() => {
    if (!position) return;
    const expire = setTimeout(
      () => {
        if (positionRef.current === position) {
          positionRef.current = undefined;
          setStatus((current) => (current === 'granted' ? 'expired' : current));
        }
        setPosition((current) => (current === position ? undefined : current));
      },
      Math.max(0, LOCATION_MAX_AGE_MS - (Date.now() - position.receivedAt)),
    );
    return () => clearTimeout(expire);
  }, [position]);

  const coordinates =
    position && Date.now() - position.receivedAt < LOCATION_MAX_AGE_MS ? position.value : undefined;
  const getCoordinates = useCallback(() => {
    const entry = positionRef.current;
    if (
      !active.current ||
      !entry ||
      Date.now() - entry.receivedAt >= LOCATION_MAX_AGE_MS ||
      readChoice() !== 'granted' ||
      (permission.current && permission.current.state !== 'granted')
    )
      return undefined;
    return entry.value;
  }, []);
  const getNavigationCoordinates = useCallback(() => {
    if (permission.current?.state === 'granted') return getCoordinates();
    // Without a readable permission, only the navigation where native GPS succeeded may use it.
    if (positionRef.current || timeout.current !== undefined) {
      cancelPending();
      positionRef.current = undefined;
      setPosition(undefined);
      setStatus('expired');
    }
    return undefined;
  }, [cancelPending, getCoordinates]);
  return {
    status,
    coordinates,
    getCoordinates,
    getNavigationCoordinates,
    message,
    request,
    dismiss: stop,
    stop,
    refresh,
  };
}
