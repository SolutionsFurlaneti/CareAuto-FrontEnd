const STORAGE_KEY = 'AutoCareManager-monitoring-session';
let memorySession: string | undefined;

/** Identificador analítico da aba, sem relação com credenciais de autenticação. */
export function getMonitoringSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored && /^[a-zA-Z0-9._-]{1,100}$/.test(stored)) return stored;
  } catch {
    // Navegação privada pode bloquear storage. A sessão em memória continua funcionando.
  }
  if (!memorySession) {
    if (typeof window.crypto?.randomUUID === 'function') memorySession = window.crypto.randomUUID();
    else if (window.crypto?.getRandomValues) {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      memorySession = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    }
  }
  if (memorySession) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, memorySession);
    } catch {
      // Não bloquear o uso do aplicativo quando o storage estiver indisponível.
    }
  }
  return memorySession;
}
