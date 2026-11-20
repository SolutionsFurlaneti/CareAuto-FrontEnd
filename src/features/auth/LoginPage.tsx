import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CarFront, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Skeleton } from '../../ui';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useI18n } from '../../i18n';
import { RecordForm } from '../../components/RecordForm';
import { QueryError } from '../../components/QueryError';
import { useAuthStore, isSessionValid } from '../../stores/authStore';
import { oidcConfigured, signIn } from './oidc';
import { getAuthConfiguration, savePasswordSession } from './api';
import { loginSchema } from './authSchema';
import { safeReturnPath } from '../../lib/basePath';
import { AndroidDownload } from './AndroidDownload';
import { IosPwaLink } from './IosPwaLink';
export function LoginPage() {
  const { t } = useI18n();
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const state = location.state as { from?: unknown; expired?: boolean } | null;
  const config = useQuery({
    queryKey: ['auth-config', session?.userId ?? null],
    queryFn: ({ signal }) => getAuthConfiguration(signal),
    enabled: !isSessionValid(session),
    retry: false,
  });
  useEffect(() => {
    if (session && !isSessionValid(session)) useAuthStore.getState().clear();
  }, [session]);
  if (isSessionValid(session))
    return (
      <Navigate
        to={session.mustChangePassword ? '/trocar-senha' : safeReturnPath(state?.from)}
        replace
      />
    );
  return (
    <main className="login-page">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <section className="login-story">
        <div className="login-brand-row">
          <span className="brand">
            <span className="brand-symbol">
              <CarFront size={25} />
            </span>
            <span>CareAuto</span>
          </span>
          <LanguageSelector />
        </div>
        <p className="eyebrow">{t('SEU NEGÓCIO EM BOAS MÃOS')}</p>
        <h1>
          {t('O cuidado começa')}
          <br />
          {t('com uma boa')}
          <br />
          <em>{t('gestão.')}</em>
        </h1>
        <p>
          {t('Conecte o estacionamento, os serviços e os recebimentos em uma rotina mais simples.')}
        </p>
        <div className="login-road" aria-hidden="true">
          <CarFront size={100} />
          <span />
        </div>
      </section>
      <section className="login-card">
        <span className="login-lock">
          <ShieldCheck size={24} />
        </span>
        <p className="eyebrow">{t('BEM-VINDO AO CAREAUTO')}</p>
        <h2>{t('Vamos começar?')}</h2>
        <p>{t('Entre com seu e-mail e senha para acessar o estacionamento.')}</p>
        {state?.expired && (
          <p role="status" className="notice">
            {t('Sua sessão expirou. Entre novamente.')}
          </p>
        )}
        {config.isPending ? (
          <Skeleton />
        ) : config.isError ? (
          <QueryError
            error={config.error}
            what={t('a configuração de acesso')}
            onRetry={() => void config.refetch()}
          />
        ) : config.data.mode === 'Internal' ? (
          <>
            <RecordForm
              submitLabel={t('Entrar no sistema')}
              spec={{
                schema: loginSchema,
                defaults: { email: '', senha: '' },
                fields: [
                  {
                    name: 'email',
                    label: t('E-mail do operador / gestor'),
                    kind: 'email',
                    autoComplete: 'username',
                  },
                  {
                    name: 'senha',
                    label: t('Senha de acesso'),
                    kind: 'password',
                    autoComplete: 'current-password',
                  },
                ],
              }}
              error={error}
              onSubmit={async (values) => {
                setError(undefined);
                try {
                  await savePasswordSession('login', values);
                } catch (e) {
                  setError(e);
                }
              }}
            />
            <Link to="/recuperar-senha" className="text-link" data-testid="forgot-password">
              {t('Esqueci minha senha')}
            </Link>
            {config.data.registrationEnabled && (
              <Link to="/primeiro-acesso" className="text-link" data-testid="first-access">
                {t('Cadastrar meu estabelecimento')}
              </Link>
            )}
            <Link to="/" className="text-link" data-testid="about-link">
              {t('Conheça as funcionalidades e os planos')}
            </Link>
            <p className="login-help">
              {t(
                'Funcionário sem acesso? Solicite seu cadastro ou uma nova senha ao administrador.',
              )}
            </p>
          </>
        ) : (
          <>
            {!oidcConfigured && (
              <p className="notice" data-testid="auth-not-configured">
                {t('O acesso está aguardando configuração. Entre em contato com o administrador.')}
              </p>
            )}
            {!!error && (
              <p role="alert" className="form-error">
                {t('Não foi possível iniciar o acesso. Confira o provedor configurado.')}
              </p>
            )}
            <Button
              data-testid="login"
              busy={busy}
              disabled={!oidcConfigured}
              onClick={async () => {
                setBusy(true);
                try {
                  await signIn(state?.from);
                } catch (e) {
                  setError(e);
                  setBusy(false);
                }
              }}
            >
              {t('Entrar com minha conta')} <ArrowRight size={18} />
            </Button>
          </>
        )}
        <AndroidDownload />
        <IosPwaLink />
      </section>
    </main>
  );
}
