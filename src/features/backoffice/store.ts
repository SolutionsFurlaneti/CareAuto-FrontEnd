import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Sessão do backoffice da plataforma. Separada da sessão dos estacionamentos (outra chave e outro token). */
export interface BackofficeSession {
  login: string;
  nome: string;
  accessToken: string;
  expiresAtUtc: string;
  mustChangePassword: boolean;
}
interface BackofficeState {
  session: BackofficeSession | null;
  setSession: (session: BackofficeSession) => void;
  clear: () => void;
}
export const useBackofficeStore = create<BackofficeState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clear: () => set({ session: null }),
    }),
    {
      storage: createJSONStorage(() => window.localStorage),
      name: 'AutoCareManager-backoffice',
      partialize: (s) => ({ session: s.session }),
    },
  ),
);
export const isBackofficeSessionValid = (
  session: BackofficeSession | null,
): session is BackofficeSession =>
  !!session?.accessToken &&
  Number.isFinite(Date.parse(session.expiresAtUtc)) &&
  Date.parse(session.expiresAtUtc) > Date.now();
