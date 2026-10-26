import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isBackofficeSessionValid, useBackofficeStore } from './store';

/** Protege o backoffice. Sessão com troca obrigatória só acessa a tela de nova senha. */
export function RequireBackoffice({
  children,
  allowPasswordChange,
}: {
  children: ReactNode;
  allowPasswordChange?: boolean;
}) {
  const session = useBackofficeStore((s) => s.session);
  const location = useLocation();
  const valid = isBackofficeSessionValid(session);
  useEffect(() => {
    if (session && !valid) useBackofficeStore.getState().clear();
  }, [session, valid]);
  if (!valid)
    return <Navigate to="/backoffice/login" replace state={{ from: location.pathname }} />;
  if (session.mustChangePassword && !allowPasswordChange)
    return <Navigate to="/backoffice/trocar-senha" replace />;
  return children;
}
