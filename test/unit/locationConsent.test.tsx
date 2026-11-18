import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Link } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiOptions } from '../../src/lib/apiClient';
import { PageViewTracker } from '../../src/features/monitoring/PageViewTracker';
import { positionToLocation } from '../../src/features/monitoring/locationConsent';

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock('../../src/lib/apiClient', () => ({ api: apiMock }));

const PAGE = '/api/v1/monitoring/page-view';
const LOOKUP = '/api/v1/monitoring/location-details';
const UPDATE = '/api/v1/monitoring/page-view/location';
const CHOICE = 'AutoCareManager-monitoring-location-choice';
const coordinates = { latitude: -23.55052, longitude: -46.633308 };
const details = {
  consentGranted: true,
  ...coordinates,
  country: 'Brasil',
  region: 'São Paulo',
  city: 'São Paulo',
  postalCode: '01001-000',
  address: 'Praça da Sé, São Paulo',
  isp: 'Provedor da conexão',
};

class PermissionStub extends EventTarget {
  state: PermissionState = 'prompt';
  onchange: ((event: Event) => void) | null = null;
}

let permission: PermissionStub;
let nativeRequests: { success: PositionCallback; error?: PositionErrorCallback | null }[];
let getCurrentPosition: ReturnType<typeof vi.fn>;

function position(
  latitude = coordinates.latitude,
  longitude = coordinates.longitude,
): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({ latitude, longitude }),
    },
    timestamp: Date.now(),
    toJSON: () => ({ latitude, longitude }),
  };
}

function calls(path: string) {
  return apiMock.mock.calls.filter(([url]) => url === path);
}
function body(path: string, index = 0) {
  return JSON.parse((calls(path)[index][1] as ApiOptions).body as string) as Record<
    string,
    unknown
  >;
}

function Fixture({ strict = false }: { strict?: boolean }) {
  const content = (
    <BrowserRouter>
      <PageViewTracker />
      <main>
        <button type="button" data-testid="app-action">
          Continuar usando o aplicativo
        </button>
        <Link to="/segunda">Ir para outra página</Link>
      </main>
    </BrowserRouter>
  );
  return strict ? <StrictMode>{content}</StrictMode> : content;
}

function grant(index = 0) {
  act(() => {
    permission.state = 'granted';
    permission.dispatchEvent(new Event('change'));
    nativeRequests[index].success(position());
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/pagina');
  permission = new PermissionStub();
  nativeRequests = [];
  getCurrentPosition = vi.fn((success: PositionCallback, error?: PositionErrorCallback | null) => {
    nativeRequests.push({ success, error });
  });
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', {
    language: 'pt-BR',
    maxTouchPoints: 0,
    geolocation: { getCurrentPosition },
    permissions: { query: vi.fn().mockResolvedValue(permission) },
  });
  apiMock.mockReset();
  apiMock.mockImplementation((path: string) => {
    if (path === PAGE)
      return Promise.resolve({ trackingToken: 'tracking-token-' + calls(PAGE).length });
    if (path === LOOKUP) return Promise.resolve(details);
    return Promise.resolve(undefined);
  });
});

