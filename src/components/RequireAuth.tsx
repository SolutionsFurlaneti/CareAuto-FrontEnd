import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasRole, isSessionValid, useAuthStore, type Role } from '../stores/authStore';
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!session || !isSessionValid(session)) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const remaining = Date.parse(session.expiresAtUtc) - Date.now();
      if (remaining <= 0) {
        tick((x) => x + 1);
        return;
      }
      timer = setTimeout(schedule, Math.min(remaining, 2147483647));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [session]);
  if (!isSessionValid(session))
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search, expired: !!session }}
      />
    );
  if (roles && !hasRole(session.roles, roles)) return <Navigate to="/" replace />;
  if (session.mustChangePassword && location.pathname !== '/trocar-senha')
    return <Navigate to="/trocar-senha" replace />;
  return children;
}
