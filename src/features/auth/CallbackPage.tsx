import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { completeSignIn } from './oidc';
import { useAuthStore } from '../../stores/authStore';
import { Skeleton } from '../../ui';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useI18n } from '../../i18n';
// A single exchange prevents React StrictMode from redeeming the same code twice.
let exchange: ReturnType<typeof completeSignIn> | undefined;
export function CallbackPage() {
  const { t } = useI18n();
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <LanguageSelector />
      </Box>
      {error ? (
        <>
          <h1>{t('Acesso não concluído')}</h1>
          <p role="alert">{t(error)}</p>
          <Link
            to="/login"
            onClick={() => {
              exchange = undefined;
            }}
            className="button button-primary"
            data-testid="auth-retry"
          >
            {t('Voltar para o login')}
          </Link>
        </>
      ) : (
        <>
          <h1>{t('Preparando seu ambiente')}</h1>
          <Skeleton />
        </>
      )}
    </main>
  );
}
