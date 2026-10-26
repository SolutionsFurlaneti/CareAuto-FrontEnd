import { useAuthStore } from '../stores/authStore';
import { useBackofficeStore } from '../features/backoffice/store';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public fieldErrors?: Record<string, string[]>,
    public traceId?: string,
  ) {
    super(message || code);
    this.name = 'ApiError';
  }
}
export const toQuery = (values: Record<string, string | number | boolean | null | undefined>) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values))
    if (v !== null && v !== undefined && v !== '') params.set(k, String(v));
  return params.size ? '?' + params.toString() : '';
};
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
/** auth 'backoffice' usa a sessão do backoffice da plataforma; 'none' não envia token; o padrão é a sessão do estacionamento. */
export type ApiOptions = RequestInit & { auth?: 'tenant' | 'backoffice' | 'none' };
const sessions = {
  none: { token: () => undefined, clear: () => {} },
  tenant: {
    token: () => useAuthStore.getState().session?.accessToken,
    clear: () => useAuthStore.getState().clear(),
  },
  backoffice: {
    token: () => useBackofficeStore.getState().session?.accessToken,
    clear: () => useBackofficeStore.getState().clear(),
  },
};
export async function api<T>(
  path: string,
  { auth = 'tenant', ...options }: ApiOptions = {},
): Promise<T> {
  const owner = sessions[auth];
  const token = owner.token();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', 'Bearer ' + token);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(base + path, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Network.Unreachable');
  }
  if (response.status === 401 && token) {
    // An obsolete response must not log out a newer session.
    if (owner.token() === token) owner.clear();
    throw new ApiError(401, 'Auth.SessionExpired');
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    if (isObject(body)) {
      const fields: Record<string, string[]> = {};
      if (isObject(body.errors))
        for (const [key, value] of Object.entries(body.errors))
          if (Array.isArray(value))
            fields[key] = value.filter((v): v is string => typeof v === 'string');
      const code = Object.keys(fields).length
        ? 'Validation.Failed'
        : typeof body.code === 'string'
          ? body.code
          : 'Http.' + response.status;
      throw new ApiError(
        response.status,
        code,
        typeof body.detail === 'string'
          ? body.detail
          : typeof body.title === 'string'
            ? body.title
            : undefined,
        fields,
        typeof body.traceId === 'string' ? body.traceId : undefined,
      );
    }
    throw new ApiError(response.status, 'Http.' + response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const apiUpload = <T>(path: string, body: FormData) =>
  api<T>(path, { method: 'POST', body });
