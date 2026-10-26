import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completeSignIn } from './oidc';
import { useAuthStore } from '../../stores/authStore';
import { Skeleton } from '../../ui';
// A single exchange prevents React StrictMode from redeeming the same code twice.
let exchange: ReturnType<typeof completeSignIn> | undefined;
export function CallbackPage() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    exchange ??= completeSignIn();
    void exchange
      .then(({ session, from }) => {
        if (active) {
          useAuthStore.getState().setSession(session);
          navigate(from, { replace: true });
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível concluir o acesso. Tente entrar novamente.');
      });
    return () => {
      active = false;
    };
  }, [navigate]);
  return (
    <main className="callback-page">
      {error ? (
        <>
          <h1>Acesso não concluído</h1>
          <p role="alert">{error}</p>
          <Link
            to="/login"
            onClick={() => {
              exchange = undefined;
            }}
            className="button button-primary"
            data-testid="auth-retry"
          >
            Voltar para o login
          </Link>
        </>
      ) : (
        <>
          <h1>Preparando seu ambiente</h1>
          <Skeleton />
        </>
      )}
    </main>
  );
}
