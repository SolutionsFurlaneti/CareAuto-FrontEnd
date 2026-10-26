import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { appPath, safeReturnPath } from '../../lib/basePath';
import type { Role, Session } from '../../stores/authStore';
const authority = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
export const oidcConfigured = !!authority && !!clientId;
let manager: UserManager | undefined;
export function identity() {
  if (!authority || !clientId)
    throw new Error(
      'O acesso ainda não foi configurado. Solicite a configuração ao administrador.',
    );
  manager ??= new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: location.origin + appPath('/auth/callback'),
    post_logout_redirect_uri: location.origin + appPath('/login'),
    response_type: 'code',
    scope: import.meta.env.VITE_OIDC_SCOPE || 'openid profile email',
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: sessionStorage }),
  });
  return manager;
}
export async function signIn(from: unknown) {
  await identity().signinRedirect({ state: { from: safeReturnPath(from) } });
}
export function tokenClaims(token: string): Record<string, unknown> {
  const encoded = token.split('.')[1];
  if (!encoded) throw new Error('O provedor não retornou um access token JWT.');
  const text = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof result !== 'object' || result === null) throw new Error('Token inválido.');
  return result as Record<string, unknown>;
}
export async function completeSignIn(): Promise<{ session: Session; from: string }> {
  const user = await identity().signinRedirectCallback();
  const claims = tokenClaims(user.access_token);
  const supported: Role[] = ['Admin', 'Operador', 'Financeiro', 'Cliente'];
  const rawRoles = Array.isArray(claims.role) ? claims.role : [claims.role];
  const roles = supported.filter((r) => rawRoles.includes(r));
  if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number' || !roles.length)
    throw new Error('O provedor não retornou um perfil de acesso válido.');
  const estabelecimentoId = Number(claims.estabelecimento_id);
  if (!Number.isInteger(estabelecimentoId) || estabelecimentoId <= 0)
    throw new Error('O provedor não vinculou a conta a um estabelecimento.');
  const state = user.state as { from?: unknown } | undefined;
  return {
    session: {
      userId: claims.sub,
      estabelecimentoId,
      estabelecimentoNome:
        typeof claims.estabelecimento_nome === 'string'
          ? claims.estabelecimento_nome
          : `Estabelecimento ${estabelecimentoId}`,
      authMode: 'oidc',
      userName: user.profile.name || 'Minha conta',
      email: user.profile.email || '',
      accessToken: user.access_token,
      expiresAtUtc: new Date(claims.exp * 1000).toISOString(),
      roles,
    },
    from: safeReturnPath(state?.from),
  };
}
export async function forgetIdentity() {
  if (oidcConfigured) await identity().removeUser();
}
