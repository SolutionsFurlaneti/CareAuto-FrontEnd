import { api } from '../../lib/apiClient';
import { useAuthStore, type Session } from '../../stores/authStore';
import { forgetIdentity } from './oidc';
export interface AuthConfiguration {
  mode: 'Internal' | 'External' | 'Local';
  registrationEnabled: boolean;
}
export const getAuthConfiguration = (signal?: AbortSignal) =>
  api<AuthConfiguration>('/api/v1/auth/configuracao', { signal });
export async function savePasswordSession(path: string, data: unknown) {
  const session = await api<Session>('/api/v1/auth/' + path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  useAuthStore.getState().setSession({ ...session, authMode: 'password' });
  return session;
}
export async function signOut() {
  try {
    if (useAuthStore.getState().session?.authMode === 'password')
      await api<void>('/api/v1/auth/logout', { method: 'POST' });
    else await forgetIdentity();
  } finally {
    useAuthStore.getState().clear();
  }
}