afterEach(() => {
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe('consentimento de localização do visitante', () => {
  it('registra o acesso imediatamente e só consulta a localização após um clique', async () => {
    render(<Fixture />);
    await waitFor(() => expect(calls(PAGE)).toHaveLength(1));
    expect(screen.getByTestId('location-consent-allow')).toHaveTextContent('Permitir localização');
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(calls(LOOKUP)).toHaveLength(0);
    expect(body(PAGE)).not.toHaveProperty('location');

    fireEvent.click(screen.getByTestId('location-consent-allow'));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(body(LOOKUP)).toMatchObject({
      url: window.location.href,
      consentGranted: true,
      ...coordinates,
    });
    expect(body(UPDATE)).toMatchObject({ trackingToken: 'tracking-token-1', location: details });
    expect(calls(PAGE)).toHaveLength(1);
    expect(window.sessionStorage.getItem(CHOICE)).toBe('granted');
    expect(
      [...Array(window.sessionStorage.length)]
        .map((_, index) => window.sessionStorage.getItem(window.sessionStorage.key(index)!))
        .join(' '),
    ).not.toContain(String(coordinates.latitude));
    expect(screen.getByTestId('location-consent-stop')).toBeVisible();
  });

  it('respeita Agora não sem voltar a pedir em outra rota ou remontagem', async () => {
    const view = render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-decline'));
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    await waitFor(() => expect(calls(PAGE)).toHaveLength(2));
    expect(screen.queryByTestId('location-consent-allow')).not.toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(calls(LOOKUP)).toHaveLength(0);
    view.unmount();
    render(<Fixture />);
    expect(screen.queryByTestId('location-consent-allow')).not.toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByTestId('app-action')).toBeEnabled();
  });

  it('continua sem coordenadas quando a permissão nativa é negada', async () => {
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    act(() =>
      nativeRequests[0].error?.({
        code: 1,
        message: 'denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('A permissão de localização foi negada');
    expect(screen.getByTestId('app-action')).toBeEnabled();
    fireEvent.click(screen.getByTestId('location-consent-decline'));
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    await waitFor(() => expect(calls(PAGE)).toHaveLength(2));
    expect(body(PAGE, 1)).not.toHaveProperty('location');
    expect(calls(LOOKUP)).toHaveLength(0);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('ignora a resposta tardia se o usuário continuar sem compartilhar durante a espera', async () => {
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    fireEvent.click(screen.getByTestId('location-consent-decline'));
    grant();
    await act(async () => Promise.resolve());
    expect(calls(LOOKUP)).toHaveLength(0);
    expect(calls(UPDATE)).toHaveLength(0);
    expect(window.sessionStorage.getItem(CHOICE)).toBe('declined');
  });

  it('encerra a espera sem resposta e permite continuar ou tentar novamente', async () => {
    vi.useFakeTimers();
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    await act(async () => vi.advanceTimersByTime(11000));
    expect(screen.getByTestId('location-consent-message')).toHaveTextContent('a tempo');
    expect(screen.getByTestId('app-action')).toBeEnabled();
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('location-consent-decline'));
    grant(1);
    expect(calls(LOOKUP)).toHaveLength(0);
  });

  it('não pede localização em contexto inseguro ou navegador sem API', async () => {
    vi.stubGlobal('isSecureContext', false);
    const view = render(<Fixture />);
    await waitFor(() => expect(calls(PAGE)).toHaveLength(1));
    expect(screen.queryByTestId('location-consent')).not.toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    view.unmount();
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', { language: 'pt-BR', maxTouchPoints: 0 });
    render(<Fixture />);
    expect(screen.queryByTestId('location-consent')).not.toBeInTheDocument();
  });

  it('não confunde uma permissão antiga do navegador com o consentimento para telemetria', async () => {
    permission.state = 'granted';
    render(<Fixture strict />);
    await waitFor(() => expect(calls(PAGE)).toHaveLength(1));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(calls(PAGE)).toHaveLength(1);
  });

  it('retoma uma escolha válida da aba somente quando o navegador ainda autoriza', async () => {
    window.sessionStorage.setItem(CHOICE, 'granted');
    permission.state = 'granted';
    render(<Fixture strict />);
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(calls(PAGE)).toHaveLength(1);
  });

  it('interrompe o compartilhamento quando o usuário revoga a permissão no navegador', async () => {
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    act(() => {
      permission.state = 'denied';
      permission.dispatchEvent(new Event('change'));
    });
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    await waitFor(() => expect(calls(PAGE)).toHaveLength(2));
    expect(body(PAGE, 1)).not.toHaveProperty('location');
    expect(screen.queryByTestId('location-consent-stop')).not.toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('funciona quando storage é bloqueado e permite parar antes da próxima navegação', async () => {
    render(<Fixture />);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    fireEvent.click(screen.getByTestId('location-consent-stop'));
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    await waitFor(() => expect(calls(PAGE)).toHaveLength(2));
    expect(body(PAGE, 1)).not.toHaveProperty('location');
  });

  it('não coleta dados em callback de autenticação', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=sensivel');
    render(<Fixture />);
    await act(async () => Promise.resolve());
    expect(calls(PAGE)).toHaveLength(0);
    expect(calls(LOOKUP)).toHaveLength(0);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.queryByTestId('location-consent')).not.toBeInTheDocument();
  });

  it('sem Permissions API pede nova ação na próxima rota em vez de reutilizar coordenadas', async () => {
    vi.stubGlobal('navigator', {
      language: 'pt-BR',
      maxTouchPoints: 0,
      geolocation: { getCurrentPosition },
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    expect(body(PAGE, 1)).not.toHaveProperty('location');
    expect(screen.getByTestId('location-consent-open')).toHaveTextContent('Atualizar localização');
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('location-consent-open'));
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('location-consent-decline'));
  });

  it('expira a amostra pelo timestamp original e oferece atualização manual sem Permissions API', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {
      language: 'pt-BR',
      maxTouchPoints: 0,
      geolocation: { getCurrentPosition },
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    act(() => nativeRequests[0].success({ ...position(), timestamp: Date.now() - 4 * 60 * 1000 }));
    await act(async () => Promise.resolve());
    expect(screen.getByTestId('location-consent-stop')).toBeVisible();
    await act(async () => vi.advanceTimersByTime(60 * 1000));
    expect(screen.getByTestId('location-consent-open')).toHaveTextContent('Atualizar localização');
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    expect(body(PAGE, 1)).not.toHaveProperty('location');
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('ignora uma amostra nativa que já chegou expirada', async () => {
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    act(() => nativeRequests[0].success({ ...position(), timestamp: Date.now() - 6 * 60 * 1000 }));
    expect(screen.getByTestId('location-consent-message')).toHaveTextContent('a tempo');
    expect(calls(LOOKUP)).toHaveLength(0);
    expect(calls(UPDATE)).toHaveLength(0);
    expect(screen.getByTestId('app-action')).toBeEnabled();
  });
});

describe('correlação da localização com o acesso', () => {
  it('espera o trackingToken e atualiza a mesma visita sem criar outra', async () => {
    let acknowledge: ((value: { trackingToken: string }) => void) | undefined;
    apiMock.mockImplementation((path: string) => {
      if (path === PAGE)
        return new Promise<{ trackingToken: string }>((resolve) => {
          acknowledge = resolve;
        });
      if (path === LOOKUP) return Promise.resolve(details);
      return Promise.resolve(undefined);
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(LOOKUP)).toHaveLength(1));
    expect(calls(UPDATE)).toHaveLength(0);
    await act(async () => acknowledge?.({ trackingToken: 'ack-after-location' }));
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(body(UPDATE)).toMatchObject({ trackingToken: 'ack-after-location' });
    expect(calls(PAGE)).toHaveLength(1);
  });

  it('envia a localização já autorizada nas próximas páginas', async () => {
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    await waitFor(() => expect(calls(PAGE)).toHaveLength(2));
    expect(body(PAGE, 1)).toMatchObject({ location: details });
    expect(calls(UPDATE)).toHaveLength(1);
  });

  it('enriquece somente a página atual quando a rota muda antes do endereço', async () => {
    let resolveDetails: ((value: typeof details) => void) | undefined;
    apiMock.mockImplementation((path: string) => {
      if (path === LOOKUP)
        return new Promise<typeof details>((resolve) => {
          resolveDetails = resolve;
        });
      if (path === PAGE)
        return Promise.resolve({ trackingToken: 'tracking-' + calls(PAGE).length });
      return Promise.resolve(undefined);
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(LOOKUP)).toHaveLength(1));
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    await act(async () => resolveDetails?.(details));
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(body(UPDATE)).toMatchObject({
      trackingToken: 'tracking-2',
      url: window.location.href,
      location: details,
    });
    expect(calls(PAGE)).toHaveLength(2);
  });

  it('não altera a página anterior se a confirmação chega depois da navegação', async () => {
    let acknowledge: ((value: { trackingToken: string }) => void) | undefined;
    apiMock.mockImplementation((path: string) => {
      if (path === PAGE && calls(PAGE).length === 1)
        return new Promise<{ trackingToken: string }>((resolve) => {
          acknowledge = resolve;
        });
      if (path === PAGE) return Promise.resolve({ trackingToken: 'new-page' });
      if (path === LOOKUP) return Promise.resolve(details);
      return Promise.resolve(undefined);
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await act(async () => Promise.resolve());
    fireEvent.click(screen.getByRole('link', { name: 'Ir para outra página' }));
    expect(body(PAGE, 1)).toMatchObject({ location: details });
    await act(async () => acknowledge?.({ trackingToken: 'old-page' }));
    expect(calls(UPDATE)).toHaveLength(0);
    expect(calls(PAGE)).toHaveLength(2);
  });

  it('não envia localização após revogação enquanto a consulta está pendente', async () => {
    let resolveDetails: ((value: typeof details) => void) | undefined;
    apiMock.mockImplementation((path: string) => {
      if (path === LOOKUP)
        return new Promise<typeof details>((resolve) => {
          resolveDetails = resolve;
        });
      if (path === PAGE) return Promise.resolve({ trackingToken: 'tracking' });
      return Promise.resolve(undefined);
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(LOOKUP)).toHaveLength(1));
    fireEvent.click(screen.getByTestId('location-consent-stop'));
    await act(async () => resolveDetails?.(details));
    expect(calls(UPDATE)).toHaveLength(0);
  });

  it('preserva coordenadas reais quando o endereço não pode ser consultado', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === LOOKUP) return Promise.reject(new Error('lookup unavailable'));
      if (path === PAGE) return Promise.resolve({ trackingToken: 'tracking' });
      return Promise.resolve(undefined);
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(body(UPDATE)).toMatchObject({ location: { consentGranted: true, ...coordinates } });
    expect(body(UPDATE).location).not.toHaveProperty('country');
    expect(body(UPDATE).location).not.toHaveProperty('isp');
    expect(calls(PAGE)).toHaveLength(1);
  });

  it('aproveita o fuso do endereço quando Intl não fornece fuso horário', async () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('unavailable');
    });
    apiMock.mockImplementation((path: string) => {
      if (path === LOOKUP) return Promise.resolve({ ...details, timeZone: 'America/Sao_Paulo' });
      if (path === PAGE) return Promise.resolve({ trackingToken: 'tracking' });
      return Promise.resolve(undefined);
    });
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(body(LOOKUP)).not.toHaveProperty('timeZone');
    expect(body(UPDATE)).toMatchObject({ location: { timeZone: 'America/Sao_Paulo' } });
  });

  it('aceita consulta de endereço com resposta vazia sem bloquear o aplicativo', async () => {
    apiMock.mockImplementation((path: string) =>
      path === PAGE ? Promise.resolve({ trackingToken: 'tracking' }) : Promise.resolve(undefined),
    );
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1));
    expect(body(UPDATE)).toMatchObject({
      location: { consentGranted: true, ...coordinates, country: null, address: null },
    });
    expect(screen.getByTestId('app-action')).toBeEnabled();
  });

  it('não insere outra visita quando o servidor responde 204 sem trackingToken', async () => {
    apiMock.mockImplementation((path: string) =>
      path === LOOKUP ? Promise.resolve(details) : Promise.resolve(undefined),
    );
    render(<Fixture />);
    fireEvent.click(screen.getByTestId('location-consent-allow'));
    grant();
    await waitFor(() => expect(calls(LOOKUP)).toHaveLength(1));
    await act(async () => Promise.resolve());
    expect(calls(UPDATE)).toHaveLength(0);
    expect(calls(PAGE)).toHaveLength(1);
  });

  it('recusa coordenadas inválidas e nunca inventa os demais campos', () => {
    expect(positionToLocation(position(Number.NaN, 10))).toBeUndefined();
    expect(positionToLocation(position(91, 10))).toBeUndefined();
    expect(positionToLocation(position(10, -181))).toBeUndefined();
    expect(positionToLocation(position(-23.12345678, -46.12345678))).toMatchObject({
      latitude: -23.123457,
      longitude: -46.123457,
      consentGranted: true,
    });
    expect(positionToLocation(position())).not.toHaveProperty('country');
    expect(positionToLocation(position())).not.toHaveProperty('address');
    expect(positionToLocation(position())).not.toHaveProperty('isp');
  });
});
