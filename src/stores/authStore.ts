import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
export type Role = 'Admin' | 'Operador' | 'Financeiro' | 'Cliente';
export interface Session {
  userId: string;
  estabelecimentoId: number;
  estabelecimentoNome: string;
  userName: string;
  email: string;
  accessToken: string;
  expiresAtUtc: string;
  roles: Role[];
  mustChangePassword?: boolean;
  authMode?: 'password' | 'oidc';
}
interface AuthState {
  session: Session | null;
  setSession: (session: Session) => void;
  clear: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clear: () => set({ session: null }),
    }),
    {
      storage: createJSONStorage(() => window.localStorage),
      name: 'AutoCareManager-auth',
      partialize: (s) => ({ session: s.session }),
    },
  ),
);
export const hasRole = (roles: Role[], allowed: Role[]) => roles.some((r) => allowed.includes(r));
export const isSessionValid = (session: Session | null): session is Session =>
  !!session?.accessToken &&
  Number.isInteger(session.estabelecimentoId) &&
  session.estabelecimentoId > 0 &&
  Number.isFinite(Date.parse(session.expiresAtUtc)) &&
  Date.parse(session.expiresAtUtc) > Date.now();

export const sessionScope = (session: Session | null) =>
  session ? `${session.estabelecimentoId}:${session.userId}` : null;
