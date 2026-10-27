import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CarFront, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Skeleton } from '../../ui';
import { ThemeToggle } from '../../components/ThemeToggle';
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
        <span className="brand">
          <span className="brand-symbol">
            <CarFront size={25} />
          </span>
          <span>CareAuto</span>
        </span>
        <p className="eyebrow">SEU NEGÓCIO EM BOAS MÃOS</p>
        <h1>
          O cuidado começa
          <br />
          com uma boa
          <br />
          <em>gestão.</em>
        </h1>
        <p>Conecte o estacionamento, os serviços e os recebimentos em uma rotina mais simples.</p>
        <div className="login-road" aria-hidden="true">
          <CarFront size={100} />
          <span />
        </div>
      </section>
      <section className="login-card">
        <span className="login-lock">
          <ShieldCheck size={24} />
        </span>
        <p className="eyebrow">BEM-VINDO AO CAREAUTO</p>
        <h2>Vamos começar?</h2>
        <p>Entre com seu e-mail e senha para acessar o estacionamento.</p>
        {state?.expired && (
          <p role="status" className="notice">
            Sua sessão expirou. Entre novamente.
          </p>
        )}
        {config.isPending ? (
          <Skeleton />
        ) : config.isError ? (
          <QueryError
            error={config.error}
            what="a configuração de acesso"
            onRetry={() => void config.refetch()}
          />
        ) : config.data.mode === 'Internal' ? (
          <>
            <RecordForm
              submitLabel="Entrar no sistema"
              spec={{
                schema: loginSchema,
                defaults: { email: '', senha: '' },
                fields: [
                  {
                    name: 'email',
                    label: 'E-mail do operador / gestor',
                    kind: 'email',
                    autoComplete: 'username',
                  },
                  {
                    name: 'senha',
                    label: 'Senha de acesso',
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
              Esqueci minha senha
            </Link>
            {config.data.registrationEnabled && (
              <Link to="/primeiro-acesso" className="text-link" data-testid="first-access">
                Cadastrar meu estabelecimento
              </Link>
            )}
            <Link to="/sobrenos" className="text-link" data-testid="about-link">
              Conheça as funcionalidades e os planos
            </Link>
            <p className="login-help">
              Funcionário sem acesso? Solicite seu cadastro ou uma nova senha ao administrador.
            </p>
          </>
        ) : (
          <>
            {!oidcConfigured && (
              <p className="notice" data-testid="auth-not-configured">
                O acesso está aguardando configuração. Entre em contato com o administrador.
              </p>
            )}
            {!!error && (
              <p role="alert" className="form-error">
                Não foi possível iniciar o acesso. Confira o provedor configurado.
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
              Entrar com minha conta <ArrowRight size={18} />
            </Button>
          </>
        )}
        <AndroidDownload />
        <IosPwaLink />
      </section>
    </main>
  );
}


